import { pgTable, text, timestamp, real, integer, serial, index, jsonb } from "drizzle-orm/pg-core";

export const quantEvaluationRunsTable = pgTable("quant_evaluation_runs", {
  id: serial("id").primaryKey(),
  strategyId: text("strategy_id").notNull().unique(),
  symbol: text("symbol").notNull(),
  action: text("action").notNull(),
  price: real("price").notNull(),
  sector: text("sector").notNull().default("Unknown"),
  scoreTotal: real("score_total").notNull(),
  confidence: real("confidence").notNull(),
  stressPenalty: real("stress_penalty").notNull().default(0),
  stressResilienceScore: real("stress_resilience_score"),
  refinementImproved: integer("refinement_improved").notNull().default(0),
  refinementIterations: integer("refinement_iterations").notNull().default(0),
  rank: integer("rank"),
  pipelineVersion: text("pipeline_version").notNull().default("1.0.0"),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_quant_eval_symbol").on(table.symbol),
  index("idx_quant_eval_score_total").on(table.scoreTotal),
  index("idx_quant_eval_rank").on(table.rank),
  index("idx_quant_eval_evaluated_at").on(table.evaluatedAt),
]);

export const quantModelScoresTable = pgTable("quant_model_scores", {
  id: serial("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  modelId: text("model_id").notNull(),
  modelName: text("model_name").notNull(),
  score: real("score").notNull(),
  confidence: real("confidence").notNull(),
  details: jsonb("details"),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_quant_model_scores_strategy_id").on(table.strategyId),
  index("idx_quant_model_scores_model_id").on(table.modelId),
]);

export const quantStressResultsTable = pgTable("quant_stress_results", {
  id: serial("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  scenarioId: text("scenario_id").notNull(),
  scenarioName: text("scenario_name").notNull(),
  description: text("description"),
  impactScore: real("impact_score").notNull(),
  survived: integer("survived").notNull().default(0),
  penalty: real("penalty").notNull(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_quant_stress_strategy_id").on(table.strategyId),
  index("idx_quant_stress_scenario_id").on(table.scenarioId),
]);

export const quantRefinementHistoryTable = pgTable("quant_refinement_history", {
  id: serial("id").primaryKey(),
  strategyId: text("strategy_id").notNull(),
  iteration: integer("iteration").notNull(),
  adjustments: jsonb("adjustments"),
  scoresBefore: jsonb("scores_before"),
  scoresAfter: jsonb("scores_after"),
  compositeBefore: real("composite_before").notNull(),
  compositeAfter: real("composite_after").notNull(),
  improved: integer("improved").notNull().default(0),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_quant_refinement_strategy_id").on(table.strategyId),
]);

export type QuantEvaluationRun = typeof quantEvaluationRunsTable.$inferSelect;
export type InsertQuantEvaluationRun = typeof quantEvaluationRunsTable.$inferInsert;
export type QuantModelScore = typeof quantModelScoresTable.$inferSelect;
export type InsertQuantModelScore = typeof quantModelScoresTable.$inferInsert;
export type QuantStressResult = typeof quantStressResultsTable.$inferSelect;
export type InsertQuantStressResult = typeof quantStressResultsTable.$inferInsert;
export type QuantRefinementHistory = typeof quantRefinementHistoryTable.$inferSelect;
export type InsertQuantRefinementHistory = typeof quantRefinementHistoryTable.$inferInsert;
