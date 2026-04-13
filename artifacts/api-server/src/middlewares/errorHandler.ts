import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { Sentry } from "../lib/sentry";

interface SuspiciousWindow {
  count: number;
  windowStart: number;
  reported: boolean;
}

const suspicious4xxMap = new Map<string, SuspiciousWindow>();
const SUSPICIOUS_WINDOW_MS = 60_000;
const AUTH_FAILURE_THRESHOLD = 10;
const VALIDATION_BURST_THRESHOLD = 20;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of suspicious4xxMap) {
    if (now - entry.windowStart > SUSPICIOUS_WINDOW_MS * 2) {
      suspicious4xxMap.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

function trackSuspicious4xx(req: Request, status: number): void {
  const isAuthFailure = status === 401 || status === 403;
  const isValidationAbuse = status === 422 || status === 400;

  if (!isAuthFailure && !isValidationAbuse) return;

  const ip = req.ip || "unknown";
  const key = `${ip}:${isAuthFailure ? "auth" : "validation"}`;
  const now = Date.now();
  const entry = suspicious4xxMap.get(key);

  if (!entry || now - entry.windowStart > SUSPICIOUS_WINDOW_MS) {
    suspicious4xxMap.set(key, { count: 1, windowStart: now, reported: false });
    return;
  }

  entry.count++;

  const threshold = isAuthFailure ? AUTH_FAILURE_THRESHOLD : VALIDATION_BURST_THRESHOLD;
  if (!entry.reported && entry.count >= threshold) {
    entry.reported = true;
    const eventType = isAuthFailure ? "repeated_auth_failures" : "validation_abuse";
    logger.warn({ ip, count: entry.count, path: req.path, status }, `Suspicious 4xx pattern: ${eventType}`);
    Sentry.withScope((scope) => {
      scope.setTag("alert_type", eventType);
      scope.setTag("http.path", req.path);
      scope.setTag("http.status", String(status));
      scope.setTag("ip", ip);
      scope.setExtra("count", entry.count);
      scope.setExtra("windowMs", SUSPICIOUS_WINDOW_MS);
      Sentry.captureMessage(`Suspicious 4xx: ${eventType} from ${ip} (${entry.count} in ${SUSPICIOUS_WINDOW_MS / 1000}s)`, "warning");
    });
  }
}

export const track4xxMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.on("finish", () => {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      trackSuspicious4xx(req, res.statusCode);
    }
  });
  next();
};

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errObj = err as { status?: number; statusCode?: number; code?: string; message?: string };

  const isQueueFull = errObj?.code === "QUEUE_FULL";

  const status = isQueueFull
    ? 503
    : typeof errObj.status === "number"
    ? errObj.status
    : typeof errObj.statusCode === "number"
    ? errObj.statusCode
    : 500;

  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
    "Unhandled error"
  );

  if (status >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag("http.method", req.method);
      scope.setTag("http.path", req.path);
      scope.setTag("http.status", String(status));
      scope.setUser({ ip_address: req.ip });
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    });
  }

  if (res.headersSent) return;

  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: isQueueFull
      ? "AI queue is full. Please try again later."
      : "Internal server error",
  });
};
