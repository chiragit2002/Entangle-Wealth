import { pgTable, serial, text, timestamp, real, integer, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { customStrategiesTable } from "./customStrategies";

export const strategyEvaluationsTable = pgTable("strategy_evaluations", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  strategyId: integer("strategy_id").references(() => customStrategiesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  datasetRange: text("dataset_range").notNull().default("1y"),
  datasetResolution: text("dataset_resolution").notNull().default("1m"),
  runStress: boolean("run_stress").notNull().default(false),
  runRefinement: boolean("run_refinement").notNull().default(false),
  scoreTotal: real("score_total"),
  confidence: real("confidence"),
  scoresJson: jsonb("scores_json"),
  stressJson: jsonb("stress_json"),
  refinementsJson: jsonb("refinements_json"),
  summaryJson: jsonb("summary_json"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_strategy_evaluations_user_id").on(table.userId),
  index("idx_strategy_evaluations_strategy_id").on(table.strategyId),
  index("idx_strategy_evaluations_job_id").on(table.jobId),
  index("idx_strategy_evaluations_status").on(table.status),
]);

export type StrategyEvaluation = typeof strategyEvaluationsTable.$inferSelect;
export type InsertStrategyEvaluation = typeof strategyEvaluationsTable.$inferInsert;
