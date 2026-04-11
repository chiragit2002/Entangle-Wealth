import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendZapierWebhookTest } from "../lib/zapierWebhook";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();

router.post("/webhooks/zapier/test", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select({ subscriptionTier: usersTable.subscriptionTier })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    if (!user || user.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const result = await sendZapierWebhookTest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to send test webhook" });
  }
});

export default router;
