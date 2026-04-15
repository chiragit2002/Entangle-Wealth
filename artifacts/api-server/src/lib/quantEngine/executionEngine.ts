import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../logger.js";
import type { OHLCVData, StrategyDescriptor } from "./strategyGenerator.js";
import type { RawResult } from "./scorer.js";

const __currentFile = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__currentFile);

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const BATCH_SIZE = 10;
const CRYPTO_BATCH_SIZE = 5;
const WORKER_COUNT = 8;
const BARS_LIMIT = 200;

export function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes("/");
}

function getAlpacaHeaders(): Record<string, string> {
  const candidates = [
    process.env.ALPACA_KEY_ID || "",
    process.env.ALPACA_API_KEY || "",
    process.env.ALPACA_API_SECRET || "",
  ].filter(Boolean);
  const keyId = candidates.find(v => v.startsWith("PK")) || candidates[0] || "";
  const secretKey = candidates.find(v => !v.startsWith("PK") && v.length > 30) || candidates[1] || "";
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secretKey,
    "Accept": "application/json",
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function alpacaTimeframe(tf: string): string {
  if (tf === "1Hour") return "1Hour";
  if (tf === "1Week") return "1Week";
  return "1Day";
}

async function fetchBarsForSymbols(symbols: string[], timeframe = "1Day"): Promise<Map<string, OHLCVData>> {
  const result = new Map<string, OHLCVData>();
  if (symbols.length === 0) return result;

  const tf = alpacaTimeframe(timeframe);
  const url = `${ALPACA_DATA_URL}/v2/stocks/bars?symbols=${encodeURIComponent(symbols.join(","))}&timeframe=${tf}&limit=${BARS_LIMIT}&adjustment=split&feed=iex&sort=asc`;

  try {
    const res = await fetch(url, {
      headers: getAlpacaHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "Quant engine: multi-bars fetch non-OK");
      return result;
    }

    const data = await res.json() as { bars?: Record<string, { o: number; h: number; l: number; c: number; v: number; t: string }[]> };
    const bars = data.bars ?? {};

    for (const [symbol, barList] of Object.entries(bars)) {
      if (barList.length < 60) continue;
      const ohlcv: OHLCVData = {
        opens: barList.map(b => b.o),
        highs: barList.map(b => b.h),
        lows: barList.map(b => b.l),
        closes: barList.map(b => b.c),
        volumes: barList.map(b => b.v),
      };
      result.set(symbol, ohlcv);
    }
  } catch (err) {
    logger.error({ err, symbols: symbols.slice(0, 3) }, "Quant engine: equity bars fetch failed");
  }

  return result;
}

async function fetchCryptoBarsForSymbols(symbols: string[], timeframe = "1Day"): Promise<Map<string, OHLCVData>> {
  const result = new Map<string, OHLCVData>();
  if (symbols.length === 0) return result;

  const tf = alpacaTimeframe(timeframe);
  const url = `${ALPACA_DATA_URL}/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(symbols.join(","))}&timeframe=${tf}&limit=${BARS_LIMIT}&sort=asc`;

  try {
    const res = await fetch(url, {
      headers: getAlpacaHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, "Quant engine: crypto bars fetch non-OK");
      return result;
    }

    const data = await res.json() as { bars?: Record<string, { o: number; h: number; l: number; c: number; v: number; t: string }[]> };
    const bars = data.bars ?? {};

    for (const [symbol, barList] of Object.entries(bars)) {
      if (barList.length < 60) continue;
      const ohlcv: OHLCVData = {
        opens: barList.map(b => b.o),
        highs: barList.map(b => b.h),
        lows: barList.map(b => b.l),
        closes: barList.map(b => b.c),
        volumes: barList.map(b => b.v),
      };
      result.set(symbol, ohlcv);
    }
  } catch (err) {
    logger.error({ err, symbols: symbols.slice(0, 3) }, "Quant engine: crypto bars fetch failed");
  }

  return result;
}

export async function fetchStockUniverse(symbols: string[], timeframe = "1Day"): Promise<Map<string, OHLCVData>> {
  const allData = new Map<string, OHLCVData>();

  const equitySymbols = symbols.filter(s => !isCryptoSymbol(s));
  const cryptoSymbols = symbols.filter(s => isCryptoSymbol(s));

  const equityBatches: string[][] = [];
  for (let i = 0; i < equitySymbols.length; i += BATCH_SIZE) {
    equityBatches.push(equitySymbols.slice(i, i + BATCH_SIZE));
  }

  const cryptoBatches: string[][] = [];
  for (let i = 0; i < cryptoSymbols.length; i += CRYPTO_BATCH_SIZE) {
    cryptoBatches.push(cryptoSymbols.slice(i, i + CRYPTO_BATCH_SIZE));
  }

  logger.info({
    totalSymbols: symbols.length,
    equityBatches: equityBatches.length,
    cryptoBatches: cryptoBatches.length,
    timeframe,
  }, "Quant engine: fetching OHLCV data");

  for (let i = 0; i < equityBatches.length; i++) {
    const batchData = await fetchBarsForSymbols(equityBatches[i], timeframe);
    for (const [sym, data] of batchData) allData.set(sym, data);
    if (i < equityBatches.length - 1) await sleep(300);
  }

  for (let i = 0; i < cryptoBatches.length; i++) {
    const batchData = await fetchCryptoBarsForSymbols(cryptoBatches[i], timeframe);
    for (const [sym, data] of batchData) allData.set(sym, data);
    if (i < cryptoBatches.length - 1) await sleep(300);
  }

  logger.info({ fetched: allData.size, requested: symbols.length }, "Quant engine: OHLCV fetch complete");
  return allData;
}

function runWorker(
  stocks: { symbol: string; data: OHLCVData }[],
  strategies: StrategyDescriptor[],
  workerId: number,
): Promise<RawResult[]> {
  return new Promise((resolve, reject) => {
    const workerPath = path.resolve(__dirname, "lib", "quantEngine", "strategyWorker.mjs");

    const worker = new Worker(workerPath, {
      workerData: { stocks, strategies, workerId },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      logger.warn({ workerId }, "Quant worker timed out, terminating");
      resolve([]);
    }, 120_000);

    worker.on("message", (msg: { results: { symbol: string; strategyId: string; strategyName: string; action: string; confidence: number; expectedReturn: number; riskScore: number; winRate: number; maxDrawdown: number }[]; workerId: number; elapsed: number; error?: string }) => {
      clearTimeout(timeout);
      if (msg.error) {
        logger.error({ error: msg.error, workerId }, "Quant worker error");
        resolve([]);
        return;
      }
      logger.info({ workerId: msg.workerId, elapsed: msg.elapsed, signals: msg.results.length }, "Quant worker complete");
      resolve(msg.results.map(r => ({
        symbol: r.symbol,
        strategyId: r.strategyId,
        strategyName: r.strategyName,
        result: {
          action: r.action as "BUY" | "SELL" | "HOLD",
          confidence: r.confidence,
          expectedReturn: r.expectedReturn,
          riskScore: r.riskScore,
          winRate: r.winRate,
          maxDrawdown: r.maxDrawdown,
        },
      })));
    });

    worker.on("error", (err) => {
      clearTimeout(timeout);
      logger.error({ err, workerId }, "Quant worker threw error");
      resolve([]);
    });

    worker.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        logger.warn({ code, workerId }, "Quant worker exited with non-zero code");
      }
    });
  });
}

export async function runStrategiesOnUniverse(
  stockData: Map<string, OHLCVData>,
  strategies: StrategyDescriptor[],
): Promise<RawResult[]> {
  const stocks = Array.from(stockData.entries()).map(([symbol, data]) => ({ symbol, data }));

  if (stocks.length === 0) {
    logger.warn("Quant engine: no stocks with sufficient data");
    return [];
  }

  const chunkSize = Math.ceil(stocks.length / WORKER_COUNT);
  const chunks: { symbol: string; data: OHLCVData }[][] = [];
  for (let i = 0; i < stocks.length; i += chunkSize) {
    chunks.push(stocks.slice(i, i + chunkSize));
  }

  const strategyChunkSize = Math.ceil(strategies.length / WORKER_COUNT);
  const strategyChunks: StrategyDescriptor[][] = [];
  for (let i = 0; i < strategies.length; i += strategyChunkSize) {
    strategyChunks.push(strategies.slice(i, i + strategyChunkSize));
  }

  logger.info({
    stocks: stocks.length,
    strategies: strategies.length,
    workers: Math.min(WORKER_COUNT, chunks.length),
  }, "Quant engine: distributing work to workers");

  const startTime = Date.now();
  const workerPromises = chunks.map((chunk, idx) =>
    runWorker(chunk, strategies, idx),
  );

  const workerResults = await Promise.all(workerPromises);
  const allResults = workerResults.flat();

  const elapsed = Date.now() - startTime;
  logger.info({
    elapsed,
    totalSignals: allResults.length,
    stocks: stocks.length,
    strategies: strategies.length,
  }, "Quant engine: parallel execution complete");

  return allResults;
}
