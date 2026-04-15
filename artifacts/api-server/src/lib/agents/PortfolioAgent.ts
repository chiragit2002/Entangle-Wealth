import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { db } from "@workspace/db";
import { paperPortfoliosTable, paperPositionsTable, paperTradesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "../logger";

interface TradeExecutedPayload {
  userId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
}

interface PriceUpdatePayload {
  symbol: string;
  price: number;
}

export class PortfolioAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Portfolio", "Recalculates holdings, P&L, and exposure on every trade or price update");
  }

  async init(): Promise<void> {
    eventBus.subscribe("trade_executed", this.name, async (payload) => {
      await this.onTradeExecuted(payload as TradeExecutedPayload);
    });
    eventBus.subscribe("price_update", this.name, async (payload) => {
      await this.onPriceUpdate(payload as PriceUpdatePayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "Portfolio agent started");
    logger.info("[PortfolioAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("trade_executed", this.name);
    eventBus.unsubscribe("price_update", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "Portfolio agent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "trade_executed") await this.onTradeExecuted(payload as TradeExecutedPayload);
    if (eventType === "price_update") await this.onPriceUpdate(payload as PriceUpdatePayload);
  }

  private async onTradeExecuted(payload: TradeExecutedPayload): Promise<void> {
    const t0 = Date.now();
    try {
      const { userId } = payload;
      const summary = await this.calculatePortfolioSummary(userId);
      await eventBus.publish({
        eventType: "portfolio_updated",
        sourceAgent: this.name,
        payload: { userId, ...summary },
      });
      this.heartbeat();
      this.resetErrors();
      await this.log("trade_executed", `Portfolio recalculated for user ${userId}`, { summary }, "info", undefined, Date.now() - t0);
    } catch (err) {
      this.incrementError();
      logger.error({ err, payload }, "[PortfolioAgent] Failed to recalculate portfolio");
      await this.log("trade_executed", "Failed to recalculate portfolio", {}, "error", String(err));
    }
  }

  private async onPriceUpdate(payload: PriceUpdatePayload): Promise<void> {
    try {
      const { symbol, price } = payload;
      const positions = await db
        .select()
        .from(paperPositionsTable)
        .where(eq(paperPositionsTable.symbol, symbol));

      for (const pos of positions) {
        if (pos.quantity <= 0) continue;
        const unrealizedPnl = (price - pos.avgCost) * pos.quantity;
        await eventBus.publish({
          eventType: "portfolio_updated",
          sourceAgent: this.name,
          payload: { userId: pos.userId, symbol, unrealizedPnl, currentPrice: price },
        });
      }
      this.heartbeat();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[PortfolioAgent] Failed to process price update");
    }
  }

  private async calculatePortfolioSummary(userId: string): Promise<Record<string, unknown>> {
    const [portfolio] = await db
      .select()
      .from(paperPortfoliosTable)
      .where(eq(paperPortfoliosTable.userId, userId));

    const positions = await db
      .select()
      .from(paperPositionsTable)
      .where(eq(paperPositionsTable.userId, userId));

    const recentTrades = await db
      .select()
      .from(paperTradesTable)
      .where(eq(paperTradesTable.userId, userId))
      .orderBy(desc(paperTradesTable.createdAt))
      .limit(10);

    const activePositions = positions.filter((p) => p.quantity > 0);
    const totalCost = activePositions.reduce((acc, p) => acc + p.avgCost * p.quantity, 0);
    const cashBalance = portfolio?.cashBalance ?? 0;

    return {
      cashBalance,
      positionCount: activePositions.length,
      totalCost,
      totalEquityValue: totalCost,
      recentTradeCount: recentTrades.length,
    };
  }
}
