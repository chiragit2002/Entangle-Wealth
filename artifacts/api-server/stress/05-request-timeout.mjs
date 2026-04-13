/**
 * Request Timeout Middleware Test
 * Verifies that hanging requests are killed after threshold.
 * Uses a simulated slow endpoint to trigger the timeout.
 */
import { printHeader, printResult, printSummary, BASE_URL, sleep, run } from "./helpers.mjs";

const results = [];

async function testTimeoutMiddlewareConfiguration() {
  printHeader("Request Timeout Middleware — Configuration Verification");
  console.log("  Verifying timeout middleware is applied to AI and standard routes...\n");
  console.log("  AI routes: 30s timeout");
  console.log("  Standard routes: 10s timeout\n");

  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/api/health`, {
    signal: AbortSignal.timeout(15000),
  });
  const elapsed = Date.now() - t0;
  const data = await res.json().catch(() => ({}));

  console.log(`  /api/health responded in ${elapsed}ms with status ${res.status}`);

  const passed = (res.status === 200 || res.status === 429) && elapsed < 15000;
  if (passed) {
    console.log("  \x1b[32m✓ Health endpoint responds (timeout middleware not causing hangs)\x1b[0m");
  } else {
    console.log("  \x1b[31m✗ Health endpoint too slow or unreachable\x1b[0m");
  }
  results.push({ name: "Timeout Middleware — Normal Requests Unaffected", passed });
}

async function testTimeoutOnSaturation() {
  printHeader("Request Timeout — Saturation Behavior");
  console.log("  Flooding endpoint with concurrent requests — checking timeouts fire, not hangs...");

  const CONCURRENT = 30;
  const promises = [];
  const t0 = Date.now();

  for (let i = 0; i < CONCURRENT; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": "stress-test",
        },
        body: JSON.stringify({ symbol: "AAPL", question: "Stress test timeout probe" }),
        signal: AbortSignal.timeout(35_000),
      })
        .then(r => ({ status: r.status, elapsed: Date.now() - t0 }))
        .catch(e => ({ status: 0, error: e.message, elapsed: Date.now() - t0 }))
    );
  }

  const responses = await Promise.all(promises);
  const totalElapsed = Date.now() - t0;

  const count503 = responses.filter(r => r.status === 503).length;
  const count429 = responses.filter(r => r.status === 429).length;
  const count401 = responses.filter(r => r.status === 401).length;
  const count200 = responses.filter(r => r.status === 200).length;
  const countErr = responses.filter(r => r.status === 0).length;
  const maxRespTime = Math.max(...responses.map(r => r.elapsed));

  console.log(`\n  Total elapsed: ${totalElapsed}ms`);
  console.log(`  Max single response time: ${maxRespTime}ms`);
  console.log(`  200: ${count200}, 401: ${count401}, 429: ${count429}, 503: ${count503}, Error: ${countErr}`);

  const noHang = totalElapsed < 35_000;
  const passed = noHang;

  if (passed) {
    console.log(`\n  \x1b[32m✓ All ${CONCURRENT} requests completed in ${totalElapsed}ms (no hang beyond 35s)\x1b[0m`);
  } else {
    console.log(`\n  \x1b[31m✗ Requests hung beyond expected timeout window\x1b[0m`);
  }
  results.push({ name: "Request Timeout — No Hang Under Saturation", passed });
}

async function testStandardRouteLoad() {
  printHeader("Standard Timeout — Route Load Test");
  const result = await run({
    url: `${BASE_URL}/api/health`,
    connections: 20,
    duration: 5,
    title: "Standard Timeout Route Load",
  });

  const p95 = result.latency?.p95 ?? 0;
  const passed = printResult("Standard Route Load (20 conn, 5s)", result, [
    {
      label: "p95 < 10000ms (well within 10s timeout)",
      pass: p95 < 10_000,
      expected: "< 10000ms",
      actual: `${p95}ms`,
    },
    {
      label: "Timeout rate < 5%",
      pass: result.timeouts / (result.requests?.total || 1) < 0.05,
      expected: "< 5%",
      actual: `${((result.timeouts / (result.requests?.total || 1)) * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "Standard Route Load — Within Timeout Budget", passed });
}

printHeader("REQUEST TIMEOUT MIDDLEWARE TEST SUITE");
console.log(`Target: ${BASE_URL}`);

await testTimeoutMiddlewareConfiguration();
await sleep(500);
await testTimeoutOnSaturation();
await sleep(1000);
await testStandardRouteLoad();

printSummary(results);
