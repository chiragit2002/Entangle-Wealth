import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export interface DriftReport {
  strategyId: string;
  hasDrift: boolean;
  driftMagnitude: number;
  driftDirection: "improving" | "degrading" | "stable";
  rollingMean: number;
  baselineMean: number;
  zScore: number;
  recommendation: "continue" | "recalibrate" | "halt";
}

interface PerformanceEntry {
  score: number;
  timestamp: number;
}

interface StrategyPerformancePayload {
  strategyId: string;
  score: number;
  timestamp?: number;
}

const DRIFT_THRESHOLD_Z = 1.5;
const HALT_THRESHOLD_Z = 2.5;
const MIN_HISTORY_LENGTH = 10;
const ROLLING_WINDOW = 10;

export class DriftAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private performanceHistory: Map<string, PerformanceEntry[]> = new Map();

  constructor() {
    super("Drift", "Monitors strategy performance history for parameter drift");
  }

  async init(): Promise<void> {
    eventBus.subscribe("strategy_evaluated", this.name, async (payload) => {
      await this.onStrategyEvaluated(payload as StrategyPerformancePayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "DriftAgent started");
    logger.info("[DriftAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("strategy_evaluated", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "DriftAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "strategy_evaluated") {
      await this.onStrategyEvaluated(payload as StrategyPerformancePayload);
    }
  }

  recordScore(strategyId: string, score: number): DriftReport {
    const history = this.performanceHistory.get(strategyId) ?? [];
    history.push({ score, timestamp: Date.now() });
    if (history.length > 100) history.shift();
    this.performanceHistory.set(strategyId, history);

    return this.computeDrift(strategyId, history);
  }

  private computeDrift(strategyId: string, history: PerformanceEntry[]): DriftReport {
    const scores = history.map(h => h.score);

    if (scores.length < MIN_HISTORY_LENGTH) {
      return {
        strategyId,
        hasDrift: false,
        driftMagnitude: 0,
        driftDirection: "stable",
        rollingMean: scores[scores.length - 1] ?? 0,
        baselineMean: scores[0] ?? 0,
        zScore: 0,
        recommendation: "continue",
      };
    }

    const baseline = scores.slice(0, Math.floor(scores.length / 2));
    const rolling = scores.slice(-ROLLING_WINDOW);

    const baselineMean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const rollingMean = rolling.reduce((a, b) => a + b, 0) / rolling.length;

    const baselineVariance = baseline.reduce((a, b) => a + (b - baselineMean) ** 2, 0) / baseline.length;
    const baselineStd = Math.sqrt(baselineVariance) || 1;

    const zScore = (rollingMean - baselineMean) / baselineStd;
    const driftMagnitude = Math.abs(zScore);
    const hasDrift = driftMagnitude > DRIFT_THRESHOLD_Z;

    let driftDirection: "improving" | "degrading" | "stable";
    if (driftMagnitude < DRIFT_THRESHOLD_Z) {
      driftDirection = "stable";
    } else if (zScore > 0) {
      driftDirection = "improving";
    } else {
      driftDirection = "degrading";
    }

    let recommendation: "continue" | "recalibrate" | "halt";
    if (driftMagnitude >= HALT_THRESHOLD_Z && driftDirection === "degrading") {
      recommendation = "halt";
    } else if (hasDrift && driftDirection === "degrading") {
      recommendation = "recalibrate";
    } else {
      recommendation = "continue";
    }

    return {
      strategyId,
      hasDrift,
      driftMagnitude: Math.round(driftMagnitude * 100) / 100,
      driftDirection,
      rollingMean: Math.round(rollingMean * 100) / 100,
      baselineMean: Math.round(baselineMean * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
      recommendation,
    };
  }

  getDriftReport(strategyId: string): DriftReport | null {
    const history = this.performanceHistory.get(strategyId);
    if (!history || history.length === 0) return null;
    return this.computeDrift(strategyId, history);
  }

  private async onStrategyEvaluated(payload: StrategyPerformancePayload): Promise<void> {
    try {
      const { strategyId, score } = payload;
      const report = this.recordScore(strategyId, score);

      if (report.hasDrift) {
        await eventBus.publish({
          eventType: "drift_detected",
          sourceAgent: this.name,
          payload: report,
        });
      }

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[DriftAgent] Failed to evaluate drift");
    }
  }
}
