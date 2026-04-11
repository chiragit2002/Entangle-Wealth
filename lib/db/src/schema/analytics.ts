import { pgTable, serial, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  event: text("event").notNull(),
  properties: jsonb("properties"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_analytics_event").on(table.event),
  index("idx_analytics_created_at").on(table.createdAt),
  index("idx_analytics_user_id").on(table.userId),
]);

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;
