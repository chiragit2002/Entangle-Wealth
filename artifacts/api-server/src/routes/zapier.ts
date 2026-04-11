import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { sendZapierWebhookTest } from "../lib/zapierWebhook";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";

const router = Router();

router.post("/webhooks/zapier/test", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await sendZapierWebhookTest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to send test webhook" });
  }
});

export default router;
