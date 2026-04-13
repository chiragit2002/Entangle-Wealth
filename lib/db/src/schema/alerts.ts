import { pgTable, text, timestamp, boolean, real, integer, serial, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  alertType: text("alert_type").notNull(),
  threshold: real("threshold"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_alerts_user_id").on(table.userId),
]);

export const alertHistoryTable = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  alertId: integer("alert_id"),
  symbol: text("symbol").notNull(),
  alertType: text("alert_type").notNull(),
  triggeredValue: real("triggered_value"),
  message: text("message"),
  read: boolean("read").default(false),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_alert_history_user_id").on(table.userId),
]);

export type Alert = typeof alertsTable.$inferSelect;
export type InsertAlert = typeof alertsTable.$inferInsert;
export type AlertHistory = typeof alertHistoryTable.$inferSelect;
export type InsertAlertHistory = typeof alertHistoryTable.$inferInsert;
