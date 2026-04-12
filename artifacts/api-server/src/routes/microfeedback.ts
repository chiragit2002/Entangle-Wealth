import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { pool } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";

const router = Router();

const MicroFeedbackSchema = z.object({
  context: z.string().min(1).max(100),
  helpful: z.boolean(),
  comment: z.string().max(500).optional(),
  sessionId: z.string().max(200).optional(),
});

router.post("/micro-feedback", validateBody(MicroFeedbackSchema), async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    const { context, helpful, comment, sessionId } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO micro_feedback (user_id, context, helpful, comment, session_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId || null, context, helpful, comment || null, sessionId || null]
      );
      res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Micro-feedback error");
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

router.get("/micro-feedback/summary", requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const summaryResult = await client.query(
        `SELECT
           context,
           COUNT(*) as total,
           SUM(CASE WHEN helpful THEN 1 ELSE 0 END) as helpful_count,
           SUM(CASE WHEN NOT helpful THEN 1 ELSE 0 END) as unhelpful_count,
           ROUND(
             (SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
           ) as satisfaction_pct
         FROM micro_feedback
         WHERE created_at >= $1
         GROUP BY context
         ORDER BY total DESC`,
        [thirtyDaysAgo]
      );

      const recentCommentsResult = await client.query(
        `SELECT context, helpful, comment, created_at
         FROM micro_feedback
         WHERE comment IS NOT NULL AND comment != '' AND created_at >= $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [thirtyDaysAgo]
      );

      res.json({
        summary: summaryResult.rows.map((r) => ({
          context: r.context,
          total: parseInt(r.total, 10),
          helpfulCount: parseInt(r.helpful_count, 10),
          unhelpfulCount: parseInt(r.unhelpful_count, 10),
          satisfactionPct: parseFloat(r.satisfaction_pct) || 0,
        })),
        recentComments: recentCommentsResult.rows,
        period: "30d",
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Micro-feedback summary error");
    res.status(500).json({ error: "Failed to load feedback summary" });
  }
});

export default router;
