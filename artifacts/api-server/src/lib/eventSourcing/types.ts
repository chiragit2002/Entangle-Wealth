export const EventTypes = {
  USER_CREATED: "USER_CREATED",
  EARLY_BOOST_GRANTED: "EARLY_BOOST_GRANTED",
  REFERRAL_REWARD_GRANTED: "REFERRAL_REWARD_GRANTED",
  PURCHASED_BALANCE: "PURCHASED_BALANCE",

  ORDER_PLACED: "ORDER_PLACED",
  ORDER_FILLED: "ORDER_FILLED",
  ORDER_REJECTED: "ORDER_REJECTED",

  CASH_DEBITED: "CASH_DEBITED",
  CASH_CREDITED: "CASH_CREDITED",
  POSITION_OPENED: "POSITION_OPENED",
  POSITION_INCREASED: "POSITION_INCREASED",
  POSITION_REDUCED: "POSITION_REDUCED",
  POSITION_CLOSED: "POSITION_CLOSED",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface PortfolioPosition {
  ticker: string;
  quantity: number;
  avgPrice: number;
}

export interface PortfolioState {
  cashBalance: number;
  positions: PortfolioPosition[];
}

export interface CashPayload {
  amount: number;
  reason?: string;
}

export interface PositionPayload {
  ticker: string;
  quantity: number;
  executionPrice: number;
}

export interface OrderPayload {
  orderId?: number;
  ticker: string;
  side: string;
  quantity: number;
  orderType?: string;
  executionPrice?: number;
  reason?: string;
}

export interface BoostPayload {
  multiplier: number;
  amount: number;
}

export interface ReferralPayload {
  referredBy?: string;
  amount: number;
}

export interface PurchasePayload {
  stripeSessionId: string;
  amountPaidCents: number;
  virtualAmountCredited: number;
}

export type EventPayload =
  | CashPayload
  | PositionPayload
  | OrderPayload
  | BoostPayload
  | ReferralPayload
  | PurchasePayload
  | Record<string, unknown>;

export interface TradingEvent {
  id: number;
  userId: string;
  portfolioId: number;
  eventType: EventType;
  payload: EventPayload;
  marketPrice: number | null;
  timestamp: Date;
  idempotencyKey: string | null;
}

export interface SnapshotState {
  cashBalance: number;
  positions: PortfolioPosition[];
}

export interface Snapshot {
  id: number;
  portfolioId: number;
  lastEventId: number;
  state: SnapshotState;
  createdAt: Date;
}

export interface ReplayResult {
  state: PortfolioState;
  lastEventId: number;
  eventCount: number;
}
