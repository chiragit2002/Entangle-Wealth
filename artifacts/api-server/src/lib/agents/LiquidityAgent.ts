import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export interface LiquidityScore {
  symbol: string;
  volumeRatio: number;
  averageVolume: number;
  currentVolume: number;
  estimatedSpreadBps: number;
  liquidityTier: "high" | "medium" | "low" | "illiquid";
  score: number;
  tradeable: boolean;
}

interface MarketDataPayload {
  symbol: string;
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
}

function sma(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-Math.min(period, data.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export class LiquidityAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastScores: Map<string, LiquidityScore> = new Map();

  constructor() {
    super("Liquidity", "Analyzes volume and spread for liquidity scoring");
  }

  async init(): Promise<void> {
    eventBus.subscribe("market_data", this.name, async (payload) => {
      await this.onMarketData(payload as MarketDataPayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "LiquidityAgent started");
    logger.info("[LiquidityAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("market_data", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "LiquidityAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "market_data") await this.onMarketData(payload as MarketDataPayload);
  }

  analyzeLiquidity(closes: number[], highs: number[], lows: number[], volumes: number[], symbol = "MARKET"): LiquidityScore {
    const avgVol = sma(volumes, 20);
    const currVol = volumes[volumes.length - 1] ?? 0;
    const volumeRatio = avgVol > 0 ? currVol / avgVol : 1;

    const price = closes[closes.length - 1] || 1;
    const recentHigh = highs[highs.length - 1] || price;
    const recentLow = lows[lows.length - 1] || price;
    const spreadBps = price > 0 ? ((recentHigh - recentLow) / price) * 10000 : 100;

    let liquidityTier: "high" | "medium" | "low" | "illiquid";
    let score: number;

    if (avgVol > 1_000_000 && volumeRatio > 0.5) {
      liquidityTier = "high";
      score = Math.min(99, 70 + volumeRatio * 10);
    } else if (avgVol > 200_000 && volumeRatio > 0.3) {
      liquidityTier = "medium";
      score = Math.min(69, 45 + volumeRatio * 10);
    } else if (avgVol > 50_000) {
      liquidityTier = "low";
      score = Math.min(44, 20 + volumeRatio * 10);
    } else {
      liquidityTier = "illiquid";
      score = Math.max(5, volumeRatio * 10);
    }

    const tradeable = liquidityTier !== "illiquid" && volumeRatio > 0.2;

    const result: LiquidityScore = {
      symbol,
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      averageVolume: Math.round(avgVol),
      currentVolume: currVol,
      estimatedSpreadBps: Math.round(spreadBps * 10) / 10,
      liquidityTier,
      score: Math.round(score),
      tradeable,
    };

    this.lastScores.set(symbol, result);
    return result;
  }

  getLastScore(symbol: string): LiquidityScore | null {
    return this.lastScores.get(symbol) ?? null;
  }

  private async onMarketData(payload: MarketDataPayload): Promise<void> {
    try {
      const { symbol, closes, highs, lows, volumes } = payload;
      if (!closes || closes.length < 5) return;

      const result = this.analyzeLiquidity(
        closes,
        highs ?? [],
        lows ?? [],
        volumes ?? [],
        symbol,
      );

      await eventBus.publish({
        eventType: "liquidity_scored",
        sourceAgent: this.name,
        payload: result,
      });

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[LiquidityAgent] Failed to score liquidity");
    }
  }
}
