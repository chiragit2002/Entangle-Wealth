import { logger } from "../logger";
import { ingestBatch } from "./ingest";
import { runAllModels } from "./models";
import { runStressEngine } from "./stressEngine";
import { runRefinementLoop, computeComposite, extractModelScores } from "./refinement";
import { buildEvaluatedStrategy, rankStrategies } from "./ranking";
import type { RawStrategy, EvaluatedStrategy } from "./types";
import { REFINEMENT_FLOOR, REFINEMENT_CEILING } from "./types";

export interface PipelineResult {
  total_evaluated: number;
  top_100: EvaluatedStrategy[];
  pipeline_version: string;
  ran_at: string;
}

export async function runEvaluationPipeline(rawStrategies: RawStrategy[]): Promise<PipelineResult> {
  const startMs = Date.now();
  logger.info({ count: rawStrategies.length }, "[Pipeline] Starting evaluation pipeline");

  const normalized = ingestBatch(rawStrategies);
  logger.info({ valid: normalized.length }, "[Pipeline] Ingestion complete");

  const evaluated: EvaluatedStrategy[] = [];

  await Promise.all(
    normalized.map(async (strategy) => {
      try {
        const modelDetails = await runAllModels(strategy);
        const modelScores = extractModelScores(modelDetails);
        const composite = computeComposite(modelScores);

        const stressResult = runStressEngine(strategy);

        let refinementResult = null;
        if (composite >= REFINEMENT_FLOOR && composite <= REFINEMENT_CEILING) {
          refinementResult = await runRefinementLoop(strategy, modelScores, composite);
        }

        const result = buildEvaluatedStrategy(strategy, modelDetails, stressResult, refinementResult);
        evaluated.push(result);
      } catch (err) {
        logger.warn({ err, symbol: strategy.symbol }, "[Pipeline] Failed to evaluate strategy");
      }
    }),
  );

  const ranked = rankStrategies(evaluated);
  const elapsed = Date.now() - startMs;

  logger.info({ evaluated: evaluated.length, top_100: ranked.length, elapsed_ms: elapsed }, "[Pipeline] Evaluation complete");

  return {
    total_evaluated: evaluated.length,
    top_100: ranked,
    pipeline_version: "1.0.0",
    ran_at: new Date().toISOString(),
  };
}
