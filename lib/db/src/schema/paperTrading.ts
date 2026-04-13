import { pgTable, text, timestamp, real, integer, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const virtualCashPurchasesTable = pgTable("virtual_cash_purchases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  amountPaidCents: integer("amount_paid_cents").notNull(),
  virtualAmountCredited: real("virtual_amount_credited").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_virtual_cash_purchases_user_id").on(table.userId),
]);

export const paperPortfoliosTable = pgTable("paper_portfolios", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  cashBalance: real("cash_balance").notNull().default(100000),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const paperTradesTable = pgTable("paper_trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
  totalCost: real("total_cost").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_paper_trades_user_id").on(table.userId),
]);

export const paperPositionsTable = pgTable("paper_positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  quantity: integer("quantity").notNull().default(0),
  avgCost: real("avg_cost").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_paper_positions_user_id").on(table.userId),
]);

export const paperOptionsTradesTable = pgTable("paper_options_trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  optionType: text("option_type").notNull(),
  strike: real("strike").notNull(),
  expiration: text("expiration").notNull(),
  side: text("side").notNull(),
  contracts: integer("contracts").notNull(),
  premium: real("premium").notNull(),
  totalCost: real("total_cost").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_paper_options_trades_user_id").on(table.userId),
]);

export const paperOptionsPositionsTable = pgTable("paper_options_positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  optionType: text("option_type").notNull(),
  strike: real("strike").notNull(),
  expiration: text("expiration").notNull(),
  contracts: integer("contracts").notNull().default(0),
  avgPremium: real("avg_premium").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_paper_options_positions_user_id").on(table.userId),
]);
