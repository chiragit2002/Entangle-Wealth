import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { auditLogTable, uxSignalsTable, apiHealthChecksTable, visualBaselinesTable, crawlRunsTable } from "@workspace/db/schema";
import { desc, gte, eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { MONITORED_ENDPOINTS } from "../lib/apiHealthMonitor";
import { z } from "zod";
import { spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const router: IRouter = Router();

const AUDIT_INGEST_WINDOW_MS = 60_000;
const AUDIT_INGEST_MAX_PER_WINDOW = 60;
const auditIngestCounts: Map<string, { count: number; windowStart: number }> = new Map();

function auditIngestSpamGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const record = auditIngestCounts.get(ip);

  if (!record || now - record.windowStart > AUDIT_INGEST_WINDOW_MS) {
    auditIngestCounts.set(ip, { count: 1, windowStart: now });
    return next();
  }

  record.count += 1;
  if (record.count > AUDIT_INGEST_MAX_PER_WINDOW) {
    res.status(429).json({ error: "Too many audit log requests" });
    return;
  }
  next();
}

const logErrorSchema = z.object({
  pageUrl: z.string().max(2000),
  issueType: z.string().max(100),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  screenshotUrl: z.string().max(2000).optional(),
  componentName: z.string().max(200).optional(),
  errorMessage: z.string().max(5000).optional(),
  sessionId: z.string().max(200).optional(),
});

const logSignalSchema = z.object({
  pageUrl: z.string().max(2000),
  signalType: z.string().max(100),
  elementSelector: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  sessionId: z.string().max(200).optional(),
});

const logSignalBatchSchema = z.object({
  signals: z.array(logSignalSchema).max(100),
});

router.post("/audit/errors", auditIngestSpamGuard, async (req, res) => {
  const parsed = logErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const data = parsed.data;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000);
  const recentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogTable)
    .where(
      and(
        eq(auditLogTable.pageUrl, data.pageUrl),
        eq(auditLogTable.issueType, data.issueType),
        gte(auditLogTable.timestamp, windowStart)
      )
    );

  const count = Number(recentCount[0]?.count ?? 0);
  const effectiveSeverity =
    count >= 2 ? "CRITICAL" : data.severity;

  await db.insert(auditLogTable).values({
    pageUrl: data.pageUrl,
    issueType: data.issueType,
    severity: effectiveSeverity,
    screenshotUrl: data.screenshotUrl,
    componentName: data.componentName,
    errorMessage: data.errorMessage,
    sessionId: data.sessionId,
  });

  res.status(201).json({ ok: true, severity: effectiveSeverity });
});

router.post("/audit/signals", auditIngestSpamGuard, async (req, res) => {
  const parsed = logSignalBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { signals } = parsed.data;
  if (signals.length === 0) {
    res.status(200).json({ ok: true, inserted: 0 });
    return;
  }

  await db.insert(uxSignalsTable).values(
    signals.map((s) => ({
      pageUrl: s.pageUrl,
      signalType: s.signalType,
      elementSelector: s.elementSelector,
      metadata: s.metadata ?? null,
      sessionId: s.sessionId,
    }))
  );

  res.status(201).json({ ok: true, inserted: signals.length });
});

router.get("/audit/logs", requireAuth, requireAdmin, async (req, res) => {
  const { severity, issueType, limit = "50", offset = "0" } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);
  const off = Number(offset) || 0;

  const conditions = [];
  if (severity) conditions.push(eq(auditLogTable.severity, String(severity)));
  if (issueType) conditions.push(eq(auditLogTable.issueType, String(issueType)));

  const rows = await db
    .select()
    .from(auditLogTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogTable.timestamp))
    .limit(lim)
    .offset(off);

  res.json({ logs: rows });
});

router.get("/audit/signals", requireAuth, requireAdmin, async (req, res) => {
  const { signalType, limit = "50" } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);

  const conditions = [];
  if (signalType) conditions.push(eq(uxSignalsTable.signalType, String(signalType)));

  const rows = await db
    .select()
    .from(uxSignalsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(uxSignalsTable.timestamp))
    .limit(lim);

  res.json({ signals: rows });
});

router.get("/audit/health", requireAuth, requireAdmin, async (req, res) => {
  const { endpoint, limit = "100" } = req.query;
  const lim = Math.min(Number(limit) || 100, 500);

  const conditions = [];
  if (endpoint) conditions.push(eq(apiHealthChecksTable.endpoint, String(endpoint)));

  const rows = await db
    .select()
    .from(apiHealthChecksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(apiHealthChecksTable.timestamp))
    .limit(lim);

  res.json({ checks: rows });
});

router.get("/audit/stats", requireAuth, requireAdmin, async (req, res) => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [errorRateRaw, signalCountsRaw, apiHealthRaw] = await Promise.all([
    db
      .select({
        hour: sql<string>`date_trunc('hour', timestamp)`,
        count: sql<number>`count(*)`,
      })
      .from(auditLogTable)
      .where(gte(auditLogTable.timestamp, oneDayAgo))
      .groupBy(sql`date_trunc('hour', timestamp)`)
      .orderBy(sql`date_trunc('hour', timestamp)`),

    db
      .select({
        signalType: uxSignalsTable.signalType,
        count: sql<number>`count(*)`,
      })
      .from(uxSignalsTable)
      .where(gte(uxSignalsTable.timestamp, oneDayAgo))
      .groupBy(uxSignalsTable.signalType),

    db
      .select({
        endpoint: apiHealthChecksTable.endpoint,
        avgMs: sql<number>`avg(response_time_ms)`,
        lastStatus: sql<number>`(array_agg(status_code ORDER BY timestamp DESC))[1]`,
        lastChecked: sql<string>`max(timestamp)`,
      })
      .from(apiHealthChecksTable)
      .where(gte(apiHealthChecksTable.timestamp, oneDayAgo))
      .groupBy(apiHealthChecksTable.endpoint),
  ]);

  const severityCounts = await db
    .select({
      severity: auditLogTable.severity,
      count: sql<number>`count(*)`,
    })
    .from(auditLogTable)
    .where(gte(auditLogTable.timestamp, oneDayAgo))
    .groupBy(auditLogTable.severity);

  const expectStatusMap = Object.fromEntries(
    MONITORED_ENDPOINTS.map((e) => [e.path, e.expectStatus])
  );

  res.json({
    errorRate: errorRateRaw.map((r) => ({
      hour: r.hour,
      count: Number(r.count),
    })),
    signalCounts: signalCountsRaw.map((r) => ({
      signalType: r.signalType,
      count: Number(r.count),
    })),
    apiHealth: apiHealthRaw.map((r) => {
      const lastStatus = Number(r.lastStatus);
      const expectStatus = expectStatusMap[r.endpoint];
      const isHealthy = expectStatus !== undefined
        ? lastStatus === expectStatus
        : lastStatus >= 200 && lastStatus < 500;
      return {
        endpoint: r.endpoint,
        avgMs: Math.round(Number(r.avgMs)),
        lastStatus,
        lastChecked: r.lastChecked,
        isHealthy,
        label: MONITORED_ENDPOINTS.find((e) => e.path === r.endpoint)?.label ?? r.endpoint,
      };
    }),
    severityCounts: severityCounts.map((r) => ({
      severity: r.severity,
      count: Number(r.count),
    })),
  });
});

let activeCrawlPid: number | null = null;

router.post("/audit/crawl", requireAuth, requireAdmin, async (req, res) => {
  if (activeCrawlPid !== null) {
    res.status(409).json({ error: "A crawl is already in progress", pid: activeCrawlPid });
    return;
  }

  const triggeredBy = (req.body?.triggeredBy as string | undefined) ?? "api";
  // interactive=true enables button clicks, form fills, dropdown triggers.
  // Disabled by default to keep scheduled/automated runs non-mutating.
  const interactive = req.body?.interactive === true;

  const [run] = await db.insert(crawlRunsTable).values({
    status: "running",
    triggeredBy,
  }).returning();

  const crawlRunId = run.id;

  const baseUrl = process.env.CRAWLER_BASE_URL
    || `http://localhost:${process.env.PORT || 3001}`;

  const screenshotsDir = process.env.CRAWLER_SCREENSHOTS_DIR || "/tmp/crawl-screenshots";

  const workspaceRoot = path.resolve(__dirname, "../../../../");

  const child = spawn(
    "pnpm",
    ["--filter", "@workspace/scripts", "run", "crawler"],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CRAWLER_BASE_URL: baseUrl,
        CRAWLER_SCREENSHOTS_DIR: screenshotsDir,
        CRAWL_RUN_ID: String(crawlRunId),
        CRAWLER_INTERACTIVE: interactive ? "true" : "false",
      },
      detached: false,
      stdio: "pipe",
    }
  );

  activeCrawlPid = child.pid ?? null;

  child.stdout?.on("data", (data: Buffer) => {
    process.stdout.write(`[Crawler] ${data}`);
  });
  child.stderr?.on("data", (data: Buffer) => {
    process.stderr.write(`[Crawler ERR] ${data}`);
  });

  child.on("close", (code) => {
    activeCrawlPid = null;
    if (code !== 0) {
      db.update(crawlRunsTable)
        .set({ status: "failed", completedAt: new Date(), errorMessage: `Exit code ${code}` })
        .where(eq(crawlRunsTable.id, crawlRunId))
        .catch(() => {});
    }
  });

  res.status(202).json({ ok: true, crawlRunId, pid: activeCrawlPid });
});

router.get("/audit/crawl/runs", requireAuth, requireAdmin, async (_req, res) => {
  const runs = await db
    .select()
    .from(crawlRunsTable)
    .orderBy(desc(crawlRunsTable.startedAt))
    .limit(20);

  res.json({ runs, activePid: activeCrawlPid });
});

router.get("/audit/visual-regressions", requireAuth, requireAdmin, async (req, res) => {
  const { onlyRegressions, limit = "50" } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);

  const conditions = [];
  if (onlyRegressions === "true") {
    conditions.push(eq(visualBaselinesTable.isRegression, true));
  }
  conditions.push(eq(visualBaselinesTable.isCurrent, true));

  const rows = await db
    .select()
    .from(visualBaselinesTable)
    .where(and(...conditions))
    .orderBy(desc(visualBaselinesTable.createdAt))
    .limit(lim);

  res.json({ regressions: rows });
});

router.post("/audit/visual-regressions/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select()
    .from(visualBaselinesTable)
    .where(eq(visualBaselinesTable.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Baseline not found" });
    return;
  }

  await db
    .update(visualBaselinesTable)
    .set({
      approvedAt: new Date(),
      isRegression: false,
    })
    .where(eq(visualBaselinesTable.id, id));

  res.json({ ok: true });
});

router.get("/audit/screenshots/:runId/:filename", requireAuth, requireAdmin, (req, res) => {
  const { runId, filename } = req.params;

  if (!/^\d+$/.test(runId) || !/^[\w\-_.]+\.png$/.test(filename)) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const screenshotsDir = process.env.CRAWLER_SCREENSHOTS_DIR || "/tmp/crawl-screenshots";
  const filePath = path.join(screenshotsDir, `run-${runId}`, filename);

  if (!filePath.startsWith(screenshotsDir)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Screenshot not found" });
    return;
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "private, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
});

router.get("/audit/screenshots/:runId/diffs/:filename", requireAuth, requireAdmin, (req, res) => {
  const { runId, filename } = req.params;

  if (!/^\d+$/.test(runId) || !/^[\w\-_.]+\.png$/.test(filename)) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const screenshotsDir = process.env.CRAWLER_SCREENSHOTS_DIR || "/tmp/crawl-screenshots";
  const filePath = path.join(screenshotsDir, `run-${runId}`, "diffs", filename);

  if (!filePath.startsWith(screenshotsDir)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Diff not found" });
    return;
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "private, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
});

export default router;
