import { Router } from "express";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { customStrategiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { resolveUserId } from "../lib/resolveUserId.js";
import { runQuantEngine, getEngineStatus, getCachedSignals } from "../lib/quantEngine/index.js";
import { fetchStockUniverse } from "../lib/quantEngine/executionEngine.js";
import { buildCustomSignal } from "../lib/quantEngine/strategyBridge.js";
import type { CustomStrategyConfig } from "../lib/quantEngine/strategyBridge.js";
import type { SignalOpportunity } from "../lib/quantEngine/scorer.js";

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

router.post("/quant/run", async (req, res) => {
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

export default router;
