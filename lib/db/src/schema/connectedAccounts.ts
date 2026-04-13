import { pgTable, text, timestamp, jsonb, serial } from "drizzle-orm/pg-core";

export const connectedAccountsTable = pgTable("connected_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id"),
  providerEmail: text("provider_email"),
  status: text("status").notNull().default("pending"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: text("scopes"),
  metadata: jsonb("metadata").default({}),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
});

export type ConnectedAccount = typeof connectedAccountsTable.$inferSelect;
export type InsertConnectedAccount = typeof connectedAccountsTable.$inferInsert;
