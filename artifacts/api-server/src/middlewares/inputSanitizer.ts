import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const SQL_PATTERNS = [
  /(--|;)\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
  /'\s*(OR|AND)\s+'?\d*'?\s*=\s*'?\d*'?/i,
  /'\s*(OR|AND)\s+'[^']*'\s*=\s*'[^']*'/i,
  /UNION\s+(ALL\s+)?SELECT/i,
];

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(load|error|click|mouseover|focus|blur|submit|change|input|keydown|keyup|keypress)\s*=/i,
  /data\s*:\s*text\/html/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
];

function containsMaliciousPatterns(value: string): string | null {
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(value)) return "sql_injection";
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) return "xss";
  }
  return null;
}

function checkObjectForThreats(obj: unknown): string | null {
  if (typeof obj === "string") {
    return containsMaliciousPatterns(obj);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const threat = checkObjectForThreats(item);
      if (threat) return threat;
    }
  }
  if (obj && typeof obj === "object") {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const threat = checkObjectForThreats(value);
      if (threat) return threat;
    }
  }
  return null;
}

const SKIP_PATHS = ["/api/stripe/webhook", "/api/analyze-document", "/api/taxgpt", "/api/analyze"];

export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (SKIP_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

  const bodyThreat = checkObjectForThreats(req.body);
  if (bodyThreat) {
    logger.warn({ ip, path: req.path, threatType: bodyThreat }, "Blocked malicious input in body");
    res.status(400).json({ error: "Invalid input detected" });
    return;
  }

  const queryThreat = checkObjectForThreats(req.query);
  if (queryThreat) {
    logger.warn({ ip, path: req.path, threatType: queryThreat }, "Blocked malicious input in query");
    res.status(400).json({ error: "Invalid input detected" });
    return;
  }

  const paramsThreat = checkObjectForThreats(req.params);
  if (paramsThreat) {
    logger.warn({ ip, path: req.path, threatType: paramsThreat }, "Blocked malicious input in params");
    res.status(400).json({ error: "Invalid input detected" });
    return;
  }

  next();
};
