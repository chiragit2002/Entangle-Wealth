import { logger } from "../logger";
import type { OrchestratorResult } from "./Orchestrator";

export interface ArbiteredDecision {
  rank: number;
  strategyId: string;
  symbol: string;
  timeframe: string;
  action: string;
  compositeScore: number;
  score: number;
  confidence: number;
  killSwitchTriggered: boolean;
  regime: string;
  liquidityTier: string;
  volatilityRegime: string;
  ensembleConsensus: string;
  driftRecommendation: string;
  positionSizePct: number | null;
  rationale: string;
}

export interface ArbiterOutput {
  topStrategies: ArbiteredDecision[];
  totalEvaluated: number;
  filteredByKillSwitch: number;
  generatedAt: string;
}

export class FinalArbiter {
  private readonly topN: number;

  constructor(topN = 10) {
    this.topN = topN;
  }

  arbitrate(results: OrchestratorResult[]): ArbiterOutput {
    const start = Date.now();

    const filteredByKillSwitch = results.filter(r => r.killSwitch.triggered).length;

    const scored = results.map(r => {
      const score = r.decision.score;
      const confidence = r.decision.confidence;
      const compositeScore = score * (confidence / 100);

      return {
        rank: 0,
        strategyId: r.strategyId,
        symbol: r.symbol,
        timeframe: r.timeframe,
        action: r.decision.action,
        compositeScore: Math.round(compositeScore * 100) / 100,
        score: Math.round(score * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        killSwitchTriggered: r.killSwitch.triggered,
        regime: r.marketContext.regime.regime,
        liquidityTier: r.marketContext.liquidity.liquidityTier,
        volatilityRegime: r.marketContext.volatility.regime,
        ensembleConsensus: r.ensembleConsensus,
        driftRecommendation: r.driftRecommendation,
        positionSizePct: r.allocation?.positionSizePct ?? null,
        rationale: r.decision.rationale,
      };
    });

    const ranked = scored
      .sort((a, b) => {
        if (a.killSwitchTriggered !== b.killSwitchTriggered) {
          return a.killSwitchTriggered ? 1 : -1;
        }
        return b.compositeScore - a.compositeScore;
      })
      .slice(0, this.topN)
      .map((d, i) => ({ ...d, rank: i + 1 }));

    logger.info({
      totalEvaluated: results.length,
      ranked: ranked.length,
      filteredByKillSwitch,
      elapsedMs: Date.now() - start,
    }, "[FinalArbiter] Arbitration complete");

    return {
      topStrategies: ranked,
      totalEvaluated: results.length,
      filteredByKillSwitch,
      generatedAt: new Date().toISOString(),
    };
  }
}
