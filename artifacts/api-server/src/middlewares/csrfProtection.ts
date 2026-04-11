import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SKIP_PATHS = ["/api/stripe/webhook"];

function getOrigin(req: Request): string | null {
  const origin = req.headers["origin"];
  if (origin) return origin;

  const referer = req.headers["referer"];
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  for (const d of domains) {
    origins.add(`https://${d.trim()}`);
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    origins.add(`https://${devDomain}`);
  }
  origins.add("http://localhost");
  for (let p = 3000; p <= 3010; p++) {
    origins.add(`http://localhost:${p}`);
  }
  const port = process.env.PORT;
  if (port) {
    origins.add(`http://localhost:${port}`);
  }
  return origins;
}

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  if (SKIP_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const origin = getOrigin(req);

  if (!origin) {
    logger.warn({ ip: req.ip, path: req.path }, "CSRF: blocked request with no Origin/Referer header");
    res.status(403).json({ error: "Forbidden: missing Origin header" });
    return;
  }

  const allowed = getAllowedOrigins();

  const host = req.headers["host"];
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }

  if (allowed.has(origin)) {
    return next();
  }

  logger.warn({ ip: req.ip, path: req.path, origin }, "CSRF: blocked request from unknown origin");
  res.status(403).json({ error: "Forbidden: cross-origin request rejected" });
};
