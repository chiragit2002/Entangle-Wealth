import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export interface AllocationDecision {
  strategyId: string;
  symbol: string;
  positionSizePct: number;
  maxPositionPct: number;
  kellyFraction: number;
  riskBudgetUsed: number;
  allocationTier: "core" | "satellite" | "speculative" | "skip";
  rationale: string;
}

interface RankedStrategyPayload {
  strategyId: string;
  symbol: string;
  score: number;
  confidence: number;
  winRate?: number;
  maxDrawdown?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
}

interface EnsembleRankedPayload {
  strategyId: string;
  symbol: string;
  ensembleScore: number;
  agreement: number;
  weightedAvg?: number;
  [key: string]: unknown;
}

const MAX_SINGLE_POSITION_PCT = 20;
const MAX_RISK_BUDGET_PCT = 100;
const KELLY_MULTIPLIER = 0.5;

export class AllocationAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private allocations: Map<string, AllocationDecision> = new Map();
  private totalRiskBudgetUsed = 0;

  constructor() {
    super("Allocation", "Determines position sizing from ranked strategies");
  }

  async init(): Promise<void> {
    eventBus.subscribe("ensemble_ranked", this.name, async (payload) => {
      await this.onEnsembleRanked(payload as RankedStrategyPayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "AllocationAgent started");
    logger.info("[AllocationAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("ensemble_ranked", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "AllocationAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "ensemble_ranked") {
      await this.onEnsembleRanked(payload as RankedStrategyPayload | EnsembleRankedPayload);
    }
  }

  allocate(strategy: RankedStrategyPayload): AllocationDecision {
    const { strategyId, symbol, score, confidence, winRate = 50, maxDrawdown = 15, riskLevel = "MEDIUM" } = strategy;

    const winProb = Math.min(0.99, Math.max(0.01, winRate / 100));
    const lossProb = 1 - winProb;
    const winLossRatio = maxDrawdown > 0 ? (score / 100) / (maxDrawdown / 100) : 2;
    const kellyRaw = (winProb * winLossRatio - lossProb) / winLossRatio;
    const kellyFraction = Math.max(0, Math.min(1, kellyRaw * KELLY_MULTIPLIER));

    const confidenceMultiplier = confidence / 100;
    let rawPosition = kellyFraction * MAX_SINGLE_POSITION_PCT * confidenceMultiplier;

    let maxPositionPct = MAX_SINGLE_POSITION_PCT;
    let allocationTier: "core" | "satellite" | "speculative" | "skip";

    if (riskLevel === "HIGH" || score < 40) {
      maxPositionPct = 5;
      allocationTier = score < 40 ? "skip" : "speculative";
    } else if (riskLevel === "MEDIUM" || score < 60) {
      maxPositionPct = 10;
      allocationTier = "satellite";
    } else {
      maxPositionPct = MAX_SINGLE_POSITION_PCT;
      allocationTier = "core";
    }

    const positionSizePct = Math.min(rawPosition, maxPositionPct);
    const remainingBudget = MAX_RISK_BUDGET_PCT - this.totalRiskBudgetUsed;
    const finalPosition = Math.min(positionSizePct, remainingBudget);

    let rationale = `Kelly=${(kellyFraction * 100).toFixed(1)}%, conf=${confidence}%, tier=${allocationTier}`;
    if (allocationTier === "skip") {
      rationale = "Score too low for allocation";
    }

    const decision: AllocationDecision = {
      strategyId,
      symbol,
      positionSizePct: Math.round(finalPosition * 10) / 10,
      maxPositionPct,
      kellyFraction: Math.round(kellyFraction * 1000) / 1000,
      riskBudgetUsed: Math.round(this.totalRiskBudgetUsed * 10) / 10,
      allocationTier,
      rationale,
    };

    if (allocationTier !== "skip") {
      this.totalRiskBudgetUsed = Math.min(MAX_RISK_BUDGET_PCT, this.totalRiskBudgetUsed + finalPosition);
    }

    this.allocations.set(`${strategyId}:${symbol}`, decision);
    return decision;
  }

  resetBudget(): void {
    this.totalRiskBudgetUsed = 0;
    this.allocations.clear();
  }

  getAllocations(): AllocationDecision[] {
    return [...this.allocations.values()];
  }

  private async onEnsembleRanked(raw: RankedStrategyPayload | EnsembleRankedPayload): Promise<void> {
    try {
      let payload: RankedStrategyPayload;
      if ("ensembleScore" in raw) {
        const ep = raw as EnsembleRankedPayload;
        payload = {
          strategyId: ep.strategyId,
          symbol: ep.symbol,
          score: ep.ensembleScore,
          confidence: Math.min(100, Math.max(0, ep.agreement)),
        };
      } else {
        payload = raw as RankedStrategyPayload;
      }
      const decision = this.allocate(payload);

      await eventBus.publish({
        eventType: "allocation_decided",
        sourceAgent: this.name,
        payload: decision,
      });

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload: raw }, "[AllocationAgent] Failed to compute allocation");
    }
  }
}
