import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { db, pool } from "@workspace/db";
import { analyticsEventsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { logger } from "../lib/logger";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();

router.post("/analytics/track", (req: Request, res: Response) => {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId || auth?.userId) as string | undefined;
  const { event, properties, sessionId } = req.body;

  if (!event || typeof event !== "string") {
    res.status(400).json({ error: "event is required" });
    return;
  }

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

router.get("/analytics/dashboard", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const totalUsersResult = await client.query("SELECT COUNT(*) as count FROM users");
      const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
        "SELECT COUNT(DISTINCT session_id) as count FROM analytics_events WHERE created_at >= $1 AND user_id IS NULL",
        [thirtyDaysAgo]
      );
      const visitors = parseInt(visitorResult.rows[0].count, 10);

      const dailySignupsResult = await client.query(
        `SELECT DATE(created_at) as day, COUNT(*) as count
         FROM users
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [thirtyDaysAgo]
      );
      const dailySignups = dailySignupsResult.rows.map((r: { day: string; count: string }) => ({
        date: r.day,
        count: parseInt(r.count, 10),
      }));

      const eventCountsResult = await client.query(
        `SELECT event, COUNT(*) as count
         FROM analytics_events
         WHERE created_at >= $1
         GROUP BY event
         ORDER BY count DESC
         LIMIT 20`,
        [thirtyDaysAgo]
      );
      const featureUsage = eventCountsResult.rows.map((r: { event: string; count: string }) => ({
        event: r.event,
        count: parseInt(r.count, 10),
      }));

      const dailyEventsResult = await client.query(
        `SELECT DATE(created_at) as day, COUNT(*) as count
         FROM analytics_events
         WHERE created_at >= $1
         GROUP BY DATE(created_at)
         ORDER BY day ASC`,
        [thirtyDaysAgo]
      );
      const dailyEvents = dailyEventsResult.rows.map((r: { day: string; count: string }) => ({
        date: r.day,
        count: parseInt(r.count, 10),
      }));

      const referralResult = await client.query(
        `SELECT
           (SELECT COUNT(*) FROM analytics_events WHERE event = 'referral_click' AND created_at >= $1) as clicks,
           (SELECT COUNT(*) FROM analytics_events WHERE event = 'referral_signup' AND created_at >= $1) as signups,
           (SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL AND created_at >= $1) as conversions`,
        [thirtyDaysAgo]
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
         WHERE event LIKE 'content_%' AND created_at >= $1
         GROUP BY platform, status
         ORDER BY count DESC`,
        [thirtyDaysAgo]
      );
      const contentByPlatform = contentResult.rows.map((r: { platform: string; status: string; count: string }) => ({
        platform: r.platform,
        status: r.status,
        count: parseInt(r.count, 10),
      }));

      const totalEventsResult = await client.query("SELECT COUNT(*) as count FROM analytics_events");
      const totalEvents = parseInt(totalEventsResult.rows[0].count, 10);

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
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Analytics dashboard error");
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
