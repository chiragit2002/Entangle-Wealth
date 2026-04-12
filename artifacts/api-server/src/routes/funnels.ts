import { Router, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

const FUNNEL_DEFINITIONS = [
  {
    id: "onboarding",
    name: "Onboarding → Dashboard",
    description: "User goes from landing page to completing onboarding",
    steps: [
      { id: "page_view_home", label: "Home Visit" },
      { id: "sign_up", label: "Sign Up" },
      { id: "onboarding_start", label: "Onboarding Start" },
      { id: "onboarding_complete", label: "Onboarding Complete" },
      { id: "page_view_dashboard", label: "Dashboard Visit" },
    ],
  },
  {
    id: "upgrade",
    name: "Free → Paid Upgrade",
    description: "User upgrades from free to a paid plan",
    steps: [
      { id: "login_email", label: "Logged In" },
      { id: "page_view_pricing", label: "Pricing Page" },
      { id: "upgrade_intent", label: "Upgrade Intent" },
      { id: "upgrade_success", label: "Upgrade Completed" },
    ],
  },
  {
    id: "feature_adoption",
    name: "Feature Discovery",
    description: "User discovers and engages key features",
    steps: [
      { id: "page_view_dashboard", label: "Dashboard" },
      { id: "taxgpt_query", label: "TaxGPT Used" },
      { id: "ai_terminal_query", label: "AI Terminal Used" },
      { id: "stock_analysis_viewed", label: "Stock Analysis Viewed" },
    ],
  },
];

router.get("/analytics/funnels", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const funnelResults = await Promise.all(
        FUNNEL_DEFINITIONS.map(async (funnel) => {
          const stepCounts: number[] = [];

          for (const step of funnel.steps) {
            const result = await client.query(
              `SELECT COUNT(DISTINCT COALESCE(user_id, session_id)) as count
               FROM analytics_events
               WHERE event = $1 AND created_at >= $2`,
              [step.id, thirtyDaysAgo]
            );
            stepCounts.push(parseInt(result.rows[0].count, 10));
          }

          const steps = funnel.steps.map((step, i) => {
            const count = stepCounts[i];
            const prevCount = i === 0 ? count : stepCounts[i - 1];
            const topCount = stepCounts[0] || 1;
            const conversionFromPrev = prevCount > 0 ? parseFloat(((count / prevCount) * 100).toFixed(1)) : 0;
            const conversionFromTop = parseFloat(((count / topCount) * 100).toFixed(1));
            const dropoffFromPrev = i === 0 ? 0 : parseFloat((((prevCount - count) / prevCount) * 100).toFixed(1));

            return {
              id: step.id,
              label: step.label,
              count,
              conversionFromPrev,
              conversionFromTop,
              dropoffFromPrev,
            };
          });

          const overallConversion = stepCounts[0] > 0
            ? parseFloat(((stepCounts[stepCounts.length - 1] / stepCounts[0]) * 100).toFixed(1))
            : 0;

          return {
            id: funnel.id,
            name: funnel.name,
            description: funnel.description,
            steps,
            overallConversion,
          };
        })
      );

      res.json({ funnels: funnelResults, period: "30d" });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Funnel analytics error");
    res.status(500).json({ error: "Failed to load funnel data" });
  }
});

export { FUNNEL_DEFINITIONS };
export default router;
