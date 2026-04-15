import { Router } from "express";
import { db } from "@workspace/db";
import { strategyEvaluationsTable, customStrategiesTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";
import { resolveUserId } from "../lib/resolveUserId.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import { validateBody, z } from "../lib/validateRequest.js";
import { fetchStockUniverse } from "../lib/quantEngine/executionEngine.js";
import type { CustomStrategyConfig } from "../lib/quantEngine/strategyBridge.js";
import type { OHLCVData } from "../lib/quantEngine/strategyGenerator.js";
import {
  executeEvaluation,
  runStressTest,
  runRefinement,
  generateSummary,
  computeModelScores,
  totalScore,
  computeConfidence,
  MODEL_NAMES,
} from "../lib/evaluationPipeline.js";

const router = Router();

function generateJobId(): string {
  const chars = "abcdef0123456789";
  let id = "job_";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const submitEvalSchema = z.object({
  strategy_id: z.number(),
  dataset: z.object({
    range: z.string().default("1y"),
    resolution: z.string().default("1m"),
  }).default({}),
  options: z.object({
    run_stress: z.boolean().default(false),
    run_refinement: z.boolean().default(false),
  }).default({}),
});

router.post("/evaluate", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const parsed = submitEvalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;

    const [strategy] = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, body.strategy_id), eq(customStrategiesTable.userId, userId)))
      .limit(1);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    const jobId = generateJobId();

    await db.insert(strategyEvaluationsTable).values({
      jobId,
      strategyId: body.strategy_id,
      userId,
      status: "queued",
      datasetRange: body.dataset.range,
      datasetResolution: body.dataset.resolution,
      runStress: body.options.run_stress,
      runRefinement: body.options.run_refinement,
    });

    setImmediate(() => {
      executeEvaluation(jobId).catch(err => {
        logger.error({ err, jobId }, "Background evaluation failed");
      });
    });

    res.json({ job_id: jobId, status: "queued" });
  } catch (err) {
    logger.error({ err }, "POST /evaluate failed");
    res.status(500).json({ error: "Failed to submit evaluation" });
  }
});

router.get("/evaluate/rankings", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const asset = req.query.asset as string | undefined;
    const timeframe = req.query.timeframe as string | undefined;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 10, 50));

    const results = await db
      .select()
      .from(strategyEvaluationsTable)
      .where(eq(strategyEvaluationsTable.status, "completed"))
      .orderBy(desc(strategyEvaluationsTable.scoreTotal))
      .limit(100);

    const strategyIds = [...new Set(results.map(r => r.strategyId).filter(Boolean))];
    const strategies = strategyIds.length > 0
      ? await db.select().from(customStrategiesTable).where(
          sql`${customStrategiesTable.id} IN (${sql.join(strategyIds.map(id => sql`${id}`), sql`, `)})`
        )
      : [];

    const strategyMap = new Map(strategies.map(s => [s.id, s]));

    let ranked = results
      .map(r => {
        const strat = r.strategyId ? strategyMap.get(r.strategyId) : null;
        const stratAssets = (strat?.assets as string[]) ?? [];
        const stratTimeframes = (strat?.timeframes as string[]) ?? [];
        return {
          strategy_id: r.strategyId,
          strategy_name: strat?.name ?? "Unknown",
          score: r.scoreTotal ?? 0,
          confidence: r.confidence ?? 0,
          _assets: stratAssets,
          _timeframes: stratTimeframes,
        };
      })
      .filter(r => !asset || r._assets.includes(asset))
      .filter(r => !timeframe || r._timeframes.includes(timeframe))
      .slice(0, limit);

    const rankings = ranked.map((r, i) => ({
      rank: i + 1,
      strategy_id: r.strategy_id,
      strategy_name: r.strategy_name,
      score: r.score,
      confidence: r.confidence,
    }));

    res.json({
      rankings,
      context: {
        asset: asset ?? "all",
        timeframe: timeframe ?? "all",
        total: rankings.length,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /evaluate/rankings failed");
    res.status(500).json({ error: "Failed to fetch rankings" });
  }
});

router.get("/evaluate/:jobId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const { jobId } = req.params;

    const [job] = await db
      .select()
      .from(strategyEvaluationsTable)
      .where(and(eq(strategyEvaluationsTable.jobId, jobId), eq(strategyEvaluationsTable.userId, userId)))
      .limit(1);

    if (!job) {
      return res.status(404).json({ error: "Evaluation job not found" });
    }

    if (job.status === "queued" || job.status === "running") {
      return res.json({ job_id: job.jobId, status: job.status });
    }

    if (job.status === "failed") {
      return res.json({ job_id: job.jobId, status: "failed", error: job.errorMessage });
    }

    res.json({
      status: "completed",
      result: {
        score_total: job.scoreTotal,
        scores: job.scoresJson,
        confidence: job.confidence,
        stress: job.stressJson,
        refinements: job.refinementsJson,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /evaluate/:jobId failed");
    res.status(500).json({ error: "Failed to fetch evaluation" });
  }
});

async function loadStrategyAndData(strategyId: number, userId: string) {
  const [strategy] = await db
    .select()
    .from(customStrategiesTable)
    .where(and(eq(customStrategiesTable.id, strategyId), eq(customStrategiesTable.userId, userId)))
    .limit(1);

  if (!strategy) return null;

  const config: CustomStrategyConfig = {
    id: strategy.id,
    name: strategy.name,
    type: strategy.type,
    assets: (strategy.assets as string[]) ?? [],
    timeframes: (strategy.timeframes as string[]) ?? ["1Day"],
    parameters: (strategy.parameters as Record<string, number>) ?? {},
    logic: (strategy.logic as { entry: string[]; exit: string[] }) ?? { entry: [], exit: [] },
    metadata: (strategy.metadata as Record<string, unknown>) ?? {},
  };

  const timeframe = config.timeframes[0] ?? "1Day";
  const symbol = config.assets[0] ?? "AAPL";
  const stockDataMap = await fetchStockUniverse([symbol], timeframe);
  const data = stockDataMap.get(symbol);

  return { strategy, config, data: data ?? null };
}

const ALLOWED_SCENARIOS = ["high_volatility", "low_liquidity", "range_bound", "sideways", "flash_crash", "trend_reversal"] as const;

const stressSchema = z.object({
  scenarios: z.array(z.enum(ALLOWED_SCENARIOS)).max(6).default(["high_volatility", "low_liquidity", "range_bound"]),
});

router.post("/evaluate/:strategyId/stress", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const parsed = stressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const loaded = await loadStrategyAndData(strategyId, userId);
    if (!loaded) return res.status(404).json({ error: "Strategy not found" });
    if (!loaded.data || loaded.data.closes.length < 30) {
      return res.status(400).json({ error: "Insufficient market data" });
    }

    const results = runStressTest(loaded.data, loaded.config, body.scenarios);
    res.json({ strategy_id: strategyId, results });
  } catch (err) {
    logger.error({ err }, "POST /evaluate/:strategyId/stress failed");
    res.status(500).json({ error: "Stress test failed" });
  }
});

const refineSchema = z.object({
  constraints: z.object({
    max_complexity: z.number().min(0).max(1).default(0.7),
    min_score: z.number().min(0).max(100).default(85),
  }).default({}),
});

router.post("/evaluate/:strategyId/refine", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const parsed = refineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;
    const loaded = await loadStrategyAndData(strategyId, userId);
    if (!loaded) return res.status(404).json({ error: "Strategy not found" });
    if (!loaded.data || loaded.data.closes.length < 30) {
      return res.status(400).json({ error: "Insufficient market data" });
    }

    const result = runRefinement(loaded.data, loaded.config, body.constraints);
    res.json({
      new_version: result.new_version,
      changes: result.changes,
      score_delta: result.score_delta,
    });
  } catch (err) {
    logger.error({ err }, "POST /evaluate/:strategyId/refine failed");
    res.status(500).json({ error: "Refinement failed" });
  }
});

router.get("/evaluate/:strategyId/summary", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const loaded = await loadStrategyAndData(strategyId, userId);
    if (!loaded) return res.status(404).json({ error: "Strategy not found" });
    if (!loaded.data || loaded.data.closes.length < 30) {
      return res.status(400).json({ error: "Insufficient market data" });
    }

    const scores = computeModelScores(loaded.data, loaded.config);
    const stressResults = runStressTest(loaded.data, loaded.config, ["high_volatility", "low_liquidity", "range_bound"]);
    const summary = generateSummary(scores, stressResults);

    res.json({
      strategy_id: strategyId,
      score_total: totalScore(scores),
      confidence: computeConfidence(scores),
      ...summary,
    });
  } catch (err) {
    logger.error({ err }, "GET /evaluate/:strategyId/summary failed");
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
