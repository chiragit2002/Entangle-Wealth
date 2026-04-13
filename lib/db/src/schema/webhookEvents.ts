import { pgTable, text, timestamp, serial } from "drizzle-orm/pg-core";

export const webhookEventsTable = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  userId: text("user_id"),
  tierBefore: text("tier_before"),
  tierAfter: text("tier_after"),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type WebhookEvent = typeof webhookEventsTable.$inferSelect;
export type InsertWebhookEvent = typeof webhookEventsTable.$inferInsert;
