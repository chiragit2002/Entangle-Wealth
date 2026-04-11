import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "./logger";

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      logger.warn({ path: req.path, issues: result.error.issues }, "Request body validation failed");
      res.status(400).json({ error: "Invalid request body", details: result.error.issues.map(i => i.message) });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      logger.warn({ path: req.path, issues: result.error.issues }, "Request query validation failed");
      res.status(400).json({ error: "Invalid query parameters", details: result.error.issues.map(i => i.message) });
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      logger.warn({ path: req.path, issues: result.error.issues }, "Request params validation failed");
      res.status(400).json({ error: "Invalid path parameters", details: result.error.issues.map(i => i.message) });
      return;
    }
    req.params = result.data as typeof req.params;
    next();
  };
}

export { z };

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const IntIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const SlugParamsSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/, "Slug must be alphanumeric with hyphens/underscores"),
});
