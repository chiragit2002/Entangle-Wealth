import express from "express";
import app from "./app";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { trackConnections } from "./routes/health";
import { ensureReferralBadgesExist } from "./lib/referralRewards";
import { startAlertEvaluator } from "./routes/alerts";
import { startDigestScheduler } from "./lib/emailDigest";
import { pool } from "@workspace/db";

async function ensureAlertTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          threshold REAL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS alert_history (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          alert_id INTEGER,
          symbol TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          triggered_value REAL,
          message TEXT,
          read BOOLEAN DEFAULT false,
          triggered_at TIMESTAMPTZ DEFAULT now()
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_email_digest TEXT DEFAULT 'off';
        CREATE TABLE IF NOT EXISTS analytics_events (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          event TEXT NOT NULL,
          properties JSONB,
          session_id TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event);
        CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events (created_at);
        CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events (user_id);
      `);
      logger.info("Alert tables ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure alert tables (non-fatal)");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = express();

server.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing signature" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error({ error }, "Webhook processing error");
      res.status(400).json({ error: "Webhook processing failed" });
    }
  }
);

server.use(app);

async function initStripe() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn("DATABASE_URL not set, skipping Stripe init");
      return;
    }

    logger.info("Running Stripe migrations...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe migrations complete");

    const stripeSync = await getStripeSync();
    logger.info("StripeSync instance created");

    const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
    if (domains.length > 0) {
      const webhookBaseUrl = `https://${domains[0]}`;
      try {
        await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        logger.info("Stripe webhook configured");
      } catch (webhookError) {
        logger.warn({ error: webhookError }, "Webhook setup failed (will retry)");
      }
    }

    try {
      await stripeSync.syncBackfill();
      logger.info("Stripe backfill complete");
    } catch (backfillError) {
      logger.warn({ error: backfillError }, "Stripe backfill failed (non-fatal)");
    }

    logger.info("Stripe initialized successfully");
  } catch (error) {
    logger.warn({ error }, "Stripe initialization failed (non-fatal)");
  }
}

const httpServer = server.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  trackConnections(httpServer);
  ensureReferralBadgesExist().catch((err) =>
    logger.warn({ error: err }, "Failed to seed referral badges (non-fatal)")
  );
  await ensureAlertTables();
  startAlertEvaluator();
  startDigestScheduler();
  await initStripe();
});
