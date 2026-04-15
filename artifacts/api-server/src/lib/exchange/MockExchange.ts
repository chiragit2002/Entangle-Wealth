import { logger } from "../logger";
import type { ExchangeAdapter, OrderResult, PositionInfo } from "./ExchangeAdapter";
import { OrderSide, OrderType } from "./ExchangeAdapter";

interface MockPosition {
  symbol: string;
  qty: number;
  side: "long" | "short";
  avgEntryPrice: number;
  currentPrice: number;
  costBasis: number;
}

export class MockExchange implements ExchangeAdapter {
  private positions = new Map<string, MockPosition>();
  private orders: OrderResult[] = [];
  private orderCounter = 0;

  async placeOrder(
    symbol: string,
    side: OrderSide,
    size: number,
    orderType: OrderType,
    limitPrice?: number,
  ): Promise<OrderResult> {
    const orderId = `mock-order-${++this.orderCounter}-${Date.now()}`;
    const fillPrice = limitPrice ?? 100;

    const existing = this.positions.get(symbol);
    if (side === OrderSide.BUY) {
      if (existing && existing.side === "long") {
        const totalQty = existing.qty + size;
        existing.avgEntryPrice = (existing.avgEntryPrice * existing.qty + fillPrice * size) / totalQty;
        existing.qty = totalQty;
        existing.costBasis = existing.avgEntryPrice * totalQty;
        existing.currentPrice = fillPrice;
      } else {
        this.positions.set(symbol, {
          symbol,
          qty: size,
          side: "long",
          avgEntryPrice: fillPrice,
          currentPrice: fillPrice,
          costBasis: fillPrice * size,
        });
      }
    } else {
      if (existing && existing.side === "short") {
        const totalQty = existing.qty + size;
        existing.avgEntryPrice = (existing.avgEntryPrice * existing.qty + fillPrice * size) / totalQty;
        existing.qty = totalQty;
        existing.costBasis = existing.avgEntryPrice * totalQty;
        existing.currentPrice = fillPrice;
      } else {
        this.positions.set(symbol, {
          symbol,
          qty: size,
          side: "short",
          avgEntryPrice: fillPrice,
          currentPrice: fillPrice,
          costBasis: fillPrice * size,
        });
      }
    }

    const result: OrderResult = {
      orderId,
      symbol,
      side,
      size,
      orderType,
      status: "filled",
      filledAvgPrice: fillPrice,
      submittedAt: new Date().toISOString(),
    };

    this.orders.push(result);
    logger.info({ orderId, symbol, side, size, fillPrice }, "[MockExchange] Order placed");
    return result;
  }

  async closePosition(symbol: string): Promise<OrderResult> {
    const position = this.positions.get(symbol);
    const orderId = `mock-close-${++this.orderCounter}-${Date.now()}`;

    if (!position) {
      logger.warn({ symbol }, "[MockExchange] closePosition called but no position found");
      const result: OrderResult = {
        orderId,
        symbol,
        side: OrderSide.SELL,
        size: 0,
        orderType: OrderType.MARKET,
        status: "no_position",
        submittedAt: new Date().toISOString(),
      };
      this.orders.push(result);
      return result;
    }

    const closeSide = position.side === "long" ? OrderSide.SELL : OrderSide.BUY;
    this.positions.delete(symbol);

    const result: OrderResult = {
      orderId,
      symbol,
      side: closeSide,
      size: position.qty,
      orderType: OrderType.MARKET,
      status: "filled",
      filledAvgPrice: position.currentPrice,
      submittedAt: new Date().toISOString(),
    };

    this.orders.push(result);
    logger.info({ orderId, symbol, qty: position.qty }, "[MockExchange] Position closed");
    return result;
  }

  async getPosition(symbol: string): Promise<PositionInfo | null> {
    const p = this.positions.get(symbol);
    if (!p) return null;
    return {
      symbol: p.symbol,
      qty: p.qty,
      side: p.side,
      marketValue: p.currentPrice * p.qty,
      costBasis: p.costBasis,
      unrealizedPl: (p.currentPrice - p.avgEntryPrice) * p.qty * (p.side === "long" ? 1 : -1),
      currentPrice: p.currentPrice,
      avgEntryPrice: p.avgEntryPrice,
    };
  }

  getOrders(): OrderResult[] {
    return [...this.orders];
  }

  getPositions(): PositionInfo[] {
    return [...this.positions.values()].map(p => ({
      symbol: p.symbol,
      qty: p.qty,
      side: p.side,
      marketValue: p.currentPrice * p.qty,
      costBasis: p.costBasis,
      unrealizedPl: (p.currentPrice - p.avgEntryPrice) * p.qty * (p.side === "long" ? 1 : -1),
      currentPrice: p.currentPrice,
      avgEntryPrice: p.avgEntryPrice,
    }));
  }

  reset(): void {
    this.positions.clear();
    this.orders = [];
    this.orderCounter = 0;
  }
}
