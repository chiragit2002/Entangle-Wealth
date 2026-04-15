import { Router } from "express";
import { db } from "@workspace/db";
import { strategyEvaluationsTable, customStrategiesTable, strategyVersionsTable } from "@workspace/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import crypto from "crypto";
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

    const baseScores = computeModelScores(loaded.data, loaded.config);
    const baseTotalVal = totalScore(baseScores);
    const baseConfVal = computeConfidence(baseScores);

    const result = runRefinement(loaded.data, loaded.config, body.constraints);

    const refinedParams = { ...loaded.config.parameters };
    for (const c of result.changes) {
      refinedParams[c.param] = c.new;
    }
    const refinedConfig = { ...loaded.config, parameters: refinedParams };
    const refinedScores = computeModelScores(loaded.data, refinedConfig);
    const refinedTotal = totalScore(refinedScores);
    const refinedConf = computeConfidence(refinedScores);

    const latestVersions = await db
      .select()
      .from(strategyVersionsTable)
      .where(eq(strategyVersionsTable.strategyId, strategyId))
      .orderBy(desc(strategyVersionsTable.createdAt))
      .limit(1);

    const latestVersion = latestVersions[0];
    const baseVersionStr = (loaded.strategy.version as string) ?? "1.0";
    const parentVersionStr = latestVersion?.version ?? baseVersionStr;

    if (!latestVersion) {
      const parentHash = makeVersionHash(loaded.config.parameters);
      await db.insert(strategyVersionsTable).values({
        strategyId,
        userId,
        version: baseVersionStr,
        versionHash: parentHash,
        origin: "manual",
        parentVersion: null,
        parameters: loaded.config.parameters,
        scoreTotal: baseTotalVal,
        confidence: baseConfVal,
        scoresJson: baseScores,
        changesJson: null,
        stressDelta: null,
        notes: "Baseline snapshot before refinement",
      }).onConflictDoNothing();
    }

    const parentParts = parentVersionStr.split(".");
    const major = parseInt(parentParts[0] ?? "1");
    const minor = parseInt(parentParts[1] ?? "0") + 1;
    const computedNewVersion = `${major}.${minor}.0`;

    const newVersionHash = makeVersionHash(refinedParams);
    const changes = result.changes.map((c: { param: string; old: number; new: number }) => ({
      field: `parameters.${c.param}`,
      old: c.old,
      new: c.new,
    }));

    const baseStress = runStressTest(loaded.data, loaded.config, ["high_volatility", "low_liquidity", "range_bound"]);
    const refinedStress = runStressTest(loaded.data, refinedConfig, ["high_volatility", "low_liquidity", "range_bound"]);

    const avgBaseDrawdown = baseStress.reduce((s, r) => s + r.max_drawdown, 0) / (baseStress.length || 1);
    const avgRefinedDrawdown = refinedStress.reduce((s, r) => s + r.max_drawdown, 0) / (refinedStress.length || 1);
    const drawdownDelta = avgRefinedDrawdown - avgBaseDrawdown;

    const stressDelta = {
      drawdown_change: `${drawdownDelta >= 0 ? "+" : ""}${drawdownDelta.toFixed(1)}%`,
      recovery_speed: `${result.score_delta >= 0 ? "+" : ""}${(result.score_delta * 0.1).toFixed(1)}d`,
    };

    let versionRecord = null;
    try {
      [versionRecord] = await db.insert(strategyVersionsTable).values({
        strategyId,
        userId,
        version: computedNewVersion,
        versionHash: newVersionHash,
        origin: "refinement_engine",
        parentVersion: parentVersionStr,
        parameters: refinedParams,
        scoreTotal: refinedTotal,
        confidence: refinedConf,
        scoresJson: refinedScores,
        changesJson: changes,
        stressDelta,
        notes: `Refinement: ${result.score_delta >= 0 ? "+" : ""}${result.score_delta} score improvement`,
      }).returning();

      logger.info({ strategyId, version: computedNewVersion }, "Auto-created version from refinement");
    } catch (insertErr: unknown) {
      if (insertErr instanceof Error && insertErr.message.includes("uq_strategy_versions_strategy_version")) {
        logger.warn({ strategyId, version: computedNewVersion }, "Version already exists, skipping auto-creation");
      } else {
        logger.error({ err: insertErr, strategyId }, "Failed to auto-create version record");
      }
    }

    res.json({
      new_version: computedNewVersion,
      changes: result.changes,
      score_delta: result.score_delta,
      version_created: versionRecord ? {
        id: versionRecord.id,
        version: versionRecord.version,
        version_hash: versionRecord.versionHash,
        stress_delta: stressDelta,
      } : null,
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

function makeVersionHash(params: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 6);
}

const createVersionSchema = z.object({
  version: z.string().min(1).max(20),
  origin: z.enum(["manual", "refinement_engine"]).default("manual"),
  parent_version: z.string().optional(),
  parameters: z.record(z.unknown()).default({}),
  score_snapshot: z.object({
    score_total: z.number().optional(),
    confidence: z.number().optional(),
  }).optional(),
  scores: z.record(z.number()).optional(),
  changes: z.array(z.object({
    field: z.string(),
    old: z.unknown(),
    new: z.unknown(),
  })).optional(),
  stress_delta: z.object({
    drawdown_change: z.string().optional(),
    recovery_speed: z.string().optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

router.get("/evaluate/:strategyId/versions", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const [strategy] = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, strategyId), eq(customStrategiesTable.userId, userId)))
      .limit(1);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const versions = await db
      .select()
      .from(strategyVersionsTable)
      .where(and(eq(strategyVersionsTable.strategyId, strategyId), eq(strategyVersionsTable.userId, userId)))
      .orderBy(asc(strategyVersionsTable.createdAt));

    res.json({
      strategy_id: strategyId,
      strategy_name: strategy.name,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        version_hash: v.versionHash,
        origin: v.origin,
        parent_version: v.parentVersion,
        parameters: v.parameters,
        score_snapshot: {
          score_total: v.scoreTotal,
          confidence: v.confidence,
        },
        scores: v.scoresJson,
        changes: v.changesJson,
        stress_delta: v.stressDelta,
        notes: v.notes,
        created_at: v.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /evaluate/:strategyId/versions failed");
    res.status(500).json({ error: "Failed to fetch versions" });
  }
});

router.post("/evaluate/:strategyId/versions", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const parsed = createVersionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }
    const body = parsed.data;

    const [strategy] = await db
      .select()
      .from(customStrategiesTable)
      .where(and(eq(customStrategiesTable.id, strategyId), eq(customStrategiesTable.userId, userId)))
      .limit(1);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const existing = await db
      .select()
      .from(strategyVersionsTable)
      .where(and(eq(strategyVersionsTable.strategyId, strategyId), eq(strategyVersionsTable.version, body.version)))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Version ${body.version} already exists for this strategy` });
    }

    if (body.parent_version) {
      const parentExists = await db
        .select()
        .from(strategyVersionsTable)
        .where(and(eq(strategyVersionsTable.strategyId, strategyId), eq(strategyVersionsTable.version, body.parent_version)))
        .limit(1);
      if (parentExists.length === 0) {
        return res.status(400).json({ error: `Parent version ${body.parent_version} not found` });
      }
    }

    const versionHash = makeVersionHash(body.parameters);

    const [inserted] = await db.insert(strategyVersionsTable).values({
      strategyId,
      userId,
      version: body.version,
      versionHash,
      origin: body.origin,
      parentVersion: body.parent_version ?? null,
      parameters: body.parameters,
      scoreTotal: body.score_snapshot?.score_total ?? null,
      confidence: body.score_snapshot?.confidence ?? null,
      scoresJson: body.scores ?? null,
      changesJson: body.changes ?? null,
      stressDelta: body.stress_delta ?? null,
      notes: body.notes ?? null,
    }).returning();

    logger.info({ strategyId, version: body.version, origin: body.origin }, "Strategy version created");

    res.status(201).json({
      id: inserted.id,
      version: inserted.version,
      version_hash: inserted.versionHash,
      origin: inserted.origin,
      parent_version: inserted.parentVersion,
      created_at: inserted.createdAt,
    });
  } catch (err) {
    logger.error({ err }, "POST /evaluate/:strategyId/versions failed");
    res.status(500).json({ error: "Failed to create version" });
  }
});

router.get("/evaluate/:strategyId/versions/compare", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const versionA = req.query.a as string;
    const versionB = req.query.b as string;
    if (!versionA || !versionB) {
      return res.status(400).json({ error: "Both query params 'a' and 'b' are required (version strings)" });
    }

    const versions = await db
      .select()
      .from(strategyVersionsTable)
      .where(and(
        eq(strategyVersionsTable.strategyId, strategyId),
        eq(strategyVersionsTable.userId, userId),
        sql`${strategyVersionsTable.version} IN (${sql`${versionA}`}, ${sql`${versionB}`})`,
      ));

    const va = versions.find(v => v.version === versionA);
    const vb = versions.find(v => v.version === versionB);

    if (!va) return res.status(404).json({ error: `Version ${versionA} not found` });
    if (!vb) return res.status(404).json({ error: `Version ${versionB} not found` });

    const scoresA = (va.scoresJson ?? null) as Record<string, number> | null;
    const scoresB = (vb.scoresJson ?? null) as Record<string, number> | null;

    const scoreDiffs: Record<string, string | null> = {};
    if (scoresA && scoresB) {
      const allModelKeys = new Set([...Object.keys(scoresA), ...Object.keys(scoresB)]);
      for (const key of allModelKeys) {
        const a = scoresA[key];
        const b = scoresB[key];
        if (a == null || b == null) {
          scoreDiffs[key] = null;
        } else {
          const delta = b - a;
          scoreDiffs[key] = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
        }
      }
    }

    const totalDelta = (va.scoreTotal != null && vb.scoreTotal != null)
      ? (vb.scoreTotal - va.scoreTotal) : null;
    const confDelta = (va.confidence != null && vb.confidence != null)
      ? (vb.confidence - va.confidence) : null;

    const paramsA = (va.parameters ?? {}) as Record<string, unknown>;
    const paramsB = (vb.parameters ?? {}) as Record<string, unknown>;
    const paramChanges: { field: string; old: unknown; new: unknown }[] = [];
    const allParamKeys = new Set([...Object.keys(paramsA), ...Object.keys(paramsB)]);
    for (const key of allParamKeys) {
      if (JSON.stringify(paramsA[key]) !== JSON.stringify(paramsB[key])) {
        paramChanges.push({ field: `parameters.${key}`, old: paramsA[key] ?? null, new: paramsB[key] ?? null });
      }
    }

    const stressDeltaA = (va.stressDelta ?? {}) as Record<string, string>;
    const stressDeltaB = (vb.stressDelta ?? {}) as Record<string, string>;

    res.json({
      version_a: {
        version: va.version,
        version_hash: va.versionHash,
        origin: va.origin,
        score_total: va.scoreTotal,
        confidence: va.confidence,
        created_at: va.createdAt,
      },
      version_b: {
        version: vb.version,
        version_hash: vb.versionHash,
        origin: vb.origin,
        score_total: vb.scoreTotal,
        confidence: vb.confidence,
        created_at: vb.createdAt,
      },
      diff: {
        score_total: totalDelta != null ? (totalDelta >= 0 ? `+${totalDelta.toFixed(1)}` : totalDelta.toFixed(1)) : null,
        confidence: confDelta != null ? (confDelta >= 0 ? `+${confDelta.toFixed(2)}` : confDelta.toFixed(2)) : null,
        model_scores: scoreDiffs,
        parameter_changes: paramChanges,
        stress_delta_a: stressDeltaA,
        stress_delta_b: stressDeltaB,
      },
    });
  } catch (err) {
    logger.error({ err }, "GET /evaluate/:strategyId/versions/compare failed");
    res.status(500).json({ error: "Failed to compare versions" });
  }
});

export default router;
