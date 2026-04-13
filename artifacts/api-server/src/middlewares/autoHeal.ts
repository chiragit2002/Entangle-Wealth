import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";

const REPEATED_500_LIMIT = 3;
const WINDOW_MS = 60_000;

interface FailureRecord {
  count: number;
  firstAt: number;
  tripped: boolean;
}

const endpointFailures: Record<string, FailureRecord> = {};

const circuitOpen: Set<string> = new Set();
const CIRCUIT_RESET_MS = 5 * 60_000;
const circuitOpenedAt: Record<string, number> = {};

function normalizeEndpoint(path: string): string {
  return path.replace(/\/[a-f0-9-]{36}/g, "/:id").replace(/\/\d+/g, "/:id");
}

async function logCircuitEvent(endpoint: string, message: string): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      pageUrl: endpoint,
      issueType: "circuit_breaker",
      severity: "CRITICAL",
      errorMessage: message,
      componentName: "AutoHealMiddleware",
    });
  } catch {
    // best effort
  }
}

export function autoHealMiddleware(req: Request, res: Response, next: NextFunction): void {
  const endpoint = normalizeEndpoint(req.path);

  const now = Date.now();
  if (circuitOpen.has(endpoint)) {
    const openedAt = circuitOpenedAt[endpoint] ?? 0;
    if (now - openedAt < CIRCUIT_RESET_MS) {
      res.status(503).json({
        error: "Service temporarily unavailable (circuit open — recovering)",
        retryAfterMs: CIRCUIT_RESET_MS - (now - openedAt),
      });
      return;
    }
    circuitOpen.delete(endpoint);
    logger.info({ endpoint }, "[AutoHeal] Circuit half-open — allowing probe request through");
  }

  const originalEnd = res.end.bind(res);

  (res as unknown as { end: typeof res.end }).end = function (
    this: Response,
    ...args: Parameters<typeof res.end>
  ) {
    const statusCode = res.statusCode;

    if (statusCode === 500) {
      const record = endpointFailures[endpoint] ?? { count: 0, firstAt: now, tripped: false };

      if (now - record.firstAt > WINDOW_MS) {
        endpointFailures[endpoint] = { count: 1, firstAt: now, tripped: false };
      } else {
        record.count += 1;
        endpointFailures[endpoint] = record;

        if (record.count >= REPEATED_500_LIMIT && !record.tripped) {
          record.tripped = true;

          const msg = `Endpoint ${endpoint} returned 500 ${record.count} times in ${WINDOW_MS / 1000}s — circuit breaker tripped, restart hook invoked`;
          logger.error({ endpoint, count: record.count }, "[AutoHeal] " + msg);

          circuitOpen.add(endpoint);
          circuitOpenedAt[endpoint] = Date.now();

          logCircuitEvent(endpoint, msg).catch(() => undefined);

          triggerRestartHook(endpoint).catch(() => undefined);
        }
      }
    } else if (statusCode < 500) {
      const record = endpointFailures[endpoint];
      if (record) {
        record.count = 0;
        record.tripped = false;
      }
    }

    return originalEnd(...args);
  } as typeof res.end;

  next();
}

let restartCooldowns: Record<string, number> = {};
const RESTART_COOLDOWN_MS = 10 * 60_000;

async function triggerRestartHook(endpoint: string): Promise<void> {
  const now = Date.now();
  const lastRestart = restartCooldowns[endpoint] ?? 0;
  if (now - lastRestart < RESTART_COOLDOWN_MS) {
    logger.warn({ endpoint }, "[AutoHeal] Restart cooldown active — skipping");
    return;
  }

  restartCooldowns[endpoint] = now;
  logger.error(
    { endpoint, action: "restart_hook" },
    "[AutoHeal] RESTART HOOK TRIGGERED: Logging restart attempt for endpoint"
  );

  try {
    await db.insert(auditLogTable).values({
      pageUrl: endpoint,
      issueType: "restart_attempt",
      severity: "CRITICAL",
      errorMessage: `Auto-heal restart hook triggered for endpoint ${endpoint} after ${REPEATED_500_LIMIT} consecutive 500 errors`,
      componentName: "AutoHealMiddleware",
    });
  } catch {
    // best effort
  }
}
