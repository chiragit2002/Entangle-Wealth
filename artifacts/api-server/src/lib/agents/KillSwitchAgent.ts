import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export type KillSwitchDecision = "ALLOW" | "EXIT";

export interface KillSwitchResult {
  decision: KillSwitchDecision;
  triggered: boolean;
  reasons: string[];
  stressScore: number;
  contextScore: number;
  overallRiskScore: number;
}

export interface KillSwitchContext {
  stressScore?: number;
  failedScenarios?: number;
  resilienceScore?: number;
  regime?: string;
  volatilityRegime?: string;
  liquidityTier?: string;
  drawdown?: number;
}

const STRESS_KILL_THRESHOLD = 70;
const DRAWDOWN_KILL_THRESHOLD = 25;
const FAILED_SCENARIOS_KILL_THRESHOLD = 3;
const OVERALL_RISK_KILL_THRESHOLD = 75;

export class KillSwitchAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("KillSwitch", "Monitors combined context and stress state; forces EXIT when thresholds are breached");
  }

  async init(): Promise<void> {
    eventBus.subscribe("risk_context_update", this.name, async (payload) => {
      await this.onRiskContextUpdate(payload as KillSwitchContext);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "KillSwitchAgent started");
    logger.info("[KillSwitchAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("risk_context_update", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "KillSwitchAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "risk_context_update") {
      await this.onRiskContextUpdate(payload as KillSwitchContext);
    }
  }

  evaluate(context: KillSwitchContext): KillSwitchResult {
    const reasons: string[] = [];

    const stressScore = context.stressScore ?? 0;
    const failedScenarios = context.failedScenarios ?? 0;
    const drawdown = context.drawdown ?? 0;
    const resilienceScore = context.resilienceScore ?? 100;

    let contextRiskScore = 0;

    if (context.regime === "volatile") contextRiskScore += 20;
    if (context.volatilityRegime === "extreme") contextRiskScore += 25;
    else if (context.volatilityRegime === "high") contextRiskScore += 15;
    if (context.liquidityTier === "illiquid") contextRiskScore += 30;
    else if (context.liquidityTier === "low") contextRiskScore += 15;

    const overallRiskScore = (stressScore * 0.4) + (contextRiskScore * 0.4) + ((100 - resilienceScore) * 0.2);

    if (stressScore > STRESS_KILL_THRESHOLD) {
      reasons.push(`Stress score ${stressScore} exceeds threshold ${STRESS_KILL_THRESHOLD}`);
    }

    if (failedScenarios >= FAILED_SCENARIOS_KILL_THRESHOLD) {
      reasons.push(`${failedScenarios} failed stress scenarios (threshold: ${FAILED_SCENARIOS_KILL_THRESHOLD})`);
    }

    if (drawdown > DRAWDOWN_KILL_THRESHOLD) {
      reasons.push(`Drawdown ${drawdown}% exceeds threshold ${DRAWDOWN_KILL_THRESHOLD}%`);
    }

    if (context.liquidityTier === "illiquid") {
      reasons.push("Market is illiquid — exit risk too high");
    }

    if (overallRiskScore > OVERALL_RISK_KILL_THRESHOLD) {
      reasons.push(`Overall risk score ${overallRiskScore.toFixed(1)} exceeds threshold ${OVERALL_RISK_KILL_THRESHOLD}`);
    }

    const triggered = reasons.length > 0;
    const decision: KillSwitchDecision = triggered ? "EXIT" : "ALLOW";

    return {
      decision,
      triggered,
      reasons,
      stressScore: Math.round(stressScore * 10) / 10,
      contextScore: Math.round(contextRiskScore * 10) / 10,
      overallRiskScore: Math.round(overallRiskScore * 10) / 10,
    };
  }

  private async onRiskContextUpdate(payload: KillSwitchContext): Promise<void> {
    try {
      const result = this.evaluate(payload);

      if (result.triggered) {
        await eventBus.publish({
          eventType: "kill_switch_triggered",
          sourceAgent: this.name,
          payload: result,
        });

        await this.log(
          "kill_switch_triggered",
          `Kill switch activated: ${result.reasons.join("; ")}`,
          { result },
          "warn",
        );
      }

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[KillSwitchAgent] Failed to evaluate risk context");
    }
  }
}
