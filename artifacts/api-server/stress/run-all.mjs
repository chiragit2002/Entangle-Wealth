#!/usr/bin/env node
/**
 * EntangleWealth API — Full Stress Test Suite
 * Runs all stress tests and produces a comprehensive summary report.
 *
 * Usage:
 *   STRESS_BASE_URL=http://localhost:3001 node stress/run-all.mjs
 *
 * Prerequisites:
 *   - API server must be running at STRESS_BASE_URL
 *   - autocannon must be installed (pnpm add -D autocannon)
 */

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:3001";

console.log(c("bright", "\n" + "█".repeat(60)));
console.log(c("cyan", "  EntangleWealth API — Brutal Stress Test Suite"));
console.log(c("bright", "█".repeat(60)));
console.log(`\n  Target: ${BASE_URL}`);
console.log(`  Date:   ${new Date().toISOString()}\n`);

async function checkServer() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(c("green", "  ✓ Server is reachable"));
      console.log(`    Status: ${data.status}`);
      if (data.db) console.log(`    DB pool: ${JSON.stringify(data.db)}`);
      if (data.aiQueue) console.log(`    AI queue: ${JSON.stringify(data.aiQueue)}`);
      return true;
    } else {
      console.log(c("yellow", `  ⚠ Server returned ${res.status}`));
      return true;
    }
  } catch (e) {
    console.log(c("red", `  ✗ Server not reachable at ${BASE_URL}: ${e.message}`));
    console.log(c("yellow", "  Make sure the API server is running before running stress tests."));
    process.exit(1);
  }
}

const suites = [
  { name: "01 — Endpoint Saturation", file: "01-endpoint-saturation.mjs" },
  { name: "02 — Resilience Mechanisms", file: "02-resilience-mechanisms.mjs" },
  { name: "03 — DB Pool Saturation", file: "03-db-pool-saturation.mjs" },
  { name: "04 — LRU Map Bounds", file: "04-lru-map-bounds.mjs" },
  { name: "05 — Request Timeout", file: "05-request-timeout.mjs" },
];

await checkServer();
console.log();

const suiteResults = [];
let overallExitCode = 0;

for (const suite of suites) {
  console.log(c("bright", `\n${"─".repeat(60)}`));
  console.log(c("cyan", `  Running: ${suite.name}`));
  console.log(c("bright", "─".repeat(60)));

  const t0 = Date.now();
  try {
    execSync(
      `node ${join(__dirname, suite.file)}`,
      {
        env: { ...process.env, STRESS_BASE_URL: BASE_URL },
        stdio: "inherit",
        timeout: 120_000,
      }
    );
    const elapsed = Date.now() - t0;
    suiteResults.push({ name: suite.name, passed: true, elapsed });
    console.log(c("green", `\n  ✓ Suite completed in ${elapsed}ms`));
    console.log(c("yellow", "  Cooling down 65s to let rate limiter window reset before next suite..."));
    await new Promise(r => setTimeout(r, 65_000));
  } catch (e) {
    const elapsed = Date.now() - t0;
    if (e.status !== 0 && e.status !== 1) {
      console.log(c("red", `\n  ✗ Suite crashed: ${e.message}`));
    }
    suiteResults.push({ name: suite.name, passed: e.status === 0, elapsed, error: e.message });
    if (e.status !== 0) overallExitCode = 1;
  }
}

console.log(c("bright", "\n\n" + "█".repeat(60)));
console.log(c("bright", "  OVERALL STRESS TEST REPORT"));
console.log(c("bright", "█".repeat(60)));

for (const r of suiteResults) {
  const icon = r.passed ? c("green", "✓") : c("red", "✗");
  const time = r.elapsed ? `(${(r.elapsed / 1000).toFixed(1)}s)` : "";
  console.log(`  ${icon} ${r.name} ${time}`);
}

console.log();
if (overallExitCode === 0) {
  console.log(c("green", "  ★ ALL SUITES PASSED"));
} else {
  console.log(c("red", "  ✗ SOME SUITES FAILED"));
}
console.log(c("bright", "█".repeat(60) + "\n"));

process.exit(overallExitCode);
