import type { NormalizedStrategy, RefinementResult, RefinementIteration, ModelScores } from "./types";
import { REFINEMENT_FLOOR, REFINEMENT_CEILING, MAX_REFINEMENT_ITERATIONS, MODEL_WEIGHTS } from "./types";
import { runAllModels } from "./models";

function computeComposite(scores: ModelScores): number {
  let total = 0;
  for (const [key, weight] of Object.entries(MODEL_WEIGHTS)) {
    total += (scores[key as keyof ModelScores] ?? 0) * weight;
  }
  return +total.toFixed(2);
}

function extractModelScores(modelDetails: Awaited<ReturnType<typeof runAllModels>>): ModelScores {
  const scores: Partial<ModelScores> = {};
  for (const m of modelDetails) {
    scores[m.modelId] = m.score;
  }
  return scores as ModelScores;
}

function adjustStrategyParams(strategy: NormalizedStrategy, iteration: number): { adjusted: NormalizedStrategy; adjustments: Record<string, unknown> } {
  const adjusted = { ...strategy };
  const adjustments: Record<string, unknown> = {};

  if (iteration === 1) {
    const rsiAdjust = strategy.action === "buy" ? -3 : 3;
    adjusted.rsi = Math.max(1, Math.min(99, strategy.rsi + rsiAdjust));
    adjusted.bollingerLower = strategy.bollingerLower * 0.99;
    adjusted.bollingerUpper = strategy.bollingerUpper * 1.01;
    adjustments.rsiDelta = rsiAdjust;
    adjustments.bollingerWidened = true;
    adjustments.description = "Tighten RSI threshold, widen Bollinger bands";
  } else if (iteration === 2) {
    const macdBoost = strategy.action === "buy" ? Math.abs(strategy.macd) * 0.1 : -Math.abs(strategy.macd) * 0.1;
    adjusted.macd = strategy.macd + macdBoost;
    adjusted.volume = strategy.volume * 1.05;
    adjustments.macdDelta = macdBoost;
    adjustments.volumeBoost = "5%";
    adjustments.description = "Adjust MACD sensitivity, require higher volume";
  } else if (iteration === 3) {
    const avgPrice = strategy.priceHistory.reduce((a, b) => a + b, 0) / (strategy.priceHistory.length || 1);
    const smoothed = strategy.priceHistory.map((p) => (p + avgPrice) / 2);
    adjusted.priceHistory = smoothed;
    adjustments.priceSmoothingApplied = true;
    adjustments.description = "Smooth price history to reduce noise sensitivity";
  }

  return { adjusted, adjustments };
}

export async function runRefinementLoop(
  strategy: NormalizedStrategy,
  initialScores: ModelScores,
  initialComposite: number,
): Promise<RefinementResult | null> {
  if (initialComposite < REFINEMENT_FLOOR || initialComposite > REFINEMENT_CEILING) {
    return null;
  }

  const iterations: RefinementIteration[] = [];
  let current = strategy;
  let currentScores = initialScores;
  let currentComposite = initialComposite;
  let improved = false;

  for (let i = 1; i <= MAX_REFINEMENT_ITERATIONS; i++) {
    const { adjusted, adjustments } = adjustStrategyParams(current, i);
    const newModelDetails = await runAllModels(adjusted);
    const newScores = extractModelScores(newModelDetails);
    const newComposite = computeComposite(newScores);

    const iterImproved = newComposite > currentComposite;

    iterations.push({
      iteration: i,
      adjustments,
      scoresBefore: { ...currentScores },
      scoresAfter: { ...newScores },
      compositeBefore: currentComposite,
      compositeAfter: newComposite,
      improved: iterImproved,
    });

    if (iterImproved) {
      current = adjusted;
      currentScores = newScores;
      currentComposite = newComposite;
      improved = true;
    }
  }

  return {
    strategy_id: strategy.strategy_id,
    iterations,
    finalScore: currentComposite,
    totalIterations: iterations.length,
    improved,
  };
}

export { computeComposite, extractModelScores };
