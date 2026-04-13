import { initSentry, Sentry } from "./lib/sentry";
initSentry();

import { exec } from "child_process";
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

const REQUIRED_ENV_VARS = [
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
] as const;

const OPTIONAL_WARNED_ENV_VARS = [
  "ALPACA_API_KEY",
  "ALPACA_API_SECRET",
] as const;

const missingRequired = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingRequired.length > 0) {
  console.error(`[STARTUP] FATAL: Missing required environment variables: ${missingRequired.join(", ")}`);
  process.exit(1);
}

const missingOptional = OPTIONAL_WARNED_ENV_VARS.filter((v) => !process.env[v]);
if (missingOptional.length > 0) {
  console.warn(`[STARTUP] Missing optional environment variables (some features may be disabled): ${missingOptional.join(", ")}`);
}

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
      logger.info("Alert ancillary tables ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure alert ancillary tables (non-fatal)");
  }
}

async function ensureGamificationTables() {
  // Gamification tables (streaks, daily_spins, giveaway_entries, founder_status) are
  // managed by Drizzle schema and pushed via `drizzle-kit push`. Column additions
  // (streak_protection_active, reward_type, reward_label) are handled by schema push.
  // This function handles only the irreversible data migration: changing last_activity_date
  // from text → timestamptz, which cannot be expressed in Drizzle schema alone.
  try {
    const client = await pool.connect();
    try {
      const colTypeResult = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'streaks' AND column_name = 'last_activity_date';
      `);
      if (colTypeResult.rows[0]?.data_type === 'text') {
        await client.query(`
          ALTER TABLE streaks
          ALTER COLUMN last_activity_date TYPE timestamptz
          USING CASE
            WHEN last_activity_date IS NULL THEN NULL
            WHEN last_activity_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
              THEN (last_activity_date || 'T00:00:00Z')::timestamptz
            ELSE last_activity_date::timestamptz
          END;
        `);
        logger.info("Migrated streaks.last_activity_date from text to timestamptz");
      }
      logger.info("Gamification data migration check complete");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to run gamification data migration (non-fatal)");
  }
}

async function ensurePaperTradingTables() {
  // Paper trading tables (paper_portfolios, paper_trades, paper_positions) are
  // managed by Drizzle schema and pushed via `drizzle-kit push`. This function
  // is retained for potential runtime column migrations in the future.
  logger.info("Paper trading tables managed by Drizzle schema");
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

async function ensureHabitsTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS habit_definitions (
          id SERIAL PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'general',
          xp_reward INTEGER NOT NULL DEFAULT 10,
          icon TEXT NOT NULL DEFAULT '⚡',
          difficulty TEXT NOT NULL DEFAULT 'easy',
          linked_habit TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS user_habits (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          habit_id INTEGER NOT NULL REFERENCES habit_definitions(id) ON DELETE CASCADE,
          current_streak INTEGER NOT NULL DEFAULT 0,
          longest_streak INTEGER NOT NULL DEFAULT 0,
          total_completions INTEGER NOT NULL DEFAULT 0,
          last_completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE (user_id, habit_id)
        );
        CREATE TABLE IF NOT EXISTS daily_action_completions (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          habit_id INTEGER NOT NULL REFERENCES habit_definitions(id) ON DELETE CASCADE,
          completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          xp_awarded INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_user_habits_user ON user_habits (user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_completions_user ON daily_action_completions (user_id);
        CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_action_completions (completed_at);
      `);

      const { rows } = await client.query(`SELECT COUNT(*) FROM habit_definitions WHERE is_active = true`);
      if (parseInt(rows[0].count) === 0) {
        await client.query(`
          INSERT INTO habit_definitions (slug, title, description, category, xp_reward, icon, difficulty) VALUES
          ('track-spending', 'Track Daily Spending', 'Log every purchase you make today to build awareness of your spending habits.', 'Budgeting', 15, '💳', 'easy'),
          ('no-impulse-buy', 'No Impulse Purchases', 'Avoid any unplanned purchases today. Sleep on it before buying.', 'Budgeting', 20, '🛑', 'medium'),
          ('check-net-worth', 'Review Net Worth', 'Update and review your net worth statement including assets and liabilities.', 'Tracking', 10, '📊', 'easy'),
          ('invest-today', 'Make an Investment', 'Contribute to your brokerage, IRA, or 401k — any amount counts.', 'Investing', 25, '📈', 'medium'),
          ('read-finance', 'Read Financial Content', 'Spend at least 15 minutes reading finance news, books, or research.', 'Education', 10, '📚', 'easy'),
          ('review-budget', 'Review Monthly Budget', 'Compare your actual spending to your budget and note any variances.', 'Budgeting', 15, '📋', 'easy'),
          ('emergency-fund', 'Add to Emergency Fund', 'Transfer any amount to your emergency fund savings account.', 'Saving', 20, '🏦', 'medium'),
          ('debt-payment', 'Extra Debt Payment', 'Make an extra payment on any debt beyond the minimum.', 'Debt', 25, '💪', 'medium'),
          ('meal-prep', 'Cook Instead of Dining Out', 'Prepare your meals at home instead of eating out to save money.', 'Budgeting', 10, '🍽️', 'easy'),
          ('automate-savings', 'Set Up Auto-Transfer', 'Schedule an automatic savings transfer or confirm your current automation is active.', 'Saving', 20, '🤖', 'medium')
          ON CONFLICT (slug) DO NOTHING;
        `);
        logger.info("Seeded default habit definitions");
      }

      logger.info("Habits tables ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure habits tables (non-fatal)");
  }
}

async function ensureTimelineTables() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS timelines (
          id SERIAL PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL DEFAULT 'My Timeline',
          annotation TEXT,
          monthly_income REAL NOT NULL DEFAULT 5000,
          savings_rate REAL NOT NULL DEFAULT 0.15,
          monthly_debt REAL NOT NULL DEFAULT 500,
          investment_rate REAL NOT NULL DEFAULT 0.07,
          current_net_worth REAL NOT NULL DEFAULT 0,
          emergency_fund_months REAL NOT NULL DEFAULT 0,
          is_baseline BOOLEAN DEFAULT false,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_timelines_user_id ON timelines (user_id);

        CREATE TABLE IF NOT EXISTS timeline_results (
          id SERIAL PRIMARY KEY,
          timeline_id INTEGER NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
          horizon TEXT NOT NULL,
          projected_net_worth REAL NOT NULL,
          savings_accumulated REAL NOT NULL,
          debt_remaining REAL NOT NULL,
          investment_value REAL NOT NULL,
          stability_score REAL NOT NULL,
          stress_index REAL NOT NULL,
          opportunity_score REAL NOT NULL,
          milestones JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_timeline_results_timeline ON timeline_results (timeline_id);

        CREATE TABLE IF NOT EXISTS timeline_comparisons (
          id SERIAL PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          timeline_a_id INTEGER NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
          timeline_b_id INTEGER NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
          delta_net_worth_5yr REAL,
          delta_net_worth_10yr REAL,
          delta_net_worth_20yr REAL,
          delta_stress REAL,
          delta_opportunity REAL,
          summary TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS user_identity_stages (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          stage TEXT NOT NULL DEFAULT 'Aware',
          simulations_run INTEGER NOT NULL DEFAULT 0,
          snapshots_saved INTEGER NOT NULL DEFAULT 0,
          scenarios_explored INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_user_identity_stages_user ON user_identity_stages (user_id);
      `);
      logger.info("Timeline tables ensured");
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to ensure timeline tables (non-fatal)");
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

const PROTECTED_PROCESS_NAMES = ["systemd", "init", "kernel", "kthreadd", "dockerd", "containerd", "sshd"];

async function evictProcessOnPort(targetPort: number): Promise<void> {
  const pids = await new Promise<string[]>((resolve) => {
    exec(`lsof -ti tcp:${targetPort}`, (err, stdout) => {
      resolve(err || !stdout.trim() ? [] : stdout.trim().split("\n").filter(Boolean));
    });
  });

  if (pids.length === 0) return;

  const safePids: string[] = [];
  for (const pid of pids) {
    if (pid === String(process.pid)) continue;
    const name = await new Promise<string>((resolve) => {
      exec(`ps -p ${pid} -o comm=`, (err, out) => resolve(err ? "" : out.trim().toLowerCase()));
    });
    if (PROTECTED_PROCESS_NAMES.some((n) => name.startsWith(n))) {
      logger.warn({ pid, name, port: targetPort }, "Skipping protected process on port");
      continue;
    }
    safePids.push(pid);
  }

  if (safePids.length === 0) return;

  logger.warn({ port: targetPort, pids: safePids }, "Sending SIGTERM to stale process(es) holding port");
  await new Promise<void>((resolve) => {
    exec(`kill -TERM ${safePids.join(" ")}`, () => resolve());
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));

  const remaining = await new Promise<string[]>((resolve) => {
    exec(`lsof -ti tcp:${targetPort}`, (err, stdout) => {
      resolve(err || !stdout.trim() ? [] : stdout.trim().split("\n").filter(Boolean));
    });
  });

  const stillAlive = remaining.filter((p) => safePids.includes(p));
  if (stillAlive.length > 0) {
    logger.warn({ pids: stillAlive }, "Process(es) did not exit after SIGTERM — sending SIGKILL");
    await new Promise<void>((resolve) => {
      exec(`kill -9 ${stillAlive.join(" ")}`, () => resolve());
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
  }
}

function bindServer(bindPort: number): Promise<ReturnType<typeof server.listen>> {
  return new Promise((resolve, reject) => {
    const srv = server.listen(bindPort, () => resolve(srv));
    srv.once("error", (err: NodeJS.ErrnoException) => reject(err));
  });
}

const ALLOW_PORT_EVICTION = process.env.ALLOW_PORT_EVICTION === "true";

async function tryListen(bindPort: number, retryCount = 0): Promise<ReturnType<typeof server.listen>> {
  try {
    return await bindServer(bindPort);
  } catch (err) {
    const portErr = err as NodeJS.ErrnoException;
    if (portErr.code === "EADDRINUSE" && ALLOW_PORT_EVICTION && retryCount < 2) {
      logger.warn({ port: bindPort, attempt: retryCount + 1 }, "Port in use — attempting stale-process eviction (ALLOW_PORT_EVICTION=true)");
      await evictProcessOnPort(bindPort);
      return tryListen(bindPort, retryCount + 1);
    }
    if (portErr.code === "EADDRINUSE") {
      const fallbackPort = bindPort + 1;
      if (ALLOW_PORT_EVICTION) {
        logger.error({ port: bindPort, fallbackPort }, "Port still in use after eviction attempts. Trying fallback port.");
      } else {
        logger.warn({ port: bindPort, fallbackPort }, "Port in use — binding fallback port (set ALLOW_PORT_EVICTION=true to evict stale processes)");
      }
      return bindServer(fallbackPort);
    }
    if (portErr.code === "EACCES") {
      logger.error({ port: bindPort }, "Permission denied on port. Use a port > 1024.");
    } else {
      logger.error({ err }, "Server startup error");
    }
    throw err;
  }
}

let httpServer: ReturnType<typeof server.listen>;
try {
  httpServer = await tryListen(port, 0);
  const boundAddr = httpServer.address();
  const boundPort = boundAddr && typeof boundAddr === "object" ? boundAddr.port : port;
  if (boundPort !== port) {
    logger.warn({ requestedPort: port, boundPort }, "Server bound to fallback port");
  } else {
    logger.info({ port: boundPort }, "Server listening");
  }
  trackConnections(httpServer);
} catch {
  process.exit(1);
  throw new Error("unreachable");
}

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  logger.error({ err }, "Unexpected server error after startup");
});

ensureReferralBadgesExist().catch((err) =>
  logger.warn({ error: err }, "Failed to seed referral badges (non-fatal)")
);
await ensureHabitsTables();
await ensureDailyContentTable();
await ensureAlertTables();
await ensurePaperTradingTables();
await ensureGamificationTables();
await ensureEmailSubscribersTable();
await ensureTimelineTables();
ensurePerformanceIndexes().catch((err) =>
  logger.warn({ error: err }, "Performance indexes setup failed (non-fatal)")
);
startAlertEvaluator();
startDigestScheduler();
startDailyContentScheduler();
startDripScheduler();
await initStripe();

let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Received shutdown signal, closing server...");
  if (!httpServer) {
    pool.end().catch(() => {}).finally(() => process.exit(0));
    return;
  }
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

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  gracefulShutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  Sentry.captureException(err);
  const timer = setTimeout(() => process.exit(1), 3000);
  timer.unref();
  gracefulShutdown("uncaughtException");
});
