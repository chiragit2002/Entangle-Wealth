import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

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

  if (res.headersSent) return;

  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: "Internal server error",
  });
};
