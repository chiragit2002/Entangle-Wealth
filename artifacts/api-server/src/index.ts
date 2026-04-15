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
import { ensureBacktesterBadgesExist } from "./routes/gamification";
import { ensureSupportTables } from "./lib/supportTables";
import { ensureBacktesterBadgesExist as ensureTask126BadgesExist } from "./lib/backtesterBadges";
import { startAlertEvaluator, stopAlertEvaluator, closeAllSseConnections } from "./routes/alerts";
import { startDigestScheduler, stopDigestScheduler } from "./lib/emailDigest";
import { startDailyContentScheduler, stopDailyContentScheduler } from "./routes/dailyContent";
import { startDripScheduler, stopDripScheduler } from "./lib/dripEmails";
import { startApiHealthMonitor } from "./lib/apiHealthMonitor";
import { pool, db } from "@workspace/db";
import { paperPortfoliosTable } from "@workspace/db/schema";
import { gt } from "drizzle-orm";

(globalThis as Record<string, unknown>).__dbLogger = logger;

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


async function seedHabitDefinitions() {
  try {
    const client = await pool.connect();
    try {
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
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ error: err }, "Failed to seed habit definitions (non-fatal)");
  }
}

async function verifySchemaReady() {
  const requiredTables = [
    "users", "alerts", "alert_history", "analytics_events", "api_health_checks",
    "push_subscriptions", "email_subscribers", "daily_content_posts",
    "habit_definitions", "user_habits", "daily_action_completions",
    "timelines", "timeline_results", "timeline_comparisons", "user_identity_stages",
    "paper_portfolios", "paper_trades", "paper_positions",
    "user_xp", "xp_transactions", "badges", "streaks",
  ];
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    const existing = new Set(rows.map((r: { tablename: string }) => r.tablename));
    const missing = requiredTables.filter((t) => !existing.has(t));
    if (missing.length > 0) {
      logger.fatal(
        { missingTables: missing },
        "SCHEMA CHECK FAILED: Required tables missing. Run 'drizzle-kit migrate' in lib/db to apply migrations."
      );
      process.exit(1);
    } else {
      logger.info("Schema readiness check passed — all required tables present");
    }
  } finally {
    client.release();
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
      res.status(500).json({ error: "Webhook processing failed" });
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

const openSockets = new Set<import("net").Socket>();

function trackOpenSockets(srv: import("http").Server): void {
  srv.on("connection", (socket: import("net").Socket) => {
    openSockets.add(socket);
    socket.once("close", () => openSockets.delete(socket));
  });
}

async function normalizePortfolioBalances() {
  const DEFAULT_STARTING_CASH = 100_000;
  try {
    const result = await db
      .update(paperPortfoliosTable)
      .set({ cashBalance: DEFAULT_STARTING_CASH, updatedAt: new Date() })
      .where(gt(paperPortfoliosTable.cashBalance, DEFAULT_STARTING_CASH));
    logger.info({ result }, "Portfolio balance normalization complete (early-adopter advantage removed)");
  } catch (err) {
    logger.warn({ error: err }, "Portfolio balance normalization failed (non-fatal)");
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
  trackOpenSockets(httpServer);
} catch (err) {
  logger.fatal({ error: err }, "Server startup failed");
  process.exit(1);
  throw new Error("unreachable");
}

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  logger.error({ err }, "Unexpected server error after startup");
});

ensureReferralBadgesExist().catch((err) =>
  logger.warn({ error: err }, "Failed to seed referral badges (non-fatal)")
);
ensureBacktesterBadgesExist().catch((err) =>
  logger.warn({ error: err }, "Failed to seed backtester badges (non-fatal)")
);
ensureTask126BadgesExist().catch((err) =>
  logger.warn({ error: err }, "Failed to seed task-126 backtester badges (non-fatal)")
);
await verifySchemaReady();
await normalizePortfolioBalances();
await ensureGamificationTables();
await ensureSupportTables();
await seedHabitDefinitions();
ensurePerformanceIndexes().catch((err) =>
  logger.warn({ error: err }, "Performance indexes setup failed (non-fatal)")
);
startAlertEvaluator();
startDigestScheduler();
startDailyContentScheduler();
startDripScheduler();
startApiHealthMonitor();
await initStripe();

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown...");

  const forceExitTimer = setTimeout(() => {
    logger.warn("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 30_000);
  forceExitTimer.unref();

  logger.info("Step 1/5: Stopping background schedulers...");
  stopAlertEvaluator();
  stopDigestScheduler();
  stopDripScheduler();
  stopDailyContentScheduler();
  logger.info("Background schedulers stopped");

  if (!httpServer) {
    logger.info("No HTTP server, closing database pool...");
    await pool.end().catch((err) => logger.error({ error: err }, "Error closing database pool"));
    process.exit(0);
    return;
  }

  logger.info("Step 2/5: Stopping acceptance of new requests...");
  await new Promise<void>((resolve) => {
    const drainTimeout = setTimeout(resolve, 10_000);
    httpServer!.close(() => {
      clearTimeout(drainTimeout);
      resolve();
    });
  });
  logger.info("Step 3/5: Active request drain complete (or 10s timeout elapsed)");

  logger.info("Step 4/5: Closing SSE connections and lingering sockets...");
  closeAllSseConnections();
  for (const socket of openSockets) {
    try { socket.destroy(); } catch (err) { logger.debug({ error: err }, "Socket already destroyed during shutdown"); }
  }
  openSockets.clear();
  logger.info("SSE connections and lingering sockets closed");

  logger.info("Step 5/5: Closing database pool...");
  try {
    await pool.end();
    logger.info("Database pool closed");
    process.exit(0);
  } catch (err) {
    logger.error({ error: err }, "Error closing database pool");
    process.exit(1);
  }
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
