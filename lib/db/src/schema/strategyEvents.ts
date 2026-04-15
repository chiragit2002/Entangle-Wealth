import { pgTable, serial, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { customStrategiesTable } from "./customStrategies";

export const strategyEventsTable = pgTable("strategy_events", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => customStrategiesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_strategy_events_strategy_id").on(table.strategyId),
  index("idx_strategy_events_type").on(table.eventType),
  index("idx_strategy_events_strategy_ts").on(table.strategyId, table.timestamp),
]);

export type StrategyEvent = typeof strategyEventsTable.$inferSelect;
export type InsertStrategyEvent = typeof strategyEventsTable.$inferInsert;

export const strategySnapshotsTable = pgTable("strategy_snapshots", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => customStrategiesTable.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  state: jsonb("state").notNull().default({}),
  lastEventId: integer("last_event_id").references(() => strategyEventsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_strategy_snapshots_strategy_id").on(table.strategyId),
  index("idx_strategy_snapshots_strategy_version").on(table.strategyId, table.version),
  index("idx_strategy_snapshots_last_event").on(table.lastEventId),
]);

export type StrategySnapshot = typeof strategySnapshotsTable.$inferSelect;
export type InsertStrategySnapshot = typeof strategySnapshotsTable.$inferInsert;
