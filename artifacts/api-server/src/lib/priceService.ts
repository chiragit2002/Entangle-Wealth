import { TTLCache } from "./cache";
import { logger } from "./logger";

const ALPACA_DATA_URL = "https://data.alpaca.markets";

const PRICE_CACHE = new TTLCache<number>(15_000, 500, "live-prices");

function getAlpacaHeaders(): Record<string, string> {
  const candidates = [
    process.env.ALPACA_KEY_ID || "",
    process.env.ALPACA_API_KEY || "",
    process.env.ALPACA_API_SECRET || "",
  ].filter(Boolean);
  const keyId = candidates.find(v => v.startsWith("PK")) || candidates[0] || "";
  const secretKey = candidates.find(v => !v.startsWith("PK") && v.length > 30) || candidates[1] || "";
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secretKey,
    "Accept": "application/json",
  };
}

export async function getLivePrice(symbol: string): Promise<number | null> {
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `price:${upperSymbol}`;

  const cached = PRICE_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`${ALPACA_DATA_URL}/v2/stocks/${upperSymbol}/snapshot`, {
      headers: getAlpacaHeaders(),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      logger.warn({ symbol: upperSymbol, status: res.status }, "Alpaca snapshot returned non-OK for price lookup");
      return null;
    }

    const data = await res.json() as Record<string, any>;
    const price: number | null =
      data.minuteBar?.c ||
      data.latestTrade?.p ||
      data.dailyBar?.c ||
      null;

    if (price && price > 0) {
      PRICE_CACHE.set(cacheKey, price);
      return price;
    }
    return null;
  } catch (err) {
    logger.error({ err, symbol: upperSymbol }, "Failed to fetch live price from Alpaca");
    return null;
  }
}

export async function getLivePrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const upperSymbols = [...new Set(symbols.map(s => s.toUpperCase()))];
  const result: Record<string, number> = {};
  const uncached: string[] = [];

  for (const symbol of upperSymbols) {
    const cached = PRICE_CACHE.get(`price:${symbol}`);
    if (cached !== undefined) {
      result[symbol] = cached;
    } else {
      uncached.push(symbol);
    }
  }

  if (uncached.length === 0) return result;

  try {
    const res = await fetch(
      `${ALPACA_DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(uncached.join(","))}`,
      {
        headers: getAlpacaHeaders(),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      logger.warn({ status: res.status }, "Alpaca multi-snapshot returned non-OK for price lookup");
      return result;
    }

    const data = await res.json() as Record<string, any>;
    for (const [symbol, snap] of Object.entries(data)) {
      const s = snap as Record<string, any>;
      const price: number | null =
        s.minuteBar?.c ||
        s.latestTrade?.p ||
        s.dailyBar?.c ||
        null;
      if (price && price > 0) {
        PRICE_CACHE.set(`price:${symbol}`, price);
        result[symbol] = price;
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to batch-fetch live prices from Alpaca");
  }

  return result;
}
