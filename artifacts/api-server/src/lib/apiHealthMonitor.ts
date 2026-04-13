import { db } from "@workspace/db";
import { apiHealthChecksTable, auditLogTable } from "@workspace/db/schema";
import { logger } from "./logger";

export const MONITORED_ENDPOINTS: { path: string; label: string; expectStatus?: number }[] = [
  { path: "/api/healthz", label: "Auth/Core" },
  { path: "/api/news", label: "News Feed", expectStatus: 200 },
  { path: "/api/stocks", label: "Trading Data", expectStatus: 200 },
  { path: "/api/gamification/leaderboard", label: "Leaderboard", expectStatus: 200 },
  { path: "/api/health/detailed", label: "System Detail", expectStatus: 401 },
  { path: "/api/status/services", label: "Service Status", expectStatus: 401 },
  { path: "/api/alpaca/positions", label: "Trading", expectStatus: 401 },
  { path: "/api/taxgpt", label: "TaxFlow", expectStatus: 404 },
  { path: "/api/alerts", label: "Alerts", expectStatus: 401 },
  { path: "/api/gamification/badges/all", label: "Gamification", expectStatus: 200 },
];

const SLOW_NEWS_THRESHOLD_MS = 3000;
const REPEATED_500_LIMIT = 3;

const consecutiveFailures: Record<string, number> = {};

type CircuitState = "closed" | "open" | "half-open";
const circuitState: Record<string, CircuitState> = {};
const circuitOpenedAt: Record<string, number> = {};
const CIRCUIT_OPEN_DURATION_MS = 5 * 60 * 1000;

function getCircuitState(path: string): CircuitState {
  const state = circuitState[path] ?? "closed";
  if (state === "open") {
    const openedAt = circuitOpenedAt[path] ?? 0;
    if (Date.now() - openedAt > CIRCUIT_OPEN_DURATION_MS) {
      circuitState[path] = "half-open";
      return "half-open";
    }
  }
  return state;
}

function tripCircuit(path: string): void {
  circuitState[path] = "open";
  circuitOpenedAt[path] = Date.now();
}

function closeCircuit(path: string): void {
  circuitState[path] = "closed";
  consecutiveFailures[path] = 0;
}

const BASE_URL = (() => {
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
})();

async function logAutoHealEvent(path: string, message: string): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      pageUrl: path,
      issueType: "auto_heal",
      severity: "CRITICAL",
      errorMessage: message,
      componentName: "ApiHealthMonitor",
    });
  } catch (dbErr) {
    logger.warn({ dbErr, path }, "[HealthMonitor] Failed to write auto-heal event to audit_log");
  }
}

async function pingEndpoint(path: string, expectStatus?: number): Promise<void> {
  const currentCircuit = getCircuitState(path);

  if (currentCircuit === "open") {
    logger.warn({ path }, "[HealthMonitor] Circuit open — skipping ping");
    return;
  }

  const t0 = Date.now();
  let statusCode = 0;
  let responseTimeMs = 0;

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        "X-Internal-Health-Check": "1",
        "X-Health-Monitor": "api-health-monitor",
      },
    });

    clearTimeout(timeoutHandle);
    responseTimeMs = Date.now() - t0;
    statusCode = res.status;

    const isHealthy = expectStatus !== undefined
      ? statusCode === expectStatus
      : statusCode >= 200 && statusCode < 500;

    if (!isHealthy && statusCode === 500) {
      consecutiveFailures[path] = (consecutiveFailures[path] ?? 0) + 1;

      if (consecutiveFailures[path] >= REPEATED_500_LIMIT) {
        const failCount = consecutiveFailures[path];
        const msg = `Endpoint ${path} returned 500 ${failCount} consecutive times — circuit breaker tripped`;

        logger.error({ path, consecutiveFailures: failCount }, "[AutoHeal] " + msg);
        await logAutoHealEvent(path, msg);
        tripCircuit(path);

        if (currentCircuit === "half-open") {
          logger.error({ path }, "[AutoHeal] Half-open probe failed — circuit re-opened");
        }
      }
    } else {
      if (currentCircuit === "half-open") {
        logger.info({ path }, "[AutoHeal] Half-open probe succeeded — closing circuit");
        closeCircuit(path);
      } else {
        consecutiveFailures[path] = 0;
      }
    }

    if (path === "/api/news" && responseTimeMs > SLOW_NEWS_THRESHOLD_MS) {
      logger.warn({ responseTimeMs, path }, "[AutoHeal] /api/news slow response — triggering cache refresh");
      await logAutoHealEvent(
        path,
        `News feed slow (${responseTimeMs}ms > ${SLOW_NEWS_THRESHOLD_MS}ms threshold) — cache refresh triggered`
      );
      triggerNewsCacheRefresh().catch(() => undefined);
    }
  } catch (err) {
    responseTimeMs = Date.now() - t0;
    statusCode = 0;
    logger.warn({ path, err }, "[HealthMonitor] Endpoint unreachable");

    consecutiveFailures[path] = (consecutiveFailures[path] ?? 0) + 1;
    if (consecutiveFailures[path] >= REPEATED_500_LIMIT) {
      const msg = `Endpoint ${path} unreachable ${consecutiveFailures[path]} consecutive times — circuit tripped`;
      await logAutoHealEvent(path, msg);
      tripCircuit(path);
    }
  }

  try {
    await db.insert(apiHealthChecksTable).values({
      endpoint: path,
      responseTimeMs,
      statusCode,
    });
  } catch (dbErr) {
    logger.warn({ dbErr, path }, "[HealthMonitor] Failed to write health check to DB");
  }
}

async function triggerNewsCacheRefresh(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/news?refresh=1`, {
      headers: { "X-Internal-Cache-Refresh": "1" },
    });
  } catch {
    // best effort
  }
}

export function startApiHealthMonitor(): void {
  const INTERVAL_MS = 60_000;

  async function runChecks() {
    for (const ep of MONITORED_ENDPOINTS) {
      pingEndpoint(ep.path, ep.expectStatus).catch(() => undefined);
    }
  }

  runChecks();
  setInterval(runChecks, INTERVAL_MS);
  logger.info(
    { endpoints: MONITORED_ENDPOINTS.map((e) => e.path), intervalMs: INTERVAL_MS },
    "[HealthMonitor] Started"
  );
}
