import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { pool } from "@workspace/db";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router: IRouter = Router();

interface CheckResult {
  id: string;
  label: string;
  category: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

async function checkHealth(): Promise<CheckResult> {
  return {
    id: "health",
    label: "Health Endpoint",
    category: "Infrastructure",
    status: "pass",
    detail: "API server is running and healthy",
  };
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    if (result.rows[0]?.ok === 1) {
      return { id: "database", label: "Database Connection", category: "Infrastructure", status: "pass", detail: "PostgreSQL connected" };
    }
    return { id: "database", label: "Database Connection", category: "Infrastructure", status: "fail", detail: "Query returned unexpected result" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id: "database", label: "Database Connection", category: "Infrastructure", status: "fail", detail: msg };
  }
}

async function checkStripeKey(): Promise<CheckResult> {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!key) {
    return { id: "stripe", label: "Stripe API Key", category: "Payments", status: "fail", detail: "No Stripe secret key configured" };
  }
  const isLive = key.startsWith("sk_live_");
  return {
    id: "stripe",
    label: "Stripe API Key",
    category: "Payments",
    status: isLive ? "pass" : "warn",
    detail: isLive ? "Live Stripe key configured" : "Using test Stripe key — switch to live for production",
  };
}

async function checkClerkKey(): Promise<CheckResult> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    return { id: "clerk", label: "Clerk Auth", category: "Authentication", status: "fail", detail: "No Clerk secret key configured" };
  }
  return { id: "clerk", label: "Clerk Auth", category: "Authentication", status: "pass", detail: "Clerk secret key configured" };
}

async function checkAlpacaKeys(): Promise<CheckResult> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_API_SECRET;
  if (!key || !secret) {
    return { id: "alpaca", label: "Alpaca Market Data", category: "Data", status: "fail", detail: "Alpaca API credentials missing" };
  }
  return { id: "alpaca", label: "Alpaca Market Data", category: "Data", status: "pass", detail: "Alpaca API credentials configured" };
}

async function checkSessionSecret(): Promise<CheckResult> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return { id: "session", label: "Session Secret", category: "Security", status: "fail", detail: "SESSION_SECRET not set" };
  }
  if (secret.length < 32) {
    return { id: "session", label: "Session Secret", category: "Security", status: "warn", detail: "SESSION_SECRET should be at least 32 characters" };
  }
  return { id: "session", label: "Session Secret", category: "Security", status: "pass", detail: "Session secret configured" };
}

async function checkDatabaseTables(): Promise<CheckResult> {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const count = parseInt(result.rows[0]?.cnt || "0", 10);
    if (count >= 5) {
      return { id: "db_tables", label: "Database Schema", category: "Infrastructure", status: "pass", detail: `${count} tables in public schema` };
    }
    return { id: "db_tables", label: "Database Schema", category: "Infrastructure", status: "warn", detail: `Only ${count} tables — expected at least 5` };
  } catch {
    return { id: "db_tables", label: "Database Schema", category: "Infrastructure", status: "fail", detail: "Could not query tables" };
  }
}

async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0], 10);
  if (major >= 18) {
    return { id: "node", label: "Node.js Version", category: "Infrastructure", status: "pass", detail: `Running ${version}` };
  }
  return { id: "node", label: "Node.js Version", category: "Infrastructure", status: "warn", detail: `Running ${version} — Node 18+ recommended` };
}

async function checkMemory(): Promise<CheckResult> {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  if (heapUsedMB < 400) {
    return { id: "memory", label: "Memory Usage", category: "Performance", status: "pass", detail: `${heapUsedMB}MB heap used` };
  }
  if (heapUsedMB < 700) {
    return { id: "memory", label: "Memory Usage", category: "Performance", status: "warn", detail: `${heapUsedMB}MB heap used — monitor closely` };
  }
  return { id: "memory", label: "Memory Usage", category: "Performance", status: "fail", detail: `${heapUsedMB}MB heap used — high memory pressure` };
}

router.get("/admin/launch-checks", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const userResult = await pool.query(
      'SELECT "subscriptionTier" FROM users WHERE "clerkId" = $1',
      [userId]
    );
    const tier = userResult.rows[0]?.subscriptionTier;
    if (tier !== "admin") return res.status(403).json({ error: "Admin access required" });

    const checks = await Promise.all([
      checkHealth(),
      checkDatabase(),
      checkDatabaseTables(),
      checkStripeKey(),
      checkClerkKey(),
      checkAlpacaKeys(),
      checkSessionSecret(),
      checkNodeVersion(),
      checkMemory(),
    ]);

    const passing = checks.filter((c) => c.status === "pass").length;
    const warnings = checks.filter((c) => c.status === "warn").length;
    const failing = checks.filter((c) => c.status === "fail").length;

    res.json({
      checks,
      summary: {
        total: checks.length,
        passing,
        warnings,
        failing,
        score: Math.round((passing / checks.length) * 100),
        ready: failing === 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

export default router;
