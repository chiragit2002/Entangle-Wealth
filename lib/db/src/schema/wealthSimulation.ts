import { pgTable, text, timestamp, real, integer, serial, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const wealthProfilesTable = pgTable("wealth_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  annualIncome: real("annual_income").notNull().default(60000),
  monthlyExpenses: real("monthly_expenses").notNull().default(3000),
  savingsRate: real("savings_rate").notNull().default(10),
  currentSavings: real("current_savings").notNull().default(0),
  monthlyInvestment: real("monthly_investment").notNull().default(500),
  expectedReturnRate: real("expected_return_rate").notNull().default(7),
  inflationRate: real("inflation_rate").notNull().default(3),
  timeHorizonYears: integer("time_horizon_years").notNull().default(30),
  riskTolerance: text("risk_tolerance").notNull().default("moderate"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const wealthSnapshotsTable = pgTable("wealth_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  snapshotLabel: text("snapshot_label").notNull().default("Default"),
  savingsRate: real("savings_rate").notNull(),
  monthlyInvestment: real("monthly_investment").notNull(),
  expectedReturnRate: real("expected_return_rate").notNull(),
  timeHorizonYears: integer("time_horizon_years").notNull(),
  projectedNetWorth: real("projected_net_worth").notNull(),
  projectionData: jsonb("projection_data").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const wealthMilestoneAchievementsTable = pgTable("wealth_milestone_achievements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  milestoneThreshold: integer("milestone_threshold").notNull(),
  milestoneKey: text("milestone_key").notNull(),
  projectedYear: integer("projected_year"),
  celebrated: boolean("celebrated").notNull().default(false),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("wealth_milestone_user_key_unique").on(table.userId, table.milestoneKey),
]);

export const simulationRunsTable = pgTable("simulation_runs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  isFirstRun: boolean("is_first_run").notNull().default(false),
  xpAwarded: boolean("xp_awarded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type WealthProfile = typeof wealthProfilesTable.$inferSelect;
export type InsertWealthProfile = typeof wealthProfilesTable.$inferInsert;
export type WealthSnapshot = typeof wealthSnapshotsTable.$inferSelect;
export type InsertWealthSnapshot = typeof wealthSnapshotsTable.$inferInsert;
export type WealthMilestoneAchievement = typeof wealthMilestoneAchievementsTable.$inferSelect;
export type SimulationRun = typeof simulationRunsTable.$inferSelect;
