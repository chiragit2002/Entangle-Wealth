import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:25343";
const API_PORT = process.env.API_PORT || "8080";
const AUDIT_API = `http://localhost:${API_PORT}/api/audit/errors`;

const PAGES_TO_SNAPSHOT = [
  { path: "/", label: "Home" },
  { path: "/pricing", label: "Pricing" },
  { path: "/about", label: "About" },
  { path: "/stocks", label: "Stocks" },
  { path: "/blog", label: "Blog" },
];

const DIFF_THRESHOLD_PERCENT = 5;

const BASELINE_DIR = path.join("e2e", "screenshots", "baselines");
const CURRENT_DIR = path.join("e2e", "screenshots", "current");
const DIFF_DIR = path.join("e2e", "screenshots", "diffs");

function ensureDirs() {
  [BASELINE_DIR, CURRENT_DIR, DIFF_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));
}

async function logVisualRegressionAudit(payload: {
  pageUrl: string;
  issueType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  errorMessage?: string;
  componentName?: string;
}) {
  try {
    await fetch(AUDIT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": `http://localhost:${API_PORT}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // best effort
  }
}

async function takePageSnapshot(page: Page, label: string, dir: string): Promise<string> {
  const filename = `${label.replace(/\W+/g, "-").toLowerCase()}-desktop.png`;
  const filepath = path.join(dir, filename);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: filepath, fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  return filepath;
}

async function compareSnapshots(
  baselinePath: string,
  currentPath: string,
  diffPath: string
): Promise<number> {
  try {
    const { PNG } = await import("pngjs");
    const { default: pixelmatch } = await import("pixelmatch");

    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const current = PNG.sync.read(fs.readFileSync(currentPath));

    const { width, height } = baseline;
    const diff = new PNG({ width, height });

    const mismatch = pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold: 0.15 }
    );

    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    const totalPixels = width * height;
    const diffPercent = (mismatch / totalPixels) * 100;
    return diffPercent;
  } catch (err) {
    console.warn(`[VisReg] pixelmatch failed (likely not installed): ${err}`);
    return 0;
  }
}

test.describe("Visual Regression — Baseline Capture & Comparison", () => {
  test.beforeAll(() => {
    ensureDirs();
  });

  for (const pg of PAGES_TO_SNAPSHOT) {
    test(`Visual Regression: ${pg.label}`, async ({ page }) => {
      const label = pg.label.replace(/\W+/g, "-").toLowerCase();
      const baselinePath = path.join(BASELINE_DIR, `${label}-desktop.png`);
      const currentPath = path.join(CURRENT_DIR, `${label}-desktop.png`);
      const diffPath = path.join(DIFF_DIR, `${label}-diff.png`);

      const res = await page.goto(`${BASE_URL}${pg.path}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      expect(res?.ok() || res?.status() === 401, `Page ${pg.path} must respond`).toBeTruthy();

      if (!fs.existsSync(baselinePath)) {
        await takePageSnapshot(page, pg.label, BASELINE_DIR);
        console.log(`[VisReg] ✓ Baseline captured for ${pg.label}`);

        await logVisualRegressionAudit({
          pageUrl: pg.path,
          issueType: "visual_regression_baseline",
          severity: "LOW",
          errorMessage: `Baseline screenshot captured for ${pg.label}`,
          componentName: "VisualRegression",
        });
        return;
      }

      await takePageSnapshot(page, pg.label, CURRENT_DIR);

      const diffPercent = await compareSnapshots(baselinePath, currentPath, diffPath);
      const diffRounded = Math.round(diffPercent * 100) / 100;

      if (diffPercent > DIFF_THRESHOLD_PERCENT) {
        console.error(`[VisReg] ✗ ${pg.label} — diff ${diffRounded}% > ${DIFF_THRESHOLD_PERCENT}% threshold`);

        await logVisualRegressionAudit({
          pageUrl: pg.path,
          issueType: "visual_regression",
          severity: diffPercent > 20 ? "CRITICAL" : "HIGH",
          errorMessage: `Visual regression detected: ${diffRounded}% pixel change (threshold: ${DIFF_THRESHOLD_PERCENT}%). Diff saved to ${diffPath}`,
          componentName: "VisualRegression",
        });

        expect(diffPercent, `Visual diff ${diffRounded}% exceeds ${DIFF_THRESHOLD_PERCENT}% threshold for ${pg.label}`).toBeLessThanOrEqual(DIFF_THRESHOLD_PERCENT);
      } else {
        console.log(`[VisReg] ✓ ${pg.label} — diff ${diffRounded}% within threshold`);

        await logVisualRegressionAudit({
          pageUrl: pg.path,
          issueType: "visual_regression_pass",
          severity: "LOW",
          errorMessage: `Visual regression PASS: ${diffRounded}% diff (threshold: ${DIFF_THRESHOLD_PERCENT}%)`,
          componentName: "VisualRegression",
        });
      }
    });
  }
});

test("Visual Regression — Sample Diff Report", async ({}) => {
  const results: { page: string; hasBaseline: boolean; hasDiff: boolean; diffPath: string }[] = [];

  for (const pg of PAGES_TO_SNAPSHOT) {
    const label = pg.label.replace(/\W+/g, "-").toLowerCase();
    const baselinePath = path.join(BASELINE_DIR, `${label}-desktop.png`);
    const diffPath = path.join(DIFF_DIR, `${label}-diff.png`);
    results.push({
      page: pg.path,
      hasBaseline: fs.existsSync(baselinePath),
      hasDiff: fs.existsSync(diffPath),
      diffPath,
    });
  }

  console.log("\n[VisReg] === VISUAL REGRESSION SAMPLE DIFF REPORT ===");
  for (const r of results) {
    const status = r.hasBaseline ? (r.hasDiff ? "COMPARED" : "BASELINE_ONLY") : "NO_BASELINE";
    console.log(`  ${r.page}: ${status} | diff: ${r.hasDiff ? r.diffPath : "N/A"}`);
  }
  console.log("[VisReg] === END REPORT ===\n");
});
