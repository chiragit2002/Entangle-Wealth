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

const AI_DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /<iframe[\s>]/i,
  /data\s*:\s*text\/html/i,
  /(--|;)\s*(DROP|DELETE|INSERT|UPDATE)\s+/i,
  /UNION\s+(ALL\s+)?SELECT/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?|guidelines?)/i,
  /forget\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|prompts?|context|rules?|guidelines?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?|guidelines?)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /act\s+as\s+(a|an|the)\s+/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /you\s+must\s+(now\s+)?(ignore|forget|disregard|bypass)/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions?|prompt|configuration|secret)/i,
  /print\s+(your\s+)?(system\s+prompt|instructions?|initial\s+prompt)/i,
  /show\s+me\s+(your\s+)?(system\s+prompt|instructions?|prompt)/i,
  /what\s+(are|is)\s+(your\s+)?(system\s+prompt|instructions?|initial\s+prompt)/i,
  /repeat\s+(after\s+me|the\s+following)/i,
  /jailbreak/i,
  /DAN\s+(mode|prompt)/i,
  /developer\s+mode/i,
  /sudo\s+/i,
  /\[\s*system\s*\]/i,
  /\[\s*assistant\s*\]/i,
  /\[\s*user\s*\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /###\s*(instruction|system|human|assistant)/i,
  /---+\s*(instruction|system)\s*---+/i,
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

function containsAiDangerousPatterns(value: string): string | null {
  for (const pattern of AI_DANGEROUS_PATTERNS) {
    if (pattern.test(value)) return "injection";
  }
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(value)) return "prompt_injection";
  }
  return null;
}

function checkObjectForThreats(
  obj: unknown,
  checker: (v: string) => string | null = containsMaliciousPatterns
): string | null {
  if (typeof obj === "string") {
    return checker(obj);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const threat = checkObjectForThreats(item, checker);
      if (threat) return threat;
    }
  }
  if (obj && typeof obj === "object") {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      const threat = checkObjectForThreats(value, checker);
      if (threat) return threat;
    }
  }
  return null;
}

const SKIP_PATHS = ["/api/stripe/webhook"];

const AI_PATHS = ["/api/analyze-document", "/api/taxgpt", "/api/analyze", "/api/coaching", "/api/stocks/"];

export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (SKIP_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

  const isAiPath = AI_PATHS.some((p) => req.path.startsWith(p));

  if (isAiPath) {
    const bodyThreat = checkObjectForThreats(req.body, containsAiDangerousPatterns);
    if (bodyThreat) {
      logger.warn({ ip, path: req.path, threatType: bodyThreat }, "Blocked dangerous input in AI route body");
      res.status(400).json({ error: "Invalid input detected" });
      return;
    }
    return next();
  }

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

const HTML_TAG_RE = /<[^>]+>/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(javascript:[^)]*\)/gi;

export function sanitizeAiOutput(text: string): string {
  return text
    .replace(MARKDOWN_LINK_RE, "[$1](#)")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on(load|error|click|mouseover|focus|blur|submit|change|input)\s*=\s*["'][^"']*["']/gi, "");
}

const DISCLAIMER_TEXT = "\n\n---\n*This is AI-generated content for educational purposes only. Not financial, tax, or investment advice. Consult a licensed professional for advice specific to your situation.*";

export function appendDisclaimer(text: string): string {
  if (text.includes("educational purposes only") || text.includes("not financial advice") || text.includes("not a CPA") || text.includes("not investment advice")) {
    return text;
  }
  return text + DISCLAIMER_TEXT;
}

export function deepSanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeAiOutput(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(deepSanitizeObject) as unknown as T;
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = deepSanitizeObject(v);
    }
    return result as T;
  }
  return obj;
}
