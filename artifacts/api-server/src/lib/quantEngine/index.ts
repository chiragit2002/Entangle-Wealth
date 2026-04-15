import { logger } from "../logger.js";
import { TTLCache } from "../cache.js";
import { db } from "@workspace/db";
import { quantEngineRunsTable } from "@workspace/db/schema";
import { desc } from "drizzle-orm";
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
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;

  const etFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = etFormatter.formatToParts(now);
  const etHours = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const etMinutes = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);

  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  const currentMinutes = etHours * 60 + etMinutes;

  return currentMinutes >= marketOpen - 30 && currentMinutes <= marketClose + 30;
}

async function persistRunResult(
  stocksScanned: number,
  strategiesEvaluated: number,
  signalsGenerated: number,
  errorCount: number,
  runTimeMs: number,
  topSignals: SignalOpportunity[],
  timeframesUsed: string[],
): Promise<void> {
  try {
    await db.insert(quantEngineRunsTable).values({
      stocksScanned,
      strategiesEvaluated,
      signalsGenerated,
      errorCount,
      runTimeMs,
      topSignals: topSignals.slice(0, 20) as object[],
      timeframesUsed,
    });
  } catch (err) {
    logger.warn({ err }, "Quant engine: failed to persist run result to DB");
  }
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
  let errorCount = 0;

  const FULL_UNIVERSE_SIZE = STOCK_UNIVERSE.length + CRYPTO_UNIVERSE.length;
  logger.info({ stockUniverse: STOCK_UNIVERSE.length, cryptoUniverse: CRYPTO_UNIVERSE.length, total: FULL_UNIVERSE_SIZE, force }, "Quant engine: starting run");

  try {
    const allStrategies = generateAllStrategies();
    const dailyStrategies = allStrategies.filter(s => !s.timeframe || s.timeframe === "1Day");
    const hourlyStrategies = allStrategies.filter(s => s.timeframe === "1Hour");
    const gridCount = allStrategies.filter(s => s.type === "RSI_EMA_GRID").length;
    logger.info(
      { total: allStrategies.length, daily: dailyStrategies.length, hourly: hourlyStrategies.length, gridStrategies: gridCount },
      "Quant engine: strategies loaded",
    );

    const FULL_UNIVERSE = [...STOCK_UNIVERSE, ...CRYPTO_UNIVERSE];
    const timeframesUsed: string[] = ["1Day"];
    const [dailyStockData, hourlyStockData] = await Promise.all([
      fetchStockUniverse(FULL_UNIVERSE, "1Day"),
      hourlyStrategies.length > 0 ? fetchStockUniverse(STOCK_UNIVERSE, "1Hour") : Promise.resolve(new Map()),
    ]);
    engineStatus.apiCallsMade += Math.ceil(FULL_UNIVERSE.length / 10) + (hourlyStrategies.length > 0 ? Math.ceil(STOCK_UNIVERSE.length / 10) : 0);

    if (hourlyStockData.size > 0) timeframesUsed.push("1Hour");

    if (dailyStockData.size === 0 && hourlyStockData.size === 0) {
      logger.warn("Quant engine: no stock data fetched, aborting");
      errorCount++;
      engineStatus.errors += errorCount;
      return signalsCache.get(SIGNALS_CACHE_KEY) ?? [];
    }

    const [dailyRawResults, hourlyRawResults] = await Promise.all([
      dailyStockData.size > 0 && dailyStrategies.length > 0
        ? runStrategiesOnUniverse(dailyStockData, dailyStrategies)
        : Promise.resolve([]),
      hourlyStockData.size > 0 && hourlyStrategies.length > 0
        ? runStrategiesOnUniverse(hourlyStockData, hourlyStrategies)
        : Promise.resolve([]),
    ]);

    const allRawResults = [...dailyRawResults, ...hourlyRawResults];
    const signals = rankOpportunities(allRawResults, 3, 100);

    const elapsed = Date.now() - startTime;
    const totalStocksScanned = dailyStockData.size;
    const totalStrategiesEvaluated = (dailyStrategies.length * dailyStockData.size) + (hourlyStrategies.length * hourlyStockData.size);
    const signalsGenerated = allRawResults.filter(r => r.result.action !== "HOLD").length;

    engineStatus.lastRunAt = new Date().toISOString();
    engineStatus.stocksScanned = totalStocksScanned;
    engineStatus.strategiesEvaluated = totalStrategiesEvaluated;
    engineStatus.signalsGenerated = signalsGenerated;
    engineStatus.totalRunTimeMs = elapsed;
    engineStatus.runCount++;

    signalsCache.set(SIGNALS_CACHE_KEY, signals);

    const nextRun = new Date(Date.now() + 30 * 60 * 1000);
    engineStatus.nextRunAt = nextRun.toISOString();

    logger.info({
      elapsed,
      stocksScanned: totalStocksScanned,
      strategiesEvaluated: totalStrategiesEvaluated,
      signalsGenerated,
      topSignals: signals.length,
      timeframesUsed,
    }, "Quant engine: run complete");

    persistRunResult(
      totalStocksScanned,
      totalStrategiesEvaluated,
      signalsGenerated,
      errorCount,
      elapsed,
      signals,
      timeframesUsed,
    ).catch(() => {});

    return signals;
  } catch (err) {
    errorCount++;
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

export async function getHistoricalRuns(limit = 20) {
  try {
    return await db
      .select()
      .from(quantEngineRunsTable)
      .orderBy(desc(quantEngineRunsTable.runAt))
      .limit(limit);
  } catch (err) {
    logger.error({ err }, "Quant engine: failed to fetch historical runs");
    return [];
  }
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
