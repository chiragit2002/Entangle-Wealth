import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { logAuthEvent } from "../lib/authEventLogger";
import { recordFailedAttempt, resetAttempts } from "../middlewares/bruteForce";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/event", (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"];
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId || auth?.userId) as string | undefined;
  const { type, details } = req.body || {};

  const validTypes = ["login_success", "login_failed", "logout", "oauth_callback", "signup"];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ error: "Invalid event type" });
    return;
  }

  if (type === "login_failed") {
    recordFailedAttempt(ip);
  }

  if (type === "login_success" || type === "oauth_callback") {
    resetAttempts(ip);
  }

  logAuthEvent({
    type,
    userId: userId || details?.userId,
    ip,
    method: req.method,
    path: "/auth/event",
    userAgent,
    details,
  });

  res.json({ logged: true });
});

router.post("/auth/webhook", async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const payload = req.body;

  if (!payload || !payload.type) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const eventType = payload.type;
  const userData = payload.data;
  const userId = userData?.id || userData?.user_id;

  let authEventType: string;
  switch (eventType) {
    case "session.created":
      authEventType = "login_success";
      resetAttempts(ip);
      break;
    case "session.ended":
    case "session.removed":
    case "session.revoked":
      authEventType = "logout";
      break;
    case "user.created":
      authEventType = "signup";
      break;
    default:
      authEventType = "oauth_callback";
      break;
  }

  logAuthEvent({
    type: authEventType as any,
    userId,
    ip,
    method: "POST",
    path: "/auth/webhook",
    details: { clerkEvent: eventType },
  });

  logger.info({ clerkEvent: eventType, userId }, "Clerk auth webhook processed");
  res.json({ received: true });
});

export default router;
