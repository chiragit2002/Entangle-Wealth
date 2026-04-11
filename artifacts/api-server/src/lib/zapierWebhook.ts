import { logger } from "./logger";

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;

let failureCount = 0;
let circuitOpen = false;
let circuitOpenedAt = 0;

function getWebhookUrl(): string | null {
  return process.env.ZAPIER_WEBHOOK_URL || null;
}

function checkCircuit(): boolean {
  if (!circuitOpen) return true;
  if (Date.now() - circuitOpenedAt >= CIRCUIT_BREAKER_RESET_MS) {
    circuitOpen = false;
    failureCount = 0;
    logger.info("[zapier] Circuit breaker reset — resuming webhook dispatch");
    return true;
  }
  return false;
}

function recordFailure() {
  failureCount++;
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD && !circuitOpen) {
    circuitOpen = true;
    circuitOpenedAt = Date.now();
    logger.warn(
      { failureCount },
      "[zapier] Circuit breaker OPEN — suppressing webhook calls for 60s"
    );
  }
}

function recordSuccess() {
  failureCount = 0;
  if (circuitOpen) {
    circuitOpen = false;
    logger.info("[zapier] Circuit breaker closed after successful call");
  }
}

export async function sendZapierWebhook(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const url = getWebhookUrl();
  if (!url) return;

  if (!checkCircuit()) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn(
        { event, status: res.status },
        "[zapier] Webhook responded with non-OK status"
      );
      recordFailure();
    } else {
      recordSuccess();
    }
  } catch (err) {
    logger.warn({ event, error: err }, "[zapier] Webhook dispatch failed");
    recordFailure();
  }
}

export async function sendZapierWebhookTest(): Promise<{
  success: boolean;
  status?: number;
  error?: string;
}> {
  const url = getWebhookUrl();
  if (!url) {
    return { success: false, error: "ZAPIER_WEBHOOK_URL not configured" };
  }

  const payload = {
    event: "test",
    timestamp: new Date().toISOString(),
    data: {
      message: "Test webhook from EntangleWealth",
      source: "admin_test_endpoint",
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    return { success: res.ok, status: res.status };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
