import { pgTable, text, timestamp, boolean, integer, serial, real } from "drizzle-orm/pg-core";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: text("referrer_id").notNull(),
  referredUserId: text("referred_user_id"),
  referralCode: text("referral_code").notNull().unique(),
  converted: boolean("converted").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
});

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  message: text("message").notNull(),
  rating: integer("rating").notNull(),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Referral = typeof referralsTable.$inferSelect;
export type InsertReferral = typeof referralsTable.$inferInsert;
export type Testimonial = typeof testimonialsTable.$inferSelect;
export type InsertTestimonial = typeof testimonialsTable.$inferInsert;
