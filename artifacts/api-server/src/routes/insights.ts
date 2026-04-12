import { Router, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

type Severity = "critical" | "warning" | "info";

interface InsightItem {
  id: string;
  category: "funnel" | "rage_clicks" | "satisfaction" | "performance" | "hesitation";
  severity: Severity;
  title: string;
  description: string;
  metric: string | number;
  recommendation: string;
}

router.get("/analytics/insights", requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const insights: InsightItem[] = [];

      const rageClickResult = await client.query(
        `SELECT
           COALESCE((properties->>'page')::text, 'unknown') as page,
           COUNT(*) as count
         FROM analytics_events
         WHERE event = 'rage_click' AND created_at >= $1
         GROUP BY page
         ORDER BY count DESC
         LIMIT 10`,
        [sevenDaysAgo]
      );

      for (const row of rageClickResult.rows) {
        const count = parseInt(row.count, 10);
        if (count >= 20) {
          insights.push({
            id: `rage_click_${row.page}`,
            category: "rage_clicks",
            severity: count >= 50 ? "critical" : "warning",
            title: `Rage Clicks Detected: ${row.page}`,
            description: `${count} rage click events recorded on "${row.page}" in the last 7 days — users are clicking repeatedly out of frustration.`,
            metric: `${count} rage clicks`,
            recommendation: "Review the UI on this page for broken buttons, slow responses, or confusing interactions.",
          });
        }
      }

      const hesitationResult = await client.query(
        `SELECT
           COALESCE((properties->>'page')::text, 'unknown') as page,
           COUNT(*) as count,
           AVG((properties->>'duration')::float) as avg_duration
         FROM analytics_events
         WHERE event = 'hesitation' AND created_at >= $1
         GROUP BY page
         ORDER BY count DESC
         LIMIT 10`,
        [sevenDaysAgo]
      );

      for (const row of hesitationResult.rows) {
        const count = parseInt(row.count, 10);
        const avgDuration = parseFloat(row.avg_duration) || 0;
        if (count >= 10 && avgDuration >= 5000) {
          insights.push({
            id: `hesitation_${row.page}`,
            category: "hesitation",
            severity: avgDuration >= 10000 ? "warning" : "info",
            title: `High Hesitation on: ${row.page}`,
            description: `Users hesitate an average of ${(avgDuration / 1000).toFixed(1)}s before interacting on "${row.page}" — indicating confusion or decision friction.`,
            metric: `avg ${(avgDuration / 1000).toFixed(1)}s hesitation`,
            recommendation: "Simplify the UI, add clearer CTAs, or provide contextual help tooltips on this page.",
          });
        }
      }

      const slowPageResult = await client.query(
        `SELECT
           COALESCE((properties->>'page')::text, 'unknown') as page,
           COUNT(*) as count,
           AVG((properties->>'duration')::float) as avg_duration
         FROM analytics_events
         WHERE event = 'slow_page_load' AND created_at >= $1
         GROUP BY page
         ORDER BY avg_duration DESC
         LIMIT 10`,
        [sevenDaysAgo]
      );

      for (const row of slowPageResult.rows) {
        const count = parseInt(row.count, 10);
        const avgDuration = parseFloat(row.avg_duration) || 0;
        if (count >= 5) {
          insights.push({
            id: `slow_load_${row.page}`,
            category: "performance",
            severity: avgDuration >= 5000 ? "critical" : avgDuration >= 3000 ? "warning" : "info",
            title: `Slow Page Load: ${row.page}`,
            description: `"${row.page}" takes an average of ${(avgDuration / 1000).toFixed(1)}s to load (${count} occurrences in 7 days).`,
            metric: `avg ${(avgDuration / 1000).toFixed(1)}s load`,
            recommendation: "Optimize bundle size, lazy-load components, and review API call performance for this route.",
          });
        }
      }

      const satisfactionResult = await client.query(
        `SELECT
           context,
           COUNT(*) as total,
           ROUND(
             (SUM(CASE WHEN helpful THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1
           ) as satisfaction_pct
         FROM micro_feedback
         WHERE created_at >= $1
         GROUP BY context
         HAVING COUNT(*) >= 5
         ORDER BY satisfaction_pct ASC`,
        [thirtyDaysAgo]
      );

      for (const row of satisfactionResult.rows) {
        const pct = parseFloat(row.satisfaction_pct) || 0;
        const total = parseInt(row.total, 10);
        if (pct < 60) {
          insights.push({
            id: `satisfaction_${row.context}`,
            category: "satisfaction",
            severity: pct < 40 ? "critical" : "warning",
            title: `Low Satisfaction: ${row.context}`,
            description: `"${row.context}" has a ${pct}% satisfaction score (${total} responses) — users find this feature unhelpful.`,
            metric: `${pct}% satisfaction`,
            recommendation: "Review user comments, check recent changes to this feature, and consider UX improvements.",
          });
        }
      }

      const FUNNEL_STEPS = [
        { event: "sign_up", label: "Sign-up" },
        { event: "onboarding_start", label: "Onboarding Start" },
        { event: "onboarding_complete", label: "Onboarding Completion" },
      ];

      const funnelCounts: Record<string, number> = {};
      for (const step of FUNNEL_STEPS) {
        const r = await client.query(
          `SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as count
           FROM analytics_events WHERE event = $1 AND created_at >= $2`,
          [step.event, thirtyDaysAgo]
        );
        funnelCounts[step.event] = parseInt(r.rows[0].count, 10);
      }

      if (funnelCounts["sign_up"] > 0) {
        const startRate = ((funnelCounts["onboarding_start"] / funnelCounts["sign_up"]) * 100);
        if (startRate < 60) {
          insights.push({
            id: "funnel_onboarding_start",
            category: "funnel",
            severity: startRate < 30 ? "critical" : "warning",
            title: "Low Onboarding Start Rate",
            description: `Only ${startRate.toFixed(1)}% of signed-up users begin onboarding — many abandon before the first step.`,
            metric: `${startRate.toFixed(1)}% start rate`,
            recommendation: "Shorten the onboarding entry point. Add a compelling first-screen value proposition.",
          });
        }
      }

      if (funnelCounts["onboarding_start"] > 0) {
        const completeRate = ((funnelCounts["onboarding_complete"] / funnelCounts["onboarding_start"]) * 100);
        if (completeRate < 70) {
          insights.push({
            id: "funnel_onboarding_complete",
            category: "funnel",
            severity: completeRate < 40 ? "critical" : "warning",
            title: "Onboarding Drop-off Detected",
            description: `${completeRate.toFixed(1)}% of users who start onboarding complete it — ${(100 - completeRate).toFixed(1)}% drop off mid-flow.`,
            metric: `${completeRate.toFixed(1)}% completion rate`,
            recommendation: "Identify the abandonment step. Reduce friction, add progress indicators, or skip optional steps.",
          });
        }
      }

      insights.sort((a, b) => {
        const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });

      const totalEvents7d = await client.query(
        `SELECT COUNT(*) as count FROM analytics_events WHERE created_at >= $1`,
        [sevenDaysAgo]
      );
      const totalFeedback30d = await client.query(
        `SELECT COUNT(*) as count, AVG(CASE WHEN helpful THEN 1.0 ELSE 0.0 END) as avg_satisfaction FROM micro_feedback WHERE created_at >= $1`,
        [thirtyDaysAgo]
      );
      const totalRageClicks7d = await client.query(
        `SELECT COUNT(*) as count FROM analytics_events WHERE event = 'rage_click' AND created_at >= $1`,
        [sevenDaysAgo]
      );

      const avgSatisfaction = parseFloat(totalFeedback30d.rows[0].avg_satisfaction) || 1;
      const criticalCount = insights.filter(i => i.severity === "critical").length;
      const warningCount = insights.filter(i => i.severity === "warning").length;
      const rageClickTotal = parseInt(totalRageClicks7d.rows[0].count, 10);

      let healthScore = 100;
      healthScore -= criticalCount * 15;
      healthScore -= warningCount * 7;
      healthScore -= Math.min(rageClickTotal, 100) * 0.2;
      healthScore += (avgSatisfaction - 0.5) * 20;
      healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

      res.json({
        insights,
        summary: {
          total: insights.length,
          critical: criticalCount,
          warning: warningCount,
          info: insights.filter(i => i.severity === "info").length,
          healthScore,
          totalEvents7d: parseInt(totalEvents7d.rows[0].count, 10),
          avgSatisfaction: parseFloat((avgSatisfaction * 100).toFixed(1)),
          rageClickTotal,
        },
        generatedAt: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Insights engine error");
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

export default router;
