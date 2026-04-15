import { Router } from "express";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth.js";
import { customStrategiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { resolveUserId } from "../lib/resolveUserId.js";
import { runQuantEngine, getEngineStatus, getCachedSignals, getHistoricalRuns } from "../lib/quantEngine/index.js";
import { fetchStockUniverse } from "../lib/quantEngine/executionEngine.js";
import { buildCustomSignal } from "../lib/quantEngine/strategyBridge.js";
import type { CustomStrategyConfig } from "../lib/quantEngine/strategyBridge.js";
import type { SignalOpportunity } from "../lib/quantEngine/scorer.js";
import { RegimeAgent } from "../lib/agents/RegimeAgent.js";
import { VolatilityAgent } from "../lib/agents/VolatilityAgent.js";
import { LiquidityAgent } from "../lib/agents/LiquidityAgent.js";
import { StrategyAgent } from "../lib/agents/StrategyAgent.js";
import { RiskAgent } from "../lib/agents/RiskAgent.js";
import { ExecutionAgent } from "../lib/agents/ExecutionAgent.js";
import { KillSwitchAgent } from "../lib/agents/KillSwitchAgent.js";
import { DriftAgent } from "../lib/agents/DriftAgent.js";
import { EnsembleAgent } from "../lib/agents/EnsembleAgent.js";
import { AllocationAgent } from "../lib/agents/AllocationAgent.js";
import { Orchestrator } from "../lib/agents/Orchestrator.js";
import { FinalArbiter } from "../lib/agents/FinalArbiter.js";
import type { OrchestratorInput } from "../lib/agents/Orchestrator.js";
import { runExecutionLoop, asyncIterableFromArray } from "../lib/executionLoop.js";
import { AlpacaExchangeAdapter } from "../lib/exchange/AlpacaExchangeAdapter.js";
import { MockExchange } from "../lib/exchange/MockExchange.js";

const regimeAgent = new RegimeAgent();
const volatilityAgent = new VolatilityAgent();
const liquidityAgent = new LiquidityAgent();
const strategyAgent = new StrategyAgent();
const riskAgent = new RiskAgent();
const executionAgent = new ExecutionAgent();
const killSwitchAgent = new KillSwitchAgent();
const driftAgent = new DriftAgent();
const ensembleAgent = new EnsembleAgent();
const allocationAgent = new AllocationAgent();
const orchestrator = new Orchestrator(
  regimeAgent,
  volatilityAgent,
  liquidityAgent,
  strategyAgent,
  riskAgent,
  executionAgent,
  killSwitchAgent,
  driftAgent,
  ensembleAgent,
  allocationAgent,
);
const finalArbiter = new FinalArbiter(10);

const router = Router();

const CUSTOM_SIGNAL_CACHE_TTL_MS = 5 * 60 * 1000;
const customSignalCache = new Map<string, { signals: SignalOpportunity[]; at: number }>();

export function invalidateCustomSignalCache(userId: string): void {
  customSignalCache.delete(userId);
}

async function getCustomSignalsForRequest(req: Request): Promise<SignalOpportunity[]> {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) return [];

    const userId = await resolveUserId(clerkUserId);
    if (!userId) return [];

    const cached = customSignalCache.get(userId);
    if (cached && Date.now() - cached.at < CUSTOM_SIGNAL_CACHE_TTL_MS) {
      return cached.signals;
    }

    const activeStrategies = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.userId, userId), eq(customStrategiesTable.isActive, true)));

    if (activeStrategies.length === 0) return [];

    const customSignals: SignalOpportunity[] = [];

    for (const strategy of activeStrategies) {
      const assets = strategy.assets as string[];
      if (assets.length === 0) continue;
      const timeframe = ((strategy.timeframes as string[])[0]) ?? "1Day";
      const stockData = await fetchStockUniverse(assets, timeframe);

      const config: CustomStrategyConfig = {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        assets,
        timeframes: strategy.timeframes as string[],
        parameters: (strategy.parameters as Record<string, number>) ?? {},
        logic: (strategy.logic as { entry: string[]; exit: string[] }) ?? { entry: [], exit: [] },
        metadata: (strategy.metadata as Record<string, unknown>) ?? {},
      };

      const bt = strategy.backtestResults as { winRate?: number; avgReturn?: number; maxDrawdown?: number } | null;
      const winRate = Math.min(100, Math.max(0, bt?.winRate ?? 50));
      const expectedReturn = bt?.avgReturn ?? 0;
      const maxDrawdown = Math.min(100, Math.max(0, bt?.maxDrawdown ?? 0));
      const riskScore = Math.min(100, Math.max(0, 20 + maxDrawdown * 0.5));

      const returnScore = Math.min(100, Math.max(0, expectedReturn * 10 + 50));
      const drawdownScore = Math.min(100, Math.max(0, 100 - maxDrawdown * 2));
      const riskLevelScore = Math.min(100, Math.max(0, 100 - riskScore));
      const riskLevel: "LOW" | "MEDIUM" | "HIGH" = riskScore < 33 ? "LOW" : riskScore < 66 ? "MEDIUM" : "HIGH";

      for (const [symbol, data] of stockData.entries()) {
        const sig = buildCustomSignal(config, symbol, data);
        if (sig.action !== "HOLD") {
          const score = parseFloat((
            returnScore * 0.30 +
            winRate * 0.25 +
            sig.confidence * 0.20 +
            drawdownScore * 0.15 +
            riskLevelScore * 0.10
          ).toFixed(2));
          customSignals.push({
            symbol: sig.symbol,
            action: sig.action,
            confidence: sig.confidence,
            expectedReturn: parseFloat(expectedReturn.toFixed(2)),
            riskScore: parseFloat(riskScore.toFixed(1)),
            winRate: parseFloat(winRate.toFixed(1)),
            maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
            score,
            strategyId: sig.strategyId,
            strategyName: sig.strategyName,
            riskLevel,
          });
        }
      }
    }

    customSignalCache.set(userId, { signals: customSignals, at: Date.now() });
    logger.info({ userId, count: customSignals.length }, "Custom strategy signals merged into quant signals");
    return customSignals;
  } catch (err) {
    logger.warn({ err }, "GET /quant/signals: failed to load custom signals, continuing without them");
    return [];
  }
}

router.get("/quant/signals", async (req, res) => {
  try {
    const [systemSignals, customSignals] = await Promise.all([
      (async () => {
        const cached = getCachedSignals();
        if (cached.length > 0) return cached;
        return runQuantEngine(false);
      })(),
      getCustomSignalsForRequest(req),
    ]);

    const allSignals = [...customSignals, ...systemSignals];

    res.json({
      signals: allSignals,
      meta: {
        count: allSignals.length,
        systemCount: systemSignals.length,
        customCount: customSignals.length,
        generatedAt: getEngineStatus().lastRunAt,
        cached: getCachedSignals().length > 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /quant/signals failed");
    res.status(502).json({ error: "Failed to fetch quant signals" });
  }
});

router.get("/quant/status", (_req, res) => {
  try {
    const status = getEngineStatus();
    res.json(status);
  } catch (err) {
    logger.error({ err }, "GET /quant/status failed");
    res.status(500).json({ error: "Failed to get engine status" });
  }
});

router.post("/quant/run", requireAuth, async (req, res) => {
  try {
    const status = getEngineStatus();
    if (status.isRunning) {
      res.status(409).json({ error: "Engine is already running", status });
      return;
    }

    logger.info("POST /quant/run: manual trigger");

    res.json({ message: "Engine run triggered", status: getEngineStatus() });

    runQuantEngine(true).catch(err =>
      logger.error({ err }, "POST /quant/run: background run failed"),
    );
  } catch (err) {
    logger.error({ err }, "POST /quant/run failed");
    res.status(500).json({ error: "Failed to trigger engine run" });
  }
});

function deriveAction(closes: number[]): "buy" | "sell" | "hold" {
  if (closes.length < 26) return "hold";
  const price = closes[closes.length - 1];
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12;
  const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26;
  const macdLine = ema12 - ema26;
  const gains = [];
  const losses = [];
  for (let i = closes.length - 15; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains.push(change);
    else losses.push(Math.abs(change));
  }
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0.001;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  let bullish = 0;
  let bearish = 0;
  if (price > sma20) bullish++; else bearish++;
  if (macdLine > 0) bullish++; else bearish++;
  if (rsi < 40) bullish++;
  if (rsi > 60) bearish++;

  if (bullish > bearish + 1) return "buy";
  if (bearish > bullish + 1) return "sell";
  return "hold";
}

router.post("/quant/orchestrate", async (req, res) => {
  try {
    const { symbols, timeframes, topN } = req.body as {
      symbols?: string[];
      timeframes?: string[];
      topN?: number;
    };

    const targetSymbols: string[] = Array.isArray(symbols) && symbols.length > 0
      ? symbols.slice(0, 20).map((s: string) => String(s).toUpperCase())
      : ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"];

    const targetTimeframes: string[] = Array.isArray(timeframes) && timeframes.length > 0
      ? timeframes.slice(0, 3)
      : ["1Day"];

    const arbiter = topN && typeof topN === "number" ? new FinalArbiter(Math.min(topN, 50)) : finalArbiter;

    logger.info({ symbols: targetSymbols, timeframes: targetTimeframes }, "POST /quant/orchestrate: starting");

    const ohlcvByTimeframe = new Map<string, Map<string, import("../lib/quantEngine/strategyGenerator.js").OHLCVData>>();
    await Promise.all(
      targetTimeframes.map(async tf => {
        const stockDataForTf = await fetchStockUniverse(targetSymbols, tf);
        ohlcvByTimeframe.set(tf, stockDataForTf);
      }),
    );

    const inputs: OrchestratorInput[] = [];
    for (const symbol of targetSymbols) {
      for (const tf of targetTimeframes) {
        const tfData = ohlcvByTimeframe.get(tf);
        const ohlcv = tfData?.get(symbol);
        if (!ohlcv || ohlcv.closes.length < 20) continue;
        const action = deriveAction(ohlcv.closes);
        inputs.push({
          strategyId: `sys:${symbol}:${tf}`,
          symbol,
          timeframe: tf,
          action,
          ohlcv,
        });
      }
    }

    if (inputs.length === 0) {
      res.status(502).json({ error: "No market data available for requested symbols" });
      return;
    }

    const orchestratorResults = await orchestrator.runMulti(inputs);
    const output = arbiter.arbitrate(orchestratorResults);

    const symbolsFetched = new Set(
      [...ohlcvByTimeframe.values()].flatMap(m => [...m.keys()]),
    ).size;

    logger.info({
      symbols: targetSymbols.length,
      timeframes: targetTimeframes.length,
      evaluated: orchestratorResults.length,
      top: output.topStrategies.length,
    }, "POST /quant/orchestrate: complete");

    res.json({
      ...output,
      meta: {
        symbolsRequested: targetSymbols.length,
        symbolsFetched,
        timeframes: targetTimeframes,
        inputsEvaluated: inputs.length,
      },
    });
  } catch (err) {
    logger.error({ err }, "POST /quant/orchestrate failed");
    res.status(500).json({ error: "Orchestration failed" });
  }
});

router.get("/quant/runs", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt((req.query.limit as string) || "20", 10));
    const runs = await getHistoricalRuns(limit);
    res.json({ runs, count: runs.length });
  } catch (err) {
    logger.error({ err }, "GET /quant/runs failed");
    res.status(500).json({ error: "Failed to fetch historical runs" });
  }
});

router.post("/quant/execute", requireAuth, async (req, res) => {
  try {
    const {
      symbols,
      timeframes,
      mock = false,
      shareSize = 1,
      stopOnError = false,
    } = req.body as {
      symbols?: string[];
      timeframes?: string[];
      mock?: boolean;
      shareSize?: number;
      stopOnError?: boolean;
    };

    const targetSymbols: string[] = Array.isArray(symbols) && symbols.length > 0
      ? symbols.slice(0, 10).map((s: string) => String(s).toUpperCase())
      : ["AAPL", "MSFT", "NVDA"];

    const targetTimeframes: string[] = Array.isArray(timeframes) && timeframes.length > 0
      ? timeframes.slice(0, 2)
      : ["1Day"];

    const alpacaKey = process.env.ALPACA_KEY_ID || process.env.ALPACA_API_KEY || "";
    const alpacaSecret = process.env.ALPACA_API_SECRET || "";
    const hasAlpacaCreds = alpacaKey.startsWith("PK") && alpacaSecret.length > 30;
    const useMock = mock || !hasAlpacaCreds;
    const adapter = useMock ? new MockExchange() : new AlpacaExchangeAdapter();

    logger.info(
      { symbols: targetSymbols, timeframes: targetTimeframes, useMock, shareSize },
      "POST /quant/execute: starting execution loop",
    );

    const ohlcvByTimeframe = new Map<string, Map<string, import("../lib/quantEngine/strategyGenerator.js").OHLCVData>>();
    await Promise.all(
      targetTimeframes.map(async tf => {
        const stockDataForTf = await fetchStockUniverse(targetSymbols, tf);
        ohlcvByTimeframe.set(tf, stockDataForTf);
      }),
    );

    const inputs: OrchestratorInput[] = [];
    for (const symbol of targetSymbols) {
      for (const tf of targetTimeframes) {
        const tfData = ohlcvByTimeframe.get(tf);
        const ohlcv = tfData?.get(symbol);
        if (!ohlcv || ohlcv.closes.length < 20) continue;
        const action = deriveAction(ohlcv.closes);
        inputs.push({
          strategyId: `exec:${symbol}:${tf}`,
          symbol,
          timeframe: tf,
          action,
          ohlcv,
        });
      }
    }

    if (inputs.length === 0) {
      res.status(502).json({ error: "No market data available for requested symbols" });
      return;
    }

    const loopResults = await runExecutionLoop(
      orchestrator,
      executionAgent,
      adapter,
      asyncIterableFromArray(inputs),
      { defaultShareSize: Math.max(1, Math.min(shareSize, 1000)), stopOnError },
    );

    const routed = loopResults.filter(r => r.outcome.routed);
    const blocked = loopResults.filter(r => !r.outcome.routed);

    logger.info(
      { total: loopResults.length, routed: routed.length, blocked: blocked.length, useMock },
      "POST /quant/execute: complete",
    );

    res.json({
      usedMockExchange: useMock,
      total: loopResults.length,
      routedCount: routed.length,
      blockedCount: blocked.length,
      results: loopResults.map(r => ({
        strategyId: r.input.strategyId,
        symbol: r.input.symbol,
        timeframe: r.input.timeframe,
        action: r.orchestratorResult?.decision?.action ?? null,
        score: r.orchestratorResult?.decision?.score ?? null,
        rationale: r.orchestratorResult?.decision?.rationale ?? null,
        killSwitchOverridden: r.killSwitchOverridden,
        killSwitchReasons: r.orchestratorResult?.killSwitch?.reasons ?? [],
        routed: r.outcome.routed,
        orderResult: r.outcome.routed ? r.outcome.orderResult : null,
        blockedReason: !r.outcome.routed ? r.outcome.reason : null,
        durationMs: r.durationMs,
        timestamp: r.timestamp,
      })),
    });
  } catch (err) {
    logger.error({ err }, "POST /quant/execute failed");
    res.status(500).json({ error: "Execution loop failed" });
  }
});

export default router;
