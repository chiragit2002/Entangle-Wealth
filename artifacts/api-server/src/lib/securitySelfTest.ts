import type { Express } from "express";
import * as http from "http";
import { logAuthEvent } from "./authEventLogger";

export type Severity = "critical" | "weak" | "improvement" | "strong";

export interface TestResult {
  name: string;
  description: string;
  passed: boolean;
  severity: Severity;
  detail: string;
  defenseResponse?: string;
}

export interface SelfTestReport {
  ranAt: string;
  durationMs: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    weak: number;
    improvement: number;
    strong: number;
  };
  categories: {
    critical: TestResult[];
    weak: TestResult[];
    improvement: TestResult[];
    strong: TestResult[];
  };
  results: TestResult[];
}

const TEST_IP_PREFIX = "198.51.100";

interface HttpResponse {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

function httpRequest(
  port: number,
  options: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  }
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const bodyStr = options.body ? JSON.stringify(options.body) : "";

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: options.path,
        method: options.method,
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(bodyStr)),
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => {
          let parsed: Record<string, unknown> = {};
          try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
          resolve({
            status: res.statusCode ?? 0,
            body: parsed,
            headers: res.headers as Record<string, string>,
          });
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function testRateLimiting(port: number): Promise<TestResult> {
  const name = "Rate Limiting";
  const description = "A rate limiter (global or per-route) responds with 429 after threshold is exceeded";

  try {
    const testIp = `${TEST_IP_PREFIX}.10`;
    const testHeaders = {
      "x-forwarded-for": testIp,
      origin: "http://localhost",
    };

    const burst = Array.from({ length: 60 }, () =>
      httpRequest(port, { method: "GET", path: "/api/health", headers: testHeaders })
    );

    const results = await Promise.all(burst);
    const blocked = results.filter((r) => r.status === 429);

    if (blocked.length > 0) {
      const msg = JSON.stringify(blocked[0].body);
      const isGlobalLimiter = msg.includes("Too many requests");
      const limiterName = isGlobalLimiter ? "global API rate limiter" : "a rate limiter";
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: `Rate limiter enforced: ${blocked.length} of 60 requests received 429 from ${limiterName}. ${results.length - blocked.length} requests allowed before threshold.`,
        defenseResponse: `429 — body: ${msg}`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: "No rate limiter triggered after 60 concurrent requests. Rate limiting may be bypassed or misconfigured.",
      defenseResponse: "No 429 response observed",
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Rate limiting test failed with error: ${String(err)}`,
    };
  }
}

async function testBruteForce(port: number): Promise<TestResult> {
  const name = "Brute Force Lockout";
  const description = "Brute force guard locks out IPs after 5 failed auth attempts via the live stack";

  const testIp = `${TEST_IP_PREFIX}.20`;

  try {
    const { recordFailedAttempt, resetAttempts } = await import("../middlewares/bruteForce");

    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(testIp);
    }

    let response: HttpResponse;
    try {
      response = await httpRequest(port, {
        method: "POST",
        path: "/api/auth/login",
        headers: {
          "x-forwarded-for": testIp,
          origin: "http://localhost",
        },
        body: { email: "selftest@test.invalid", password: "intentionally-wrong-selftest" },
      });
    } finally {
      resetAttempts(testIp);
    }

    if (response.status === 429) {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "Brute force guard correctly blocked the test IP via the live middleware stack after 5 simulated failed attempts. (Note: /api/auth/login is used as the probe path — no real login was attempted.)",
        defenseResponse: `429 retryAfter=${response.body.retryAfter}s`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Expected 429 from brute force guard after 5 seeded failures on the test IP. Got ${response.status}. Guard may not be mounted on /api/auth/login, or x-forwarded-for trust may be misconfigured.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    const { resetAttempts } = await import("../middlewares/bruteForce");
    resetAttempts(testIp);
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Brute force test failed with error: ${String(err)}`,
    };
  }
}

async function testSqlInjection(port: number): Promise<TestResult> {
  const name = "SQL Injection Blocking";
  const description = "Input sanitizer blocks SQL injection payloads in request body via the live stack";

  try {
    const response = await httpRequest(port, {
      method: "POST",
      path: "/api/auth/login",
      headers: { origin: "http://localhost" },
      body: { email: "' OR '1'='1", password: "x" },
    });

    if (response.status === 400 && response.body?.error === "Invalid input detected") {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "SQL injection payload `' OR '1'='1` was correctly blocked with 400 through the live middleware stack.",
        defenseResponse: "400 Invalid input detected",
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `SQL injection was not blocked. Got ${response.status}. inputSanitizer may not cover this pattern or path.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `SQL injection test failed with error: ${String(err)}`,
    };
  }
}

async function testXssScriptTag(port: number): Promise<TestResult> {
  const name = "XSS Script Tag Blocking";
  const description = "Input sanitizer blocks <script> XSS payloads in request body via the live stack";

  try {
    const response = await httpRequest(port, {
      method: "POST",
      path: "/api/auth/login",
      headers: { origin: "http://localhost" },
      body: { email: "user@test.com", name: "<script>alert(document.cookie)</script>" },
    });

    if (response.status === 400 && response.body?.error === "Invalid input detected") {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "XSS script tag payload was correctly blocked with 400 through the live middleware stack.",
        defenseResponse: "400 Invalid input detected",
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `XSS script tag was not blocked. Got ${response.status}. inputSanitizer may not cover this pattern.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `XSS script tag test failed with error: ${String(err)}`,
    };
  }
}

async function testXssEventHandler(port: number): Promise<TestResult> {
  const name = "XSS Inline Event Handler Blocking";
  const description = "Input sanitizer blocks inline event handler XSS payloads via the live stack";

  try {
    const response = await httpRequest(port, {
      method: "POST",
      path: "/api/auth/login",
      headers: { origin: "http://localhost" },
      body: { bio: "<img src=x onerror=alert(1)>", email: "user@test.com" },
    });

    if (response.status === 400 && response.body?.error === "Invalid input detected") {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "Inline event handler XSS (`onerror=`) was correctly blocked with 400 through the live middleware stack.",
        defenseResponse: "400 Invalid input detected",
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Inline XSS event handler was not blocked. Got ${response.status}.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `XSS event handler test failed with error: ${String(err)}`,
    };
  }
}

async function testCsrfUnknownOrigin(port: number): Promise<TestResult> {
  const name = "CSRF Cross-Origin Rejection";
  const description = "CSRF middleware rejects POST from unknown cross-site origin via the live stack";

  try {
    const response = await httpRequest(port, {
      method: "POST",
      path: "/api/auth/login",
      headers: { origin: "https://evil-attacker.example.com" },
      body: { email: "user@test.com", password: "pass" },
    });

    if (response.status === 403) {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "POST from unknown origin `https://evil-attacker.example.com` was rejected with 403 by the live CSRF middleware.",
        defenseResponse: `403 ${JSON.stringify(response.body)}`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Cross-origin POST was not rejected. Got ${response.status}. CSRF protection may be bypassed.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `CSRF cross-origin test failed with error: ${String(err)}`,
    };
  }
}

async function testCsrfMissingOrigin(port: number): Promise<TestResult> {
  const name = "CSRF Missing Origin Header";
  const description = "CSRF middleware rejects mutating requests with no Origin or Referer header via the live stack";

  try {
    const response = await httpRequest(port, {
      method: "POST",
      path: "/api/auth/login",
      headers: {},
      body: { email: "user@test.com", password: "pass" },
    });

    if (response.status === 403) {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "POST with no Origin/Referer header was rejected with 403 by the live CSRF middleware.",
        defenseResponse: `403 ${JSON.stringify(response.body)}`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "weak",
      detail: `POST with no Origin header was not rejected. Got ${response.status}. Headerless cross-origin requests may slip through.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "weak",
      detail: `CSRF missing-origin test failed with error: ${String(err)}`,
    };
  }
}

async function testAuthEnforcement(port: number): Promise<TestResult> {
  const name = "Auth Enforcement";
  const description = "Protected admin routes reject unauthenticated requests with 401 via the live stack";

  const testIp = `${TEST_IP_PREFIX}.30`;

  try {
    const { resetAttempts } = await import("../middlewares/bruteForce");

    let response: HttpResponse;
    try {
      response = await httpRequest(port, {
        method: "GET",
        path: "/api/security/dashboard",
        headers: {
          "x-forwarded-for": testIp,
          origin: "http://localhost",
        },
      });
    } finally {
      resetAttempts(testIp);
    }

    if (response.status === 401) {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "Unauthenticated request to `/api/security/dashboard` was correctly rejected with 401 via the live middleware chain.",
        defenseResponse: `401 ${JSON.stringify(response.body)}`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Unauthenticated access to protected route returned ${response.status} instead of 401. Auth guard may be broken.`,
      defenseResponse: `${response.status} ${JSON.stringify(response.body)}`,
    };
  } catch (err) {
    const { resetAttempts } = await import("../middlewares/bruteForce");
    resetAttempts(testIp);
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Auth enforcement test failed with error: ${String(err)}`,
    };
  }
}

async function testErrorShielding(): Promise<TestResult> {
  const name = "Error Shielding";
  const description = "Global error handler does not expose stack traces or internal details when an unhandled error occurs";

  try {
    const { globalErrorHandler } = await import("../middlewares/errorHandler");

    const fakeError = new Error("DB connection failed: password authentication failed for user 'admin'");
    (fakeError as Error & { stack: string }).stack = [
      "Error: DB connection failed: password authentication failed for user 'admin'",
      "    at Object.query (/app/src/lib/db.ts:42:10)",
      "    at async handler (/app/src/routes/api.ts:15:3)",
      "    at async Layer.handle (/app/node_modules/express/lib/router/layer.js:86:5)",
    ].join("\n");

    const reqState = { method: "GET", path: "/api/test", ip: "127.0.0.1" };
    const fakeReq = {
      method: reqState.method,
      path: reqState.path,
      ip: reqState.ip,
      headers: {},
    };

    const capture: { status: number; body: Record<string, unknown>; headersSent: boolean } = {
      status: 200,
      body: {},
      headersSent: false,
    };

    const fakeRes = {
      get headersSent() { return capture.headersSent; },
      set headersSent(v: boolean) { capture.headersSent = v; },
      status(code: number) { capture.status = code; return fakeRes; },
      setHeader() {},
      getHeader() { return undefined; },
      json(data: unknown) {
        capture.headersSent = true;
        capture.body = data as Record<string, unknown>;
      },
      send(data: unknown) {
        capture.headersSent = true;
        capture.body = typeof data === "object" ? (data as Record<string, unknown>) : { raw: data };
      },
    };

    (globalErrorHandler as unknown as (
      err: unknown,
      req: unknown,
      res: unknown,
      next: () => void
    ) => void)(fakeError, fakeReq, fakeRes, () => {});

    const bodyStr = JSON.stringify(capture.body);

    const leaksInternals =
      bodyStr.includes("password authentication") ||
      bodyStr.includes("at Object.") ||
      bodyStr.includes("at async") ||
      bodyStr.includes("at Layer") ||
      bodyStr.includes("/app/src/") ||
      bodyStr.includes("node_modules") ||
      bodyStr.includes('"stack"');

    if (leaksInternals) {
      return {
        name,
        description,
        passed: false,
        severity: "critical",
        detail: "Global error handler leaks internal error details (stack trace, DB credentials, or file paths) in the response body.",
        defenseResponse: `${capture.status} — ${bodyStr.slice(0, 300)}`,
      };
    }

    if (capture.status >= 400 && capture.status < 600) {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: `Intentional server error was handled with ${capture.status} and no internal details were exposed in the response. Error shielding is working.`,
        defenseResponse: `${capture.status} — ${bodyStr}`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "improvement",
      detail: `Unexpected error handler behavior: status ${capture.status}, body ${bodyStr}`,
      defenseResponse: `${capture.status} — ${bodyStr}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "critical",
      detail: `Error shielding test failed with error: ${String(err)}`,
    };
  }
}

async function testZodValidation(): Promise<TestResult> {
  const name = "Zod Schema Validation";
  const description = "Zod validateQuery middleware rejects malformed query parameters with 400";

  try {
    const { validateQuery, z } = await import("./validateRequest");

    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(200),
    });

    const capture: { status: number; body: Record<string, unknown>; ended: boolean } = {
      status: 200,
      body: {},
      ended: false,
    };

    const fakeReq = {
      method: "GET",
      path: "/api/security/alerts",
      query: { limit: "not-a-number" },
      headers: {},
    };

    const fakeRes = {
      status(code: number) { capture.status = code; return fakeRes; },
      setHeader() {},
      json(data: unknown) {
        capture.body = data as Record<string, unknown>;
        capture.ended = true;
      },
    };

    await new Promise<void>((resolve) => {
      (validateQuery(schema) as unknown as (req: unknown, res: unknown, next: () => void) => void)(
        fakeReq,
        fakeRes,
        () => {
          capture.ended = true;
          resolve();
        }
      );
      setTimeout(resolve, 100);
    });

    if (capture.status === 400 && capture.ended) {
      return {
        name,
        description,
        passed: true,
        severity: "strong",
        detail: "Zod validateQuery middleware correctly rejected malformed input `limit=not-a-number` with 400. Zod validation is active and working.",
        defenseResponse: `400 ${JSON.stringify(capture.body)}`,
      };
    }

    if (!capture.ended) {
      return {
        name,
        description,
        passed: false,
        severity: "improvement",
        detail: "Zod validateQuery middleware passed malformed input without rejecting it. Validation may be misconfigured.",
        defenseResponse: `${capture.status} ${JSON.stringify(capture.body)}`,
      };
    }

    return {
      name,
      description,
      passed: false,
      severity: "improvement",
      detail: `Zod validateQuery returned unexpected status ${capture.status} for malformed input.`,
      defenseResponse: `${capture.status} ${JSON.stringify(capture.body)}`,
    };
  } catch (err) {
    return {
      name,
      description,
      passed: false,
      severity: "improvement",
      detail: `Zod validation test failed with error: ${String(err)}`,
    };
  }
}

function classifyBySeverity(results: TestResult[]): SelfTestReport["categories"] {
  const categories: SelfTestReport["categories"] = {
    critical: [],
    weak: [],
    improvement: [],
    strong: [],
  };

  for (const r of results) {
    if (!r.passed) {
      if (r.severity === "critical") categories.critical.push(r);
      else if (r.severity === "weak") categories.weak.push(r);
      else categories.improvement.push(r);
    } else {
      categories.strong.push(r);
    }
  }

  return categories;
}

export async function runSecuritySelfTest(
  app: Express,
  triggeredByUserId: string,
  ip: string
): Promise<SelfTestReport> {
  const startedAt = Date.now();

  logAuthEvent({
    type: "security_self_test",
    userId: triggeredByUserId,
    ip,
    method: "POST",
    path: "/api/security/self-test",
    details: { status: "started" },
  });

  const server = http.createServer(app as unknown as http.RequestListener);
  const port = await new Promise<number>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve(addr.port);
      } else {
        reject(new Error("Failed to get server port"));
      }
    });
    server.on("error", reject);
  });

  const results: TestResult[] = [];

  try {
    const liveRunners: Array<(p: number) => Promise<TestResult>> = [
      testRateLimiting,
      testBruteForce,
      testSqlInjection,
      testXssScriptTag,
      testXssEventHandler,
      testCsrfUnknownOrigin,
      testCsrfMissingOrigin,
      testAuthEnforcement,
    ];

    for (const run of liveRunners) {
      results.push(await run(port));
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  results.push(await testErrorShielding());
  results.push(await testZodValidation());

  const durationMs = Date.now() - startedAt;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const categories = classifyBySeverity(results);

  const report: SelfTestReport = {
    ranAt: new Date(startedAt).toISOString(),
    durationMs,
    summary: {
      total: results.length,
      passed,
      failed,
      critical: categories.critical.length,
      weak: categories.weak.length,
      improvement: categories.improvement.length,
      strong: categories.strong.length,
    },
    categories,
    results,
  };

  logAuthEvent({
    type: "security_self_test",
    userId: triggeredByUserId,
    ip,
    method: "POST",
    path: "/api/security/self-test",
    details: {
      status: "completed",
      durationMs,
      total: report.summary.total,
      passed: report.summary.passed,
      failed: report.summary.failed,
      criticalFailures: report.summary.critical,
    },
  });

  return report;
}
