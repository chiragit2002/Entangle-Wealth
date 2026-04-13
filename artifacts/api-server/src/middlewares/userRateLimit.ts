import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { LRUMap } from "../lib/lruMap";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_WINDOW_ENTRIES = 10_000;

const userWindows = new LRUMap<string, RateLimitEntry>(MAX_WINDOW_ENTRIES);
const ipWindows = new LRUMap<string, RateLimitEntry>(MAX_WINDOW_ENTRIES);

const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userWindows) {
    if (now > entry.resetAt) userWindows.delete(key);
  }
  for (const [key, entry] of ipWindows) {
    if (now > entry.resetAt) ipWindows.delete(key);
  }
}, CLEANUP_INTERVAL);

function checkWindow(
  map: LRUMap<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  let entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

const WEBHOOK_PATHS_STRIPPED = ["/stripe/webhook", "/webhooks/zapier"];
const WEBHOOK_PATHS_FULL = ["/api/stripe/webhook", "/api/webhooks/zapier"];
const EXEMPT_PATHS = ["/health", "/api/health", "/stress-test", "/api/stress-test"];

function makeUserLimiter(windowMs: number, max: number, label: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path || req.url || "";
    const allWebhookPaths = [...WEBHOOK_PATHS_STRIPPED, ...WEBHOOK_PATHS_FULL];
    if (allWebhookPaths.some(wp => path.startsWith(wp))) {
      next();
      return;
    }
    if (EXEMPT_PATHS.some(ep => path === ep || path.startsWith(ep + "/"))) {
      next();
      return;
    }

    const auth = getAuth(req);
    const userId = auth?.userId;

    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (userId) {
      const key = `${label}:user:${userId}`;
      const result = checkWindow(userWindows, key, windowMs, max);
      if (!result.allowed) {
        logger.warn({ userId, path: req.path, label }, "Per-user rate limit exceeded");
        res.setHeader("Retry-After", String(result.retryAfterSec));
        res.status(429).json({
          error: "Too many requests. Please slow down.",
          retryAfter: result.retryAfterSec,
        });
        return;
      }
    } else {
      const key = `${label}:ip:${ip}`;
      const result = checkWindow(ipWindows, key, windowMs, Math.floor(max / 5));
      if (!result.allowed) {
        logger.warn({ ip, path: req.path, label }, "Per-IP rate limit exceeded (unauthenticated)");
        res.setHeader("Retry-After", String(result.retryAfterSec));
        res.status(429).json({
          error: "Too many requests. Please slow down.",
          retryAfter: result.retryAfterSec,
        });
        return;
      }
    }

    next();
  };
}

export const userApiLimiter = makeUserLimiter(60_000, 200, "api");

export const userAiLimiter = makeUserLimiter(60_000, 20, "ai");

export const userTradingLimiter = makeUserLimiter(60_000, 60, "trading");

export const userKycLimiter = makeUserLimiter(60_000, 10, "kyc");

export function makeSpamGuard(windowMs: number, authenticatedMax: number, unauthenticatedMax: number, label: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = getAuth(req);
    const userId = auth?.userId;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (userId) {
      const key = `${label}:user:${userId}`;
      const result = checkWindow(userWindows, key, windowMs, authenticatedMax);
      if (!result.allowed) {
        logger.warn({ userId, path: req.path, label }, "Spam guard rate limit exceeded (authenticated)");
        res.setHeader("Retry-After", String(result.retryAfterSec));
        res.status(429).json({ error: "Too many requests. Please slow down.", retryAfter: result.retryAfterSec });
        return;
      }
    } else {
      const key = `${label}:ip:${ip}`;
      const result = checkWindow(ipWindows, key, windowMs, unauthenticatedMax);
      if (!result.allowed) {
        logger.warn({ ip, path: req.path, label }, "Spam guard rate limit exceeded (unauthenticated)");
        res.setHeader("Retry-After", String(result.retryAfterSec));
        res.status(429).json({ error: "Too many requests. Please slow down.", retryAfter: result.retryAfterSec });
        return;
      }
    }

    next();
  };
}

export const unauthWriteSpamGuard = makeSpamGuard(60_000, 30, 5, "unauth-write");

export function getRateLimiterStats() {
  return {
    userWindows: userWindows.size,
    ipWindows: ipWindows.size,
    totalTrackedKeys: userWindows.size + ipWindows.size,
    userWindowsSize: userWindows.size,
    ipWindowsSize: ipWindows.size,
    maxEntries: MAX_WINDOW_ENTRIES,
  };
}
