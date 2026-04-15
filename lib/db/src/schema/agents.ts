import { pgTable, serial, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

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

export type AgentLog = typeof agentLogsTable.$inferSelect;
export type InsertAgentLog = typeof agentLogsTable.$inferInsert;
export type AgentEvent = typeof agentEventsTable.$inferSelect;
export type InsertAgentEvent = typeof agentEventsTable.$inferInsert;
