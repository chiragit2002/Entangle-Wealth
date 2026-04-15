import { pgTable, serial, text, timestamp, real, integer, jsonb, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { customStrategiesTable } from "./customStrategies";

export const strategyVersionsTable = pgTable("strategy_versions", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => customStrategiesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  versionHash: text("version_hash").notNull(),
  origin: text("origin").notNull().default("manual"),
  parentVersion: text("parent_version"),
  parameters: jsonb("parameters").notNull().default({}),
  scoreTotal: real("score_total"),
  confidence: real("confidence"),
  scoresJson: jsonb("scores_json"),
  changesJson: jsonb("changes_json"),
  stressDelta: jsonb("stress_delta"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_strategy_versions_strategy_id").on(table.strategyId),
  index("idx_strategy_versions_user_id").on(table.userId),
  index("idx_strategy_versions_version").on(table.strategyId, table.version),
  unique("uq_strategy_versions_strategy_version").on(table.strategyId, table.version),
]);

export type StrategyVersion = typeof strategyVersionsTable.$inferSelect;
export type InsertStrategyVersion = typeof strategyVersionsTable.$inferInsert;
