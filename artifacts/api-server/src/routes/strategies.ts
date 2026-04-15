import { Router } from "express";
import { db } from "@workspace/db";
import { customStrategiesTable, strategyBacktestRunsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";
import { resolveUserId } from "../lib/resolveUserId.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import { validateBody, z } from "../lib/validateRequest.js";
import { fetchStockUniverse } from "../lib/quantEngine/executionEngine.js";
import { runCustomStrategyBacktest, buildCustomSignal } from "../lib/quantEngine/strategyBridge.js";
import type { CustomStrategyConfig } from "../lib/quantEngine/strategyBridge.js";
import { invalidateCustomSignalCache } from "./quant.js";

const router = Router();

const strategyLogicSchema = z.object({
  entry: z.array(z.string()).default([]),
  exit: z.array(z.string()).default([]),
});

const createStrategySchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().default("1.0"),
  type: z.string().min(1),
  assets: z.array(z.string()).default([]),
  timeframes: z.array(z.string()).default(["1Day"]),
  parameters: z.record(z.number()).default({}),
  logic: strategyLogicSchema.default({ entry: [], exit: [] }),
  metadata: z.record(z.unknown()).default({}),
});

const updateStrategySchema = createStrategySchema.partial();

router.get("/strategies", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategies = await db
      .select()
      .from(customStrategiesTable)
      .where(eq(customStrategiesTable.userId, userId))
      .orderBy(desc(customStrategiesTable.updatedAt));
    res.json({ strategies });
  } catch (err) {
    logger.error({ err }, "GET /strategies failed");
    res.status(500).json({ error: "Failed to fetch strategies" });
  }
});

router.get("/strategies/signals", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);

    const activeStrategies = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.userId, userId), eq(customStrategiesTable.isActive, true)));

    if (activeStrategies.length === 0) {
      return res.json({ signals: [], meta: { count: 0, activeStrategies: 0 } });
    }

    const allSignals: {
      symbol: string;
      strategyId: string;
      strategyName: string;
      action: string;
      confidence: number;
    }[] = [];

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

      for (const [symbol, data] of stockData.entries()) {
        const signal = buildCustomSignal(config, symbol, data);
        if (signal.action !== "HOLD") {
          allSignals.push(signal);
        }
      }
    }

    logger.info({ userId, activeStrategies: activeStrategies.length, signals: allSignals.length }, "Custom strategy signals generated");

    res.json({
      signals: allSignals,
      meta: { count: allSignals.length, activeStrategies: activeStrategies.length },
    });
  } catch (err) {
    logger.error({ err }, "GET /strategies/signals failed");
    res.status(500).json({ error: "Failed to generate custom strategy signals" });
  }
});

router.get("/strategies/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [strategy] = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)));

    if (!strategy) return res.status(404).json({ error: "Strategy not found" });
    res.json({ strategy });
  } catch (err) {
    logger.error({ err }, "GET /strategies/:id failed");
    res.status(500).json({ error: "Failed to fetch strategy" });
  }
});

router.post("/strategies", requireAuth, validateBody(createStrategySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const body = req.body as z.infer<typeof createStrategySchema>;

    const [strategy] = await db
      .insert(customStrategiesTable)
      .values({
        userId,
        name: body.name,
        version: body.version,
        type: body.type,
        assets: body.assets,
        timeframes: body.timeframes,
        parameters: body.parameters,
        logic: body.logic,
        metadata: body.metadata,
        isActive: false,
      })
      .returning();

    invalidateCustomSignalCache(userId);
    res.status(201).json({ strategy });
  } catch (err) {
    logger.error({ err }, "POST /strategies failed");
    res.status(500).json({ error: "Failed to create strategy" });
  }
});

router.put("/strategies/:id", requireAuth, validateBody(updateStrategySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const body = req.body as z.infer<typeof updateStrategySchema>;

    const [strategy] = await db
      .update(customStrategiesTable)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)))
      .returning();

    if (!strategy) return res.status(404).json({ error: "Strategy not found" });
    invalidateCustomSignalCache(userId);
    res.json({ strategy });
  } catch (err) {
    logger.error({ err }, "PUT /strategies/:id failed");
    res.status(500).json({ error: "Failed to update strategy" });
  }
});

router.delete("/strategies/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [deleted] = await db
      .delete(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Strategy not found" });
    invalidateCustomSignalCache(userId);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /strategies/:id failed");
    res.status(500).json({ error: "Failed to delete strategy" });
  }
});

router.post("/strategies/:id/duplicate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [original] = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)));

    if (!original) return res.status(404).json({ error: "Strategy not found" });

    const [copy] = await db
      .insert(customStrategiesTable)
      .values({
        userId,
        name: `${original.name} (Copy)`,
        version: original.version as string,
        type: original.type,
        assets: original.assets as string[],
        timeframes: original.timeframes as string[],
        parameters: original.parameters as Record<string, number>,
        logic: original.logic as Record<string, unknown>,
        metadata: original.metadata as Record<string, unknown>,
        isActive: false,
        backtestResults: null,
      })
      .returning();

    invalidateCustomSignalCache(userId);
    res.status(201).json({ strategy: copy });
  } catch (err) {
    logger.error({ err }, "POST /strategies/:id/duplicate failed");
    res.status(500).json({ error: "Failed to duplicate strategy" });
  }
});

router.post("/strategies/:id/activate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [strategy] = await db
      .update(customStrategiesTable)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)))
      .returning();

    if (!strategy) return res.status(404).json({ error: "Strategy not found" });
    invalidateCustomSignalCache(userId);
    res.json({ strategy });
  } catch (err) {
    logger.error({ err }, "POST /strategies/:id/activate failed");
    res.status(500).json({ error: "Failed to activate strategy" });
  }
});

router.post("/strategies/:id/deactivate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [strategy] = await db
      .update(customStrategiesTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)))
      .returning();

    if (!strategy) return res.status(404).json({ error: "Strategy not found" });
    invalidateCustomSignalCache(userId);
    res.json({ strategy });
  } catch (err) {
    logger.error({ err }, "POST /strategies/:id/deactivate failed");
    res.status(500).json({ error: "Failed to deactivate strategy" });
  }
});

router.post("/strategies/:id/backtest", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [strategy] = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)));

    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const assets = (strategy.assets as string[]);
    if (assets.length === 0) {
      return res.status(400).json({ error: "Strategy has no assets configured" });
    }

    const timeframe = ((strategy.timeframes as string[])[0]) ?? "1Day";
    logger.info({ strategyId: id, assets, timeframe }, "Running backtest for custom strategy");

    const stockData = await fetchStockUniverse(assets, timeframe);

    if (stockData.size === 0) {
      return res.status(502).json({ error: "Unable to fetch historical data for the specified assets" });
    }

    const config = {
      id: strategy.id,
      name: strategy.name,
      type: strategy.type,
      assets: assets,
      timeframes: strategy.timeframes as string[],
      parameters: (strategy.parameters as Record<string, number>) ?? {},
      logic: (strategy.logic as { entry: string[]; exit: string[] }) ?? { entry: [], exit: [] },
      metadata: (strategy.metadata as Record<string, unknown>) ?? {},
    };

    const assetResults: Record<string, ReturnType<typeof runCustomStrategyBacktest>> = {};

    for (const [symbol, data] of stockData.entries()) {
      assetResults[symbol] = runCustomStrategyBacktest(config, data);
    }

    const symbols = Object.keys(assetResults);
    const allResults = Object.values(assetResults);
    const combined = {
      winRate: parseFloat((allResults.reduce((a, b) => a + b.winRate, 0) / allResults.length).toFixed(2)),
      avgReturn: parseFloat((allResults.reduce((a, b) => a + b.avgReturn, 0) / allResults.length).toFixed(3)),
      maxDrawdown: parseFloat((Math.max(...allResults.map(r => r.maxDrawdown))).toFixed(2)),
      totalTrades: allResults.reduce((a, b) => a + b.totalTrades, 0),
      equityCurve: allResults[0]?.equityCurve ?? [],
      equityCurveSymbol: symbols[0] ?? null,
      assetResults,
    };

    await db
      .update(customStrategiesTable)
      .set({ backtestResults: combined, updatedAt: new Date() })
      .where(and(eq(customStrategiesTable.id, id), eq(customStrategiesTable.userId, userId)));

    invalidateCustomSignalCache(userId);
    await db.insert(strategyBacktestRunsTable).values({
      strategyId: id,
      userId,
      assets: assets,
      timeframe: (strategy.timeframes as string[])[0] ?? "1Day",
      winRate: combined.winRate.toString(),
      avgReturn: combined.avgReturn.toString(),
      maxDrawdown: combined.maxDrawdown.toString(),
      totalTrades: combined.totalTrades.toString(),
      equityCurve: combined.equityCurve,
      rawResults: assetResults,
    });

    res.json({ results: combined });
  } catch (err) {
    logger.error({ err }, "POST /strategies/:id/backtest failed");
    res.status(500).json({ error: "Failed to run backtest" });
  }
});

router.get("/strategies/:id/backtest-history", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid strategy ID" });

    const runs = await db
      .select()
      .from(strategyBacktestRunsTable)
      .where(and(
        eq(strategyBacktestRunsTable.strategyId, id),
        eq(strategyBacktestRunsTable.userId, userId),
      ))
      .orderBy(desc(strategyBacktestRunsTable.ranAt))
      .limit(10);

    res.json({ runs });
  } catch (err) {
    logger.error({ err }, "GET /strategies/:id/backtest-history failed");
    res.status(500).json({ error: "Failed to fetch backtest history" });
  }
});

export default router;
