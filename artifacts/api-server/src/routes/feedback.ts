import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { userFeedbackTable } from "@workspace/db/schema";
import { sql, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateBody, validateQuery, validateParams, IntIdParamsSchema, PaginationQuerySchema, z } from "../lib/validateRequest";

const router = Router();

const VALID_FEEDBACK_CATEGORIES = ["general", "feature", "bug", "performance", "ui", "content", "support"];

const FeedbackCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  category: z.enum(VALID_FEEDBACK_CATEGORIES as [string, ...string[]]).default("general"),
});

const AdminFeedbackResponseSchema = z.object({
  adminResponse: z.string().max(2000).optional(),
});

const FeedbackQuerySchema = PaginationQuerySchema.extend({
  category: z.string().max(50).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
  maxRating: z.coerce.number().int().min(1).max(5).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

router.post("/feedback", requireAuth, validateBody(FeedbackCreateSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { rating, comment, category } = req.body;

  try {
    const [inserted] = await db
      .insert(userFeedbackTable)
      .values({ userId, rating, comment: comment || null, category: category || "general" })
      .returning({ id: userFeedbackTable.id, createdAt: userFeedbackTable.createdAt });

    logger.info({ feedbackId: inserted.id, userId, rating }, "User feedback submitted");
    res.json({ success: true, feedbackId: inserted.id, createdAt: inserted.createdAt });
  } catch (err) {
    logger.error(err, "Failed to create user feedback");
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/feedback/mine", requireAuth, validateQuery(PaginationQuerySchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };

  try {
    const result = await db.execute(sql`
      SELECT id, rating, comment, category, admin_response, created_at, updated_at
      FROM user_feedback
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM user_feedback WHERE user_id = ${userId}
    `);
    const total = parseInt(totalResult.rows[0]?.count as string, 10) || 0;

    res.json({ feedback: result.rows, total, limit, offset });
  } catch (err) {
    logger.error(err, "Failed to fetch user feedback");
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.get("/feedback/admin", requireAuth, requireAdmin, validateQuery(FeedbackQuerySchema), async (req: Request, res: Response) => {
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };
  const category = req.query.category as string | undefined;
  const days = (req.query.days as number | undefined) || 30;
  const minRating = (req.query.minRating as number | undefined) || 1;
  const maxRating = (req.query.maxRating as number | undefined) || 5;

  try {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let result;
    let totalResult;
    let avgResult;
    let categoryResult;
    let trendResult;

    if (category && category !== "all") {
      result = await db.execute(sql`
        SELECT id, user_id, rating, comment, category, admin_response, created_at, updated_at
        FROM user_feedback
        WHERE created_at >= ${sinceDate}
          AND category = ${category}
          AND rating >= ${minRating}
          AND rating <= ${maxRating}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      totalResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM user_feedback
        WHERE created_at >= ${sinceDate}
          AND category = ${category}
          AND rating >= ${minRating}
          AND rating <= ${maxRating}
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, user_id, rating, comment, category, admin_response, created_at, updated_at
        FROM user_feedback
        WHERE created_at >= ${sinceDate}
          AND rating >= ${minRating}
          AND rating <= ${maxRating}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);
      totalResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM user_feedback
        WHERE created_at >= ${sinceDate}
          AND rating >= ${minRating}
          AND rating <= ${maxRating}
      `);
    }

    avgResult = await db.execute(sql`
      SELECT
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(*) as total_count,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_count
      FROM user_feedback
      WHERE created_at >= ${sinceDate}
    `);

    categoryResult = await db.execute(sql`
      SELECT category, COUNT(*) as count, ROUND(AVG(rating)::numeric, 2) as avg_rating
      FROM user_feedback
      WHERE created_at >= ${sinceDate}
      GROUP BY category
      ORDER BY count DESC
    `);

    trendResult = await db.execute(sql`
      SELECT DATE(created_at) as day, COUNT(*) as count, ROUND(AVG(rating)::numeric, 2) as avg_rating
      FROM user_feedback
      WHERE created_at >= ${sinceDate}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);

    const total = parseInt(totalResult.rows[0]?.count as string, 10) || 0;
    const avgRating = parseFloat(avgResult.rows[0]?.avg_rating as string) || 0;
    const totalCount = parseInt(avgResult.rows[0]?.total_count as string, 10) || 0;
    const positiveCount = parseInt(avgResult.rows[0]?.positive_count as string, 10) || 0;
    const satisfactionRate = totalCount > 0 ? parseFloat(((positiveCount / totalCount) * 100).toFixed(1)) : 0;

    res.json({
      feedback: result.rows,
      total,
      limit,
      offset,
      stats: {
        avgRating,
        totalCount,
        satisfactionRate,
      },
      categoryBreakdown: categoryResult.rows.map((r: Record<string, unknown>) => ({
        category: r.category,
        count: parseInt(r.count as string, 10),
        avgRating: parseFloat(r.avg_rating as string) || 0,
      })),
      trend: trendResult.rows.map((r: Record<string, unknown>) => ({
        date: r.day,
        count: parseInt(r.count as string, 10),
        avgRating: parseFloat(r.avg_rating as string) || 0,
      })),
    });
  } catch (err) {
    logger.error(err, "Failed to fetch admin feedback");
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.patch("/feedback/admin/:id", requireAuth, requireAdmin, validateParams(IntIdParamsSchema), validateBody(AdminFeedbackResponseSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const feedbackId = req.params.id as unknown as number;
  const { adminResponse } = req.body;

  try {
    const updated = await db
      .update(userFeedbackTable)
      .set({ adminResponse: adminResponse || null, updatedAt: new Date() })
      .where(eq(userFeedbackTable.id, feedbackId))
      .returning({ id: userFeedbackTable.id });

    if (updated.length === 0) {
      res.status(404).json({ error: "Feedback entry not found" });
      return;
    }

    logger.info({ feedbackId, userId }, "Admin responded to feedback");
    res.json({ success: true });
  } catch (err) {
    logger.error(err, "Failed to update feedback response");
    res.status(500).json({ error: "Failed to update feedback" });
  }
});

export default router;
