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
}
