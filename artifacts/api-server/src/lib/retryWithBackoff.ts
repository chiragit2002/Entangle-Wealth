import { logger } from "./logger";

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  label?: string;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 4,
    baseDelayMs = 1000,
    maxDelayMs = 8000,
    jitter = true,
    label = "request",
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxRetries) break;

      const exponentialDelay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const delay = jitter
        ? exponentialDelay * (0.5 + Math.random() * 0.5)
        : exponentialDelay;

      logger.warn(
        { attempt: attempt + 1, maxRetries, delay: Math.round(delay), label },
        `Retrying ${label} after failure`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
