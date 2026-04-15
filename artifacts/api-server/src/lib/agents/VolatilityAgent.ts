import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export interface VolatilityMetrics {
  symbol: string;
  atr: number;
  atrPct: number;
  stdDev20: number;
  stdDevPct: number;
  bollingerWidth: number;
  bollingerWidthPct: number;
  regime: "low" | "moderate" | "high" | "extreme";
  score: number;
}

interface MarketDataPayload {
  symbol: string;
  closes: number[];
  highs: number[];
  lows: number[];
}

function computeATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  const len = closes.length;
  if (len < 2) return 0;

  const trs: number[] = [];
  for (let i = 1; i < len; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    ));
  }

  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeStdDev(data: number[], period: number): number {
  const slice = data.slice(-Math.min(period, data.length));
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function computeBollinger(closes: number[], period = 20, mult = 2): { upper: number; lower: number; mid: number } {
  const slice = closes.slice(-Math.min(period, closes.length));
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const sd = Math.sqrt(variance);
  return { upper: mean + mult * sd, lower: mean - mult * sd, mid: mean };
}

export class VolatilityAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastMetrics: Map<string, VolatilityMetrics> = new Map();

  constructor() {
    super("Volatility", "Computes real-time volatility metrics (ATR, std dev, Bollinger width)");
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
    await this.log("start", "VolatilityAgent started");
    logger.info("[VolatilityAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("market_data", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "VolatilityAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "market_data") await this.onMarketData(payload as MarketDataPayload);
  }

  computeMetrics(closes: number[], highs: number[], lows: number[], symbol = "MARKET"): VolatilityMetrics {
    const price = closes[closes.length - 1] || 1;
    const atrVal = computeATR(highs, lows, closes, 14);
    const atrPct = (atrVal / price) * 100;
    const sd20 = computeStdDev(closes, 20);
    const sdPct = (sd20 / price) * 100;
    const boll = computeBollinger(closes, 20, 2);
    const bw = boll.upper - boll.lower;
    const bwPct = (bw / price) * 100;

    let regime: "low" | "moderate" | "high" | "extreme";
    let score: number;

    if (atrPct < 1) {
      regime = "low";
      score = 80;
    } else if (atrPct < 2.5) {
      regime = "moderate";
      score = 65;
    } else if (atrPct < 5) {
      regime = "high";
      score = 40;
    } else {
      regime = "extreme";
      score = 15;
    }

    const metrics: VolatilityMetrics = {
      symbol,
      atr: Math.round(atrVal * 100) / 100,
      atrPct: Math.round(atrPct * 100) / 100,
      stdDev20: Math.round(sd20 * 100) / 100,
      stdDevPct: Math.round(sdPct * 100) / 100,
      bollingerWidth: Math.round(bw * 100) / 100,
      bollingerWidthPct: Math.round(bwPct * 100) / 100,
      regime,
      score,
    };

    this.lastMetrics.set(symbol, metrics);
    return metrics;
  }

  getLastMetrics(symbol: string): VolatilityMetrics | null {
    return this.lastMetrics.get(symbol) ?? null;
  }

  private async onMarketData(payload: MarketDataPayload): Promise<void> {
    try {
      const { symbol, closes, highs, lows } = payload;
      if (!closes || closes.length < 15) return;

      const metrics = this.computeMetrics(closes, highs, lows, symbol);

      await eventBus.publish({
        eventType: "volatility_computed",
        sourceAgent: this.name,
        payload: metrics,
      });

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[VolatilityAgent] Failed to compute volatility");
    }
  }
}
