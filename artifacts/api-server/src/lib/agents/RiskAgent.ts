import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { db } from "@workspace/db";
import { paperPositionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

interface PortfolioUpdatedPayload {
  userId: string;
  cashBalance?: number;
  positionCount?: number;
  totalCost?: number;
  totalEquityValue?: number;
}

export class RiskAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Risk", "Evaluates drawdown, concentration, and volatility after portfolio changes");
  }

  async init(): Promise<void> {
    eventBus.subscribe("portfolio_updated", this.name, async (payload) => {
      await this.onPortfolioUpdated(payload as PortfolioUpdatedPayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "Risk agent started");
    logger.info("[RiskAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("portfolio_updated", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "Risk agent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "portfolio_updated") await this.onPortfolioUpdated(payload as PortfolioUpdatedPayload);
  }

  assessFromInputs(inputs: {
    failedScenarios: number;
    resilienceScore: number;
    volatilityRegime: string;
    liquidityTier: string;
  }): { riskLevel: "LOW" | "MEDIUM" | "HIGH"; rationale: string } {
    const { failedScenarios, resilienceScore } = inputs;
    const vol = inputs.volatilityRegime.toLowerCase();
    const liq = inputs.liquidityTier.toLowerCase();

    let score = 0;
    if (failedScenarios >= 3) score += 3;
    else if (failedScenarios >= 1) score += 1;
    if (resilienceScore < 40) score += 2;
    else if (resilienceScore < 70) score += 1;
    if (vol === "extreme" || vol === "crisis" || vol === "high") score += 2;
    else if (vol === "moderate" || vol === "medium") score += 1;
    if (liq === "illiquid") score += 2;
    else if (liq === "low") score += 1;

    const riskLevel: "LOW" | "MEDIUM" | "HIGH" = score >= 5 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";
    const rationale = `failedScenarios=${failedScenarios}, resilience=${resilienceScore.toFixed(0)}, vol=${inputs.volatilityRegime}, liq=${inputs.liquidityTier}`;

    return { riskLevel, rationale };
  }

  private async onPortfolioUpdated(payload: PortfolioUpdatedPayload): Promise<void> {
    const t0 = Date.now();
    try {
      const { userId } = payload;
      const assessment = await this.assessRisk(userId, payload);
      await eventBus.publish({
        eventType: "risk_assessed",
        sourceAgent: this.name,
        payload: { userId, ...assessment },
      });
      this.heartbeat();
      this.resetErrors();
      await this.log("portfolio_updated", `Risk assessed for user ${userId}`, { assessment }, "info", undefined, Date.now() - t0);
    } catch (err) {
      this.incrementError();
      logger.error({ err, payload }, "[RiskAgent] Failed to assess risk");
      await this.log("portfolio_updated", "Failed to assess risk", {}, "error", String(err));
    }
  }

  private async assessRisk(userId: string, portfolio: PortfolioUpdatedPayload): Promise<Record<string, unknown>> {
    const positions = await db
      .select()
      .from(paperPositionsTable)
      .where(eq(paperPositionsTable.userId, userId));

    const activePositions = positions.filter((p) => p.quantity > 0);
    const totalCost = activePositions.reduce((acc, p) => acc + p.avgCost * p.quantity, 0);

    let concentrationRisk: "low" | "medium" | "high" = "low";
    if (activePositions.length > 0 && totalCost > 0) {
      const maxPositionCost = Math.max(...activePositions.map((p) => p.avgCost * p.quantity));
      const concentration = maxPositionCost / totalCost;
      if (concentration > 0.5) concentrationRisk = "high";
      else if (concentration > 0.25) concentrationRisk = "medium";
    }

    const cashBalance = portfolio.cashBalance ?? 0;
    const totalPortfolio = totalCost + cashBalance;
    const cashRatio = totalPortfolio > 0 ? cashBalance / totalPortfolio : 1;
    const cashRisk: "low" | "medium" | "high" = cashRatio < 0.05 ? "high" : cashRatio < 0.15 ? "medium" : "low";

    const overallRisk: "low" | "medium" | "high" =
      concentrationRisk === "high" || cashRisk === "high" ? "high" :
      concentrationRisk === "medium" || cashRisk === "medium" ? "medium" : "low";

    return {
      concentrationRisk,
      cashRisk,
      overallRisk,
      positionCount: activePositions.length,
      totalCost,
      cashBalance,
      cashRatio: Math.round(cashRatio * 100) / 100,
    };
  }
}
