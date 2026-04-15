import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export type ExecutionAction = "BUY" | "SELL" | "HOLD" | "EXIT";

export interface ExecutionDecision {
  strategyId: string;
  symbol: string;
  action: ExecutionAction;
  score: number;
  confidence: number;
  rationale: string;
  inputs: {
    evaluationScore: number;
    stressResilienceScore: number;
    riskLevel: string;
    regimeBonus: number;
    liquidityPenalty: number;
    volatilityPenalty: number;
  };
}

export interface ExecutionInput {
  strategyId: string;
  symbol: string;
  evaluationScore: number;
  confidence: number;
  action: "buy" | "sell" | "hold" | "BUY" | "SELL" | "HOLD";
  stressResilienceScore?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  regime?: string;
  liquidityTier?: string;
  volatilityRegime?: string;
  stressScore?: number;
}

export class ExecutionAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Execution", "Synthesizes evaluation, stress, risk, and context inputs into a scored decision");
  }

  async init(): Promise<void> {
    eventBus.subscribe("execution_requested", this.name, async (payload) => {
      await this.onExecutionRequested(payload as ExecutionInput);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "ExecutionAgent started");
    logger.info("[ExecutionAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("execution_requested", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "ExecutionAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "execution_requested") {
      await this.onExecutionRequested(payload as ExecutionInput);
    }
  }

  decide(input: ExecutionInput): ExecutionDecision {
    const {
      strategyId,
      symbol,
      evaluationScore,
      confidence,
      action: rawAction,
      stressResilienceScore = 70,
      riskLevel = "MEDIUM",
      regime = "sideways",
      liquidityTier = "medium",
      volatilityRegime = "moderate",
      stressScore = 0,
    } = input;

    let regimeBonus = 0;
    if (regime === "trending") regimeBonus = 10;
    else if (regime === "sideways") regimeBonus = 0;
    else if (regime === "mean-reverting") regimeBonus = 5;
    else if (regime === "volatile") regimeBonus = -10;

    let liquidityPenalty = 0;
    if (liquidityTier === "illiquid") liquidityPenalty = 25;
    else if (liquidityTier === "low") liquidityPenalty = 10;
    else if (liquidityTier === "medium") liquidityPenalty = 2;

    let volatilityPenalty = 0;
    if (volatilityRegime === "extreme") volatilityPenalty = 20;
    else if (volatilityRegime === "high") volatilityPenalty = 10;

    let riskPenalty = 0;
    if (riskLevel === "HIGH") riskPenalty = 15;
    else if (riskLevel === "MEDIUM") riskPenalty = 5;

    const stressPenalty = stressScore > 60 ? (stressScore - 60) * 0.3 : 0;

    const rawScore =
      evaluationScore * 0.45 +
      stressResilienceScore * 0.25 +
      confidence * 0.30;

    const adjustedScore = Math.max(0, Math.min(100,
      rawScore + regimeBonus - liquidityPenalty - volatilityPenalty - riskPenalty - stressPenalty,
    ));

    const normalizedAction = rawAction.toUpperCase() as ExecutionAction;

    let finalAction: ExecutionAction = normalizedAction === "BUY" || normalizedAction === "SELL"
      ? normalizedAction
      : "HOLD";

    if (adjustedScore < 35 || liquidityTier === "illiquid") {
      finalAction = "HOLD";
    }

    const adjustedConfidence = Math.max(0, Math.min(100,
      confidence - liquidityPenalty * 0.5 - volatilityPenalty * 0.3,
    ));

    const rationaleparts = [];
    if (regimeBonus > 0) rationaleparts.push(`regime bonus +${regimeBonus}`);
    if (liquidityPenalty > 0) rationaleparts.push(`liquidity penalty -${liquidityPenalty}`);
    if (volatilityPenalty > 0) rationaleparts.push(`volatility penalty -${volatilityPenalty}`);
    if (riskPenalty > 0) rationaleparts.push(`risk penalty -${riskPenalty}`);
    if (stressPenalty > 0) rationaleparts.push(`stress penalty -${stressPenalty.toFixed(1)}`);

    const rationale = rationaleparts.length > 0
      ? `Score ${adjustedScore.toFixed(1)}: ${rationaleparts.join(", ")}`
      : `Score ${adjustedScore.toFixed(1)}: no significant adjustments`;

    return {
      strategyId,
      symbol,
      action: finalAction,
      score: Math.round(adjustedScore * 100) / 100,
      confidence: Math.round(adjustedConfidence * 100) / 100,
      rationale,
      inputs: {
        evaluationScore,
        stressResilienceScore,
        riskLevel,
        regimeBonus,
        liquidityPenalty,
        volatilityPenalty,
      },
    };
  }

  private async onExecutionRequested(payload: ExecutionInput): Promise<void> {
    try {
      const decision = this.decide(payload);

      await eventBus.publish({
        eventType: "execution_decided",
        sourceAgent: this.name,
        payload: decision,
      });

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[ExecutionAgent] Failed to decide execution");
    }
  }
}
