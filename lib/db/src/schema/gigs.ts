import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const gigsTable = pgTable("gigs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  category: text("category").notNull(),
  contactName: text("contact_name"),
  rating: text("rating").default("5.0"),
  completedJobs: integer("completed_jobs").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Gig = typeof gigsTable.$inferSelect;
export type InsertGig = typeof gigsTable.$inferInsert;
