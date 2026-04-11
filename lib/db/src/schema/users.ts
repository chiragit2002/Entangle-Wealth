import { pgTable, text, timestamp, boolean, real } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  photoUrl: text("photo_url"),
  headline: text("headline"),
  bio: text("bio"),
  phone: text("phone"),
  location: text("location"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionTier: text("subscription_tier").default("free"),
  kycStatus: text("kyc_status").default("not_started"),
  kycSubmittedAt: timestamp("kyc_submitted_at", { withTimezone: true }),
  kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
  isPublicProfile: boolean("is_public_profile").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  walletAddress: text("wallet_address"),
  tokenBalance: real("token_balance").default(0),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
