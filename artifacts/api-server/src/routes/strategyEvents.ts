import { Router } from "express";
import { db } from "@workspace/db";
import { strategyEventsTable, portfolioSnapshotsTable, paperPortfoliosTable } from "@workspace/db/schema";
import { eq, and, desc, asc, gt, lte, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";
import { resolveUserId } from "../lib/resolveUserId.js";
import { logger } from "../lib/logger.js";
import {
  replayPortfolio,
  replayPortfolioAtTime,
  getLatestSnapshot,
  rebuildSnapshots,
} from "../lib/eventSourcing/index.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";

const router = Router();

async function getPortfolioForUser(userId: string) {
  const [portfolio] = await db
    .select()
    .from(paperPortfoliosTable)
    .where(eq(paperPortfoliosTable.userId, userId))
    .limit(1);
  return portfolio ?? null;
}

router.get("/events/portfolio", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const portfolio = await getPortfolioForUser(userId);
    if (!portfolio) return res.json({ events: [], total: 0 });

    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const eventType = req.query.type as string | undefined;

    const conditions = [eq(strategyEventsTable.portfolioId, portfolio.id)];
    if (eventType) conditions.push(eq(strategyEventsTable.eventType, eventType));

    const [totalResult] = await db
      .select({ count: count() })
      .from(strategyEventsTable)
      .where(and(...conditions));

    const events = await db
      .select()
      .from(strategyEventsTable)
      .where(and(...conditions))
      .orderBy(desc(strategyEventsTable.id))
      .limit(limit)
      .offset(offset);

    res.json({
      events: events.map((e) => ({
        id: e.id,
        event_type: e.eventType,
        payload: e.payload,
        market_price: e.marketPrice,
        timestamp: e.timestamp,
        idempotency_key: e.idempotencyKey,
      })),
      total: totalResult?.count ?? 0,
      portfolio_id: portfolio.id,
    });
  } catch (err) {
    logger.error({ err }, "GET /events/portfolio failed");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/events/replay", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const portfolio = await getPortfolioForUser(userId);
    if (!portfolio) {
      return res.json({
        state: { cashBalance: 0, positions: [] },
        last_event_id: 0,
        event_count: 0,
      });
    }

    const result = await replayPortfolio(portfolio.id);

    res.json({
      state: result.state,
      last_event_id: result.lastEventId,
      event_count: result.eventCount,
    });
  } catch (err) {
    logger.error({ err }, "GET /events/replay failed");
    res.status(500).json({ error: "Failed to replay portfolio" });
  }
});

router.get("/events/time-travel", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const portfolio = await getPortfolioForUser(userId);
    if (!portfolio) {
      return res.json({
        state: { cashBalance: 0, positions: [] },
        last_event_id: 0,
        event_count: 0,
        as_of: null,
      });
    }

    const timestamp = req.query.timestamp as string;
    if (!timestamp) {
      return res.status(400).json({ error: "timestamp query parameter required (ISO 8601)" });
    }

    const asOf = new Date(timestamp);
    if (isNaN(asOf.getTime())) {
      return res.status(400).json({ error: "Invalid timestamp format" });
    }

    const result = await replayPortfolioAtTime(portfolio.id, asOf);

    res.json({
      state: result.state,
      last_event_id: result.lastEventId,
      event_count: result.eventCount,
      as_of: asOf.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "GET /events/time-travel failed");
    res.status(500).json({ error: "Failed to time-travel portfolio" });
  }
});

router.get("/events/snapshots", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const portfolio = await getPortfolioForUser(userId);
    if (!portfolio) return res.json({ snapshots: [] });

    const snapshots = await db
      .select()
      .from(portfolioSnapshotsTable)
      .where(eq(portfolioSnapshotsTable.portfolioId, portfolio.id))
      .orderBy(desc(portfolioSnapshotsTable.createdAt))
      .limit(20);

    res.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        portfolio_id: s.portfolioId,
        last_event_id: s.lastEventId,
        state: s.state,
        created_at: s.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /events/snapshots failed");
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

router.post("/events/snapshots/rebuild", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const portfolio = await getPortfolioForUser(userId);
    if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });

    await rebuildSnapshots(portfolio.id);
    const snapshot = await getLatestSnapshot(portfolio.id);

    res.json({
      message: "Snapshots rebuilt from scratch",
      latest_snapshot: snapshot
        ? {
            id: snapshot.id,
            last_event_id: snapshot.lastEventId,
            state: snapshot.state,
            created_at: snapshot.createdAt,
          }
        : null,
    });
  } catch (err) {
    logger.error({ err }, "POST /events/snapshots/rebuild failed");
    res.status(500).json({ error: "Failed to rebuild snapshots" });
  }
});

export default router;
