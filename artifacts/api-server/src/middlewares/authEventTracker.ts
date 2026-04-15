import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { logAuthEvent } from "../lib/authEventLogger";
import { resetAttempts, recordFailedAttempt } from "./bruteForce";
import { logger } from "../lib/logger";

const recentSessions = new Map<string, number>();
const SESSION_LOG_COOLDOWN = 5 * 60 * 1000;
const MAX_TRACKED = 10000;

const CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - SESSION_LOG_COOLDOWN;
  for (const [key, ts] of recentSessions) {
    if (ts < cutoff) recentSessions.delete(key);
  }
}, CLEANUP_INTERVAL);

export const authEventTracker = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId } = getAuth(req);
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (userId && sessionId) {
      const sessionKey = `${userId}:${sessionId}`;
      const lastLogged = recentSessions.get(sessionKey);
      const now = Date.now();

      if (!lastLogged || now - lastLogged > SESSION_LOG_COOLDOWN) {
        if (recentSessions.size >= MAX_TRACKED) {
          const firstKey = recentSessions.keys().next().value;
          if (firstKey !== undefined) recentSessions.delete(firstKey);
        }
        recentSessions.set(sessionKey, now);

        logAuthEvent({
          type: "login_success",
          userId,
          ip,
          method: req.method,
          path: req.path,
          userAgent: req.headers["user-agent"],
          details: { sessionId, source: "session_tracker" },
        });

        resetAttempts(ip);
      }
    }
  } catch (err) {
    logger.debug({ error: err }, "Auth event tracking failed (non-critical)");
  }

  next();
};
