import autocannon from "autocannon";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:3001";
export const MOCK_AUTH_TOKEN = process.env.STRESS_AUTH_TOKEN || "mock-token";

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function color(c, text) {
  return `${COLORS[c]}${text}${COLORS.reset}`;
}

export function printHeader(title) {
  console.log("\n" + color("bright", "=".repeat(60)));
  console.log(color("cyan", `  ${title}`));
  console.log(color("bright", "=".repeat(60)));
}

export function printResult(label, result, assertions = []) {
  const rps = result.requests?.average ?? 0;
  const p50 = result.latency?.p50 ?? 0;
  const p95 = result.latency?.p95 ?? 0;
  const p99 = result.latency?.p99 ?? 0;
  const errors = result.errors ?? 0;
  const timeouts = result.timeouts ?? 0;
  const total = result.requests?.total ?? 0;
  const status2xx = result["2xx"] ?? 0;
  const status4xx = result["4xx"] ?? 0;
  const status5xx = result["5xx"] ?? 0;

  const errorRate = total > 0 ? ((errors + timeouts) / total * 100).toFixed(1) : "0.0";
  const status4xxRate = total > 0 ? (status4xx / total * 100).toFixed(1) : "0.0";
  const status5xxRate = total > 0 ? (status5xx / total * 100).toFixed(1) : "0.0";

  console.log("\n" + color("bright", `  [${label}]`));
  console.log(`    Throughput  : ${color("cyan", rps.toFixed(1))} req/s`);
  console.log(`    Latency p50 : ${color("cyan", p50)} ms`);
  console.log(`    Latency p95 : ${color("cyan", p95)} ms`);
  console.log(`    Latency p99 : ${color("cyan", p99)} ms`);
  console.log(`    Total reqs  : ${total}`);
  console.log(`    2xx         : ${color("green", status2xx)}`);
  console.log(`    4xx         : ${color("yellow", status4xx)} (${status4xxRate}%)`);
  console.log(`    5xx         : ${color("red", status5xx)} (${status5xxRate}%)`);
  console.log(`    Errors/TOs  : ${errors + timeouts > 0 ? color("red", errors + timeouts) : "0"} (${errorRate}%)`);

  const passed = [];
  const failed = [];
  for (const a of assertions) {
    if (a.pass) {
      passed.push(color("green", `    ✓ ${a.label}`));
    } else {
      failed.push(color("red", `    ✗ ${a.label}: expected ${a.expected}, got ${a.actual}`));
    }
  }
  if (passed.length || failed.length) {
    console.log("    Assertions:");
    for (const p of passed) console.log(p);
    for (const f of failed) console.log(f);
  }

  return failed.length === 0;
}

export function printSummary(results) {
  console.log("\n" + color("bright", "=".repeat(60)));
  console.log(color("bright", "  STRESS TEST SUMMARY"));
  console.log(color("bright", "=".repeat(60)));
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? color("green", "✓") : color("red", "✗");
    console.log(`  ${icon} ${r.name}`);
    if (!r.passed) allPassed = false;
  }
  console.log();
  if (allPassed) {
    console.log(color("green", "  ALL TESTS PASSED"));
  } else {
    console.log(color("red", "  SOME TESTS FAILED"));
    process.exitCode = 1;
  }
  console.log(color("bright", "=".repeat(60)) + "\n");
}

export function run(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: false });
  });
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function authHeaders(token = MOCK_AUTH_TOKEN) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-csrf-token": "stress-test",
  };
}
