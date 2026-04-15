export { EventTypes } from "./types.js";
export type {
  EventType,
  PortfolioState,
  PortfolioPosition,
  SnapshotState,
  TradingEvent,
  Snapshot,
  ReplayResult,
  CashPayload,
  PositionPayload,
  OrderPayload,
  BoostPayload,
  ReferralPayload,
  PurchasePayload,
  EventPayload,
} from "./types.js";

export { emitEvent, emitTradeEvents } from "./eventEmitter.js";
export type { EmitEventOptions } from "./eventEmitter.js";

export {
  replayPortfolio,
  replayPortfolioAtTime,
  getLatestSnapshot,
  getEventsSince,
  createEmptyState,
  applyEvent,
} from "./replayEngine.js";

export {
  shouldCreateSnapshot,
  createSnapshot,
  maybeCreateSnapshot,
  rebuildSnapshots,
} from "./snapshotEngine.js";
