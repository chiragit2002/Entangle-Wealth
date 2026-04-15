import { Router } from "express";
import { db } from "@workspace/db";
import { strategyEventsTable, strategySnapshotsTable, customStrategiesTable } from "@workspace/db/schema";
import { eq, and, desc, asc, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth.js";
import { resolveUserId } from "../lib/resolveUserId.js";
import { logger } from "../lib/logger.js";
import type { AuthenticatedRequest } from "../types/authenticatedRequest.js";
import { z } from "../lib/validateRequest.js";

const router = Router();

const appendEventSchema = z.object({
  event_type: z.string().min(1).max(100),
  payload: z.record(z.unknown()).default({}),
});

const createSnapshotSchema = z.object({
  version: z.string().min(1).max(20),
  state: z.record(z.unknown()).default({}),
  last_event_id: z.number().int().positive().optional(),
});

async function verifyStrategyOwnership(strategyId: number, userId: string) {
  const [strategy] = await db
    .select()
    .from(customStrategiesTable)
    .where(and(eq(customStrategiesTable.id, strategyId), eq(customStrategiesTable.userId, userId)))
    .limit(1);
  return strategy ?? null;
}

router.get("/strategies/:strategyId/events", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const strategy = await verifyStrategyOwnership(strategyId, userId);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 50, 200));
    const afterId = parseInt(req.query.after as string) || 0;
    const eventType = req.query.type as string | undefined;

    let query = db
      .select()
      .from(strategyEventsTable)
      .where(eq(strategyEventsTable.strategyId, strategyId))
      .orderBy(asc(strategyEventsTable.id))
      .limit(limit);

    if (afterId > 0) {
      query = db
        .select()
        .from(strategyEventsTable)
        .where(and(
          eq(strategyEventsTable.strategyId, strategyId),
          ...(afterId > 0 ? [lte(strategyEventsTable.id, afterId)] : []),
        ))
        .orderBy(asc(strategyEventsTable.id))
        .limit(limit);
    }

    const events = await query;
    const filtered = eventType ? events.filter(e => e.eventType === eventType) : events;

    res.json({
      strategy_id: strategyId,
      events: filtered.map(e => ({
        id: e.id,
        event_type: e.eventType,
        payload: e.payload,
        timestamp: e.timestamp,
      })),
      has_more: events.length === limit,
    });
  } catch (err) {
    logger.error({ err }, "GET /strategies/:strategyId/events failed");
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/strategies/:strategyId/events", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const parsed = appendEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }

    const strategy = await verifyStrategyOwnership(strategyId, userId);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const [inserted] = await db.insert(strategyEventsTable).values({
      strategyId,
      eventType: parsed.data.event_type,
      payload: parsed.data.payload,
    }).returning();

    logger.info({ strategyId, eventType: parsed.data.event_type, eventId: inserted.id }, "Strategy event appended");

    res.status(201).json({
      id: inserted.id,
      strategy_id: strategyId,
      event_type: inserted.eventType,
      payload: inserted.payload,
      timestamp: inserted.timestamp,
    });
  } catch (err) {
    logger.error({ err }, "POST /strategies/:strategyId/events failed");
    res.status(500).json({ error: "Failed to append event" });
  }
});

router.get("/strategies/:strategyId/snapshots", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const strategy = await verifyStrategyOwnership(strategyId, userId);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const snapshots = await db
      .select()
      .from(strategySnapshotsTable)
      .where(eq(strategySnapshotsTable.strategyId, strategyId))
      .orderBy(desc(strategySnapshotsTable.createdAt));

    res.json({
      strategy_id: strategyId,
      snapshots: snapshots.map(s => ({
        id: s.id,
        version: s.version,
        state: s.state,
        last_event_id: s.lastEventId,
        created_at: s.createdAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /strategies/:strategyId/snapshots failed");
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

router.post("/strategies/:strategyId/snapshots", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const parsed = createSnapshotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
    }

    const strategy = await verifyStrategyOwnership(strategyId, userId);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    if (parsed.data.last_event_id) {
      const [event] = await db
        .select()
        .from(strategyEventsTable)
        .where(and(
          eq(strategyEventsTable.id, parsed.data.last_event_id),
          eq(strategyEventsTable.strategyId, strategyId),
        ))
        .limit(1);
      if (!event) {
        return res.status(400).json({ error: `Event ${parsed.data.last_event_id} not found for this strategy` });
      }
    }

    const [inserted] = await db.insert(strategySnapshotsTable).values({
      strategyId,
      version: parsed.data.version,
      state: parsed.data.state,
      lastEventId: parsed.data.last_event_id ?? null,
    }).returning();

    logger.info({ strategyId, version: parsed.data.version, snapshotId: inserted.id }, "Strategy snapshot created");

    res.status(201).json({
      id: inserted.id,
      strategy_id: strategyId,
      version: inserted.version,
      state: inserted.state,
      last_event_id: inserted.lastEventId,
      created_at: inserted.createdAt,
    });
  } catch (err) {
    logger.error({ err }, "POST /strategies/:strategyId/snapshots failed");
    res.status(500).json({ error: "Failed to create snapshot" });
  }
});

router.get("/strategies/:strategyId/snapshots/:version", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = await resolveUserId(req.userId, req);
    const strategyId = parseInt(req.params.strategyId);
    if (isNaN(strategyId)) return res.status(400).json({ error: "Invalid strategy ID" });

    const strategy = await verifyStrategyOwnership(strategyId, userId);
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const [snapshot] = await db
      .select()
      .from(strategySnapshotsTable)
      .where(and(
        eq(strategySnapshotsTable.strategyId, strategyId),
        eq(strategySnapshotsTable.version, req.params.version),
      ))
      .limit(1);

    if (!snapshot) return res.status(404).json({ error: `Snapshot version ${req.params.version} not found` });

    const eventsSince = snapshot.lastEventId
      ? await db
          .select()
          .from(strategyEventsTable)
          .where(and(
            eq(strategyEventsTable.strategyId, strategyId),
          ))
          .orderBy(asc(strategyEventsTable.id))
      : [];

    const eventsAfterSnapshot = snapshot.lastEventId
      ? eventsSince.filter(e => e.id > (snapshot.lastEventId ?? 0))
      : [];

    res.json({
      snapshot: {
        id: snapshot.id,
        version: snapshot.version,
        state: snapshot.state,
        last_event_id: snapshot.lastEventId,
        created_at: snapshot.createdAt,
      },
      events_since_snapshot: eventsAfterSnapshot.map(e => ({
        id: e.id,
        event_type: e.eventType,
        payload: e.payload,
        timestamp: e.timestamp,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /strategies/:strategyId/snapshots/:version failed");
    res.status(500).json({ error: "Failed to fetch snapshot" });
  }
});

export default router;
