import { pgTable, text, timestamp, integer, serial, index, jsonb } from "drizzle-orm/pg-core";

export const quantEngineRunsTable = pgTable("quant_engine_runs", {
  id: serial("id").primaryKey(),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  stocksScanned: integer("stocks_scanned").notNull().default(0),
  strategiesEvaluated: integer("strategies_evaluated").notNull().default(0),
  signalsGenerated: integer("signals_generated").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  runTimeMs: integer("run_time_ms").notNull().default(0),
  topSignals: jsonb("top_signals").$type<object[]>(),
  timeframesUsed: text("timeframes_used").array(),
  engineVersion: text("engine_version").notNull().default("2.0.0"),
}, (table) => [
  index("idx_qer_run_at").on(table.runAt),
  index("idx_qer_signals_generated").on(table.signalsGenerated),
]);

export type QuantEngineRun = typeof quantEngineRunsTable.$inferSelect;
export type InsertQuantEngineRun = typeof quantEngineRunsTable.$inferInsert;
