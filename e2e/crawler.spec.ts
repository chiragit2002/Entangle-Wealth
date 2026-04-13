import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:25343";
const API_PORT = process.env.API_PORT || "8080";
const AUDIT_API = `http://localhost:${API_PORT}/api/audit/errors`;

const PUBLIC_ROUTES = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/pricing", label: "Pricing" },
  { path: "/research", label: "Research" },
  { path: "/stocks", label: "Stocks" },
  { path: "/jobs", label: "Jobs" },
  { path: "/gigs", label: "Gigs" },
  { path: "/blog", label: "Blog" },
  { path: "/terms", label: "Terms" },
  { path: "/privacy", label: "Privacy" },
  { path: "/cookies", label: "Cookies" },
  { path: "/disclaimer", label: "Disclaimer" },
  { path: "/case-study", label: "Case Study" },
  { path: "/travel", label: "Travel" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const PAGE_LOAD_THRESHOLD_MS = 2000;

async function logAuditError(payload: {
  pageUrl: string;
  issueType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  errorMessage?: string;
  componentName?: string;
}) {
  try {
    const res = await fetch(AUDIT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": `http://localhost:${API_PORT}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    console.log(`[AUDIT] Logged: ${payload.issueType} → ${payload.pageUrl} (${json.severity})`);
  } catch (err) {
    console.error(`[AUDIT] Failed to log: ${err}`);
  }
}

async function crawlPage(
  page: Page,
  route: { path: string; label: string },
  viewport: { name: string; width: number; height: number }
): Promise<{ issues: number; passed: boolean }> {
  const url = `${BASE_URL}${route.path}`;
  const consoleErrors: string[] = [];
  const pageUrl = `${route.path}?viewport=${viewport.name}`;
  let issues = 0;

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  const t0 = Date.now();
  let navError: string | null = null;

  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    if (!response || !response.ok()) {
      navError = `HTTP ${response?.status() ?? "??"} on ${url}`;
    }
  } catch (err) {
    navError = `Navigation failed: ${String(err)}`;
  }

  const loadMs = Date.now() - t0;

  if (navError) {
    await logAuditError({
      pageUrl,
      issueType: "broken_page",
      severity: "CRITICAL",
      errorMessage: navError,
      componentName: `crawler:${viewport.name}`,
    });
    issues++;
    return { issues, passed: false };
  }

  if (loadMs > PAGE_LOAD_THRESHOLD_MS) {
    await logAuditError({
      pageUrl,
      issueType: "slow_page_load",
      severity: "HIGH",
      errorMessage: `Page load ${loadMs}ms exceeds ${PAGE_LOAD_THRESHOLD_MS}ms threshold`,
      componentName: `crawler:${viewport.name}`,
    });
    issues++;
  }

  await page.waitForTimeout(500);

  for (const err of consoleErrors) {
    if (
      err.includes("favicon") ||
      err.includes("ChunkLoadError") ||
      err.includes("ResizeObserver")
    )
      continue;
    await logAuditError({
      pageUrl,
      issueType: "js_console_error",
      severity: "MEDIUM",
      errorMessage: err.slice(0, 1000),
      componentName: `crawler:${viewport.name}`,
    });
    issues++;
  }

  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src || img.getAttribute("src") || "unknown");
  });

  for (const src of brokenImages) {
    await logAuditError({
      pageUrl,
      issueType: "broken_image",
      severity: "MEDIUM",
      errorMessage: `Broken image: ${src}`,
      componentName: `crawler:${viewport.name}`,
    });
    issues++;
  }

  const textOverflow = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("*"));
    const overflowing: string[] = [];
    for (const el of els) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > htmlEl.clientWidth + 5 && htmlEl.clientWidth > 0) {
        const text = htmlEl.textContent?.trim().slice(0, 60) ?? "";
        if (text.length > 0 && !["html", "body", "div", "main", "section"].includes(el.tagName.toLowerCase())) {
          overflowing.push(`${el.tagName.toLowerCase()}:${text}`);
        }
      }
    }
    return overflowing.slice(0, 5);
  });

  for (const el of textOverflow) {
    await logAuditError({
      pageUrl,
      issueType: "text_overflow",
      severity: "LOW",
      errorMessage: `Text overflow on element: ${el}`,
      componentName: `crawler:${viewport.name}`,
    });
    issues++;
  }

  const screenshotsDir = path.join("e2e", "screenshots", "crawler");
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const filename = `${route.label.replace(/\W+/g, "-").toLowerCase()}-${viewport.name}.png`;
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });

  console.log(`[CRAWLER] ✓ ${route.label} (${viewport.name}) — ${loadMs}ms — ${issues} issues`);

  return { issues, passed: true };
}

test.describe("UI Crawler — All Public Routes", () => {
  for (const route of PUBLIC_ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route.label} @ ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        const { passed } = await crawlPage(page, route, viewport);
        expect(passed, `Page ${route.path} failed to load at ${viewport.name}`).toBe(true);
      });
    }
  }
});

test("Crawler Summary — Log final crawl event to audit_log", async ({}) => {
  await logAuditError({
    pageUrl: "/crawler-summary",
    issueType: "crawler_run",
    severity: "LOW",
    errorMessage: `Manual crawl completed: ${PUBLIC_ROUTES.length} routes × ${VIEWPORTS.length} viewports`,
    componentName: "UIcrawler",
  });
  console.log("[CRAWLER] ✓ Summary logged to audit_log");
});
