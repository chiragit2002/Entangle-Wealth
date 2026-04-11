import { pgTable, text, timestamp, real, integer, serial, jsonb, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const timelinesTable = pgTable("timelines", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("My Timeline"),
  annotation: text("annotation"),
  monthlyIncome: real("monthly_income").notNull().default(5000),
  savingsRate: real("savings_rate").notNull().default(0.15),
  monthlyDebt: real("monthly_debt").notNull().default(500),
  investmentRate: real("investment_rate").notNull().default(0.07),
  currentNetWorth: real("current_net_worth").notNull().default(0),
  emergencyFundMonths: real("emergency_fund_months").notNull().default(0),
  isBaseline: boolean("is_baseline").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const timelineResultsTable = pgTable("timeline_results", {
  id: serial("id").primaryKey(),
  timelineId: integer("timeline_id").notNull().references(() => timelinesTable.id, { onDelete: "cascade" }),
  horizon: text("horizon").notNull(),
  projectedNetWorth: real("projected_net_worth").notNull(),
  savingsAccumulated: real("savings_accumulated").notNull(),
  debtRemaining: real("debt_remaining").notNull(),
  investmentValue: real("investment_value").notNull(),
  stabilityScore: real("stability_score").notNull(),
  stressIndex: real("stress_index").notNull(),
  opportunityScore: real("opportunity_score").notNull(),
  milestones: jsonb("milestones").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const timelineComparisonsTable = pgTable("timeline_comparisons", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  timelineAId: integer("timeline_a_id").notNull().references(() => timelinesTable.id, { onDelete: "cascade" }),
  timelineBId: integer("timeline_b_id").notNull().references(() => timelinesTable.id, { onDelete: "cascade" }),
  deltaNetWorth5yr: real("delta_net_worth_5yr"),
  deltaNetWorth10yr: real("delta_net_worth_10yr"),
  deltaNetWorth20yr: real("delta_net_worth_20yr"),
  deltaStress: real("delta_stress"),
  deltaOpportunity: real("delta_opportunity"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userIdentityStagesTable = pgTable("user_identity_stages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  stage: text("stage").notNull().default("Aware"),
  simulationsRun: integer("simulations_run").notNull().default(0),
  snapshotsSaved: integer("snapshots_saved").notNull().default(0),
  scenariosExplored: integer("scenarios_explored").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Timeline = typeof timelinesTable.$inferSelect;
export type InsertTimeline = typeof timelinesTable.$inferInsert;
export type TimelineResult = typeof timelineResultsTable.$inferSelect;
export type TimelineComparison = typeof timelineComparisonsTable.$inferSelect;
export type UserIdentityStage = typeof userIdentityStagesTable.$inferSelect;
