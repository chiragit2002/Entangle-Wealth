import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { logAuthEvent, type AuthEventType } from "../lib/authEventLogger";
import { recordFailedAttempt, resetAttempts } from "../middlewares/bruteForce";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";
import crypto from "crypto";

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
