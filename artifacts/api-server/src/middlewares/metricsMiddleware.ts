import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

let totalRequests = 0;
let totalResponseTimeMs = 0;
let activeRequestCount = 0;
let lastEventLoopLagMs = 0;

const SLOW_REQUEST_THRESHOLD_MS = 2000;

function measureEventLoopLag() {
  const start = process.hrtime.bigint();
  setTimeout(() => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
    lastEventLoopLagMs = Math.max(0, elapsed - 1);
    measureEventLoopLag();
  }, 1);
}
measureEventLoopLag();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  totalRequests++;
  activeRequestCount++;

  res.on("finish", () => {
    activeRequestCount--;
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = durationNs / 1_000_000;
    totalResponseTimeMs += durationMs;

    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(
        {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs),
        },
        `Slow request detected (${Math.round(durationMs)}ms)`
      );
    }
  });

  next();
}

export function getMetricsSnapshot() {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  return {
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
    },
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
    requests: {
      total: totalRequests,
      active: activeRequestCount,
      avgResponseTimeMs: totalRequests > 0
        ? Math.round(totalResponseTimeMs / totalRequests)
        : 0,
    },
    eventLoopLagMs: Math.round(lastEventLoopLagMs * 100) / 100,
    node: process.version,
    timestamp: new Date().toISOString(),
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}
