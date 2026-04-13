import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { Sentry } from "../lib/sentry";

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errObj = err as { status?: number; statusCode?: number; code?: string; message?: string };

  const isQueueFull = errObj?.code === "QUEUE_FULL";

  const status = isQueueFull
    ? 503
    : typeof errObj.status === "number"
    ? errObj.status
    : typeof errObj.statusCode === "number"
    ? errObj.statusCode
    : 500;

  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
    "Unhandled error"
  );

  if (status >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag("http.method", req.method);
      scope.setTag("http.path", req.path);
      scope.setTag("http.status", String(status));
      scope.setUser({ ip_address: req.ip });
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
    });
  }

  if (res.headersSent) return;

  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: isQueueFull
      ? "AI queue is full. Please try again later."
      : "Internal server error",
  });
};
