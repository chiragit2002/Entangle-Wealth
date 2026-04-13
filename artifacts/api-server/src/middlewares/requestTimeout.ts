import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10);
const AI_TIMEOUT_MS = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || "60000", 10);

const AI_PATH_PATTERNS: RegExp[] = [
  /^\/api\/taxgpt/,
  /^\/api\/analyze/,
  /^\/api\/marketing\/generate/,
  /^\/api\/stocks\/[^/]+\/analyze/,
  /^\/api\/stocks\/[^/]+\/quick-analyze/,
];

function isAiPath(path: string): boolean {
  return AI_PATH_PATTERNS.some((re) => re.test(path));
}

declare global {
  namespace Express {
    interface Request {
      timeoutAbortController?: AbortController;
      abortSignal?: AbortSignal;
      abortController?: AbortController;
    }
  }
}

export function requestTimeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === "/api/alerts/stream") {
    next();
    return;
  }

  const timeoutMs = isAiPath(req.path) ? AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  req.timeoutAbortController = controller;

  const timer = setTimeout(() => {
    if (res.headersSent) return;

    controller.abort();

    logger.warn(
      { method: req.method, path: req.path, timeoutMs },
      "Request timed out"
    );

    res.status(504).json({
      error: "Gateway Timeout",
      message: `Request exceeded the ${timeoutMs / 1000}s time limit. Please try again.`,
      timeoutMs,
    });
  }, timeoutMs);

  timer.unref();

  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
}

export function requestTimeout(timeoutMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const controller = new AbortController();
    req.abortController = controller;
    req.abortSignal = controller.signal;

    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
      if (!res.headersSent) {
        logger.warn(
          { method: req.method, path: req.path, timeoutMs },
          "Request timed out"
        );
        res.status(503).json({
          error: "Request timed out. Please try again.",
          timeout: timeoutMs,
        });
      }
    }, timeoutMs);

    const cleanup = () => {
      if (!timedOut) clearTimeout(timer);
    };

    res.on("finish", cleanup);
    res.on("close", cleanup);

    next();
  };
}

export const standardTimeout = requestTimeout(10_000);
export const aiTimeout = requestTimeout(30_000);
