import { logger } from "../logger";
import { alpacaCircuit } from "../circuitBreaker";
import { retryWithBackoff } from "../retryWithBackoff";
import type { ExchangeAdapter, OrderResult, PositionInfo } from "./ExchangeAdapter";
import { OrderSide, OrderType } from "./ExchangeAdapter";

const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

function resolveAlpacaCreds() {
  const candidates = [
    process.env.ALPACA_KEY_ID || "",
    process.env.ALPACA_API_KEY || "",
    process.env.ALPACA_API_SECRET || "",
  ].filter(Boolean);
  const pk = candidates.find(v => v.startsWith("PK")) || candidates[0] || "";
  const secret = candidates.find(v => !v.startsWith("PK") && v.length > 30) || candidates[1] || "";
  return { keyId: pk, secretKey: secret };
}

function alpacaHeaders(): Record<string, string> {
  const { keyId, secretKey } = resolveAlpacaCreds();
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secretKey,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

async function alpacaPostRaw(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: alpacaHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text, url }, "[AlpacaAdapter] POST error");
    const err = new Error(`Alpaca ${res.status}: ${text}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function alpacaDeleteRaw(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: alpacaHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text, url }, "[AlpacaAdapter] DELETE error");
    const err = new Error(`Alpaca ${res.status}: ${text}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  if (!text || text.trim() === "") return { status: "closed" };
  return JSON.parse(text) as Record<string, unknown>;
}

async function alpacaGetRaw(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Alpaca ${res.status}: ${text}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export class AlpacaExchangeAdapter implements ExchangeAdapter {
  async placeOrder(
    symbol: string,
    side: OrderSide,
    size: number,
    orderType: OrderType,
    limitPrice?: number,
  ): Promise<OrderResult> {
    const body: Record<string, unknown> = {
      symbol: symbol.toUpperCase(),
      qty: size.toString(),
      side: side === OrderSide.BUY ? "buy" : "sell",
      type: orderType === OrderType.LIMIT ? "limit" : "market",
      time_in_force: "day",
    };
    if (orderType === OrderType.LIMIT && limitPrice !== undefined) {
      body.limit_price = limitPrice.toFixed(2);
    }

    const data = await alpacaCircuit.execute(
      () => retryWithBackoff(
        () => alpacaPostRaw(`${ALPACA_PAPER_URL}/v2/orders`, body),
        { label: "alpaca-placeOrder", maxRetries: 3 },
      ),
    );

    logger.info({ symbol, side, size, orderType, orderId: data.id }, "[AlpacaAdapter] Order placed");

    return {
      orderId: String(data.id ?? ""),
      symbol: String(data.symbol ?? symbol),
      side,
      size,
      orderType,
      status: String(data.status ?? "submitted"),
      filledAvgPrice: data.filled_avg_price ? Number(data.filled_avg_price) : undefined,
      submittedAt: String(data.submitted_at ?? new Date().toISOString()),
    };
  }

  async closePosition(symbol: string): Promise<OrderResult> {
    const data = await alpacaCircuit.execute(
      () => retryWithBackoff(
        () => alpacaDeleteRaw(`${ALPACA_PAPER_URL}/v2/positions/${encodeURIComponent(symbol.toUpperCase())}`),
        { label: "alpaca-closePosition", maxRetries: 3 },
      ),
    );

    logger.info({ symbol, orderId: data.id }, "[AlpacaAdapter] Position closed");

    const rawSide = String(data.side ?? "sell").toLowerCase();
    const closeSide = rawSide === "buy" ? OrderSide.BUY : OrderSide.SELL;

    return {
      orderId: String(data.id ?? `close-${symbol}-${Date.now()}`),
      symbol,
      side: closeSide,
      size: Number(data.qty ?? 0),
      orderType: OrderType.MARKET,
      status: String(data.status ?? "closed"),
      filledAvgPrice: data.filled_avg_price ? Number(data.filled_avg_price) : undefined,
      submittedAt: String(data.submitted_at ?? new Date().toISOString()),
    };
  }

  async getPosition(symbol: string): Promise<PositionInfo | null> {
    try {
      const data = await alpacaCircuit.execute(
        () => retryWithBackoff(
          () => alpacaGetRaw(`${ALPACA_PAPER_URL}/v2/positions/${encodeURIComponent(symbol.toUpperCase())}`),
          { label: "alpaca-getPosition", maxRetries: 2 },
        ),
      );

      return {
        symbol: String(data.symbol ?? symbol),
        qty: Number(data.qty ?? 0),
        side: String(data.side ?? "long") as "long" | "short",
        marketValue: Number(data.market_value ?? 0),
        costBasis: Number(data.cost_basis ?? 0),
        unrealizedPl: Number(data.unrealized_pl ?? 0),
        currentPrice: Number(data.current_price ?? 0),
        avgEntryPrice: Number(data.avg_entry_price ?? 0),
      };
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 404) return null;
      throw err;
    }
  }
}
