import { pgTable, serial, text, timestamp, integer, jsonb, real, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const strategyEventsTable = pgTable("strategy_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  portfolioId: integer("portfolio_id").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  marketPrice: real("market_price"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  idempotencyKey: text("idempotency_key"),
}, (table) => [
  index("idx_strategy_events_portfolio_event").on(table.portfolioId, table.id),
  index("idx_strategy_events_user_ts").on(table.userId, table.timestamp),
  index("idx_strategy_events_type").on(table.eventType),
  uniqueIndex("idx_strategy_events_idempotency").on(table.idempotencyKey),
]);

export type StrategyEvent = typeof strategyEventsTable.$inferSelect;
export type InsertStrategyEvent = typeof strategyEventsTable.$inferInsert;

export const portfolioSnapshotsTable = pgTable("portfolio_snapshots", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull(),
  lastEventId: integer("last_event_id").notNull(),
  state: jsonb("state").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_portfolio_snapshots_portfolio").on(table.portfolioId),
  index("idx_portfolio_snapshots_last_event").on(table.lastEventId),
]);

export type PortfolioSnapshot = typeof portfolioSnapshotsTable.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshotsTable.$inferInsert;
