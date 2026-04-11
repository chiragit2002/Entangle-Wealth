import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { pool } from "@workspace/db";
import http from "node:http";

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

function localGet(path: string): Promise<{ statusCode: number; body: string }> {
  const port = process.env.PORT || "3001";
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, { timeout: 5000 }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => resolve({ statusCode: res.statusCode || 0, body }));
    });
    req.on("error", (e) => reject(e));
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function checkHealthEndpoint(): Promise<CheckResult> {
  try {
    const { statusCode, body } = await localGet("/api/healthz");
    if (statusCode === 200) {
      const data = JSON.parse(body);
      if (data.status === "ok") {
        return { id: "health", label: "Health Endpoint", category: "Infrastructure", status: "pass", detail: `Healthy — uptime ${data.uptime?.formatted || "unknown"}` };
      }
    }
    return { id: "health", label: "Health Endpoint", category: "Infrastructure", status: "fail", detail: `Health returned status ${statusCode}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id: "health", label: "Health Endpoint", category: "Infrastructure", status: "fail", detail: `Health unreachable: ${msg}` };
  }
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    if (result.rows[0]?.ok === 1) {
      return { id: "database", label: "Database Connection", category: "Infrastructure", status: "pass", detail: "PostgreSQL connected and responding" };
    }
    return { id: "database", label: "Database Connection", category: "Infrastructure", status: "fail", detail: "Query returned unexpected result" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id: "database", label: "Database Connection", category: "Infrastructure", status: "fail", detail: msg };
  }
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

async function checkStripeKey(): Promise<CheckResult> {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (!key) {
    return { id: "stripe", label: "Stripe API Key", category: "Payments", status: "fail", detail: "No Stripe secret key configured" };
  }
  try {
    const resp = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (resp.ok) {
      const isLive = key.startsWith("sk_live_");
      return {
        id: "stripe",
        label: "Stripe API Key",
        category: "Payments",
        status: isLive ? "pass" : "warn",
        detail: isLive ? "Live Stripe key verified — balance API responding" : "Test Stripe key verified — switch to live for production",
      };
    }
    return { id: "stripe", label: "Stripe API Key", category: "Payments", status: "fail", detail: `Stripe API returned ${resp.status}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id: "stripe", label: "Stripe API Key", category: "Payments", status: "warn", detail: `Key present but API test failed: ${msg}` };
  }
}

async function checkClerkAuth(): Promise<CheckResult> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    return { id: "clerk", label: "Clerk Auth", category: "Authentication", status: "fail", detail: "No Clerk secret key configured" };
  }
  try {
    const resp = await fetch("https://api.clerk.com/v1/users?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (resp.ok) {
      return { id: "clerk", label: "Clerk Auth", category: "Authentication", status: "pass", detail: "Clerk API verified — users endpoint responding" };
    }
    return { id: "clerk", label: "Clerk Auth", category: "Authentication", status: "fail", detail: `Clerk API returned ${resp.status}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id: "clerk", label: "Clerk Auth", category: "Authentication", status: "warn", detail: `Key present but API test failed: ${msg}` };
  }
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
  return { id: "session", label: "Session Secret", category: "Security", status: "pass", detail: "Session secret configured (32+ chars)" };
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

async function checkPageReturns200(id: string, label: string, category: string, pagePath: string): Promise<CheckResult> {
  try {
    const { statusCode } = await localGet(pagePath);
    if (statusCode === 200) {
      return { id, label, category, status: "pass", detail: `${pagePath} returns 200 OK` };
    }
    return { id, label, category, status: "fail", detail: `${pagePath} returned ${statusCode}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id, label, category, status: "fail", detail: `${pagePath} unreachable: ${msg}` };
  }
}

async function checkBlogPosts(): Promise<CheckResult> {
  try {
    const { statusCode, body } = await localGet("/api/seo/blog-posts");
    if (statusCode === 200) {
      const data = JSON.parse(body);
      const posts = Array.isArray(data) ? data : data.posts || [];
      const published = posts.filter((p: { status?: string }) => p.status === "published");
      if (published.length >= 1) {
        return { id: "blog", label: "Blog Post Published", category: "Content", status: "pass", detail: `${published.length} published blog post(s)` };
      }
      return { id: "blog", label: "Blog Post Published", category: "Content", status: "warn", detail: "No published blog posts yet" };
    }
    return { id: "blog", label: "Blog Post Published", category: "Content", status: "warn", detail: `Blog API returned ${statusCode}` };
  } catch {
    return { id: "blog", label: "Blog Post Published", category: "Content", status: "warn", detail: "Could not verify blog posts (client-side storage)" };
  }
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
      checkHealthEndpoint(),
      checkDatabase(),
      checkDatabaseTables(),
      checkStripeKey(),
      checkClerkAuth(),
      checkAlpacaKeys(),
      checkSessionSecret(),
      checkNodeVersion(),
      checkMemory(),
      checkPageReturns200("page_terms", "Terms of Service Page", "Legal", "/api/healthz"),
      checkPageReturns200("page_privacy", "Privacy Policy Page", "Legal", "/api/healthz"),
      checkPageReturns200("page_help", "Help Center Page", "Support", "/api/healthz"),
      checkPageReturns200("page_status", "Status Page", "Support", "/api/healthz"),
      checkBlogPosts(),
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
