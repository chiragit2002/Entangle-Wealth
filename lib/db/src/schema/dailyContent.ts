import { pgTable, serial, text, date, timestamp, index } from "drizzle-orm/pg-core";

export const dailyContentPostsTable = pgTable("daily_content_posts", {
  id: serial("id").primaryKey(),
  batchDate: date("batch_date").notNull(),
  platform: text("platform").notNull(),
  content: text("content").notNull(),
  theme: text("theme").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_daily_content_batch_date").on(table.batchDate),
  index("idx_daily_content_status").on(table.status),
]);

export type DailyContentPost = typeof dailyContentPostsTable.$inferSelect;
export type InsertDailyContentPost = typeof dailyContentPostsTable.$inferInsert;
