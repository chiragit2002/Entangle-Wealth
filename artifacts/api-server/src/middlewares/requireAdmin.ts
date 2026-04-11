import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const ADMIN_CLERK_IDS = new Set(
  (process.env.ADMIN_CLERK_IDS || "").split(",").map(id => id.trim()).filter(Boolean)
);

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (ADMIN_CLERK_IDS.has(userId)) {
    return next();
  }

  logger.warn({ userId, path: req.path }, "Admin access denied — userId not in ADMIN_CLERK_IDS");
  res.status(403).json({ error: "Admin access required" });
};
