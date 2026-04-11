import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { logAuthEvent } from "../lib/authEventLogger";
import { recordFailedAttempt, resetAttempts } from "./bruteForce";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = getAuth(req);
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  if (!userId) {
    logAuthEvent({
      type: "auth_check_failed",
      ip,
      method: req.method,
      path: req.path,
      userAgent: req.headers["user-agent"],
    });
    recordFailedAttempt(ip);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  resetAttempts(ip);
  (req as AuthenticatedRequest).userId = userId as string;
  next();
};
