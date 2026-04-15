import { pgTable, serial, text, timestamp, integer, jsonb, index, real, uniqueIndex } from "drizzle-orm/pg-core";

export const agentLogsTable = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  action: text("action").notNull(),
  status: text("status").notNull().default("info"),
  message: text("message"),
  metadata: jsonb("metadata"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_agent_logs_agent_name").on(table.agentName),
  index("idx_agent_logs_status").on(table.status),
  index("idx_agent_logs_created_at").on(table.createdAt),
]);

export const agentEventsTable = pgTable("agent_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  sourceAgent: text("source_agent").notNull(),
  payload: jsonb("payload"),
  processedBy: jsonb("processed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_agent_events_event_type").on(table.eventType),
  index("idx_agent_events_source_agent").on(table.sourceAgent),
  index("idx_agent_events_created_at").on(table.createdAt),
]);

export const strategyRegimeInsightsTable = pgTable("strategy_regime_insights", {
  id: serial("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  regime: text("regime").notNull(),
  avgPnl: real("avg_pnl").notNull().default(0),
  totalPnl: real("total_pnl").notNull().default(0),
  samples: integer("samples").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  avgWinPnl: real("avg_win_pnl").default(0),
  avgLossPnl: real("avg_loss_pnl").default(0),
  maxDrawdown: real("max_drawdown").default(0),
  bestPnl: real("best_pnl").default(0),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex("idx_strategy_regime_unique").on(table.strategyId, table.regime),
  index("idx_strategy_regime_insights_regime").on(table.regime),
  index("idx_strategy_regime_insights_avg_pnl").on(table.avgPnl),
]);

export type AgentLog = typeof agentLogsTable.$inferSelect;
export type InsertAgentLog = typeof agentLogsTable.$inferInsert;
export type AgentEvent = typeof agentEventsTable.$inferSelect;
export type InsertAgentEvent = typeof agentEventsTable.$inferInsert;
export type StrategyRegimeInsight = typeof strategyRegimeInsightsTable.$inferSelect;
export type InsertStrategyRegimeInsight = typeof strategyRegimeInsightsTable.$inferInsert;
