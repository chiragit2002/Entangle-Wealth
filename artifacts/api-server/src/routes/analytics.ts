import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db, pool } from "@workspace/db";
import { analyticsEventsTable } from "@workspace/db/schema";
import { getAuth } from "@clerk/express";
import { logger } from "../lib/logger";
import { validateBody, validateQuery, z } from "../lib/validateRequest";
import { unauthWriteSpamGuard } from "../middlewares/userRateLimit";

const router = Router();

const AnalyticsTrackSchema = z.object({
  event: z.string().min(1).max(200),
  properties: z.record(z.unknown()).optional(),
  sessionId: z.string().max(200).optional(),
});

const DashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.post("/analytics/track", unauthWriteSpamGuard, validateBody(AnalyticsTrackSchema), (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const { event, properties, sessionId } = req.body;

  db.insert(analyticsEventsTable)
    .values({
      userId: userId || null,
      event,
      properties: properties || null,
      sessionId: sessionId || null,
    })
    .then(() => {
      res.json({ ok: true });
    })
    .catch((err) => {
      logger.error({ err }, "Failed to track analytics event");
      res.status(500).json({ error: "Failed to track event" });
    });
});

router.get("/analytics/dashboard", requireAuth, requireAdmin, validateQuery(DashboardQuerySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const now = new Date();

      let startDate: Date;
      let endDate: Date = now;

      const startDateParam = req.query.startDate as string | undefined;
      const endDateParam = req.query.endDate as string | undefined;

      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
        } else {
          endDate.setHours(23, 59, 59, 999);
        }
      } else {
        const days = (req.query.days as number | undefined) || 30;
        startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }

      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalUsersResult = await client.query("SELECT COUNT(*) as count FROM users");
      const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

      const dauResult = await client.query(
        "SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE created_at >= $1 AND user_id IS NOT NULL",
        [oneDayAgo]
      );
      const dau = parseInt(dauResult.rows[0].count, 10);

      const wauResult = await client.query(
        "SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE created_at >= $1 AND user_id IS NOT NULL",
        [sevenDaysAgo]
      );
      const wau = parseInt(wauResult.rows[0].count, 10);

      const mauResult = await client.query(
        "SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE created_at >= $1 AND user_id IS NOT NULL",
        [thirtyDaysAgo]
      );
      const mau = parseInt(mauResult.rows[0].count, 10);

      const tierCountsResult = await client.query(
        "SELECT subscription_tier, COUNT(*) as count FROM users GROUP BY subscription_tier"
      );
      const tierCounts: Record<string, number> = {};
      for (const row of tierCountsResult.rows) {
        tierCounts[row.subscription_tier || "free"] = parseInt(row.count, 10);
      }

      const proUsers = tierCounts["pro"] || 0;
      const businessUsers = tierCounts["business"] || 0;
      const freeUsers = tierCounts["free"] || 0;
      const paidUsers = proUsers + businessUsers;
      const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : "0";

      const proPriceMonthly = 29;
      const businessPriceMonthly = 99;
      const mrr = proUsers * proPriceMonthly + businessUsers * businessPriceMonthly;
      const arr = mrr * 12;

      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const churnResult = await client.query(
        `SELECT COUNT(*) as count FROM users
         WHERE subscription_tier = 'free'
         AND updated_at >= $1
         AND stripe_subscription_id IS NOT NULL`,
        [thirtyDaysAgo]
      );
      const churnedUsers = parseInt(churnResult.rows[0].count, 10);
      const activeSubsLastMonth = await client.query(
        `SELECT COUNT(*) as count FROM users
         WHERE subscription_tier IN ('pro', 'business')
         OR (subscription_tier = 'free' AND stripe_subscription_id IS NOT NULL AND updated_at >= $1)`,
        [sixtyDaysAgo]
      );
      const totalSubBase = parseInt(activeSubsLastMonth.rows[0].count, 10) || 1;
      const churnRate = parseFloat(((churnedUsers / totalSubBase) * 100).toFixed(1));

      const avgRevenuePerUser = paidUsers > 0 ? mrr / paidUsers : 0;
      const monthlyChurnDecimal = churnRate / 100 || 0.01;
      const ltv = parseFloat((avgRevenuePerUser / monthlyChurnDecimal).toFixed(0));

      const visitorResult = await client.query(
        "SELECT COUNT(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= $1 AND created_at <= $2 AND user_id IS NULL",
        [startDate, endDate]
      );
      const visitors = parseInt(visitorResult.rows[0].count, 10);

      const dailySignupsResult = await client.query(
        `SELECT DATE(created_at) as day, COUNT(*) as count
         FROM users
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [startDate, endDate]
      );
      const dailySignups = dailySignupsResult.rows.map((r: { day: string; count: string }) => ({
        date: r.day,
        count: parseInt(r.count, 10),
      }));

      const eventCountsResult = await client.query(
        `SELECT event, COUNT(*) as count
         FROM analytics_events
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY event
         ORDER BY count DESC
         LIMIT 20`,
        [startDate, endDate]
      );
      const featureUsage = eventCountsResult.rows.map((r: { event: string; count: string }) => ({
        event: r.event,
        count: parseInt(r.count, 10),
      }));

      const dailyEventsResult = await client.query(
        `SELECT DATE(created_at) as day, COUNT(*) as count
         FROM analytics_events
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [startDate, endDate]
      );
      const dailyEvents = dailyEventsResult.rows.map((r: { day: string; count: string }) => ({
        date: r.day,
        count: parseInt(r.count, 10),
      }));

      const referralResult = await client.query(
        `SELECT
           (SELECT COUNT(*) FROM analytics_events WHERE event = 'referral_click' AND created_at >= $1 AND created_at <= $2) as clicks,
           (SELECT COUNT(*) FROM analytics_events WHERE event = 'referral_signup' AND created_at >= $1 AND created_at <= $2) as signups,
           (SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL AND created_at >= $1 AND created_at <= $2) as conversions`,
        [startDate, endDate]
      );
      const referralFunnel = {
        clicks: parseInt(referralResult.rows[0].clicks, 10),
        signups: parseInt(referralResult.rows[0].signups, 10),
        conversions: parseInt(referralResult.rows[0].conversions, 10),
      };

      const contentResult = await client.query(
        `SELECT
           COALESCE((properties->>'platform')::text, 'unknown') as platform,
           COALESCE((properties->>'status')::text, 'unknown') as status,
           COUNT(*) as count
         FROM analytics_events
         WHERE event LIKE 'content_%' AND created_at >= $1 AND created_at <= $2
         GROUP BY platform, status
         ORDER BY count DESC`,
        [startDate, endDate]
      );
      const contentByPlatform = contentResult.rows.map((r: { platform: string; status: string; count: string }) => ({
        platform: r.platform,
        status: r.status,
        count: parseInt(r.count, 10),
      }));

      const totalEventsResult = await client.query("SELECT COUNT(*) as count FROM analytics_events");
      const totalEvents = parseInt(totalEventsResult.rows[0].count, 10);

      let feedbackStats = { avgRating: 0, totalCount: 0, satisfactionRate: 0 };
      let feedbackRecent: unknown[] = [];
      let feedbackCategoryBreakdown: unknown[] = [];
      let feedbackTrend: unknown[] = [];

      try {
        const fbStatsResult = await client.query(
          `SELECT
             ROUND(AVG(rating)::numeric, 2) as avg_rating,
             COUNT(*) as total_count,
             SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_count
           FROM user_feedback
           WHERE created_at >= $1 AND created_at <= $2`,
          [startDate, endDate]
        );
        const fbStats = fbStatsResult.rows[0];
        const tc = parseInt(fbStats?.total_count, 10) || 0;
        const pc = parseInt(fbStats?.positive_count, 10) || 0;
        feedbackStats = {
          avgRating: parseFloat(fbStats?.avg_rating) || 0,
          totalCount: tc,
          satisfactionRate: tc > 0 ? parseFloat(((pc / tc) * 100).toFixed(1)) : 0,
        };

        const fbRecentResult = await client.query(
          `SELECT id, user_id, rating, comment, category, admin_response, created_at
           FROM user_feedback
           WHERE created_at >= $1 AND created_at <= $2
           ORDER BY created_at DESC
           LIMIT 10`,
          [startDate, endDate]
        );
        feedbackRecent = fbRecentResult.rows;

        const fbCategoryResult = await client.query(
          `SELECT category, COUNT(*) as count, ROUND(AVG(rating)::numeric, 2) as avg_rating
           FROM user_feedback
           WHERE created_at >= $1 AND created_at <= $2
           GROUP BY category
           ORDER BY count DESC`,
          [startDate, endDate]
        );
        feedbackCategoryBreakdown = fbCategoryResult.rows.map((r: Record<string, unknown>) => ({
          category: r.category,
          count: parseInt(r.count as string, 10),
          avgRating: parseFloat(r.avg_rating as string) || 0,
        }));

        const fbTrendResult = await client.query(
          `SELECT DATE(created_at) as day, COUNT(*) as count, ROUND(AVG(rating)::numeric, 2) as avg_rating
           FROM user_feedback
           WHERE created_at >= $1 AND created_at <= $2
           GROUP BY DATE(created_at)
           ORDER BY day ASC`,
          [startDate, endDate]
        );
        feedbackTrend = fbTrendResult.rows.map((r: Record<string, unknown>) => ({
          date: r.day,
          count: parseInt(r.count as string, 10),
          avgRating: parseFloat(r.avg_rating as string) || 0,
        }));
      } catch (fbErr) {
        logger.warn({ err: fbErr }, "Feedback query failed in analytics dashboard (non-fatal)");
      }

      res.json({
        kpi: {
          totalUsers,
          dau,
          wau,
          mau,
          proUsers,
          businessUsers,
          freeUsers,
          conversionRate: parseFloat(conversionRate),
          totalEvents,
          mrr,
          arr,
          churnRate,
          ltv,
          visitors,
        },
        tierCounts,
        conversionFunnel: [
          { stage: "Visitors", value: visitors },
          { stage: "Free", value: freeUsers },
          { stage: "Pro", value: proUsers },
          { stage: "Business", value: businessUsers },
        ],
        dailySignups,
        featureUsage,
        dailyEvents,
        referralFunnel,
        contentByPlatform,
        feedback: {
          stats: feedbackStats,
          recent: feedbackRecent,
          categoryBreakdown: feedbackCategoryBreakdown,
          trend: feedbackTrend,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Analytics dashboard error");
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

const EventDrilldownQuerySchema = z.object({
  event: z.string().min(1).max(200),
  days: z.coerce.number().int().min(1).max(365).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get("/analytics/events/drilldown", requireAuth, requireAdmin, validateQuery(EventDrilldownQuerySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const now = new Date();
      const event = req.query.event as string;
      const startDateParam = req.query.startDate as string | undefined;
      const endDateParam = req.query.endDate as string | undefined;
      const limit = (req.query.limit as number | undefined) || 50;
      const offset = (req.query.offset as number | undefined) || 0;

      let startDate: Date;
      let endDate: Date = now;

      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
        } else {
          endDate.setHours(23, 59, 59, 999);
        }
      } else {
        const days = (req.query.days as number | undefined) || 30;
        startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }

      const eventsResult = await client.query(
        `SELECT id, user_id, session_id, properties, created_at
         FROM analytics_events
         WHERE event = $1 AND created_at >= $2 AND created_at <= $3
         ORDER BY created_at DESC
         LIMIT $4 OFFSET $5`,
        [event, startDate, endDate, limit, offset]
      );

      const totalResult = await client.query(
        `SELECT COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
         FROM analytics_events
         WHERE event = $1 AND created_at >= $2 AND created_at <= $3`,
        [event, startDate, endDate]
      );

      const dailyResult = await client.query(
        `SELECT DATE(created_at) as day, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
         FROM analytics_events
         WHERE event = $1 AND created_at >= $2 AND created_at <= $3
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [event, startDate, endDate]
      );

      const total = parseInt(totalResult.rows[0]?.count, 10) || 0;
      const uniqueUsers = parseInt(totalResult.rows[0]?.unique_users, 10) || 0;

      res.json({
        event,
        total,
        uniqueUsers,
        limit,
        offset,
        events: eventsResult.rows.map((r: Record<string, unknown>) => ({
          id: r.id,
          userId: r.user_id,
          sessionId: r.session_id,
          properties: r.properties,
          createdAt: r.created_at,
        })),
        dailyBreakdown: dailyResult.rows.map((r: Record<string, unknown>) => ({
          date: r.day,
          count: parseInt(r.count as string, 10),
          uniqueUsers: parseInt(r.unique_users as string, 10),
        })),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Analytics event drilldown error");
    res.status(500).json({ error: "Failed to load event drilldown" });
  }
});

export default router;

