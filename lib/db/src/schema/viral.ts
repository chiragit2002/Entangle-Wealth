import { pgTable, text, timestamp, boolean, integer, serial, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: text("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  converted: boolean("converted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
}, (table) => [
  index("idx_referrals_referrer_id").on(table.referrerId),
]);

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  message: text("message").notNull(),
  rating: integer("rating").notNull(),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_testimonials_user_id").on(table.userId),
]);

export type Referral = typeof referralsTable.$inferSelect;
export type InsertReferral = typeof referralsTable.$inferInsert;
export type Testimonial = typeof testimonialsTable.$inferSelect;
export type InsertTestimonial = typeof testimonialsTable.$inferInsert;
