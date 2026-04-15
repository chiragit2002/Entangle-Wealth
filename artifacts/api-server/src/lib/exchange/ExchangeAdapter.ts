export enum OrderSide {
  BUY = "buy",
  SELL = "sell",
}

export enum OrderType {
  MARKET = "market",
  LIMIT = "limit",
}

export interface OrderResult {
  orderId: string;
  symbol: string;
  side: OrderSide;
  size: number;
  orderType: OrderType;
  status: string;
  filledAvgPrice?: number;
  submittedAt: string;
}

export interface PositionInfo {
  symbol: string;
  qty: number;
  side: "long" | "short";
  marketValue: number;
  costBasis: number;
  unrealizedPl: number;
  currentPrice: number;
  avgEntryPrice: number;
}

export interface ExchangeAdapter {
  placeOrder(symbol: string, side: OrderSide, size: number, orderType: OrderType, limitPrice?: number): Promise<OrderResult>;
  closePosition(symbol: string): Promise<OrderResult>;
  getPosition(symbol: string): Promise<PositionInfo | null>;
}
