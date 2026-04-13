import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { logAuthEvent, type AuthEventType } from "../lib/authEventLogger";
import { recordFailedAttempt, resetAttempts } from "../middlewares/bruteForce";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";
import crypto from "crypto";
import { BoundedRateLimitMap } from "../lib/boundedMap";

const router = Router();

const AuthEventBodySchema = z.object({
  type: z.enum(["login_success", "login_failed", "logout", "oauth_callback", "signup"]),
  details: z.record(z.unknown()).optional(),
});

const REQUIRES_AUTH: Set<AuthEventType> = new Set([
  "login_success",
  "logout",
  "oauth_callback",
  "signup",
]);

const failedEventWindow = new BoundedRateLimitMap(5_000, "authEvents-failedWindow");
const FAILED_EVENT_MAX = 10;
const FAILED_EVENT_WINDOW_MS = 60_000;

router.post("/auth/event", validateBody(AuthEventBodySchema), (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"];
  const { userId } = getAuth(req);
  const resolvedUserId = userId ?? undefined;
  const { type, details } = req.body;

  const eventType: AuthEventType = type as AuthEventType;

  if (REQUIRES_AUTH.has(eventType) && !resolvedUserId) {
    res.status(401).json({ error: "Authentication required for this event type" });
    return;
  }

  if (eventType === "login_failed") {
    const now = Date.now();
    const bucket = failedEventWindow.get(ip);
    if (bucket && now < bucket.resetAt) {
      bucket.count++;
      if (bucket.count > FAILED_EVENT_MAX) {
        res.status(429).json({ error: "Too many failed login events" });
        return;
      }
    } else {
      failedEventWindow.set(ip, { count: 1, resetAt: now + FAILED_EVENT_WINDOW_MS });
    }
    recordFailedAttempt(ip);
  }

  if (eventType === "login_success" || eventType === "oauth_callback") {
    resetAttempts(ip);
  }

  logAuthEvent({
    type: eventType,
    userId: resolvedUserId,
    ip,
    method: req.method,
    path: "/auth/event",
    userAgent,
    details,
  });

  if (eventType === "login_success" && resolvedUserId) {
    const hashedIp = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
    sendZapierWebhook("login", {
      userId: resolvedUserId,
      timestamp: new Date().toISOString(),
      ipHash: hashedIp,
    }).catch(err => logger.warn({ err, userId }, 'Failed to send login Zapier webhook'));
  }

  res.json({ logged: true });
});

export default router;
