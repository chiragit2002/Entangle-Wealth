import { db } from "@workspace/db";
import { strategyEventsTable, portfolioSnapshotsTable } from "@workspace/db/schema";
import { eq, and, gt, lte, asc, desc } from "drizzle-orm";
import { logger } from "../logger.js";
import { EventTypes } from "./types.js";
import type {
  PortfolioState,
  PortfolioPosition,
  SnapshotState,
  TradingEvent,
  Snapshot,
  ReplayResult,
  CashPayload,
  PositionPayload,
  BoostPayload,
  ReferralPayload,
  PurchasePayload,
} from "./types.js";

export function createEmptyState(): PortfolioState {
  return { cashBalance: 0, positions: [] };
}

function findPosition(state: PortfolioState, ticker: string): PortfolioPosition | undefined {
  return state.positions.find((p) => p.ticker === ticker);
}

function removePosition(state: PortfolioState, ticker: string): void {
  state.positions = state.positions.filter((p) => p.ticker !== ticker);
}

function applyEvent(state: PortfolioState, event: TradingEvent): void {
  const { eventType, payload } = event;

  switch (eventType) {
    case EventTypes.USER_CREATED: {
      const p = payload as CashPayload;
      state.cashBalance = p.amount ?? 100_000;
      break;
    }

    case EventTypes.EARLY_BOOST_GRANTED: {
      const p = payload as BoostPayload;
      state.cashBalance += p.amount;
      break;
    }

    case EventTypes.REFERRAL_REWARD_GRANTED: {
      const p = payload as ReferralPayload;
      state.cashBalance += p.amount;
      break;
    }

    case EventTypes.PURCHASED_BALANCE: {
      const p = payload as PurchasePayload;
      state.cashBalance += p.virtualAmountCredited;
      break;
    }

    case EventTypes.CASH_DEBITED: {
      const p = payload as CashPayload;
      state.cashBalance -= p.amount;
      break;
    }

    case EventTypes.CASH_CREDITED: {
      const p = payload as CashPayload;
      state.cashBalance += p.amount;
      break;
    }

    case EventTypes.POSITION_OPENED: {
      const p = payload as PositionPayload;
      state.positions.push({
        ticker: p.ticker,
        quantity: p.quantity,
        avgPrice: p.executionPrice,
      });
      break;
    }

    case EventTypes.POSITION_INCREASED: {
      const p = payload as PositionPayload;
      const pos = findPosition(state, p.ticker);
      if (pos) {
        const totalCost = pos.quantity * pos.avgPrice + p.quantity * p.executionPrice;
        const newQty = pos.quantity + p.quantity;
        pos.avgPrice = totalCost / newQty;
        pos.quantity = newQty;
      }
      break;
    }

    case EventTypes.POSITION_REDUCED: {
      const p = payload as PositionPayload;
      const pos = findPosition(state, p.ticker);
      if (pos) {
        pos.quantity -= p.quantity;
        if (pos.quantity <= 0) {
          removePosition(state, p.ticker);
        }
      }
      break;
    }

    case EventTypes.POSITION_CLOSED: {
      const p = payload as PositionPayload;
      removePosition(state, p.ticker);
      break;
    }

    case EventTypes.ORDER_PLACED:
    case EventTypes.ORDER_FILLED:
    case EventTypes.ORDER_REJECTED:
      break;

    default:
      logger.warn({ eventType }, "Unknown event type during replay — skipping");
  }
}

export async function getLatestSnapshot(portfolioId: number): Promise<Snapshot | null> {
  const [row] = await db
    .select()
    .from(portfolioSnapshotsTable)
    .where(eq(portfolioSnapshotsTable.portfolioId, portfolioId))
    .orderBy(desc(portfolioSnapshotsTable.lastEventId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    portfolioId: row.portfolioId,
    lastEventId: row.lastEventId,
    state: row.state as SnapshotState,
    createdAt: row.createdAt,
  };
}

export async function getEventsSince(portfolioId: number, afterEventId: number): Promise<TradingEvent[]> {
  const rows = await db
    .select()
    .from(strategyEventsTable)
    .where(and(
      eq(strategyEventsTable.portfolioId, portfolioId),
      gt(strategyEventsTable.id, afterEventId),
    ))
    .orderBy(asc(strategyEventsTable.id));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    portfolioId: r.portfolioId,
    eventType: r.eventType as TradingEvent["eventType"],
    payload: r.payload as TradingEvent["payload"],
    marketPrice: r.marketPrice,
    timestamp: r.timestamp,
    idempotencyKey: r.idempotencyKey,
  }));
}

export async function replayPortfolio(portfolioId: number): Promise<ReplayResult> {
  const snapshot = await getLatestSnapshot(portfolioId);

  let state: PortfolioState;
  let afterEventId: number;

  if (snapshot) {
    state = {
      cashBalance: snapshot.state.cashBalance,
      positions: snapshot.state.positions.map((p) => ({ ...p })),
    };
    afterEventId = snapshot.lastEventId;
  } else {
    state = createEmptyState();
    afterEventId = 0;
  }

  const events = await getEventsSince(portfolioId, afterEventId);

  let lastEventId = afterEventId;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (i > 0 && event.id !== events[i - 1].id + 1) {
      logger.error(
        { portfolioId, expectedId: events[i - 1].id + 1, actualId: event.id },
        "EVENT STREAM GAP DETECTED — halting replay",
      );
      throw new Error(`Event stream corruption: gap between events ${events[i - 1].id} and ${event.id}`);
    }

    applyEvent(state, event);
    lastEventId = event.id;
  }

  return { state, lastEventId, eventCount: events.length };
}

export async function replayPortfolioAtTime(
  portfolioId: number,
  untilTimestamp: Date,
): Promise<ReplayResult> {
  const snapshot = await getLatestSnapshot(portfolioId);

  let state: PortfolioState;
  let afterEventId: number;

  if (snapshot && snapshot.createdAt <= untilTimestamp) {
    state = {
      cashBalance: snapshot.state.cashBalance,
      positions: snapshot.state.positions.map((p) => ({ ...p })),
    };
    afterEventId = snapshot.lastEventId;
  } else {
    state = createEmptyState();
    afterEventId = 0;
  }

  const rows = await db
    .select()
    .from(strategyEventsTable)
    .where(and(
      eq(strategyEventsTable.portfolioId, portfolioId),
      gt(strategyEventsTable.id, afterEventId),
      lte(strategyEventsTable.timestamp, untilTimestamp),
    ))
    .orderBy(asc(strategyEventsTable.id));

  const events: TradingEvent[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    portfolioId: r.portfolioId,
    eventType: r.eventType as TradingEvent["eventType"],
    payload: r.payload as TradingEvent["payload"],
    marketPrice: r.marketPrice,
    timestamp: r.timestamp,
    idempotencyKey: r.idempotencyKey,
  }));

  let lastEventId = afterEventId;
  for (const event of events) {
    applyEvent(state, event);
    lastEventId = event.id;
  }

  return { state, lastEventId, eventCount: events.length };
}

export { applyEvent };
