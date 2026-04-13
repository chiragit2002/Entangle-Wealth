import { pgTable, serial, text, timestamp, integer, jsonb, index, boolean, real } from "drizzle-orm/pg-core";

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

export const visualBaselinesTable = pgTable("visual_baselines", {
  id: serial("id").primaryKey(),
  pageUrl: text("page_url").notNull(),
  viewport: text("viewport").notNull().default("desktop"),
  screenshotPath: text("screenshot_path").notNull(),
  baselinePath: text("baseline_path"),
  diffPath: text("diff_path"),
  diffPercent: real("diff_percent").default(0),
  isRegression: boolean("is_regression").default(false),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  isCurrent: boolean("is_current").default(true),
  crawlRunId: integer("crawl_run_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_visual_baselines_page_url").on(table.pageUrl),
  index("idx_visual_baselines_is_current").on(table.isCurrent),
  index("idx_visual_baselines_is_regression").on(table.isRegression),
]);

export const crawlRunsTable = pgTable("crawl_runs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  totalPages: integer("total_pages").default(0),
  totalIssues: integer("total_issues").default(0),
  totalRegressions: integer("total_regressions").default(0),
  triggeredBy: text("triggered_by").default("api"),
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_crawl_runs_status").on(table.status),
  index("idx_crawl_runs_started_at").on(table.startedAt),
]);

export type AuditLog = typeof auditLogTable.$inferSelect;
export type InsertAuditLog = typeof auditLogTable.$inferInsert;
export type UxSignal = typeof uxSignalsTable.$inferSelect;
export type InsertUxSignal = typeof uxSignalsTable.$inferInsert;
export type ApiHealthCheck = typeof apiHealthChecksTable.$inferSelect;
export type InsertApiHealthCheck = typeof apiHealthChecksTable.$inferInsert;
export type VisualBaseline = typeof visualBaselinesTable.$inferSelect;
export type InsertVisualBaseline = typeof visualBaselinesTable.$inferInsert;
export type CrawlRun = typeof crawlRunsTable.$inferSelect;
export type InsertCrawlRun = typeof crawlRunsTable.$inferInsert;
