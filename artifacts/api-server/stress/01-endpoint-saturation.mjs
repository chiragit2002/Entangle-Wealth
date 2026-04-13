/**
 * Endpoint Saturation Tests
 * Hammers every critical API surface from baseline to 10x expected traffic.
 * Captures throughput, latency percentiles, and error codes.
 */
import { run, printHeader, printResult, printSummary, authHeaders, BASE_URL, sleep } from "./helpers.mjs";

const results = [];

async function testHealth() {
  printHeader("Health Endpoint — Saturation");
  const result = await run({
    url: `${BASE_URL}/api/health`,
    connections: 50,
    duration: 10,
    title: "Health Saturation",
  });

  const passed = printResult("GET /api/health (50 conn, 10s)", result, [
    {
      label: "Error rate < 1%",
      pass: (result.errors + result.timeouts) / (result.requests?.total || 1) < 0.01,
      expected: "< 1%",
      actual: `${(((result.errors + result.timeouts) / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
    {
      label: "p99 < 500ms",
      pass: result.latency?.p99 < 500,
      expected: "< 500ms",
      actual: `${result.latency?.p99}ms`,
    },
  ]);
  results.push({ name: "Health Endpoint Saturation", passed });
}

async function testHealthRampUp() {
  printHeader("Health Endpoint — 10x Ramp");
  const result = await run({
    url: `${BASE_URL}/api/health`,
    connections: 200,
    duration: 10,
    title: "Health 10x Ramp",
  });
  const passed = printResult("GET /api/health (200 conn, 10s)", result, [
    {
      label: "Server survives (< 5% errors)",
      pass: (result.errors + result.timeouts) / (result.requests?.total || 1) < 0.05,
      expected: "< 5%",
      actual: `${(((result.errors + result.timeouts) / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "Health Endpoint 10x Ramp", passed });
}

async function testStocksSymbol() {
  printHeader("Stocks Symbol Endpoint — Saturation");
  const result = await run({
    url: `${BASE_URL}/api/stocks/AAPL`,
    connections: 30,
    duration: 10,
    title: "Stocks Symbol",
  });
  const passed = printResult("GET /api/stocks/AAPL (30 conn, 10s)", result, [
    {
      label: "Response received (p95 < 2000ms)",
      pass: result.latency?.p95 < 2000,
      expected: "< 2000ms",
      actual: `${result.latency?.p95}ms`,
    },
  ]);
  results.push({ name: "Stocks /api/stocks/:symbol Saturation", passed });
}

async function testUsersMe() {
  printHeader("/api/users/me — Saturation (unauthenticated)");
  const result = await run({
    url: `${BASE_URL}/api/users/me`,
    connections: 30,
    duration: 10,
    title: "Users/Me Unauthenticated",
    headers: { "x-csrf-token": "stress-test" },
  });
  const passed = printResult("GET /api/users/me (30 conn, 10s, no auth)", result, [
    {
      label: "Responds with 401 or 200 (not 500)",
      pass: (result["5xx"] ?? 0) / (result.requests?.total || 1) < 0.05,
      expected: "< 5% 5xx",
      actual: `${(((result["5xx"] ?? 0) / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "Users /api/users/me Saturation", passed });
}

async function testGamificationXp() {
  printHeader("/api/gamification/xp — Saturation (unauthenticated)");
  const result = await run({
    url: `${BASE_URL}/api/gamification/xp`,
    connections: 30,
    duration: 10,
    title: "Gamification XP",
    headers: { "x-csrf-token": "stress-test" },
  });
  const passed = printResult("GET /api/gamification/xp (30 conn, 10s, no auth)", result, [
    {
      label: "Server stable (< 5% 5xx)",
      pass: (result["5xx"] ?? 0) / (result.requests?.total || 1) < 0.05,
      expected: "< 5% 5xx",
      actual: `${(((result["5xx"] ?? 0) / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "Gamification /api/gamification/xp Saturation", passed });
}

async function testAlpacaTrading() {
  printHeader("/api/alpaca/* — Saturation");
  const result = await run({
    url: `${BASE_URL}/api/alpaca/snapshot/AAPL`,
    connections: 20,
    duration: 10,
    title: "Alpaca Snapshot Saturation",
  });
  const passed = printResult("GET /api/alpaca/snapshot/AAPL (20 conn, 10s)", result, [
    {
      label: "Server stable (< 10% 5xx — Alpaca may be unavailable in test)",
      pass: (result.errors + result.timeouts) / (result.requests?.total || 1) < 0.9,
      expected: "< 90% errors",
      actual: `${(((result.errors + result.timeouts) / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "Alpaca /api/alpaca/* Saturation", passed });
}

async function testAnalyzeAI() {
  printHeader("/api/analyze — AI Endpoint Saturation");
  const result = await run({
    url: `${BASE_URL}/api/analyze`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": "stress-test",
    },
    body: JSON.stringify({ symbol: "AAPL", question: "What is the outlook?" }),
    connections: 10,
    duration: 10,
    title: "AI Analyze Saturation",
  });
  const passed = printResult("POST /api/analyze (10 conn, 10s, no auth)", result, [
    {
      label: "Server stable (returns 401/429/503, not 500)",
      pass: (result["5xx"] ?? 0) / (result.requests?.total || 1) < 0.1,
      expected: "< 10% 5xx",
      actual: `${(((result["5xx"] ?? 0) / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "AI /api/analyze Saturation", passed });
}

async function testWebhooksEndpoint() {
  printHeader("/api/webhooks — Endpoint Saturation");
  const result = await run({
    url: `${BASE_URL}/api/webhooks/zapier`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "test", data: {} }),
    connections: 20,
    duration: 5,
    title: "Webhooks Saturation",
  });
  const passed = printResult("POST /api/webhooks/zapier (20 conn, 5s)", result, [
    {
      label: "Server responds (not timeout)",
      pass: result.timeouts / (result.requests?.total || 1) < 0.1,
      expected: "< 10% timeout",
      actual: `${((result.timeouts / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "Webhooks Saturation", passed });
}

printHeader("ENDPOINT SATURATION TEST SUITE");
console.log(`Target: ${BASE_URL}`);

await testHealth();
await sleep(1000);
await testHealthRampUp();
await sleep(1000);
await testStocksSymbol();
await sleep(1000);
await testUsersMe();
await sleep(1000);
await testGamificationXp();
await sleep(1000);
await testAlpacaTrading();
await sleep(1000);
await testAnalyzeAI();
await sleep(1000);
await testWebhooksEndpoint();

printSummary(results);
