import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getMetricsSnapshot } from "../middlewares/metricsMiddleware";
import { getAllCircuitStates } from "../lib/circuitBreaker";
import { aiQueue } from "../lib/aiQueue";
import { stockCache, newsCache } from "../lib/cache";

const router = Router();

router.get("/metrics", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const _authenticatedReq = req as AuthenticatedRequest;
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
