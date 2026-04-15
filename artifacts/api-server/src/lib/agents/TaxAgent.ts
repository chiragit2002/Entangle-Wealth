import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { db } from "@workspace/db";
import { paperTradesTable } from "@workspace/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { logger } from "../logger";

interface TradeExecutedPayload {
  userId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  tradeId?: number;
}

export class TaxAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Tax", "Calculates wash sale implications and tax-lot impact for executed trades");
  }

  async init(): Promise<void> {
    eventBus.subscribe("trade_executed", this.name, async (payload) => {
      await this.onTradeExecuted(payload as TradeExecutedPayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "Tax agent started");
    logger.info("[TaxAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("trade_executed", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "Tax agent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "trade_executed") await this.onTradeExecuted(payload as TradeExecutedPayload);
  }

  private async onTradeExecuted(payload: TradeExecutedPayload): Promise<void> {
    const t0 = Date.now();
    try {
      const { userId, symbol, side, price, quantity } = payload;

      if (side !== "sell") {
        this.heartbeat();
        return;
      }

      const washSaleRisk = await this.checkWashSaleRisk(userId, symbol);
      const taxImpact = this.estimateTaxImpact(price, quantity);

      await eventBus.publish({
        eventType: "tax_assessed",
        sourceAgent: this.name,
        payload: {
          userId,
          symbol,
          side,
          washSaleRisk,
          estimatedGain: taxImpact.estimatedGain,
          shortTermFlag: taxImpact.shortTerm,
        },
      });

      this.heartbeat();
      this.resetErrors();
      await this.log(
        "trade_executed",
        `Tax assessed for ${symbol} sell by user ${userId}`,
        { washSaleRisk, taxImpact },
        "info",
        undefined,
        Date.now() - t0
      );
    } catch (err) {
      this.incrementError();
      logger.error({ err, payload }, "[TaxAgent] Failed to assess tax impact");
      await this.log("trade_executed", "Failed to assess tax impact", {}, "error", String(err));
    }
  }

  private async checkWashSaleRisk(userId: string, symbol: string): Promise<boolean> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const recentTrades = await db
      .select()
      .from(paperTradesTable)
      .where(
        and(
          eq(paperTradesTable.userId, userId),
          eq(paperTradesTable.symbol, symbol),
          gte(paperTradesTable.createdAt, thirtyDaysAgo)
        )
      );

    const hasBuyAfterSell = recentTrades.some((t) => t.side === "buy");
    return hasBuyAfterSell;
  }

  private estimateTaxImpact(price: number, quantity: number): { estimatedGain: number; shortTerm: boolean } {
    return {
      estimatedGain: price * quantity,
      shortTerm: true,
    };
  }
}
