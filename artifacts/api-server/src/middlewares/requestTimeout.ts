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
