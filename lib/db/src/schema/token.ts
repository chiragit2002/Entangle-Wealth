import { pgTable, text, timestamp, integer, serial, real, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const tokenTransactionsTable = pgTable("token_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  txHash: text("tx_hash"),
  fromAddress: text("from_address"),
  toAddress: text("to_address"),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const rewardDistributionsTable = pgTable("reward_distributions", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  tokensAwarded: real("tokens_awarded").notNull(),
  portfolioGain: real("portfolio_gain").notNull().default(0),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("reward_dist_month_user").on(table.month, table.userId),
]);

export const travelBookingsTable = pgTable("travel_bookings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  destination: text("destination"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  tokenAmount: real("token_amount").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull().default("confirmed"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tokenConfigTable = pgTable("token_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
