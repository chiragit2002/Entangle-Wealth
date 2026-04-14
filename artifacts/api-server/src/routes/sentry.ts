import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SENTRY_ORG = "entaglewealth";
const SENTRY_API_BASE = "https://us.sentry.io/api/0";

async function sentryFetch(path: string, init?: RequestInit): Promise<unknown> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) throw new Error("SENTRY_AUTH_TOKEN not configured");

  const baseHeaders = { "Content-Type": "application/json" };
  const schemes = [`Bearer ${token}`, `Token ${token}`];

  let lastError = "";
  for (const auth of schemes) {
    const res = await fetch(`${SENTRY_API_BASE}${path}`, {
      ...init,
      headers: { ...baseHeaders, Authorization: auth, ...(init?.headers || {}) },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 401 || res.status === 403) {
      lastError = `HTTP ${res.status}: ${await res.text().catch(() => "")}`;
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Sentry API error ${res.status}: ${text}`);
    }
    return res.json();
  }
  throw new Error(
    `Sentry authentication failed — SENTRY_AUTH_TOKEN is invalid or missing required scopes (org:read, project:read, event:read). Details: ${lastError}`
  );
}

router.get("/sentry/issues", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { project, level, status = "unresolved", limit = "25", cursor } = req.query;

    const projects = project
      ? [project as string]
      : ["entangle-wealth-backend", "entangle-wealth-frontend"];

    const allIssues: unknown[] = [];
    const errors: string[] = [];

    for (const proj of projects) {
      const queryParts = [
        status !== "all" ? `is:${status}` : "",
        level ? `level:${level}` : "",
      ].filter(Boolean);

      const params = new URLSearchParams({
        query: queryParts.join(" "),
        limit: limit as string,
        ...(cursor ? { cursor: cursor as string } : {}),
      });

      try {
        const data = await sentryFetch(`/projects/${SENTRY_ORG}/${proj}/issues/?${params}`);
        if (Array.isArray(data)) {
          const tagged = data.map((issue: Record<string, unknown>) => ({
            ...issue,
            _project: proj,
          }));
          allIssues.push(...tagged);
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (errors.length > 0 && allIssues.length === 0) {
      res.status(502).json({ error: errors[0] });
      return;
    }

    allIssues.sort((a, b) => {
      const aCount = Number((a as Record<string, unknown>).count) || 0;
      const bCount = Number((b as Record<string, unknown>).count) || 0;
      return bCount - aCount;
    });

    res.json({ issues: allIssues.slice(0, Number(limit)), warnings: errors });
  } catch (err) {
    logger.error({ err }, "Sentry issues fetch failed");
    res.status(502).json({ error: "Failed to fetch Sentry issues" });
  }
});

router.get("/sentry/issues/:issueId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { issueId } = req.params;
    const [issue, events] = await Promise.all([
      sentryFetch(`/issues/${issueId}/`),
      sentryFetch(`/issues/${issueId}/events/?limit=1&full=true`),
    ]);

    const latestEvent = Array.isArray(events) && events.length > 0 ? events[0] : null;

    let tags: Record<string, unknown>[] = [];
    try {
      const tagKeys = ["browser", "browser.name", "os", "environment", "device"];
      const tagResults = await Promise.allSettled(
        tagKeys.map((k) =>
          sentryFetch(`/issues/${issueId}/tags/${encodeURIComponent(k)}/`)
        )
      );
      tags = tagResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<unknown>).value as Record<string, unknown>);
    } catch (err) {
      logger.warn({ err, issueId }, "Failed to fetch Sentry issue tags");
    }

    res.json({ issue, latestEvent, tags });
  } catch (err) {
    logger.error({ err }, "Sentry issue detail fetch failed");
    res.status(502).json({ error: "Failed to fetch Sentry issue details" });
  }
});

router.get("/sentry/search", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { q = "", project, limit = "25" } = req.query;

    const projects = project
      ? [project as string]
      : ["entangle-wealth-backend", "entangle-wealth-frontend"];

    const allIssues: unknown[] = [];
    const errors: string[] = [];

    for (const proj of projects) {
      const params = new URLSearchParams({
        query: String(q),
        limit: limit as string,
      });

      try {
        const data = await sentryFetch(`/projects/${SENTRY_ORG}/${proj}/issues/?${params}`);
        if (Array.isArray(data)) {
          const tagged = data.map((issue: Record<string, unknown>) => ({
            ...issue,
            _project: proj,
          }));
          allIssues.push(...tagged);
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (errors.length > 0 && allIssues.length === 0) {
      res.status(502).json({ error: errors[0] });
      return;
    }

    res.json({ issues: allIssues.slice(0, Number(limit)), warnings: errors });
  } catch (err) {
    logger.error({ err }, "Sentry search failed");
    res.status(502).json({ error: "Failed to search Sentry issues" });
  }
});

router.get("/sentry/summary", requireAuth, requireAdmin, async (req, res) => {
  try {
    const projects = ["entangle-wealth-backend", "entangle-wealth-frontend"];
    const now = Math.floor(Date.now() / 1000);
    const since24h = now - 24 * 3600;

    let totalUnresolved = 0;
    let totalFatal = 0;
    let totalErrors = 0;
    let events24h = 0;
    const trendMap = new Map<number, number>();
    const fetchErrors: string[] = [];

    for (const proj of projects) {
      const [unresolvedR, fatalR, errorsR, statsR] = await Promise.allSettled([
        sentryFetch(`/projects/${SENTRY_ORG}/${proj}/issues/?query=is:unresolved&limit=100`),
        sentryFetch(`/projects/${SENTRY_ORG}/${proj}/issues/?query=is:unresolved%20level:fatal&limit=100`),
        sentryFetch(`/projects/${SENTRY_ORG}/${proj}/issues/?query=is:unresolved%20level:error&limit=100`),
        sentryFetch(`/projects/${SENTRY_ORG}/${proj}/stats/?stat=received&since=${since24h}&until=${now}&resolution=1h`),
      ]);

      if (unresolvedR.status === "rejected") {
        fetchErrors.push(unresolvedR.reason?.message || String(unresolvedR.reason));
      } else if (Array.isArray(unresolvedR.value)) {
        totalUnresolved += unresolvedR.value.length;
      }

      if (fatalR.status === "fulfilled" && Array.isArray(fatalR.value)) {
        totalFatal += fatalR.value.length;
      }
      if (errorsR.status === "fulfilled" && Array.isArray(errorsR.value)) {
        totalErrors += errorsR.value.length;
      }
      if (statsR.status === "fulfilled" && Array.isArray(statsR.value)) {
        for (const [ts, count] of statsR.value as [number, number][]) {
          trendMap.set(ts, (trendMap.get(ts) || 0) + count);
          events24h += count;
        }
      }
    }

    if (fetchErrors.length > 0 && totalUnresolved === 0 && trendMap.size === 0) {
      res.status(502).json({ error: fetchErrors[0] });
      return;
    }

    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, count]) => ({ ts, count }));

    res.json({
      totalUnresolved,
      criticalCount: totalFatal,
      errorCount: totalErrors,
      events24h,
      trend,
    });
  } catch (err) {
    logger.error({ err }, "Sentry summary fetch failed");
    res.status(502).json({ error: "Failed to fetch Sentry summary" });
  }
});

export default router;
