import { Router, type IRouter } from "express";
import type { Server } from "node:http";
import type { Socket } from "node:net";
import { getAuthEventStats } from "../lib/authEventLogger";
import { requireAuth } from "../middlewares/requireAuth";
import { pool, getPoolStats } from "@workspace/db";
import { getAllCircuitStates } from "../lib/circuitBreaker";
import { aiQueue } from "../lib/aiQueue";
import { getRateLimiterStats } from "../middlewares/userRateLimit";

const router: IRouter = Router();

const startTime = Date.now();
let activeConnections = 0;

export function getActiveConnectionCount(): number {
  return activeConnections;
}

export function trackConnections(server: Server): void {
  server.on("connection", (socket: Socket) => {
    activeConnections++;
    socket.on("close", () => {
      activeConnections--;
    });
  });
}

const POOL_WARN_THRESHOLD = 0.8;
const QUEUE_WARN_THRESHOLD = 0.7;

function getPoolStatsWithUtilization() {
  const raw = getPoolStats();
  return {
    ...raw,
    utilizationPct: raw.total ? Math.round(((raw.total - raw.idle) / raw.max) * 100) : 0,
  };
}

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.get("/health", (_req, res) => {
  const poolStats = getPoolStatsWithUtilization();
  const queueStatus = aiQueue.getStatus();
  const circuits = getAllCircuitStates();

  const poolUtilization = poolStats.utilizationPct / 100;
  const queueUtilization = queueStatus.maxWaiting > 0 ? queueStatus.queued / queueStatus.maxWaiting : 0;
  const anyCircuitOpen = circuits.some(c => c.state === "open");
  const anyCircuitHalfOpen = circuits.some(c => c.state === "half-open");

  const degraded =
    poolUtilization >= POOL_WARN_THRESHOLD ||
    queueUtilization >= QUEUE_WARN_THRESHOLD ||
    anyCircuitOpen ||
    anyCircuitHalfOpen ||
    poolStats.waiting > 5;

  const status = degraded ? "degraded" : "ok";

  res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    db: {
      ...poolStats,
      warning: poolUtilization >= POOL_WARN_THRESHOLD,
    },
    aiQueue: {
      ...queueStatus,
      warning: queueUtilization >= QUEUE_WARN_THRESHOLD,
    },
    circuits: circuits.map(c => ({
      name: c.name,
      state: c.state,
      failureCount: c.failureCount,
    })),
    rateLimiter: getRateLimiterStats(),
  });
});

router.get("/health/detailed", requireAuth, (_req, res) => {
  const mem = process.memoryUsage();
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  const poolStats = getPoolStatsWithUtilization();
  const queueStatus = aiQueue.getStatus();
  const circuits = getAllCircuitStates();

  res.json({
    status: "ok",
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`,
    },
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(mem.external / 1024 / 1024)}MB`,
    },
    connections: activeConnections,
    database: {
      pool: poolStats,
    },
    node: process.version,
    platform: process.platform,
    auth: getAuthEventStats(),
    db: poolStats,
    aiQueue: queueStatus,
    circuits,
    rateLimiter: getRateLimiterStats(),
    timestamp: new Date().toISOString(),
  });
});

type DepStatus = "ok" | "degraded" | "unavailable";

interface DependencyCheck {
  status: DepStatus;
  latencyMs?: number;
  detail?: string;
}

async function checkDb(): Promise<DependencyCheck> {
  const t0 = Date.now();
  try {
    await pool.query("SELECT 1");
    return { status: "ok", latencyMs: Date.now() - t0 };
  } catch (e: unknown) {
    return {
      status: "unavailable",
      latencyMs: Date.now() - t0,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkClerk(): Promise<DependencyCheck> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return { status: "degraded", detail: "CLERK_SECRET_KEY not configured" };
  const t0 = Date.now();
  try {
    const resp = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) return { status: "ok", latencyMs: Date.now() - t0 };
    return { status: "degraded", latencyMs: Date.now() - t0, detail: `HTTP ${resp.status}` };
  } catch (e: unknown) {
    return {
      status: "degraded",
      latencyMs: Date.now() - t0,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkStripe(): Promise<DependencyCheck> {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!key) return { status: "degraded", detail: "Stripe key not configured" };
  const t0 = Date.now();
  try {
    const resp = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) return { status: "ok", latencyMs: Date.now() - t0 };
    return { status: "degraded", latencyMs: Date.now() - t0, detail: `HTTP ${resp.status}` };
  } catch (e: unknown) {
    return {
      status: "degraded",
      latencyMs: Date.now() - t0,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkAlpaca(): Promise<DependencyCheck> {
  const key = process.env.ALPACA_API_KEY || process.env.ALPACA_KEY_ID;
  const secret = process.env.ALPACA_API_SECRET;
  if (!key || !secret) return { status: "degraded", detail: "Alpaca credentials not configured" };
  const t0 = Date.now();
  try {
    const resp = await fetch("https://data.alpaca.markets/v2/stocks/bars/latest?symbols=AAPL", {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) return { status: "ok", latencyMs: Date.now() - t0 };
    return { status: "degraded", latencyMs: Date.now() - t0, detail: `HTTP ${resp.status}` };
  } catch (e: unknown) {
    return {
      status: "degraded",
      latencyMs: Date.now() - t0,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

router.get("/health/dependencies", requireAuth, async (_req, res) => {
  const [db, clerk, stripe, alpaca] = await Promise.all([
    checkDb(),
    checkClerk(),
    checkStripe(),
    checkAlpaca(),
  ]);

  const deps = { db, clerk, stripe, alpaca };
  const anyUnavailable = Object.values(deps).some((d) => d.status === "unavailable");
  const anyDegraded = Object.values(deps).some((d) => d.status === "degraded");

  const overallStatus: DepStatus = anyUnavailable
    ? "unavailable"
    : anyDegraded
    ? "degraded"
    : "ok";

  const httpStatus = overallStatus === "unavailable" ? 503 : 200;

  res.status(httpStatus).json({
    status: overallStatus,
    dependencies: deps,
    timestamp: new Date().toISOString(),
  });
});

export default router;
