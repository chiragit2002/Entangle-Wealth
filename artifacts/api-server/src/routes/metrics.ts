import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getMetricsSnapshot } from "../middlewares/metricsMiddleware";
import { getAllCircuitStates } from "../lib/circuitBreaker";
import { aiQueue } from "../lib/aiQueue";
import { stockCache, newsCache } from "../lib/cache";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();

router.get("/metrics", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const snapshot = getMetricsSnapshot();
    const circuits = getAllCircuitStates();
    const queueStatus = aiQueue.getStatus();

    res.json({
      ...snapshot,
      circuits,
      aiQueue: queueStatus,
      caches: {
        stockCache: stockCache.getStats(),
        newsCache: newsCache.getStats(),
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
