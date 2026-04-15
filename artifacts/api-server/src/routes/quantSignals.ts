import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logger } from "../lib/logger";
import { pool } from "@workspace/db";
import { runEvaluationPipeline } from "../lib/quant/pipeline";
import { ingestStrategy } from "../lib/quant/ingest";
import { runAllModels } from "../lib/quant/models";
import { runStressEngine } from "../lib/quant/stressEngine";
import { runRefinementLoop, computeComposite, extractModelScores } from "../lib/quant/refinement";
import { buildEvaluatedStrategy } from "../lib/quant/ranking";
import { REFINEMENT_FLOOR, REFINEMENT_CEILING } from "../lib/quant/types";
import type { RawStrategy } from "../lib/quant/types";
import { validateBody, z } from "../lib/validateRequest";

const router = Router();

const RawStrategySchema = z.object({
  symbol: z.string().min(1).max(10),
  action: z.enum(["buy", "sell", "hold"]),
  price: z.number().positive(),
  rsi: z.number().min(0).max(100).optional(),
  macd: z.number().optional(),
  macdSignal: z.number().optional(),
  bollingerUpper: z.number().optional(),
  bollingerLower: z.number().optional(),
  volume: z.number().optional(),
  avgVolume: z.number().optional(),
  high: z.number().optional(),
  low: z.number().optional(),
  open: z.number().optional(),
  close: z.number().optional(),
  priceHistory: z.array(z.number()).optional(),
  volumeHistory: z.array(z.number()).optional(),
  highHistory: z.array(z.number()).optional(),
  lowHistory: z.array(z.number()).optional(),
  indicatorTriggers: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  sector: z.string().optional(),
  capTier: z.string().optional(),
  sourceAgent: z.string().optional(),
});

const BatchEvaluateSchema = z.object({
  strategies: z.array(RawStrategySchema).min(1).max(500),
});

const SingleEvaluateSchema = z.object({
  strategy: RawStrategySchema,
});

async function persistEvaluationResults(results: Awaited<ReturnType<typeof runEvaluationPipeline>>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const s of results.top_100) {
      await client.query(
        `INSERT INTO quant_evaluation_runs
          (strategy_id, symbol, action, price, sector, score_total, confidence, stress_penalty, stress_resilience_score, refinement_improved, refinement_iterations, rank, pipeline_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (strategy_id) DO UPDATE SET
           score_total = EXCLUDED.score_total,
           rank = EXCLUDED.rank,
           evaluated_at = NOW()`,
        [
          s.strategy_id, s.symbol, s.action, s.price, s.sector,
          s.score_total, s.confidence,
          s.stressResult?.totalPenalty ?? 0,
          s.stressResult?.resilienceScore ?? null,
          s.refinementResult?.improved ? 1 : 0,
          s.refinementResult?.totalIterations ?? 0,
          s.rank ?? null,
          results.pipeline_version,
        ],
      );

      for (const m of s.modelDetails) {
        await client.query(
          `INSERT INTO quant_model_scores (strategy_id, model_id, model_name, score, confidence, details)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT DO NOTHING`,
          [s.strategy_id, m.modelId, m.modelName, m.score, m.confidence, JSON.stringify(m.details)],
        );
      }

      if (s.stressResult) {
        for (const sc of s.stressResult.scenarios) {
          await client.query(
            `INSERT INTO quant_stress_results (strategy_id, scenario_id, scenario_name, description, impact_score, survived, penalty)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING`,
            [s.strategy_id, sc.scenarioId, sc.scenarioName, sc.description, sc.impactScore, sc.survived ? 1 : 0, sc.penalty],
          );
        }
      }

      if (s.refinementResult) {
        for (const iter of s.refinementResult.iterations) {
          await client.query(
            `INSERT INTO quant_refinement_history (strategy_id, iteration, adjustments, scores_before, scores_after, composite_before, composite_after, improved)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT DO NOTHING`,
            [
              s.strategy_id, iter.iteration,
              JSON.stringify(iter.adjustments),
              JSON.stringify(iter.scoresBefore),
              JSON.stringify(iter.scoresAfter),
              iter.compositeBefore, iter.compositeAfter,
              iter.improved ? 1 : 0,
            ],
          );
        }
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

router.post(
  "/quant/evaluate/batch",
  requireAuth,
  validateBody(BatchEvaluateSchema),
  async (req, res) => {
    try {
      const { strategies } = req.body as { strategies: RawStrategy[] };
      const results = await runEvaluationPipeline(strategies);

      try {
        await persistEvaluationResults(results);
      } catch (dbErr) {
        logger.warn({ err: dbErr }, "[QuantSignals] Failed to persist results — returning in-memory");
      }

      res.json(results);
    } catch (err) {
      logger.error({ err }, "[QuantSignals] Batch evaluation failed");
      res.status(500).json({ error: "Evaluation pipeline failed" });
    }
  },
);

router.post(
  "/quant/evaluate/single",
  requireAuth,
  validateBody(SingleEvaluateSchema),
  async (req, res) => {
    try {
      const { strategy: raw } = req.body as { strategy: RawStrategy };
      const normalized = ingestStrategy(raw);
      if (!normalized) {
        res.status(400).json({ error: "Strategy validation failed" });
        return;
      }

      const modelDetails = await runAllModels(normalized);
      const modelScores = extractModelScores(modelDetails);
      const composite = computeComposite(modelScores);
      const stressResult = runStressEngine(normalized);
      let refinementResult = null;
      if (composite >= REFINEMENT_FLOOR && composite <= REFINEMENT_CEILING) {
        refinementResult = await runRefinementLoop(normalized, modelScores, composite);
      }
      const result = buildEvaluatedStrategy(normalized, modelDetails, stressResult, refinementResult);

      res.json(result);
    } catch (err) {
      logger.error({ err }, "[QuantSignals] Single evaluation failed");
      res.status(500).json({ error: "Evaluation failed" });
    }
  },
);

router.get("/quant/signals", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);
    const symbol = req.query.symbol as string | undefined;
    const client = await pool.connect();
    try {
      let query: string;
      let params: (string | number)[];

      if (symbol) {
        query = `
          SELECT r.*, 
            json_agg(json_build_object('modelId', ms.model_id, 'modelName', ms.model_name, 'score', ms.score, 'confidence', ms.confidence, 'details', ms.details) ORDER BY ms.model_id) as model_scores
          FROM quant_evaluation_runs r
          LEFT JOIN quant_model_scores ms ON ms.strategy_id = r.strategy_id
          WHERE r.symbol = $1
          GROUP BY r.id
          ORDER BY r.score_total DESC
          LIMIT $2`;
        params = [symbol.toUpperCase(), limit];
      } else {
        query = `
          SELECT r.*,
            json_agg(json_build_object('modelId', ms.model_id, 'modelName', ms.model_name, 'score', ms.score, 'confidence', ms.confidence, 'details', ms.details) ORDER BY ms.model_id) as model_scores
          FROM quant_evaluation_runs r
          LEFT JOIN quant_model_scores ms ON ms.strategy_id = r.strategy_id
          GROUP BY r.id
          ORDER BY r.rank ASC NULLS LAST, r.score_total DESC
          LIMIT $1`;
        params = [limit];
      }

      const { rows } = await client.query(query, params);
      res.json({ signals: rows, count: rows.length });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "[QuantSignals] Failed to fetch signals");
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

router.get("/quant/signals/:strategyId", requireAuth, async (req, res) => {
  try {
    const { strategyId } = req.params;
    const client = await pool.connect();
    try {
      const runRow = await client.query(
        `SELECT * FROM quant_evaluation_runs WHERE strategy_id = $1`,
        [strategyId],
      );
      if (runRow.rows.length === 0) {
        res.status(404).json({ error: "Strategy not found" });
        return;
      }

      const modelScores = await client.query(
        `SELECT * FROM quant_model_scores WHERE strategy_id = $1 ORDER BY model_id`,
        [strategyId],
      );
      const stressResults = await client.query(
        `SELECT * FROM quant_stress_results WHERE strategy_id = $1 ORDER BY scenario_id`,
        [strategyId],
      );
      const refinementHistory = await client.query(
        `SELECT * FROM quant_refinement_history WHERE strategy_id = $1 ORDER BY iteration`,
        [strategyId],
      );

      res.json({
        run: runRow.rows[0],
        modelScores: modelScores.rows,
        stressResults: stressResults.rows,
        refinementHistory: refinementHistory.rows,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "[QuantSignals] Failed to fetch strategy detail");
    res.status(500).json({ error: "Failed to fetch strategy detail" });
  }
});

router.get("/quant/demo", requireAuth, async (req, res) => {
  try {
    const demoStrategies: RawStrategy[] = [
      { symbol: "AAPL", action: "buy", price: 185.50, rsi: 42, macd: 1.2, macdSignal: 0.8, volume: 65000000, avgVolume: 55000000, sector: "Technology", capTier: "mega" },
      { symbol: "NVDA", action: "buy", price: 875.20, rsi: 58, macd: 12.5, macdSignal: 9.8, volume: 42000000, avgVolume: 38000000, sector: "Technology", capTier: "mega" },
      { symbol: "MSFT", action: "buy", price: 415.30, rsi: 55, macd: 3.2, macdSignal: 2.1, volume: 22000000, avgVolume: 20000000, sector: "Technology", capTier: "mega" },
      { symbol: "TSLA", action: "sell", price: 248.50, rsi: 72, macd: -2.1, macdSignal: 0.5, volume: 95000000, avgVolume: 85000000, sector: "Consumer Cyclical", capTier: "mega" },
      { symbol: "META", action: "buy", price: 512.80, rsi: 48, macd: 5.8, macdSignal: 4.2, volume: 18000000, avgVolume: 16000000, sector: "Communication Services", capTier: "mega" },
      { symbol: "AMZN", action: "buy", price: 192.40, rsi: 51, macd: 0.8, macdSignal: 0.5, volume: 38000000, avgVolume: 35000000, sector: "Consumer Cyclical", capTier: "mega" },
      { symbol: "GOOGL", action: "hold", price: 175.60, rsi: 50, macd: 0.1, macdSignal: 0.1, volume: 25000000, avgVolume: 24000000, sector: "Technology", capTier: "mega" },
      { symbol: "AMD", action: "buy", price: 155.20, rsi: 38, macd: -0.5, macdSignal: 0.2, volume: 55000000, avgVolume: 50000000, sector: "Technology", capTier: "mega" },
      { symbol: "COIN", action: "buy", price: 215.60, rsi: 62, macd: 4.8, macdSignal: 3.2, volume: 12000000, avgVolume: 10000000, sector: "Financial Services", capTier: "large" },
      { symbol: "PLTR", action: "buy", price: 24.80, rsi: 55, macd: 0.3, macdSignal: 0.2, volume: 85000000, avgVolume: 80000000, sector: "Technology", capTier: "large" },
    ];

    const results = await runEvaluationPipeline(demoStrategies);
    res.json(results);
  } catch (err) {
    logger.error({ err }, "[QuantSignals] Demo evaluation failed");
    res.status(500).json({ error: "Demo evaluation failed" });
  }
});

export default router;
