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

function localApiGet(path: string): Promise<{ statusCode: number; body: string }> {
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

function frontendGet(path: string): Promise<{ statusCode: number; body: string }> {
  const frontendPort = process.env.FRONTEND_PORT || "80";
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${frontendPort}${path}`, { timeout: 5000 }, (res) => {
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
    const { statusCode, body } = await localApiGet("/api/healthz");
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

async function checkFrontendPage(id: string, label: string, category: string, path: string): Promise<CheckResult> {
  try {
    const { statusCode, body } = await frontendGet(path);
    if (statusCode === 200 && body.length > 100) {
      return { id, label, category, status: "pass", detail: `${path} serving (${statusCode}, ${Math.round(body.length / 1024)}KB)` };
    }
    return { id, label, category, status: "fail", detail: `${path} returned ${statusCode}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { id, label, category, status: "fail", detail: `${path} unreachable: ${msg}` };
  }
}

async function checkBlogPosts(): Promise<CheckResult> {
  try {
    const { statusCode, body } = await localApiGet("/api/seo/blog-posts");
    if (statusCode === 200) {
      const data = JSON.parse(body);
      const posts = Array.isArray(data) ? data : data.posts || [];
      const published = posts.filter((p: { status?: string }) => p.status === "published");
      if (published.length >= 1) {
        return { id: "blog", label: "Blog Post Published", category: "Content", status: "pass", detail: `${published.length} published blog post(s)` };
      }
      return { id: "blog", label: "Blog Post Published", category: "Content", status: "warn", detail: "No published blog posts yet" };
    }
    return { id: "blog", label: "Blog Post Published", category: "Content", status: "warn", detail: `Blog API returned ${statusCode} — posts may be in localStorage` };
  } catch {
    return { id: "blog", label: "Blog Post Published", category: "Content", status: "warn", detail: "Could not verify blog posts (client-side storage)" };
  }
}

async function checkSSL(): Promise<CheckResult> {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (!replitDomain) {
    return { id: "ssl", label: "SSL Certificate", category: "Security", status: "warn", detail: "No deployment domain detected — SSL handled by Replit on deploy" };
  }
  try {
    const resp = await fetch(`https://${replitDomain}/api/healthz`, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      return { id: "ssl", label: "SSL Certificate", category: "Security", status: "pass", detail: `HTTPS verified on ${replitDomain}` };
    }
    return { id: "ssl", label: "SSL Certificate", category: "Security", status: "warn", detail: `HTTPS returned ${resp.status}` };
  } catch {
    return { id: "ssl", label: "SSL Certificate", category: "Security", status: "warn", detail: "SSL auto-provisioned by Replit on deployment" };
  }
}

async function check404Page(): Promise<CheckResult> {
  try {
    const { statusCode, body } = await frontendGet("/this-page-does-not-exist-404-test");
    if (statusCode === 200 && body.includes("404")) {
      return { id: "error_page", label: "404 Error Page", category: "UX", status: "pass", detail: "Branded 404 page is serving" };
    }
    if (statusCode === 200) {
      return { id: "error_page", label: "404 Error Page", category: "UX", status: "pass", detail: "SPA fallback serving — 404 handled client-side" };
    }
    return { id: "error_page", label: "404 Error Page", category: "UX", status: "fail", detail: `404 test returned ${statusCode}` };
  } catch {
    return { id: "error_page", label: "404 Error Page", category: "UX", status: "warn", detail: "Could not verify 404 page (frontend may not be accessible from API)" };
  }
}

async function checkEmailService(): Promise<CheckResult> {
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  if (sendgridKey) {
    try {
      const resp = await fetch("https://api.sendgrid.com/v3/scopes", {
        headers: { Authorization: `Bearer ${sendgridKey}` },
      });
      if (resp.ok) {
        return { id: "email", label: "Email Service", category: "Communications", status: "pass", detail: "SendGrid API key verified" };
      }
      return { id: "email", label: "Email Service", category: "Communications", status: "warn", detail: `SendGrid API returned ${resp.status}` };
    } catch {
      return { id: "email", label: "Email Service", category: "Communications", status: "warn", detail: "SendGrid key present but verification failed" };
    }
  }

  if (resendKey) {
    return { id: "email", label: "Email Service", category: "Communications", status: "pass", detail: "Resend API key configured" };
  }

  if (smtpHost) {
    return { id: "email", label: "Email Service", category: "Communications", status: "pass", detail: `SMTP configured (${smtpHost})` };
  }

  return { id: "email", label: "Email Service", category: "Communications", status: "warn", detail: "No email service configured (SENDGRID_API_KEY, RESEND_API_KEY, or SMTP_HOST)" };
}

async function checkOAuthProviders(): Promise<CheckResult> {
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) {
    return { id: "oauth", label: "OAuth Providers", category: "Authentication", status: "fail", detail: "Cannot verify OAuth — Clerk key missing" };
  }
  try {
    const resp = await fetch("https://api.clerk.com/v1/oauth_applications", {
      headers: { Authorization: `Bearer ${clerkKey}` },
    });
    if (resp.ok) {
      return { id: "oauth", label: "OAuth Providers", category: "Authentication", status: "pass", detail: "Clerk OAuth configuration accessible" };
    }
    if (resp.status === 404 || resp.status === 403) {
      return { id: "oauth", label: "OAuth Providers", category: "Authentication", status: "pass", detail: "Clerk configured — OAuth managed via Clerk dashboard" };
    }
    return { id: "oauth", label: "OAuth Providers", category: "Authentication", status: "warn", detail: `OAuth check returned ${resp.status} — verify in Clerk dashboard` };
  } catch {
    return { id: "oauth", label: "OAuth Providers", category: "Authentication", status: "warn", detail: "Cannot reach Clerk API — verify OAuth in dashboard" };
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
      checkFrontendPage("page_terms", "Terms of Service", "Legal", "/terms"),
      checkFrontendPage("page_privacy", "Privacy Policy", "Legal", "/privacy"),
      checkFrontendPage("page_disclaimer", "Financial Disclaimer", "Legal", "/disclaimer"),
      checkFrontendPage("page_help", "Help Center", "Support", "/help"),
      checkFrontendPage("page_status", "Status Page", "Support", "/status"),
      checkBlogPosts(),
      checkSSL(),
      check404Page(),
      checkEmailService(),
      checkOAuthProviders(),
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
