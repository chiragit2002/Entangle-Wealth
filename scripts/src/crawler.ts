#!/usr/bin/env tsx
/**
 * Playwright UI Crawler + Visual Regression system.
 *
 * Route list is kept in sync with App.tsx — update APP_ROUTES when adding routes.
 * Dynamic segments use sample values (e.g. /blog/:slug → /blog/sample-post).
 *
 * SAFETY MODEL
 * ────────────
 * Scheduled (24 h cron) runs are READ-ONLY by default: passive checks only.
 * Interactive checks (button clicks, form fills, dropdown triggers) are only
 * executed when CRAWLER_INTERACTIVE=true, intended for explicit manual runs.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const BASE_URL = process.env.CRAWLER_BASE_URL || "http://localhost:3001";
const SCREENSHOTS_DIR = process.env.CRAWLER_SCREENSHOTS_DIR || "/tmp/crawl-screenshots";
const CRAWL_RUN_ID = parseInt(process.env.CRAWL_RUN_ID || "0", 10);
const DB_URL = process.env.DATABASE_URL;
const INTERACTIVE = process.env.CRAWLER_INTERACTIVE === "true";

const REGRESSION_THRESHOLD = 0.05;

/**
 * All routes extracted from App.tsx.
 * Dynamic segments are replaced with representative sample values.
 * Protected routes will typically redirect to sign-in; that state is still
 * captured and validated (console errors, layout, regressions).
 */
const APP_ROUTES: string[] = [
  "/",
  "/dashboard",
  "/earn",
  "/options",
  "/stocks",
  "/jobs",
  "/gigs",
  "/community",
  "/tax",
  "/receipts",
  "/integrations",
  "/travel",
  "/tax-strategy",
  "/taxgpt",
  "/technical",
  "/charts",
  "/screener",
  "/terminal",
  "/about",
  "/terms",
  "/privacy",
  "/pricing",
  "/research",
  "/time-machine",
  "/sector-flow",
  "/volatility",
  "/competitive-intel",
  "/open-source-intel",
  "/case-study",
  "/leaderboard",
  "/achievements",
  "/sign-in",
  "/sign-up",
  "/resume",
  "/profile",
  "/wallet",
  "/marketplace",
  "/rewards",
  "/token-admin",
  "/marketing",
  "/content-calendar",
  "/reddit-engine",
  "/seo",
  "/alerts",
  "/analytics",
  "/blog",
  "/blog/sample-post",
  "/cookies",
  "/disclaimer",
  "/dmca",
  "/accessibility",
  "/help",
  "/submit-ticket",
  "/status",
  "/admin/tickets",
  "/admin/status",
  "/admin/scalability",
  "/admin/kyc",
  "/admin/evolution",
  "/admin/monitoring",
  "/admin/audit",
  "/launch",
  "/daily-content",
  "/gamification",
  "/giveaway",
  "/wealth-sim",
  "/alternate-timeline",
  "/habits",
  "/life-outcomes",
  "/ai-coach",
  "/command-center",
];

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
];

const DESTRUCTIVE_PATTERNS = [
  /delete/i, /remove/i, /clear/i, /reset/i, /logout/i,
  /log\s*out/i, /sign\s*out/i, /disconnect/i, /unlink/i,
  /destroy/i, /terminate/i, /cancel\s+account/i, /close\s+account/i,
];

function isDestructiveText(text: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((p) => p.test(text));
}

interface PageIssue {
  issueType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  errorMessage: string;
}

interface PageResult {
  url: string;
  viewport: string;
  loadTimeMs: number;
  issues: PageIssue[];
  screenshotPath: string;
}

interface CrawlResults {
  runId: number;
  totalPages: number;
  totalIssues: number;
  totalRegressions: number;
  pages: PageResult[];
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeSlug(route: string, viewport: string): string {
  const base = route.replace(/\//g, "_").replace(/^_/, "") || "home";
  return `${base}_${viewport}`;
}

async function compareWithBaseline(
  currentPath: string,
  baselinePath: string,
  diffPath: string
): Promise<number> {
  try {
    const current = PNG.sync.read(fs.readFileSync(currentPath));
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));

    if (current.width !== baseline.width || current.height !== baseline.height) {
      return 1.0;
    }

    const { width, height } = current;
    const diff = new PNG({ width, height });

    const pixelsDiff = pixelmatch(
      current.data,
      baseline.data,
      diff.data,
      width,
      height,
      { threshold: 0.1, includeAA: false, diffColor: [255, 0, 0] }
    );

    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    return pixelsDiff / (width * height);
  } catch {
    return 0;
  }
}

/**
 * INTERACTIVE ONLY — click non-destructive visible buttons, verify no crash.
 * Only called when CRAWLER_INTERACTIVE=true.
 */
async function testButtonInteractivity(page: Page, issues: PageIssue[]) {
  const buttonInfos = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll("button, [role='button']")
    ) as HTMLElement[];

    return candidates.slice(0, 12).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        parseFloat(style.opacity) > 0;
      const isDisabled =
        el.getAttribute("disabled") !== null ||
        el.getAttribute("aria-disabled") === "true";
      const text =
        (el.textContent?.trim() || el.getAttribute("aria-label") || "").slice(0, 60);
      const inViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;
      return {
        text, isVisible, isDisabled, inViewport,
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        width: rect.width,
        height: rect.height,
      };
    });
  }).catch(() => [] as {
    text: string; isVisible: boolean; isDisabled: boolean; inViewport: boolean;
    x: number; y: number; width: number; height: number;
  }[]);

  for (const btn of buttonInfos) {
    if (!btn.isVisible || btn.isDisabled || !btn.inViewport) continue;
    if (isDestructiveText(btn.text)) continue;
    if (btn.width < 4 || btn.height < 4) {
      issues.push({
        issueType: "button_too_small",
        severity: "LOW",
        errorMessage: `Button "${btn.text}" is ${Math.round(btn.width)}x${Math.round(btn.height)}px (too small to tap)`,
      });
      continue;
    }

    const urlBefore = page.url();
    try {
      await page.mouse.click(btn.x, btn.y);
      await page.waitForTimeout(300);

      if (page.url() !== urlBefore) {
        await page.goto(urlBefore, { waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(200);
      }
    } catch {
      issues.push({
        issueType: "button_click_failed",
        severity: "LOW",
        errorMessage: `Failed to click button: "${btn.text}"`,
      });
    }
  }
}

/**
 * INTERACTIVE ONLY — fill form inputs with typed test data and submit.
 * Only called when CRAWLER_INTERACTIVE=true.
 */
async function testFormSubmission(page: Page, issues: PageIssue[]) {
  const formInfos = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll("form"));
    return forms.map((form, idx) => {
      const inputs = Array.from(
        form.querySelectorAll("input:not([type='hidden']), textarea, select")
      ) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
      const hasSubmit = !!form.querySelector(
        "button[type='submit'], input[type='submit'], button:not([type='button'])"
      );
      const id = form.getAttribute("id") || form.getAttribute("data-testid") || `form-${idx}`;
      return {
        idx,
        id: id.slice(0, 40),
        inputCount: inputs.length,
        hasSubmit,
        inputs: inputs.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            type: (el as HTMLInputElement).type || "text",
            name: el.name || el.id || "unknown",
            required: (el as HTMLInputElement).required || false,
            tag: el.tagName.toLowerCase(),
            visible: rect.width > 0 && rect.height > 0,
          };
        }),
      };
    });
  }).catch(() => [] as {
    idx: number; id: string; inputCount: number; hasSubmit: boolean;
    inputs: { type: string; name: string; required: boolean; tag: string; visible: boolean }[];
  }[]);

  for (const formInfo of formInfos) {
    if (!formInfo.hasSubmit) {
      issues.push({
        issueType: "form_no_submit_button",
        severity: "LOW",
        errorMessage: `Form "${formInfo.id}" has no submit button`,
      });
      continue;
    }

    const requiredFields = formInfo.inputs.filter((i) => i.required && i.visible);
    if (requiredFields.length > 0) {
      issues.push({
        issueType: "form_required_fields_present",
        severity: "LOW",
        errorMessage: `Form "${formInfo.id}" has ${requiredFields.length} required field(s): ${requiredFields.map(f => f.name).join(", ").slice(0, 100)}`,
      });
    }

    if (formInfo.inputCount === 0) continue;

    const urlBefore = page.url();
    const nth = formInfo.idx + 1;

    try {
      for (const inp of formInfo.inputs.slice(0, 8)) {
        if (!inp.visible) continue;
        const nameAttr = inp.name !== "unknown" ? `[name="${inp.name}"]` : inp.tag;
        const sel = `form:nth-of-type(${nth}) ${nameAttr}`;

        try {
          if (inp.tag === "select") {
            const opts = await page.evaluate((s) => {
              const el = document.querySelector(s) as HTMLSelectElement | null;
              return el ? Array.from(el.options).slice(1, 2).map(o => o.value) : [];
            }, sel);
            if (opts[0]) await page.selectOption(sel, opts[0], { timeout: 1000 });
          } else if (inp.type === "checkbox" || inp.type === "radio") {
            await page.check(sel, { timeout: 1000, force: true }).catch(() => {});
          } else if (inp.type === "email") {
            await page.fill(sel, "crawler-test@example.com", { timeout: 1000 });
          } else if (inp.type === "tel" || inp.type === "phone") {
            await page.fill(sel, "5555550000", { timeout: 1000 });
          } else if (inp.type === "number") {
            await page.fill(sel, "42", { timeout: 1000 });
          } else if (inp.type === "date") {
            await page.fill(sel, "2025-01-01", { timeout: 1000 });
          } else if (inp.type === "url") {
            await page.fill(sel, "https://example.com", { timeout: 1000 });
          } else if (inp.type === "password") {
            await page.fill(sel, "TestPass1234!", { timeout: 1000 });
          } else if (inp.tag === "textarea") {
            await page.fill(sel, "Automated crawler test — please ignore.", { timeout: 1000 });
          } else {
            await page.fill(sel, "CrawlerTest", { timeout: 1000 });
          }
        } catch {}
      }

      const submitSel = `form:nth-of-type(${nth}) button[type='submit'], form:nth-of-type(${nth}) input[type='submit']`;
      if (await page.isVisible(submitSel).catch(() => false)) {
        const submitText = await page.textContent(submitSel).catch(() => "");
        if (!isDestructiveText(submitText || "")) {
          await page.click(submitSel, { timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(400);
        }
      }

      if (page.url() !== urlBefore) {
        await page.goto(urlBefore, { waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(200);
      }
    } catch {}
  }
}

/**
 * INTERACTIVE ONLY — find and trigger modals/dropdowns via ARIA attributes.
 * Only called when CRAWLER_INTERACTIVE=true.
 */
async function testModalsAndDropdowns(page: Page, issues: PageIssue[]) {
  const triggers = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll(
        "[aria-haspopup], [data-radix-dropdown-menu-trigger], details > summary"
      )
    ) as HTMLElement[];

    return candidates.slice(0, 8).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight;
      const text = (el.textContent?.trim() || el.getAttribute("aria-label") || "").slice(0, 40);
      const targetId = el.getAttribute("aria-controls") || null;
      return { text, isVisible, targetId, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
  }).catch(() => [] as { text: string; isVisible: boolean; targetId: string | null; x: number; y: number }[]);

  for (const trig of triggers) {
    if (!trig.isVisible || isDestructiveText(trig.text)) continue;

    try {
      await page.mouse.click(trig.x, trig.y);
      await page.waitForTimeout(350);

      if (trig.targetId) {
        const targetVisible = await page.isVisible(`#${trig.targetId}`).catch(() => false);
        if (!targetVisible) {
          issues.push({
            issueType: "modal_dropdown_not_reachable",
            severity: "LOW",
            errorMessage: `Trigger "${trig.text}" did not reveal its target (#${trig.targetId})`,
          });
        }
      }

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    } catch {}
  }
}

async function checkPage(
  page: Page,
  route: string,
  viewportName: string
): Promise<{ issues: PageIssue[]; loadTimeMs: number; screenshotPath: string }> {
  const issues: PageIssue[] = [];
  const consoleErrors: string[] = [];
  const uncaughtExceptions: string[] = [];
  const networkErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  page.on("pageerror", (err) => {
    uncaughtExceptions.push(err.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    const reqUrl = response.url();
    if (
      status === 404 &&
      !reqUrl.includes("favicon") &&
      /\.(js|css|png|jpe?g|svg|woff2?)(\?|$)/.test(reqUrl)
    ) {
      networkErrors.push(`404: ${reqUrl}`);
    }
  });

  const startTime = Date.now();
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 12000 });
  } catch {
    issues.push({
      issueType: "page_load_failure",
      severity: "HIGH",
      errorMessage: `Page failed to load within timeout: ${route}`,
    });
  }
  const loadTimeMs = Date.now() - startTime;

  await page.waitForTimeout(400).catch(() => {});

  if (loadTimeMs > 2000) {
    issues.push({
      issueType: "slow_load",
      severity: loadTimeMs > 4000 ? "HIGH" : "MEDIUM",
      errorMessage: `Loaded in ${loadTimeMs}ms (threshold: 2 000ms)`,
    });
  }

  for (const err of consoleErrors.slice(0, 5)) {
    issues.push({ issueType: "console_error", severity: "MEDIUM", errorMessage: err.slice(0, 500) });
  }

  for (const err of uncaughtExceptions.slice(0, 5)) {
    issues.push({ issueType: "uncaught_js_exception", severity: "HIGH", errorMessage: err.slice(0, 500) });
  }

  for (const err of networkErrors.slice(0, 5)) {
    issues.push({ issueType: "broken_asset_404", severity: "MEDIUM", errorMessage: err });
  }

  const overflowCount = await page.evaluate(() => {
    let count = 0;
    for (const el of document.querySelectorAll("*")) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > htmlEl.offsetWidth + 2) {
        const s = window.getComputedStyle(htmlEl);
        if (s.overflow === "hidden" || s.overflow === "clip") count++;
      }
    }
    return count;
  }).catch(() => 0);

  if (overflowCount > 0) {
    issues.push({
      issueType: "text_overflow",
      severity: "LOW",
      errorMessage: `${overflowCount} element(s) with clipped text overflow`,
    });
  }

  const brokenImages = await page.evaluate(() => {
    let broken = 0;
    for (const img of document.querySelectorAll("img")) {
      if (!img.complete || img.naturalWidth === 0) broken++;
    }
    return broken;
  }).catch(() => 0);

  if (brokenImages > 0) {
    issues.push({
      issueType: "broken_images",
      severity: "MEDIUM",
      errorMessage: `${brokenImages} broken image(s)`,
    });
  }

  if (INTERACTIVE) {
    await testButtonInteractivity(page, issues);
    await testFormSubmission(page, issues);
    await testModalsAndDropdowns(page, issues);
  }

  const slug = safeSlug(route, viewportName);
  const screenshotDir = path.join(SCREENSHOTS_DIR, `run-${CRAWL_RUN_ID}`);
  ensureDir(screenshotDir);
  const screenshotPath = path.join(screenshotDir, `${slug}.png`);

  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});

  return { issues, loadTimeMs, screenshotPath };
}

async function saveToDb(results: CrawlResults) {
  if (!DB_URL) {
    console.log("[Crawler] No DATABASE_URL — skipping DB write");
    return;
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  try {
    for (const pageResult of results.pages) {
      for (const issue of pageResult.issues) {
        await client.query(
          `INSERT INTO audit_log (page_url, issue_type, severity, screenshot_url, error_message, session_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pageResult.url, issue.issueType, issue.severity,
           pageResult.screenshotPath, issue.errorMessage, `crawl-run-${results.runId}`]
        );
      }
    }

    if (results.runId > 0) {
      await client.query(
        `UPDATE crawl_runs
         SET status = 'completed', completed_at = NOW(),
             total_pages = $1, total_issues = $2, total_regressions = $3
         WHERE id = $4`,
        [results.totalPages, results.totalIssues, results.totalRegressions, results.runId]
      );
    }
  } finally {
    await client.end();
  }
}

async function saveVisualBaseline(
  pageUrl: string,
  viewport: string,
  screenshotPath: string,
  baselinePath: string | null,
  diffPath: string | null,
  diffPercent: number,
  isRegression: boolean,
  crawlRunId: number
) {
  if (!DB_URL) return;

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  try {
    await client.query(
      `UPDATE visual_baselines SET is_current = false WHERE page_url = $1 AND viewport = $2`,
      [pageUrl, viewport]
    );
    await client.query(
      `INSERT INTO visual_baselines
         (page_url, viewport, screenshot_path, baseline_path, diff_path, diff_percent, is_regression, is_current, crawl_run_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)`,
      [pageUrl, viewport, screenshotPath, baselinePath, diffPath, diffPercent, isRegression, crawlRunId]
    );
  } finally {
    await client.end();
  }
}

async function getApprovedBaseline(pageUrl: string, viewport: string): Promise<string | null> {
  if (!DB_URL) return null;

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  try {
    const result = await client.query(
      `SELECT screenshot_path FROM visual_baselines
       WHERE page_url = $1 AND viewport = $2 AND approved_at IS NOT NULL
       ORDER BY approved_at DESC LIMIT 1`,
      [pageUrl, viewport]
    );
    return result.rows[0]?.screenshot_path ?? null;
  } finally {
    await client.end();
  }
}

function resolveChromiumPath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  try {
    const p = execSync("which chromium 2>/dev/null || echo ''", { encoding: "utf-8" }).trim();
    if (p) return p;
  } catch {}
  try {
    const nixPath = execSync(
      "ls /nix/store/*/bin/chromium 2>/dev/null | head -1",
      { encoding: "utf-8" }
    ).trim();
    if (nixPath) return nixPath;
  } catch {}
  return undefined;
}

async function main() {
  const mode = INTERACTIVE ? "interactive" : "read-only";
  console.log(`[Crawler] Starting crawl run ${CRAWL_RUN_ID} — mode: ${mode}`);
  console.log(`[Crawler] Target: ${BASE_URL}`);
  console.log(`[Crawler] Routes: ${APP_ROUTES.length} × ${VIEWPORTS.length} viewports = ${APP_ROUTES.length * VIEWPORTS.length} pages`);
  ensureDir(SCREENSHOTS_DIR);

  let browser: Browser | null = null;
  const results: CrawlResults = {
    runId: CRAWL_RUN_ID,
    totalPages: 0,
    totalIssues: 0,
    totalRegressions: 0,
    pages: [],
  };

  const executablePath = resolveChromiumPath();

  try {
    browser = await chromium.launch({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--headless=new",
      ],
    });

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        ignoreHTTPSErrors: true,
      });

      for (const route of APP_ROUTES) {
        const page = await context.newPage();
        console.log(`[Crawler] ${route} @ ${viewport.name}`);

        try {
          const { issues, loadTimeMs, screenshotPath } = await checkPage(page, route, viewport.name);

          const baselinePath = await getApprovedBaseline(route, viewport.name);
          const diffDir = path.join(SCREENSHOTS_DIR, `run-${CRAWL_RUN_ID}`, "diffs");
          ensureDir(diffDir);
          const slug = safeSlug(route, viewport.name);
          const diffPath = path.join(diffDir, `${slug}_diff.png`);

          let diffPercent = 0;
          let isRegression = false;

          if (baselinePath && fs.existsSync(baselinePath) && fs.existsSync(screenshotPath)) {
            diffPercent = await compareWithBaseline(screenshotPath, baselinePath, diffPath);
            isRegression = diffPercent > REGRESSION_THRESHOLD;
            if (isRegression) {
              results.totalRegressions++;
              issues.push({
                issueType: "visual_regression",
                severity: diffPercent > 0.2 ? "HIGH" : "MEDIUM",
                errorMessage: `Visual regression: ${(diffPercent * 100).toFixed(2)}% pixel diff`,
              });
            }
          }

          const pageResult: PageResult = {
            url: route,
            viewport: viewport.name,
            loadTimeMs,
            issues,
            screenshotPath,
          };
          results.pages.push(pageResult);
          results.totalPages++;
          results.totalIssues += issues.length;

          await saveVisualBaseline(
            route, viewport.name, screenshotPath,
            baselinePath, isRegression ? diffPath : null,
            diffPercent * 100, isRegression, CRAWL_RUN_ID
          );
        } catch (err) {
          console.error(`[Crawler] Error on ${route}@${viewport.name}:`, err);
        } finally {
          await page.close().catch(() => {});
        }
      }

      await context.close().catch(() => {});
    }

    await saveToDb(results);
    console.log(`[Crawler] Done — pages: ${results.totalPages}, issues: ${results.totalIssues}, regressions: ${results.totalRegressions}`);
    process.exit(0);
  } catch (err) {
    console.error("[Crawler] Fatal error:", err);
    if (DB_URL && CRAWL_RUN_ID > 0) {
      const { default: pg } = await import("pg");
      const client = new pg.Client({ connectionString: DB_URL });
      await client.connect().catch(() => {});
      await client.query(
        `UPDATE crawl_runs SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
        [String(err), CRAWL_RUN_ID]
      ).catch(() => {});
      await client.end().catch(() => {});
    }
    process.exit(1);
  } finally {
    await browser?.close().catch(() => {});
  }
}

main();
