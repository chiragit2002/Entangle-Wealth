import { pgTable, serial, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  pageUrl: text("page_url").notNull(),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull().default("LOW"),
  screenshotUrl: text("screenshot_url"),
  componentName: text("component_name"),
  errorMessage: text("error_message"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_audit_log_issue_type").on(table.issueType),
  index("idx_audit_log_severity").on(table.severity),
  index("idx_audit_log_timestamp").on(table.timestamp),
  index("idx_audit_log_page_url").on(table.pageUrl),
]);

export const uxSignalsTable = pgTable("ux_signals", {
  id: serial("id").primaryKey(),
  pageUrl: text("page_url").notNull(),
  signalType: text("signal_type").notNull(),
  elementSelector: text("element_selector"),
  metadata: jsonb("metadata"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_ux_signals_signal_type").on(table.signalType),
  index("idx_ux_signals_page_url").on(table.pageUrl),
  index("idx_ux_signals_timestamp").on(table.timestamp),
]);

export const apiHealthChecksTable = pgTable("api_health_checks", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  responseTimeMs: integer("response_time_ms"),
  statusCode: integer("status_code"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_api_health_endpoint").on(table.endpoint),
  index("idx_api_health_timestamp").on(table.timestamp),
]);

export type AuditLog = typeof auditLogTable.$inferSelect;
export type InsertAuditLog = typeof auditLogTable.$inferInsert;
export type UxSignal = typeof uxSignalsTable.$inferSelect;
export type InsertUxSignal = typeof uxSignalsTable.$inferInsert;
export type ApiHealthCheck = typeof apiHealthChecksTable.$inferSelect;
export type InsertApiHealthCheck = typeof apiHealthChecksTable.$inferInsert;
