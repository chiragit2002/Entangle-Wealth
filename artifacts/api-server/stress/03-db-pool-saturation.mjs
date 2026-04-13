/**
 * Database Connection Pool Saturation Test
 * Opens concurrent DB-hitting requests until pool saturates.
 * Verifies server degrades gracefully (503) rather than hanging.
 *
 * Uses public endpoints that hit the DB (health endpoint runs SELECT 1 internally).
 * The dedicated /stress-test endpoint can also trigger DB load.
 */
import { run, printHeader, printResult, printSummary, BASE_URL, sleep } from "./helpers.mjs";

const results = [];

async function testDbPoolConfigVerification() {
  printHeader("DB Pool — Configuration Verification via /api/health");
  let data = {};
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (res.status === 429) {
      console.log(`  Rate limited (attempt ${attempt}/3), waiting 5s...`);
      await sleep(5000);
      continue;
    }
    data = await res.json();
    break;
  }

  const pool = data.db;
  console.log("\n  DB pool stats from /api/health:");
  console.log("  ", JSON.stringify(pool, null, 2));

  const hasPoolConfig = pool && pool.max === 20;
  const hasIdleStats = pool && typeof pool.idle === "number";
  const hasWaitingStats = pool && typeof pool.waiting === "number";
  const hasUtilization = pool && typeof pool.utilizationPct === "number";

  console.log(`  max=20: ${hasPoolConfig ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"}`);
  console.log(`  idle count exposed: ${hasIdleStats ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"}`);
  console.log(`  waiting count exposed: ${hasWaitingStats ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"}`);
  console.log(`  utilizationPct exposed: ${hasUtilization ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"}`);

  const passed = hasPoolConfig && hasIdleStats && hasWaitingStats && hasUtilization;
  results.push({ name: "DB Pool Config max=20 Verified", passed });
}

async function testDbPoolGracefulDegradation() {
  printHeader("DB Pool — Graceful Degradation Under Concurrent Load");
  console.log("  Sending 60 concurrent requests to public DB-touching endpoints...");
  console.log("  Pool max=20, connectionTimeoutMillis=5000");
  console.log("  Expect: all requests complete (200/503), no hang beyond 15s\n");

  const CONCURRENT = 60;
  const promises = [];
  const t0 = Date.now();

  for (let i = 0; i < CONCURRENT; i++) {
    const url = i % 2 === 0
      ? `${BASE_URL}/api/health`
      : `${BASE_URL}/api/alpaca/snapshot/AAPL`;

    promises.push(
      fetch(url, {
        signal: AbortSignal.timeout(12000),
      })
        .then(r => ({ status: r.status, ok: r.ok }))
        .catch(e => ({ status: 0, error: e.message }))
    );
  }

  const responses = await Promise.all(promises);
  const elapsed = Date.now() - t0;

  const count200 = responses.filter(r => r.status === 200).length;
  const count429 = responses.filter(r => r.status === 429).length;
  const count503 = responses.filter(r => r.status === 503).length;
  const count502 = responses.filter(r => r.status === 502).length;
  const countTimeout = responses.filter(r => r.status === 0).length;
  const countOther = responses.filter(r => ![200, 429, 503, 502, 0].includes(r.status)).length;
  const countResponded = responses.filter(r => r.status !== 0).length;

  console.log(`  Completed ${CONCURRENT} concurrent requests in ${elapsed}ms`);
  console.log(`  200 (ok):          ${count200}`);
  console.log(`  429 (rate limit):  ${count429}`);
  console.log(`  502 (upstream):    ${count502}`);
  console.log(`  503 (unavailable): ${count503}`);
  console.log(`  Timeout/Error:     ${countTimeout}`);
  console.log(`  Other:             ${countOther}`);

  const noHang = elapsed < 15_000;
  const serverStable = countTimeout < CONCURRENT * 0.2;
  const graceful = countResponded >= CONCURRENT * 0.8;

  const passed = noHang && serverStable && graceful;

  console.log(`\n  No hang (< 15s): ${noHang ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} (${elapsed}ms)`);
  console.log(`  < 20% timeouts: ${serverStable ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} (${countTimeout} timeouts)`);
  console.log(`  > 80% responded: ${graceful ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} (${countResponded} responded)`);

  if (passed) {
    console.log(`\n  \x1b[32m✓ Server degrades gracefully under DB pool pressure (${elapsed}ms)\x1b[0m`);
  } else {
    console.log(`\n  \x1b[31m✗ Server did not degrade gracefully — hung or failed catastrophically\x1b[0m`);
  }

  results.push({ name: "DB Pool Graceful Degradation", passed });
}

async function testDbPoolAutocannon() {
  printHeader("DB Pool — Autocannon Heavy Concurrent Load");
  const result = await run({
    url: `${BASE_URL}/api/health`,
    connections: 60,
    duration: 8,
    title: "DB Pool Heavy Load",
  });

  const total = result.requests?.total ?? 0;
  const status5xx = result["5xx"] ?? 0;
  const timeoutRate = result.timeouts / (total || 1);
  const failRate5xx = status5xx / (total || 1);

  const passed = printResult("Heavy DB Load (60 conn, 8s)", result, [
    {
      label: "Server stable: < 10% 5xx responses",
      pass: failRate5xx < 0.1,
      expected: "< 10%",
      actual: `${(failRate5xx * 100).toFixed(2)}%`,
    },
    {
      label: "No catastrophic timeout: < 30% timeouts",
      pass: timeoutRate < 0.3,
      expected: "< 30%",
      actual: `${(timeoutRate * 100).toFixed(2)}%`,
    },
  ]);
  results.push({ name: "DB Pool Heavy Autocannon Load", passed });
}

printHeader("DATABASE POOL SATURATION TEST SUITE");
console.log(`Target: ${BASE_URL}`);

await testDbPoolConfigVerification();
await sleep(500);
await testDbPoolGracefulDegradation();
await sleep(1000);
await testDbPoolAutocannon();

printSummary(results);
