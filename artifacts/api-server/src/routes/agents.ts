import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { agentRegistry } from "../lib/agents";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

router.get("/agents/status", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agents = await agentRegistry.getStatus();
    const now = Date.now();

    const enriched = agents.map((a) => {
      const heartbeatAge = a.lastHeartbeat ? now - a.lastHeartbeat.getTime() : null;
      let health: "green" | "yellow" | "red" = "green";
      if (a.status === "failed" || a.status === "stopped") {
        health = "red";
      } else if (a.status === "degraded" || a.errorCount > 5 || (heartbeatAge !== null && heartbeatAge > 5 * 60 * 1000)) {
        health = "yellow";
      }

      return {
        name: a.name,
        description: a.description,
        status: a.status,
        health,
        lastHeartbeat: a.lastHeartbeat,
        heartbeatAgeMs: heartbeatAge,
        errorCount: a.errorCount,
        startedAt: a.startedAt,
        uptimeMs: a.uptime,
        restartCount: a.restartCount,
        lastRestartAt: a.lastRestartAt,
      };
    });

    const greenCount = enriched.filter((a) => a.health === "green").length;
    const yellowCount = enriched.filter((a) => a.health === "yellow").length;
    const redCount = enriched.filter((a) => a.health === "red").length;

    const overallHealth: "green" | "yellow" | "red" =
      redCount > 0 ? "red" : yellowCount > 0 ? "yellow" : "green";

    res.json({
      overallHealth,
      totalAgents: enriched.length,
      greenCount,
      yellowCount,
      redCount,
      agents: enriched,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch agent status");
    res.status(500).json({ error: "Failed to fetch agent status" });
  }
});

router.get("/agents/logs", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 200);
    const agentName = req.query.agent as string | undefined;

    const client = await pool.connect();
    try {
      let query: string;
      let params: (string | number)[];

      if (agentName) {
        query = `SELECT * FROM agent_logs WHERE agent_name = $1 ORDER BY created_at DESC LIMIT $2`;
        params = [agentName, limit];
      } else {
        query = `SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT $1`;
        params = [limit];
      }

      const { rows } = await client.query(query, params);
      res.json({ logs: rows, count: rows.length });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Failed to fetch agent logs");
    res.status(500).json({ error: "Failed to fetch agent logs" });
  }
});

router.get("/agents/events", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 200);
    const eventType = req.query.type as string | undefined;

    const client = await pool.connect();
    try {
      let query: string;
      let params: (string | number)[];

      if (eventType) {
        query = `SELECT * FROM agent_events WHERE event_type = $1 ORDER BY created_at DESC LIMIT $2`;
        params = [eventType, limit];
      } else {
        query = `SELECT * FROM agent_events ORDER BY created_at DESC LIMIT $1`;
        params = [limit];
      }

      const { rows } = await client.query(query, params);
      res.json({ events: rows, count: rows.length });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Failed to fetch agent events");
    res.status(500).json({ error: "Failed to fetch agent events" });
  }
});

export default router;
