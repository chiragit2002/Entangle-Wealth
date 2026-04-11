import { Router, type Request, type Response } from "express";
import webpush from "web-push";
import { requireAuth } from "../middlewares/requireAuth";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();

const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@entanglewealth.com";

let vapidConfigured = false;
let activePublicKey = "";

function tryConfigureVapid(pub: string, priv: string): boolean {
  try {
    webpush.setVapidDetails(vapidSubject, pub, priv);
    activePublicKey = pub;
    return true;
  } catch {
    return false;
  }
}

const envPub = process.env.VAPID_PUBLIC_KEY || "";
const envPriv = process.env.VAPID_PRIVATE_KEY || "";

if (envPub && envPriv && tryConfigureVapid(envPub, envPriv)) {
  vapidConfigured = true;
  logger.info("VAPID configured from environment variables");
} else {
  const generated = webpush.generateVAPIDKeys();
  if (tryConfigureVapid(generated.publicKey, generated.privateKey)) {
    vapidConfigured = true;
    logger.info({ publicKey: generated.publicKey }, "VAPID keys auto-generated (set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars for persistence across restarts)");
  } else {
    logger.warn("Failed to configure VAPID keys — push notifications disabled");
  }
}

router.get("/push/vapid-public-key", (_req: Request, res: Response) => {
  res.json({ publicKey: activePublicKey });
});

const PushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({
      p256dh: z.string().max(500),
      auth: z.string().max(200),
    }).optional(),
  }),
});

router.post("/push/subscribe", requireAuth, validateBody(PushSubscriptionSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { subscription } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, endpoint) DO UPDATE SET subscription_json = $3, updated_at = now()`,
        [userId, subscription.endpoint, JSON.stringify(subscription)]
      );
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ error: err }, "Failed to save push subscription");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.delete("/push/subscribe", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "Missing endpoint" });
    return;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(
        "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
        [userId, endpoint]
      );
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ error: err }, "Failed to remove push subscription");
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

export async function sendPushNotificationToUser(userId: string, payload: { title: string; body: string; icon?: string; url?: string }) {
  if (!vapidConfigured) {
    return;
  }

  try {
    const client = await pool.connect();
    let rows: Array<{ id: number; endpoint: string; subscription_json: string }>;
    try {
      const result = await client.query(
        "SELECT id, endpoint, subscription_json FROM push_subscriptions WHERE user_id = $1",
        [userId]
      );
      rows = result.rows;
    } finally {
      client.release();
    }

    if (rows.length === 0) return;

    const notificationPayload = JSON.stringify(payload);
    const staleIds: number[] = [];

    await Promise.allSettled(
      rows.map(async (row) => {
        try {
          const subscription = JSON.parse(row.subscription_json);
          await webpush.sendNotification(subscription, notificationPayload);
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(row.id);
          } else {
            logger.warn({ error: err, endpoint: row.endpoint }, "Push notification failed");
          }
        }
      })
    );

    if (staleIds.length > 0) {
      const client2 = await pool.connect();
      try {
        await client2.query(
          "DELETE FROM push_subscriptions WHERE id = ANY($1)",
          [staleIds]
        );
      } finally {
        client2.release();
      }
    }
  } catch (err) {
    logger.error({ error: err }, "Failed to send push notifications");
  }
}

export default router;
