import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now > record.lockedUntil && now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }

  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    logger.warn({ ip, attempts: record.count }, "IP locked out due to brute force");
  }
}

export function resetAttempts(ip: string): void {
  attempts.delete(ip);
}

export const bruteForceGuard = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = attempts.get(ip);

  if (record && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    logger.warn({ ip, retryAfter }, "Blocked request from locked-out IP");
    res.status(429).json({
      error: "Too many failed attempts. Please try again later.",
      retryAfter,
    });
    return;
  }

  next();
};
