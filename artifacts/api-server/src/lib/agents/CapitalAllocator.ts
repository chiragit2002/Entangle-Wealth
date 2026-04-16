import { logger } from "../logger";
import type { AllocationDecision } from "./AllocationAgent";

export interface PortfolioAllocation {
  strategyId: string;
  symbol: string;
  allocation: number;
  rawWeight: number;
  capped: boolean;
  tier: "core" | "satellite" | "speculative";
}

export interface CapitalAllocationResult {
  allocations: PortfolioAllocation[];
  totalExposure: number;
  activeCount: number;
  skippedCount: number;
}

interface StrategyCandidate {
  strategyId: string;
  symbol: string;
  score: number;
  confidence: number;
  decision: string;
  riskLevel?: string;
  drawdown?: number;
}

const DEFAULT_MAX_EXPOSURE = 1.0;
const DEFAULT_MAX_PER_STRATEGY = 0.40;
const DEFAULT_MIN_SCORE = 30;
const DEFAULT_MIN_CONFIDENCE = 20;

export class CapitalAllocator {
  private maxExposure: number;
  private maxPerStrategy: number;
  private minScore: number;
  private minConfidence: number;

  constructor(opts?: {
    maxExposure?: number;
    maxPerStrategy?: number;
    minScore?: number;
    minConfidence?: number;
  }) {
    this.maxExposure = opts?.maxExposure ?? DEFAULT_MAX_EXPOSURE;
    this.maxPerStrategy = opts?.maxPerStrategy ?? DEFAULT_MAX_PER_STRATEGY;
    this.minScore = opts?.minScore ?? DEFAULT_MIN_SCORE;
    this.minConfidence = opts?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  }

  allocate(strategies: StrategyCandidate[]): CapitalAllocationResult {
    const active = strategies.filter(
      s =>
        (s.decision === "EXECUTE" || s.decision === "BUY" || s.decision === "SELL") &&
        s.score >= this.minScore &&
        s.confidence >= this.minConfidence,
    );

    const skippedCount = strategies.length - active.length;

    if (active.length === 0) {
      return { allocations: [], totalExposure: 0, activeCount: 0, skippedCount };
    }

    const ranked = [...active].sort(
      (a, b) => b.score * b.confidence - a.score * a.confidence,
    );

    const totalWeight = ranked.reduce((sum, s) => sum + s.score * s.confidence, 0);

    const allocations: PortfolioAllocation[] = [];

    for (const strat of ranked) {
      const rawWeight = (strat.score * strat.confidence) / totalWeight;

      let tier: "core" | "satellite" | "speculative";
      let capForTier: number;

      if (strat.score >= 75 && strat.confidence >= 70) {
        tier = "core";
        capForTier = this.maxPerStrategy;
      } else if (strat.score >= 50 && strat.confidence >= 40) {
        tier = "satellite";
        capForTier = this.maxPerStrategy * 0.6;
      } else {
        tier = "speculative";
        capForTier = this.maxPerStrategy * 0.3;
      }

      if (strat.drawdown !== undefined && strat.drawdown < -25) {
        capForTier = Math.min(capForTier, 0.10);
      }

      const capped = rawWeight > capForTier;
      const weight = Math.min(rawWeight, capForTier);

      allocations.push({
        strategyId: strat.strategyId,
        symbol: strat.symbol,
        allocation: weight,
        rawWeight,
        capped,
        tier,
      });
    }

    const totalAlloc = allocations.reduce((sum, a) => sum + a.allocation, 0);
    if (totalAlloc > this.maxExposure) {
      const scaleFactor = this.maxExposure / totalAlloc;
      for (const a of allocations) {
        a.allocation *= scaleFactor;
      }
    }

    const totalExposure = allocations.reduce((sum, a) => sum + a.allocation, 0);

    logger.info(
      {
        activeCount: active.length,
        skippedCount,
        totalExposure: Math.round(totalExposure * 1000) / 1000,
        topStrategy: allocations[0]?.strategyId,
        topAllocation: Math.round((allocations[0]?.allocation ?? 0) * 1000) / 10,
      },
      "[CapitalAllocator] Portfolio allocation complete",
    );

    return {
      allocations,
      totalExposure: Math.round(totalExposure * 1000) / 1000,
      activeCount: active.length,
      skippedCount,
    };
  }

  toAllocationDecisions(result: CapitalAllocationResult): Map<string, AllocationDecision> {
    const map = new Map<string, AllocationDecision>();

    for (const a of result.allocations) {
      map.set(`${a.strategyId}:${a.symbol}`, {
        strategyId: a.strategyId,
        symbol: a.symbol,
        positionSizePct: Math.round(a.allocation * 1000) / 10,
        maxPositionPct: Math.round(this.maxPerStrategy * 100),
        kellyFraction: 0,
        riskBudgetUsed: Math.round(result.totalExposure * 100),
        allocationTier: a.tier,
        rationale: `Portfolio weight=${(a.rawWeight * 100).toFixed(1)}%${a.capped ? " (capped)" : ""}, tier=${a.tier}, final=${(a.allocation * 100).toFixed(1)}%`,
      });
    }

    return map;
  }
}
