import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { logAuthEvent, type AuthEventType } from "../lib/authEventLogger";
import { recordFailedAttempt, resetAttempts } from "../middlewares/bruteForce";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

const VALID_TYPES: Set<AuthEventType> = new Set([
  "login_success",
  "login_failed",
  "logout",
  "oauth_callback",
  "signup",
]);

const REQUIRES_AUTH: Set<AuthEventType> = new Set([
  "login_success",
  "logout",
  "oauth_callback",
  "signup",
]);

router.post("/auth/event", (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"];
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId || auth?.userId) as string | undefined;
  const { type, details } = req.body || {};

  if (!type || !VALID_TYPES.has(type)) {
    res.status(400).json({ error: "Invalid event type" });
    return;
  }

  const eventType: AuthEventType = type;

  if (REQUIRES_AUTH.has(eventType) && !userId) {
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
    userId,
    ip,
    method: req.method,
    path: "/auth/event",
    userAgent,
    details,
  });

  if (eventType === "login_success" && userId) {
    const hashedIp = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
    sendZapierWebhook("login", {
      userId,
      timestamp: new Date().toISOString(),
      ipHash: hashedIp,
    }).catch((err) => logger.warn({ err }, "Failed to send Zapier webhook for login event"));
  }

  res.json({ logged: true });
});

export default router;
