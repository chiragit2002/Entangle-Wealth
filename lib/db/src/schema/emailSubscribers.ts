import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const emailSubscribersTable = pgTable("email_subscribers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  preference: text("preference").notNull().default("tips"),
  dripStage: integer("drip_stage").notNull().default(0),
  subscribed: boolean("subscribed").notNull().default(true),
  unsubscribeToken: text("unsubscribe_token").notNull(),
  converted: boolean("converted").notNull().default(false),
  nextSendAt: timestamp("next_send_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type EmailSubscriber = typeof emailSubscribersTable.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribersTable.$inferInsert;
