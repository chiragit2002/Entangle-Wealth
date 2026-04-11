import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { validateQuery, z } from "../lib/validateRequest";
import {
  getRecentAuthEvents,
  getAuthEventStats,
  getSecurityAlerts,
  getSecuritySummary,
} from "../lib/authEventLogger";

const router = Router();

router.get("/security/dashboard", requireAuth, requireAdmin, (_req, res) => {
  const summary = getSecuritySummary();
  const stats = getAuthEventStats();
  const recentEvents = getRecentAuthEvents(50);
  const alerts = getSecurityAlerts(50);

  res.json({
    summary,
    authStats: stats,
    recentEvents,
    alerts,
    generatedAt: new Date().toISOString(),
  });
});

router.get("/security/alerts", requireAuth, requireAdmin, validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(200).optional().default(50) })), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const alerts = getSecurityAlerts(limit);
  res.json({ alerts, total: alerts.length });
});

export default router;
