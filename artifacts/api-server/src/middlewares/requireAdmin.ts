import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

  try {
    const [user] = await db
      .select({ subscriptionTier: usersTable.subscriptionTier })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    if (user && user.subscriptionTier === "admin") {
      return next();
    }
  } catch (err) {
    logger.error({ err, userId }, "Admin check failed");
  }

  res.status(403).json({ error: "Admin access required" });
};
