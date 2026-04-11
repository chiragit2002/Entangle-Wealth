import { pgTable, text, timestamp, real, integer, serial } from "drizzle-orm/pg-core";

export const virtualCashPurchasesTable = pgTable("virtual_cash_purchases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  amountPaidCents: integer("amount_paid_cents").notNull(),
  virtualAmountCredited: real("virtual_amount_credited").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const paperPortfoliosTable = pgTable("paper_portfolios", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  cashBalance: real("cash_balance").notNull().default(100000),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const paperTradesTable = pgTable("paper_trades", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
  totalCost: real("total_cost").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const paperPositionsTable = pgTable("paper_positions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: integer("quantity").notNull().default(0),
  avgCost: real("avg_cost").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
