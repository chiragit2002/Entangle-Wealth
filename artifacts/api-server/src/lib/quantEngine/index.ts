import { logger } from "../logger.js";
import { TTLCache } from "../cache.js";
import { generateAllStrategies } from "./strategyGenerator.js";
import { fetchStockUniverse, runStrategiesOnUniverse } from "./executionEngine.js";
import { rankOpportunities } from "./scorer.js";
import type { SignalOpportunity } from "./scorer.js";

const STOCK_UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "AMD", "NFLX",
  "ADBE", "CRM", "INTU", "QCOM", "TXN", "AMAT", "LRCX", "KLAC", "MU", "ARM",
  "PLTR", "CRWD", "PANW", "ZS", "NET", "DDOG", "MDB", "SNOW", "NOW", "WDAY",
  "COIN", "HOOD", "SOFI", "SQ", "PYPL", "AFRM", "MARA", "RIVN", "LCID", "NIO",
  "SHOP", "MELI", "SE", "GRAB", "JD", "BABA", "UBER", "LYFT", "ABNB", "DKNG",
  "SMCI", "IONQ", "RGTI", "AI", "PATH", "U", "RBLX", "TTWO", "EA", "SPOT",
];

const CRYPTO_UNIVERSE = [
  "BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD",
  "AVAX/USD", "LINK/USD", "DOT/USD", "LTC/USD", "UNI/USD",
];

export interface EngineStatus {
  lastRunAt: string | null;
  nextRunAt: string | null;
  isRunning: boolean;
  stocksScanned: number;
  strategiesEvaluated: number;
  signalsGenerated: number;
  totalRunTimeMs: number;
  apiCallsMade: number;
  errors: number;
  runCount: number;
}

const signalsCache = new TTLCache<SignalOpportunity[]>(35 * 60 * 1000, 2, "quant-signals");
const SIGNALS_CACHE_KEY = "top100";

let engineStatus: EngineStatus = {
  lastRunAt: null,
  nextRunAt: null,
  isRunning: false,
  stocksScanned: 0,
  strategiesEvaluated: 0,
  signalsGenerated: 0,
  totalRunTimeMs: 0,
  apiCallsMade: 0,
  errors: 0,
  runCount: 0,
};

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function isMarketHours(): boolean {
  const now = new Date();
  const etOffset = -5;
  const utcHours = now.getUTCHours();
  const etHours = (utcHours + 24 + etOffset) % 24;
  const etMinutes = now.getUTCMinutes();
  const day = now.getUTCDay();

  if (day === 0 || day === 6) return false;

  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  const currentMinutes = etHours * 60 + etMinutes;

  return currentMinutes >= marketOpen - 30 && currentMinutes <= marketClose + 30;
}

export async function runQuantEngine(force: boolean = false): Promise<SignalOpportunity[]> {
  if (engineStatus.isRunning) {
    logger.info("Quant engine: already running, returning cached results");
    return signalsCache.get(SIGNALS_CACHE_KEY) ?? [];
  }

  const cached = signalsCache.get(SIGNALS_CACHE_KEY);
  if (cached && !force) {
    logger.info("Quant engine: returning cached signals");
    return cached;
  }

  engineStatus.isRunning = true;
  const startTime = Date.now();

  const FULL_UNIVERSE_SIZE = STOCK_UNIVERSE.length + CRYPTO_UNIVERSE.length;
  logger.info({ stockUniverse: STOCK_UNIVERSE.length, cryptoUniverse: CRYPTO_UNIVERSE.length, total: FULL_UNIVERSE_SIZE, force }, "Quant engine: starting run");

  try {
    const strategies = generateAllStrategies();
    const gridCount = strategies.filter(s => s.type === "RSI_EMA_GRID").length;
    logger.info({ strategies: strategies.length, gridStrategies: gridCount, baseStrategies: strategies.length - gridCount }, "Quant engine: system strategies loaded");

    const FULL_UNIVERSE = [...STOCK_UNIVERSE, ...CRYPTO_UNIVERSE];
    const stockData = await fetchStockUniverse(FULL_UNIVERSE);
    engineStatus.apiCallsMade += Math.ceil(FULL_UNIVERSE.length / 10);

    if (stockData.size === 0) {
      logger.warn("Quant engine: no stock data fetched, aborting");
      engineStatus.errors++;
      return signalsCache.get(SIGNALS_CACHE_KEY) ?? [];
    }

    const rawResults = await runStrategiesOnUniverse(stockData, strategies);

    const signals = rankOpportunities(rawResults, 3, 100);

    const elapsed = Date.now() - startTime;

    engineStatus.lastRunAt = new Date().toISOString();
    engineStatus.stocksScanned = stockData.size;
    engineStatus.strategiesEvaluated = strategies.length * stockData.size;
    engineStatus.signalsGenerated = rawResults.filter(r => r.result.action !== "HOLD").length;
    engineStatus.totalRunTimeMs = elapsed;
    engineStatus.runCount++;

    signalsCache.set(SIGNALS_CACHE_KEY, signals);

    const nextRun = new Date(Date.now() + 30 * 60 * 1000);
    engineStatus.nextRunAt = nextRun.toISOString();

    logger.info({
      elapsed,
      stocksScanned: stockData.size,
      strategiesEvaluated: engineStatus.strategiesEvaluated,
      signalsGenerated: engineStatus.signalsGenerated,
      topSignals: signals.length,
    }, "Quant engine: run complete");

    return signals;
  } catch (err) {
    engineStatus.errors++;
    logger.error({ err }, "Quant engine: fatal error during run");
    return signalsCache.get(SIGNALS_CACHE_KEY) ?? [];
  } finally {
    engineStatus.isRunning = false;
  }
}

export function getEngineStatus(): EngineStatus {
  return { ...engineStatus };
}

export function getCachedSignals(): SignalOpportunity[] {
  return signalsCache.get(SIGNALS_CACHE_KEY) ?? [];
}

export function startScheduler(): void {
  if (schedulerInterval) return;

  const INTERVAL_MS = 30 * 60 * 1000;

  logger.info("Quant engine: scheduler started (30-min interval)");

  setTimeout(() => {
    if (isMarketHours()) {
      logger.info("Quant engine: initial run on startup (market hours)");
      runQuantEngine(false).catch(err => logger.error({ err }, "Quant engine: initial run failed"));
    }
  }, 5_000);

  schedulerInterval = setInterval(() => {
    if (isMarketHours()) {
      logger.info("Quant engine: scheduled run triggered");
      runQuantEngine(false).catch(err => logger.error({ err }, "Quant engine: scheduled run failed"));
    } else {
      logger.info("Quant engine: outside market hours, skipping scheduled run");
    }
  }, INTERVAL_MS);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info("Quant engine: scheduler stopped");
  }
}
