import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendZapierWebhookTest } from "../lib/zapierWebhook";
import { validateBody, z } from "../lib/validateRequest";

const router = Router();

router.post("/webhooks/zapier/test", requireAuth, requireAdmin, validateBody(z.object({}).strict()), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await sendZapierWebhookTest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to send test webhook" });
  }
});

export default router;
