import { pgTable, text, timestamp, real, serial, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const balanceTransactionsTable = pgTable("balance_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  transactionType: text("transaction_type").notNull(),
  amount: real("amount").notNull(),
  balanceBefore: real("balance_before").notNull(),
  balanceAfter: real("balance_after").notNull(),
  source: text("source").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_balance_transactions_user_id").on(table.userId),
  index("idx_balance_transactions_created_at").on(table.createdAt),
]);

export type BalanceTransaction = typeof balanceTransactionsTable.$inferSelect;
export type InsertBalanceTransaction = typeof balanceTransactionsTable.$inferInsert;
