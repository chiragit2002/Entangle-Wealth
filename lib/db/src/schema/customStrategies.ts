import { pgTable, text, timestamp, boolean, serial, integer, index, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const customStrategiesTable = pgTable("custom_strategies", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  type: text("type").notNull(),
  assets: jsonb("assets").notNull().default([]),
  timeframes: jsonb("timeframes").notNull().default([]),
  parameters: jsonb("parameters").notNull().default({}),
  logic: jsonb("logic").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  isActive: boolean("is_active").notNull().default(false),
  backtestResults: jsonb("backtest_results"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_custom_strategies_user_id").on(table.userId),
  index("idx_custom_strategies_is_active").on(table.isActive),
]);

export const strategyBacktestRunsTable = pgTable("strategy_backtest_runs", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").references(() => customStrategiesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  assets: jsonb("assets").notNull().default([]),
  timeframe: text("timeframe").notNull().default("1Day"),
  winRate: text("win_rate"),
  avgReturn: text("avg_return"),
  maxDrawdown: text("max_drawdown"),
  totalTrades: text("total_trades"),
  equityCurve: jsonb("equity_curve"),
  rawResults: jsonb("raw_results"),
  ranAt: timestamp("ran_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_strategy_backtest_runs_strategy_id").on(table.strategyId),
  index("idx_strategy_backtest_runs_user_id").on(table.userId),
]);
