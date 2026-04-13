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
import { getPoolStats } from "@workspace/db";
import { getSseConnectionStats } from "./alerts";
import { logger } from "../lib/logger";
import { getRateLimiterStats } from "../middlewares/userRateLimit";

const router = Router();

const MEMORY_LIMIT_MB = parseInt(process.env.MEMORY_LIMIT_MB || "0", 10);

router.get("/metrics", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const _authenticatedReq = req as AuthenticatedRequest;
  try {
    const snapshot = getMetricsSnapshot();
    const circuits = getAllCircuitStates();
    const queueStatus = aiQueue.getStatus();
    const poolStats = getPoolStats();
    const sseStats = getSseConnectionStats();

    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const heapUsagePercent = heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0;
    const rssLimitMB = MEMORY_LIMIT_MB > 0 ? MEMORY_LIMIT_MB : null;
    const rssUsagePercent = rssLimitMB ? Math.round((rssMB / rssLimitMB) * 100) : null;

    const pressureWarning = heapUsagePercent > 80 || (rssUsagePercent !== null && rssUsagePercent > 80);

    if (pressureWarning) {
      logger.warn(
        { heapUsedMB, heapTotalMB, heapUsagePercent, rssMB, rssLimitMB, rssUsagePercent },
        "Memory pressure detected (heap or RSS exceeds 80%)"
      );
    }

    res.json({
      ...snapshot,
      circuits,
      aiQueue: queueStatus,
      caches: {
        stockCache: stockCache.getStats(),
        newsCache: newsCache.getStats(),
      },
      database: {
        pool: poolStats,
      },
      sse: sseStats,
      rateLimiter: getRateLimiterStats(),
      memory: {
        rss: `${rssMB}MB`,
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        heapUsagePercent,
        rssLimitMB,
        rssUsagePercent,
        external: `${Math.round(mem.external / 1024 / 1024)}MB`,
        pressureWarning,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
