import { pgTable, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const gigsTable = pgTable("gigs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  category: text("category").notNull(),
  contactName: text("contact_name"),
  rating: text("rating"),
  completedJobs: integer("completed_jobs").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_gigs_user_id").on(table.userId),
]);

export type Gig = typeof gigsTable.$inferSelect;
export type InsertGig = typeof gigsTable.$inferInsert;
