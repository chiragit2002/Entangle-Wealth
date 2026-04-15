import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

interface PriceUpdatePayload {
  symbol: string;
  price: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
}

export class StrategyAgent extends BaseAgent {
  private priceHistory = new Map<string, number[]>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Strategy", "Evaluates technical patterns and emits trading strategy signals");
  }

  async init(): Promise<void> {
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
    await this.log("start", "Strategy agent started");
    logger.info("[StrategyAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("price_update", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "Strategy agent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "price_update") await this.onPriceUpdate(payload as PriceUpdatePayload);
  }

  private async onPriceUpdate(payload: PriceUpdatePayload): Promise<void> {
    try {
      const { symbol, price, rsi, macd, macdSignal, bollingerUpper, bollingerLower } = payload;

      const history = this.priceHistory.get(symbol) || [];
      history.push(price);
      if (history.length > 50) history.shift();
      this.priceHistory.set(symbol, history);

      const signal = this.evaluateSignal({ symbol, price, rsi, macd, macdSignal, bollingerUpper, bollingerLower });

      if (signal) {
        await eventBus.publish({
          eventType: "strategy_signal",
          sourceAgent: this.name,
          payload: signal,
        });
        await this.log("price_update", `Strategy signal emitted for ${symbol}`, signal, "info");
      }

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[StrategyAgent] Failed to evaluate strategy");
    }
  }

  private evaluateSignal(data: PriceUpdatePayload): Record<string, unknown> | null {
    const { symbol, price, rsi, macd, macdSignal, bollingerUpper, bollingerLower } = data;
    const signals: string[] = [];

    if (rsi !== undefined) {
      if (rsi < 30) signals.push("rsi_oversold");
      else if (rsi > 70) signals.push("rsi_overbought");
    }

    if (macd !== undefined && macdSignal !== undefined) {
      if (macd > macdSignal) signals.push("macd_bullish_crossover");
      else if (macd < macdSignal) signals.push("macd_bearish_crossover");
    }

    if (bollingerUpper !== undefined && bollingerLower !== undefined) {
      if (price > bollingerUpper) signals.push("bollinger_upper_breach");
      else if (price < bollingerLower) signals.push("bollinger_lower_breach");
    }

    if (signals.length === 0) return null;

    const bullishCount = signals.filter((s) => s.includes("oversold") || s.includes("bullish") || s.includes("lower")).length;
    const bearishCount = signals.filter((s) => s.includes("overbought") || s.includes("bearish") || s.includes("upper")).length;

    const direction = bullishCount > bearishCount ? "buy" : bearishCount > bullishCount ? "sell" : "hold";
    const confidence = Math.min(signals.length / 3, 1);

    return { symbol, price, direction, confidence, signals };
  }

  evaluateFromOHLCV(
    symbol: string,
    closes: number[],
    highs: number[],
    lows: number[],
  ): { score: number; confidence: number; direction: "buy" | "sell" | "hold"; signals: string[] } {
    const price = closes[closes.length - 1] ?? 0;
    const signals: string[] = [];

    if (closes.length >= 14) {
      const gains: number[] = [];
      const losses: number[] = [];
      for (let i = closes.length - 14; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change >= 0) gains.push(change);
        else losses.push(Math.abs(change));
      }
      const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
      const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0.001;
      const rsi = 100 - 100 / (1 + avgGain / avgLoss);
      if (rsi < 30) signals.push("rsi_oversold");
      else if (rsi > 70) signals.push("rsi_overbought");
    }

    if (closes.length >= 26) {
      const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12;
      const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26;
      const macd = ema12 - ema26;
      const signalEma = closes.slice(-9).reduce((a, b) => a + b, 0) / 9;
      const macdSignal = signalEma;
      if (macd > macdSignal) signals.push("macd_bullish_crossover");
      else if (macd < macdSignal) signals.push("macd_bearish_crossover");
    }

    if (closes.length >= 20 && highs.length >= 20 && lows.length >= 20) {
      const midSma = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const stdev = Math.sqrt(
        closes.slice(-20).reduce((acc, c) => acc + (c - midSma) ** 2, 0) / 20,
      );
      const upper = midSma + 2 * stdev;
      const lower = midSma - 2 * stdev;
      if (price > upper) signals.push("bollinger_upper_breach");
      else if (price < lower) signals.push("bollinger_lower_breach");
    }

    const bullishCount = signals.filter((s) => s.includes("oversold") || s.includes("bullish") || s.includes("lower")).length;
    const bearishCount = signals.filter((s) => s.includes("overbought") || s.includes("bearish") || s.includes("upper")).length;
    const direction: "buy" | "sell" | "hold" = bullishCount > bearishCount ? "buy" : bearishCount > bullishCount ? "sell" : "hold";
    const confidence = Math.min((signals.length / 3) * 100, 100);
    const score = direction === "buy" ? 60 + confidence * 0.4
      : direction === "sell" ? 40 - confidence * 0.4
      : 50;

    return { score, confidence, direction, signals };
  }
}
