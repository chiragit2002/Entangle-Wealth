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

async function ensurePerformanceIndexes() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);
        CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users (subscription_tier);
        CREATE INDEX IF NOT EXISTS idx_alert_history_user_triggered ON alert_history (user_id, triggered_at);
        CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets (user_id, status);
        CREATE INDEX IF NOT EXISTS idx_analytics_event_timestamp ON analytics_events (event, created_at);
      `);
      logger.info("Performance indexes ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure performance indexes (non-fatal)");
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
    try {
      const client = await pool.connect();
      try {
        await client.query("CREATE SCHEMA IF NOT EXISTS stripe");
        await client.query(`
          CREATE TABLE IF NOT EXISTS "stripe"."accounts" (
            id TEXT PRIMARY KEY,
            raw_data JSONB NOT NULL DEFAULT '{}',
            first_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            business_name TEXT GENERATED ALWAYS AS ((raw_data->'business_profile'->>'name')::text) STORED,
            email TEXT GENERATED ALWAYS AS ((raw_data->>'email')::text) STORED,
            type TEXT GENERATED ALWAYS AS ((raw_data->>'type')::text) STORED,
            charges_enabled BOOLEAN GENERATED ALWAYS AS ((raw_data->>'charges_enabled')::boolean) STORED,
            payouts_enabled BOOLEAN GENERATED ALWAYS AS ((raw_data->>'payouts_enabled')::boolean) STORED,
            details_submitted BOOLEAN GENERATED ALWAYS AS ((raw_data->>'details_submitted')::boolean) STORED,
            country TEXT GENERATED ALWAYS AS ((raw_data->>'country')::text) STORED,
            default_currency TEXT GENERATED ALWAYS AS ((raw_data->>'default_currency')::text) STORED,
            created INTEGER GENERATED ALWAYS AS ((raw_data->>'created')::integer) STORED
          );
          ALTER TABLE "stripe"."accounts" ADD COLUMN IF NOT EXISTS "api_key_hashes" TEXT[] DEFAULT '{}';
          CREATE INDEX IF NOT EXISTS idx_accounts_api_key_hashes ON "stripe"."accounts" USING GIN (api_key_hashes);
          CREATE INDEX IF NOT EXISTS idx_accounts_business_name ON "stripe"."accounts" (business_name);
        `);
      } finally {
        client.release();
      }
    } catch (schemaErr) {
      logger.warn({ error: schemaErr }, "Could not ensure stripe schema/tables (non-fatal)");
    }
    await runMigrations({ databaseUrl });
    logger.info("Stripe migrations complete");

    const origConsoleError = console.error;
    const suppressStripeRelationErrors = (...args: any[]) => {
      const msg = args.map(String).join(" ");
      if (msg.includes("stripe.accounts") && msg.includes("does not exist")) return;
      if (msg.includes("Failed to lookup account by API key hash")) return;
      if (msg.includes("Failed to upsert account to database")) return;
      origConsoleError.apply(console, args);
    };

    console.error = suppressStripeRelationErrors;

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
        logger.info("Stripe webhook setup deferred (stripe.accounts table pending sync migration)");
      }
    }

    try {
      await stripeSync.syncBackfill();
      logger.info("Stripe backfill complete");
    } catch (backfillError: any) {
      const msg = backfillError?.message || String(backfillError);
      if (msg.includes("relation") && msg.includes("does not exist")) {
        logger.info("Stripe sync tables not yet created — skipping backfill");
      } else {
        logger.warn({ error: backfillError }, "Stripe backfill failed (non-fatal)");
      }
    }

    console.error = origConsoleError;

    logger.info("Stripe initialized successfully");
  } catch (error) {
    logger.warn({ error }, "Stripe initialization failed (non-fatal)");
  }
}

const httpServer = server.listen(port, async () => {

  logger.info({ port }, "Server listening");
  trackConnections(httpServer);
  ensureReferralBadgesExist().catch((err) =>
    logger.warn({ error: err }, "Failed to seed referral badges (non-fatal)")
  );
  await ensureAlertTables();
  ensurePerformanceIndexes().catch((err) =>
    logger.warn({ error: err }, "Performance indexes setup failed (non-fatal)")
  );
  startAlertEvaluator();
  startDigestScheduler();
  await initStripe();
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error({ port }, "Port is already in use");
  } else {
    logger.error({ err }, "Server error");
  }
  process.exit(1);
});

let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Received shutdown signal, closing server...");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    pool.end().then(() => {
      logger.info("Database pool closed");
      process.exit(0);
    }).catch((err) => {
      logger.error({ error: err }, "Error closing database pool");
      process.exit(1);
    });
  });

  const timer = setTimeout(() => {
    logger.warn("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  timer.unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
