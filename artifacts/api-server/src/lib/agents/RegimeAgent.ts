import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export type MarketRegime = "trending" | "mean-reverting" | "volatile" | "sideways";

export interface RegimeResult {
  symbol: string;
  regime: MarketRegime;
  confidence: number;
  adx: number;
  trendStrength: number;
  volatilityRatio: number;
}

interface MarketDataPayload {
  symbol: string;
  closes: number[];
  highs: number[];
  lows: number[];
}

function sma(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-Math.min(period, data.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeADX(highs: number[], lows: number[], closes: number[], period = 14): number {
  const len = closes.length;
  if (len < period + 2) return 0;

  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < len; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    trueRanges.push(tr);

    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const atr14 = sma(trueRanges.slice(-period), period);
  const plusDI = atr14 > 0 ? (sma(plusDM.slice(-period), period) / atr14) * 100 : 0;
  const minusDI = atr14 > 0 ? (sma(minusDM.slice(-period), period) / atr14) * 100 : 0;
  const diSum = plusDI + minusDI;
  const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
  return dx;
}

function stdDev(data: number[], period: number): number {
  const slice = data.slice(-Math.min(period, data.length));
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function detectRegime(closes: number[], highs: number[], lows: number[]): RegimeResult {
  const symbol = "MARKET";
  const adxVal = computeADX(highs, lows, closes, 14);
  const sd20 = stdDev(closes, 20);
  const price = closes[closes.length - 1];
  const sd5 = stdDev(closes, 5);
  const volatilityRatio = sd20 > 0 ? sd5 / sd20 : 1;

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const trendStrength = sma20 > 0 ? Math.abs(sma20 - sma50) / sma20 : 0;

  let regime: MarketRegime;
  let confidence: number;

  if (adxVal > 30 && trendStrength > 0.02) {
    regime = "trending";
    confidence = Math.min(99, 50 + adxVal * 0.8 + trendStrength * 200);
  } else if (volatilityRatio > 1.5 || (sd20 / price) > 0.04) {
    regime = "volatile";
    confidence = Math.min(99, 50 + volatilityRatio * 15);
  } else if (adxVal < 20 && trendStrength < 0.01) {
    regime = "mean-reverting";
    confidence = Math.min(99, 80 - adxVal);
  } else {
    regime = "sideways";
    confidence = 60;
  }

  return {
    symbol,
    regime,
    confidence: Math.round(confidence),
    adx: Math.round(adxVal * 10) / 10,
    trendStrength: Math.round(trendStrength * 10000) / 10000,
    volatilityRatio: Math.round(volatilityRatio * 100) / 100,
  };
}

export class RegimeAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastRegime: Map<string, RegimeResult> = new Map();

  constructor() {
    super("Regime", "Detects market regime (trending, mean-reverting, volatile, sideways) from price data");
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
    await this.log("start", "RegimeAgent started");
    logger.info("[RegimeAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("market_data", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "RegimeAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "market_data") await this.onMarketData(payload as MarketDataPayload);
  }

  analyzeRegime(closes: number[], highs: number[], lows: number[], symbol = "MARKET"): RegimeResult {
    const result = detectRegime(closes, highs, lows);
    result.symbol = symbol;
    this.lastRegime.set(symbol, result);
    return result;
  }

  getLastRegime(symbol: string): RegimeResult | null {
    return this.lastRegime.get(symbol) ?? null;
  }

  private async onMarketData(payload: MarketDataPayload): Promise<void> {
    try {
      const { symbol, closes, highs, lows } = payload;
      if (!closes || closes.length < 20) return;

      const result = this.analyzeRegime(closes, highs, lows, symbol);

      await eventBus.publish({
        eventType: "regime_detected",
        sourceAgent: this.name,
        payload: result,
      });

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[RegimeAgent] Failed to detect regime");
    }
  }
}
