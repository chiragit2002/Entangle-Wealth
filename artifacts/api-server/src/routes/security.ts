import { Router } from "express";
import type { Express } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { validateQuery, z } from "../lib/validateRequest";
import {
  getRecentAuthEvents,
  getAuthEventStats,
  getSecurityAlerts,
  getSecuritySummary,
} from "../lib/authEventLogger";
import { runSecuritySelfTest } from "../lib/securitySelfTest";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";

export function createSecurityRouter(app: Express) {
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

  router.get(
    "/security/alerts",
    requireAuth,
    requireAdmin,
    validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(200).optional().default(50) })),
    (req, res) => {
      const { limit } = req.query as unknown as { limit: number };
      const alerts = getSecurityAlerts(limit);
      res.json({ alerts, total: alerts.length });
    }
  );

  router.post("/security/self-test", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const ip = req.ip || req.socket.remoteAddress || "unknown";

      const report = await runSecuritySelfTest(app, userId, ip);

      res.json(report);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
