import { pgTable, serial, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

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

export const userFeedbackTable = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  category: text("category").notNull().default("general"),
  adminResponse: text("admin_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_user_feedback_user_id").on(table.userId),
  index("idx_user_feedback_created_at").on(table.createdAt),
]);

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;
export type UserFeedback = typeof userFeedbackTable.$inferSelect;
export type InsertUserFeedback = typeof userFeedbackTable.$inferInsert;
