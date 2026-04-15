import type { NormalizedStrategy, ModelScore, ModelScores, EvaluatedStrategy, StressResult, RefinementResult } from "./types";
import { MODEL_WEIGHTS } from "./types";
import { computeComposite, extractModelScores } from "./refinement";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function computeOverallConfidence(modelDetails: ModelScore[]): number {
  if (modelDetails.length === 0) return 50;
  const weighted = modelDetails.reduce((acc, m) => {
    const weight = MODEL_WEIGHTS[m.modelId] ?? 1 / modelDetails.length;
    return acc + m.confidence * weight;
  }, 0);
  return clamp(+weighted.toFixed(1));
}

export function buildEvaluatedStrategy(
  strategy: NormalizedStrategy,
  modelDetails: ModelScore[],
  stressResult: StressResult | null,
  refinementResult: RefinementResult | null,
): EvaluatedStrategy {
  const modelScores = extractModelScores(modelDetails);
  let composite = computeComposite(modelScores);

  if (stressResult) {
    const penaltyFraction = stressResult.totalPenalty / 100;
    composite = clamp(composite * (1 - penaltyFraction * 0.3));
  }

  if (refinementResult?.improved) {
    const improvementBonus = Math.min((refinementResult.finalScore - composite) * 0.1, 5);
    composite = clamp(composite + improvementBonus);
  }

  const confidence = computeOverallConfidence(modelDetails);

  return {
    strategy_id: strategy.strategy_id,
    symbol: strategy.symbol,
    action: strategy.action,
    price: strategy.price,
    sector: strategy.sector,
    score_total: +composite.toFixed(2),
    scores: modelScores,
    confidence,
    modelDetails,
    stressResult,
    refinementResult,
    evaluatedAt: new Date().toISOString(),
  };
}

export function rankStrategies(strategies: EvaluatedStrategy[]): EvaluatedStrategy[] {
  const sorted = [...strategies].sort((a, b) => {
    if (Math.abs(b.score_total - a.score_total) > 0.5) return b.score_total - a.score_total;
    return b.confidence - a.confidence;
  });

  return sorted.slice(0, 100).map((s, i) => ({ ...s, rank: i + 1 }));
}
