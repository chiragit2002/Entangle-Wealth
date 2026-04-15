import type { StrategyAction, StrategyResult } from "./strategyGenerator.js";

export interface SignalOpportunity {
  symbol: string;
  action: StrategyAction;
  confidence: number;
  expectedReturn: number;
  riskScore: number;
  winRate: number;
  maxDrawdown: number;
  score: number;
  strategyId: string;
  strategyName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface RawResult {
  symbol: string;
  strategyId: string;
  strategyName: string;
  result: StrategyResult;
}

const WEIGHTS = {
  expectedReturn: 0.30,
  winRate: 0.25,
  confidence: 0.20,
  maxDrawdown: 0.15,
  riskScore: 0.10,
};

export function scoreResult(result: StrategyResult): number {
  if (result.action === "HOLD") return 0;

  const returnScore = Math.min(100, Math.max(0, result.expectedReturn * 10 + 50));
  const winRateScore = Math.min(100, Math.max(0, result.winRate));
  const confidenceScore = Math.min(100, Math.max(0, result.confidence));
  const drawdownScore = Math.min(100, Math.max(0, 100 - result.maxDrawdown * 2));
  const riskScore = Math.min(100, Math.max(0, 100 - result.riskScore));

  return (
    returnScore * WEIGHTS.expectedReturn +
    winRateScore * WEIGHTS.winRate +
    confidenceScore * WEIGHTS.confidence +
    drawdownScore * WEIGHTS.maxDrawdown +
    riskScore * WEIGHTS.riskScore
  );
}

function getRiskLevel(riskScore: number): "LOW" | "MEDIUM" | "HIGH" {
  if (riskScore < 33) return "LOW";
  if (riskScore < 66) return "MEDIUM";
  return "HIGH";
}

export function rankOpportunities(
  rawResults: RawResult[],
  maxPerSymbol: number = 3,
  topN: number = 100,
): SignalOpportunity[] {
  const scored = rawResults
    .filter(r => r.result.action !== "HOLD")
    .map(r => ({
      symbol: r.symbol,
      action: r.result.action,
      confidence: +r.result.confidence.toFixed(1),
      expectedReturn: +r.result.expectedReturn.toFixed(2),
      riskScore: +r.result.riskScore.toFixed(1),
      winRate: +r.result.winRate.toFixed(1),
      maxDrawdown: +r.result.maxDrawdown.toFixed(1),
      score: +scoreResult(r.result).toFixed(2),
      strategyId: r.strategyId,
      strategyName: r.strategyName,
      riskLevel: getRiskLevel(r.result.riskScore),
    } as SignalOpportunity))
    .sort((a, b) => b.score - a.score);

  const symbolCount: Record<string, number> = {};
  const deduplicated: SignalOpportunity[] = [];

  for (const item of scored) {
    const count = symbolCount[item.symbol] ?? 0;
    if (count < maxPerSymbol) {
      deduplicated.push(item);
      symbolCount[item.symbol] = count + 1;
    }
    if (deduplicated.length >= topN) break;
  }

  return deduplicated.slice(0, topN);
}
