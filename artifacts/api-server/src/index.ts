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
import { startDailyContentScheduler } from "./routes/dailyContent";
import { startDripScheduler } from "./lib/dripEmails";
import { pool } from "@workspace/db";

async function ensureDailyContentTable() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS daily_content_posts (
          id SERIAL PRIMARY KEY,
          batch_date DATE NOT NULL,
          platform TEXT NOT NULL,
          content TEXT NOT NULL,
          theme TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_daily_content_batch_date ON daily_content_posts (batch_date);
        CREATE INDEX IF NOT EXISTS idx_daily_content_status ON daily_content_posts (status);
      `);
      logger.info("Daily content table ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure daily content table (non-fatal)");
  }
}

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
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          subscription_json TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, endpoint)
        );
        CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);
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

async function ensureGamificationTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS daily_spins (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reward TEXT NOT NULL,
          reward_type TEXT NOT NULL,
          reward_value INTEGER NOT NULL DEFAULT 0,
          spun_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS founder_status (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          xp_multiplier REAL NOT NULL DEFAULT 1.5,
          granted_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_daily_spins_user ON daily_spins (user_id);
      `);
      logger.info("Gamification tables ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure gamification tables (non-fatal)");
  }
}

async function ensurePaperTradingTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS paper_portfolios (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE,
          cash_balance REAL NOT NULL DEFAULT 100000,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS paper_trades (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          total_cost REAL NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS paper_positions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          avg_cost REAL NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS daily_spins (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          prize_amount REAL NOT NULL,
          spin_date TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS daily_spins_user_date_unique ON daily_spins (user_id, spin_date);
        CREATE INDEX IF NOT EXISTS idx_paper_trades_user ON paper_trades (user_id);
        CREATE INDEX IF NOT EXISTS idx_paper_positions_user ON paper_positions (user_id);
      `);
      logger.info("Paper trading tables ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure paper trading tables (non-fatal)");
  }
}

async function ensureEmailSubscribersTable() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_subscribers (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          preference TEXT NOT NULL DEFAULT 'tips',
          drip_stage INTEGER NOT NULL DEFAULT 0,
          subscribed BOOLEAN NOT NULL DEFAULT true,
          unsubscribe_token TEXT NOT NULL,
          converted BOOLEAN NOT NULL DEFAULT false,
          next_send_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers (email);
        CREATE INDEX IF NOT EXISTS idx_email_subscribers_next_send ON email_subscribers (next_send_at)
          WHERE subscribed = true AND converted = false;
      `);
      logger.info("Email subscribers table ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure email_subscribers table (non-fatal)");
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
  await ensureDailyContentTable();
  await ensureAlertTables();
  await ensurePaperTradingTables();
  await ensureGamificationTables();
  await ensureEmailSubscribersTable();
  ensurePerformanceIndexes().catch((err) =>
    logger.warn({ error: err }, "Performance indexes setup failed (non-fatal)")
  );
  startAlertEvaluator();
  startDigestScheduler();
  startDailyContentScheduler();
  startDripScheduler();
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
