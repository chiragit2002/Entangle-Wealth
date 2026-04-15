import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { logAuthEvent } from "../lib/authEventLogger";
import { resetAttempts, recordFailedAttempt } from "./bruteForce";
import { logger } from "../lib/logger";
import { BoundedTimestampMap } from "../lib/boundedMap";

const SESSION_LOG_COOLDOWN = 5 * 60 * 1000;
const recentSessions = new BoundedTimestampMap(10_000, SESSION_LOG_COOLDOWN * 2, "auth-sessions");

export const authEventTracker = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId } = getAuth(req);
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (userId && sessionId) {
      const sessionKey = `${userId}:${sessionId}`;
      const lastLogged = recentSessions.get(sessionKey);
      const now = Date.now();

      if (!lastLogged || now - lastLogged > SESSION_LOG_COOLDOWN) {
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
