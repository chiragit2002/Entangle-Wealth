import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { db } from "@workspace/db";
import { paperPortfoliosTable, paperPositionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

interface PortfolioUpdatedPayload {
  userId: string;
}

export class SyncAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Sync", "Ensures data consistency across portfolio, positions, and balance after events");
  }

  async init(): Promise<void> {
    eventBus.subscribe("portfolio_updated", this.name, async (payload) => {
      await this.onPortfolioUpdated(payload as PortfolioUpdatedPayload);
    });
    eventBus.subscribe("trade_executed", this.name, async (payload) => {
      await this.onTradeExecuted(payload as { userId: string; symbol: string; side: string; quantity: number; price: number });
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "Sync agent started");
    logger.info("[SyncAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("portfolio_updated", this.name);
    eventBus.unsubscribe("trade_executed", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "Sync agent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "portfolio_updated") await this.onPortfolioUpdated(payload as PortfolioUpdatedPayload);
  }

  private async onPortfolioUpdated(payload: PortfolioUpdatedPayload): Promise<void> {
    const t0 = Date.now();
    try {
      const { userId } = payload;
      const discrepancies = await this.checkConsistency(userId);

      if (discrepancies.length > 0) {
        logger.warn({ userId, discrepancies }, "[SyncAgent] Portfolio consistency issues found");
        await eventBus.publish({
          eventType: "sync_discrepancy",
          sourceAgent: this.name,
          payload: { userId, discrepancies },
        });
        await this.log("portfolio_updated", `Discrepancies found for user ${userId}`, { discrepancies }, "warn");
      }

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.error({ err, payload }, "[SyncAgent] Failed to check consistency");
      await this.log("portfolio_updated", "Failed to check consistency", {}, "error", String(err));
    }
  }

  private async onTradeExecuted(payload: { userId: string; symbol: string; side: string; quantity: number; price: number }): Promise<void> {
    const t0 = Date.now();
    try {
      const { userId } = payload;
      const discrepancies = await this.checkConsistency(userId);
      if (discrepancies.length > 0) {
        logger.warn({ userId, discrepancies }, "[SyncAgent] Post-trade consistency check found issues");
        await eventBus.publish({
          eventType: "sync_discrepancy",
          sourceAgent: this.name,
          payload: { userId, discrepancies, trigger: "trade_executed" },
        });
      }
      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.error({ err, payload }, "[SyncAgent] Failed post-trade consistency check");
    }
  }

  private async checkConsistency(userId: string): Promise<string[]> {
    const discrepancies: string[] = [];

    try {
      const [portfolio] = await db
        .select()
        .from(paperPortfoliosTable)
        .where(eq(paperPortfoliosTable.userId, userId));

      if (!portfolio) {
        discrepancies.push("Portfolio record missing");
        return discrepancies;
      }

      const positions = await db
        .select()
        .from(paperPositionsTable)
        .where(eq(paperPositionsTable.userId, userId));

      for (const pos of positions) {
        if (pos.quantity < 0) {
          discrepancies.push(`Negative quantity for ${pos.symbol}: ${pos.quantity}`);
        }
        if (pos.avgCost < 0) {
          discrepancies.push(`Negative avg cost for ${pos.symbol}: ${pos.avgCost}`);
        }
      }

      if (portfolio.cashBalance < 0) {
        discrepancies.push(`Negative cash balance: ${portfolio.cashBalance}`);
      }
    } catch (err) {
      logger.warn({ err, userId }, "[SyncAgent] Failed to read portfolio data for consistency check");
    }

    return discrepancies;
  }
}
