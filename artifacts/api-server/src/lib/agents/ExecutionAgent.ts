import { createHash } from "crypto";
import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";
import type { ExchangeAdapter, OrderResult } from "../exchange/ExchangeAdapter";
import { OrderSide, OrderType } from "../exchange/ExchangeAdapter";

export type ExecutionAction = "BUY" | "SELL" | "HOLD" | "EXIT" | "BLOCK";

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

export type ExecuteOutcome =
  | { routed: false; reason: string }
  | { routed: true; orderResult: OrderResult };

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;
const IDEMPOTENCY_CACHE_MAX = 10_000;

function makeIdempotencyKey(strategyId: string, symbol: string, action: ExecutionAction, timestampMs: number): string {
  const windowedTs = Math.floor(timestampMs / IDEMPOTENCY_WINDOW_MS) * IDEMPOTENCY_WINDOW_MS;
  return createHash("sha256")
    .update(`${strategyId}:${symbol}:${action}:${windowedTs}`)
    .digest("hex");
}

export class ExecutionAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private idempotencyCache = new Map<string, number>();

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

  async execute(decision: ExecutionDecision, adapter: ExchangeAdapter, sizeShares = 1): Promise<ExecuteOutcome> {
    const { action, strategyId, symbol } = decision;

    if (action === "HOLD" || action === "BLOCK") {
      logger.info({ strategyId, symbol, action }, `[ExecutionAgent] ${action} — no order placed`);
      return { routed: false, reason: `${action}: no-op` };
    }

    const idempotencyKey = makeIdempotencyKey(strategyId, symbol, action, Date.now());
    const existing = this.idempotencyCache.get(idempotencyKey);
    if (existing) {
      logger.warn({ strategyId, symbol, action, idempotencyKey }, "[ExecutionAgent] Duplicate order suppressed by idempotency cache");
      return { routed: false, reason: "duplicate: idempotency key already used in this window" };
    }

    this.pruneIdempotencyCache();
    this.idempotencyCache.set(idempotencyKey, Date.now());

    try {
      let orderResult: OrderResult;

      if (action === "EXIT") {
        logger.info({ strategyId, symbol }, "[ExecutionAgent] EXIT — closing position");
        orderResult = await adapter.closePosition(symbol);
      } else {
        const side = action === "BUY" ? OrderSide.BUY : OrderSide.SELL;
        logger.info({ strategyId, symbol, action, side, sizeShares }, "[ExecutionAgent] Placing order");
        orderResult = await adapter.placeOrder(symbol, side, sizeShares, OrderType.MARKET);
      }

      this.heartbeat();
      this.resetErrors();

      await eventBus.publish({
        eventType: "trade_executed",
        sourceAgent: this.name,
        payload: {
          strategy_id: strategyId,
          symbol,
          action,
          orderResult,
          idempotencyKey,
        },
      });

      return { routed: true, orderResult };
    } catch (err) {
      this.incrementError();
      logger.error({ err, strategyId, symbol, action }, "[ExecutionAgent] Order routing failed");
      this.idempotencyCache.delete(idempotencyKey);
      throw err;
    }
  }

  private pruneIdempotencyCache(): void {
    if (this.idempotencyCache.size < IDEMPOTENCY_CACHE_MAX) return;
    const cutoff = Date.now() - IDEMPOTENCY_WINDOW_MS;
    for (const [key, ts] of this.idempotencyCache) {
      if (ts < cutoff) this.idempotencyCache.delete(key);
    }
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
