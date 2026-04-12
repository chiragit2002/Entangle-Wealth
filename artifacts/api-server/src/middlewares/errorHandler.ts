import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { Sentry } from "../lib/sentry";

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status =
    typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : typeof (err as { statusCode?: number }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
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
    error: "Internal server error",
  });
};
