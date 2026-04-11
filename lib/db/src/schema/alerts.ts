import { pgTable, text, timestamp, boolean, real, integer, serial } from "drizzle-orm/pg-core";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  alertType: text("alert_type").notNull(),
  threshold: real("threshold"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const alertHistoryTable = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  alertId: integer("alert_id"),
  symbol: text("symbol").notNull(),
  alertType: text("alert_type").notNull(),
  triggeredValue: real("triggered_value"),
  message: text("message"),
  read: boolean("read").default(false),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
});

export type Alert = typeof alertsTable.$inferSelect;
export type InsertAlert = typeof alertsTable.$inferInsert;
export type AlertHistory = typeof alertHistoryTable.$inferSelect;
export type InsertAlertHistory = typeof alertHistoryTable.$inferInsert;
