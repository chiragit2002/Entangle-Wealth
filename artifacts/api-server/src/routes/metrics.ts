import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getMetricsSnapshot } from "../middlewares/metricsMiddleware";
import { getAllCircuitStates } from "../lib/circuitBreaker";
import { aiQueue } from "../lib/aiQueue";
import { stockCache, newsCache } from "../lib/cache";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();

router.get("/metrics", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select({ subscriptionTier: usersTable.subscriptionTier })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    if (!user || user.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const snapshot = getMetricsSnapshot();
    const circuits = getAllCircuitStates();
    const queueStatus = aiQueue.getStatus();

    res.json({
      ...snapshot,
      circuits,
      aiQueue: queueStatus,
      caches: {
        stockCache: { size: stockCache.size },
        newsCache: { size: newsCache.size },
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
