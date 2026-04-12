import { pgTable, serial, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const microFeedbackTable = pgTable("micro_feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  context: text("context").notNull(),
  helpful: boolean("helpful").notNull(),
  comment: text("comment"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_micro_feedback_context").on(table.context),
  index("idx_micro_feedback_user_id").on(table.userId),
  index("idx_micro_feedback_created_at").on(table.createdAt),
]);

export type MicroFeedback = typeof microFeedbackTable.$inferSelect;
export type InsertMicroFeedback = typeof microFeedbackTable.$inferInsert;
