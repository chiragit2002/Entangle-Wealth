import { db } from "@workspace/db";
import { strategyEventsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger.js";
import { maybeCreateSnapshot } from "./snapshotEngine.js";
import type { EventType, EventPayload, TradingEvent } from "./types.js";

export interface EmitEventOptions {
  userId: string;
  portfolioId: number;
  eventType: EventType;
  payload: EventPayload;
  marketPrice?: number | null;
  idempotencyKey?: string | null;
  tx?: typeof db;
}

export async function emitEvent(opts: EmitEventOptions): Promise<TradingEvent> {
  const executor = opts.tx ?? db;

  if (opts.idempotencyKey) {
    const [existing] = await executor
      .select()
      .from(strategyEventsTable)
      .where(eq(strategyEventsTable.idempotencyKey, opts.idempotencyKey))
      .limit(1);

    if (existing) {
      logger.info({ idempotencyKey: opts.idempotencyKey }, "Duplicate idempotency key — returning existing event");
      return {
        id: existing.id,
        userId: existing.userId,
        portfolioId: existing.portfolioId,
        eventType: existing.eventType as EventType,
        payload: existing.payload as EventPayload,
        marketPrice: existing.marketPrice,
        timestamp: existing.timestamp,
        idempotencyKey: existing.idempotencyKey,
      };
    }
  }

  const [inserted] = await executor.insert(strategyEventsTable).values({
    userId: opts.userId,
    portfolioId: opts.portfolioId,
    eventType: opts.eventType,
    payload: opts.payload,
    marketPrice: opts.marketPrice ?? null,
    idempotencyKey: opts.idempotencyKey ?? null,
  }).returning();

  const event: TradingEvent = {
    id: inserted.id,
    userId: inserted.userId,
    portfolioId: inserted.portfolioId,
    eventType: inserted.eventType as EventType,
    payload: inserted.payload as EventPayload,
    marketPrice: inserted.marketPrice,
    timestamp: inserted.timestamp,
    idempotencyKey: inserted.idempotencyKey,
  };

  if (!opts.tx) {
    setImmediate(() => maybeCreateSnapshot(opts.portfolioId));
  }

  return event;
}

export async function emitTradeEvents(
  tx: typeof db,
  userId: string,
  portfolioId: number,
  ticker: string,
  side: string,
  quantity: number,
  executionPrice: number,
  orderId: number | undefined,
  idempotencyKey: string,
): Promise<TradingEvent[]> {
  const events: TradingEvent[] = [];
  const totalCost = quantity * executionPrice;

  const orderPlaced = await emitEvent({
    tx,
    userId,
    portfolioId,
    eventType: "ORDER_PLACED",
    payload: { orderId, ticker, side, quantity, orderType: "market", executionPrice },
    marketPrice: executionPrice,
    idempotencyKey: `${idempotencyKey}_order_placed`,
  });
  events.push(orderPlaced);

  if (side === "buy") {
    events.push(await emitEvent({
      tx, userId, portfolioId,
      eventType: "CASH_DEBITED",
      payload: { amount: totalCost, reason: `buy_${ticker}_${quantity}` },
      marketPrice: executionPrice,
      idempotencyKey: `${idempotencyKey}_cash_debit`,
    }));
  } else if (side === "sell") {
    events.push(await emitEvent({
      tx, userId, portfolioId,
      eventType: "CASH_CREDITED",
      payload: { amount: totalCost, reason: `sell_${ticker}_${quantity}` },
      marketPrice: executionPrice,
      idempotencyKey: `${idempotencyKey}_cash_credit`,
    }));
  } else if (side === "short_sell") {
    events.push(await emitEvent({
      tx, userId, portfolioId,
      eventType: "CASH_CREDITED",
      payload: { amount: totalCost, reason: `short_sell_${ticker}_${quantity}` },
      marketPrice: executionPrice,
      idempotencyKey: `${idempotencyKey}_cash_credit`,
    }));
  } else if (side === "short_cover") {
    events.push(await emitEvent({
      tx, userId, portfolioId,
      eventType: "CASH_DEBITED",
      payload: { amount: totalCost, reason: `short_cover_${ticker}_${quantity}` },
      marketPrice: executionPrice,
      idempotencyKey: `${idempotencyKey}_cash_debit`,
    }));
  }

  const orderFilled = await emitEvent({
    tx, userId, portfolioId,
    eventType: "ORDER_FILLED",
    payload: { orderId, ticker, side, quantity, executionPrice },
    marketPrice: executionPrice,
    idempotencyKey: `${idempotencyKey}_order_filled`,
  });
  events.push(orderFilled);

  return events;
}
