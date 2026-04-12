import { logger } from "./logger";

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "oauth_callback"
  | "token_refresh"
  | "signup"
  | "auth_check_failed"
  | "security_self_test";

const SENSITIVE_ENDPOINTS = [
  "/api/kyc/submit",
  "/api/kyc/approve",
  "/api/kyc/reject",
  "/api/token/admin",
  "/api/security/dashboard",
  "/api/security/alerts",
  "/api/taxgpt",
  "/api/analyze",
  "/api/analyze-document",
  "/api/paper-trading/trade",
];

const SENSITIVE_ENDPOINT_WINDOW_MS = 60_000;
const SENSITIVE_ENDPOINT_THRESHOLD = 30;

interface EndpointAccessRecord {
  count: number;
  firstAt: number;
  flaggedAt: number | null;
}

const sensitiveEndpointAccess = new Map<string, EndpointAccessRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of sensitiveEndpointAccess) {
    if (now - record.firstAt > SENSITIVE_ENDPOINT_WINDOW_MS * 2) {
      sensitiveEndpointAccess.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function trackSensitiveEndpointAccess(userId: string | undefined, ip: string, path: string): void {
  const normalizedPath = path.replace(/\/[0-9a-f-]{8,}$/i, "/:id");
  const isSensitive = SENSITIVE_ENDPOINTS.some(ep => normalizedPath.startsWith(ep));
  if (!isSensitive) return;

  const actor = userId ?? `ip:${ip}`;
  const key = `sensitive:${actor}:${normalizedPath}`;
  const now = Date.now();
  let record = sensitiveEndpointAccess.get(key);

  if (!record || now - record.firstAt > SENSITIVE_ENDPOINT_WINDOW_MS) {
    sensitiveEndpointAccess.set(key, { count: 1, firstAt: now, flaggedAt: null });
    return;
  }

  record.count++;

  if (record.count >= SENSITIVE_ENDPOINT_THRESHOLD && record.flaggedAt === null) {
    record.flaggedAt = now;
    pushSecurityAlert({
      type: "suspicious_endpoint",
      ip,
      userId,
      count: record.count,
      window: "1 minute",
      detectedAt: new Date().toISOString(),
      details: { endpoint: normalizedPath, threshold: SENSITIVE_ENDPOINT_THRESHOLD },
    });
  }
}

interface AuthEvent {
  type: AuthEventType;
  userId?: string;
  ip: string;
  method: string;
  path: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

const MAX_EVENTS = 10000;
const authEvents: AuthEvent[] = [];

const ANOMALY_WINDOW_MS = 5 * 60 * 1000;
const FAILURE_THRESHOLD = 20;
const REQUEST_VOLUME_THRESHOLD = 300;

interface IpFailureRecord {
  count: number;
  firstAt: number;
  flaggedAt: number | null;
}

interface UserRequestRecord {
  count: number;
  firstAt: number;
  flaggedAt: number | null;
}

const ipFailures = new Map<string, IpFailureRecord>();
const userRequests = new Map<string, UserRequestRecord>();

const MAX_ANOMALY_RECORDS = 5000;
const ANOMALY_CLEANUP_INTERVAL = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipFailures) {
    if (now - record.firstAt > ANOMALY_WINDOW_MS * 2) ipFailures.delete(key);
  }
  for (const [key, record] of userRequests) {
    if (now - record.firstAt > ANOMALY_WINDOW_MS * 2) userRequests.delete(key);
  }
}, ANOMALY_CLEANUP_INTERVAL);

export interface SecurityAlert {
  type: "repeated_auth_failures" | "unusual_request_volume" | "suspicious_endpoint";
  ip?: string;
  userId?: string;
  count: number;
  window: string;
  detectedAt: string;
  details?: Record<string, unknown>;
}

const MAX_SECURITY_ALERTS = 1000;
const securityAlerts: SecurityAlert[] = [];

function pushSecurityAlert(alert: SecurityAlert): void {
  securityAlerts.push(alert);
  if (securityAlerts.length > MAX_SECURITY_ALERTS) {
    securityAlerts.splice(0, securityAlerts.length - MAX_SECURITY_ALERTS);
  }
  logger.warn({ securityAlert: alert }, `Security alert: ${alert.type}`);
}

function trackIpFailure(ip: string, eventType: AuthEventType): void {
  if (eventType !== "login_failed" && eventType !== "auth_check_failed") return;

  const now = Date.now();
  let record = ipFailures.get(ip);

  if (!record || now - record.firstAt > ANOMALY_WINDOW_MS) {
    if (ipFailures.size >= MAX_ANOMALY_RECORDS) {
      const oldestKey = ipFailures.keys().next().value;
      if (oldestKey !== undefined) ipFailures.delete(oldestKey);
    }
    record = { count: 1, firstAt: now, flaggedAt: null };
    ipFailures.set(ip, record);
    return;
  }

  record.count++;

  if (record.count >= FAILURE_THRESHOLD && record.flaggedAt === null) {
    record.flaggedAt = now;
    pushSecurityAlert({
      type: "repeated_auth_failures",
      ip,
      count: record.count,
      window: "5 minutes",
      detectedAt: new Date().toISOString(),
      details: { threshold: FAILURE_THRESHOLD },
    });
  }
}

export function trackUserRequest(userId: string, path: string): void {
  const now = Date.now();
  let record = userRequests.get(userId);

  if (!record || now - record.firstAt > ANOMALY_WINDOW_MS) {
    if (userRequests.size >= MAX_ANOMALY_RECORDS) {
      const oldestKey = userRequests.keys().next().value;
      if (oldestKey !== undefined) userRequests.delete(oldestKey);
    }
    record = { count: 1, firstAt: now, flaggedAt: null };
    userRequests.set(userId, record);
    return;
  }

  record.count++;

  if (record.count >= REQUEST_VOLUME_THRESHOLD && record.flaggedAt === null) {
    record.flaggedAt = now;
    pushSecurityAlert({
      type: "unusual_request_volume",
      userId,
      count: record.count,
      window: "5 minutes",
      detectedAt: new Date().toISOString(),
      details: { threshold: REQUEST_VOLUME_THRESHOLD, lastPath: path },
    });
  }
}

export function logAuthEvent(event: Omit<AuthEvent, "timestamp">): void {
  const fullEvent: AuthEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  authEvents.push(fullEvent);

  if (authEvents.length > MAX_EVENTS) {
    authEvents.splice(0, authEvents.length - MAX_EVENTS);
  }

  trackIpFailure(event.ip, event.type);
  if (event.userId) {
    trackUserRequest(event.userId, event.path);
  }

  logger.info(
    {
      authEvent: fullEvent.type,
      userId: fullEvent.userId,
      ip: fullEvent.ip,
      method: fullEvent.method,
      path: fullEvent.path,
    },
    `Auth event: ${fullEvent.type}`,
  );
}

export function getRecentAuthEvents(limit = 100): AuthEvent[] {
  return authEvents.slice(-limit).reverse();
}

export function getAuthEventStats(): {
  total: number;
  byType: Record<string, number>;
  last24h: number;
} {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const byType: Record<string, number> = {};
  let last24h = 0;

  for (const event of authEvents) {
    byType[event.type] = (byType[event.type] || 0) + 1;
    if (new Date(event.timestamp).getTime() > dayAgo) {
      last24h++;
    }
  }

  return { total: authEvents.length, byType, last24h };
}

export function getSecurityAlerts(limit = 50): SecurityAlert[] {
  return securityAlerts.slice(-limit).reverse();
}

export function getSecuritySummary(): {
  totalAlerts: number;
  alertsByType: Record<string, number>;
  last1h: number;
  recentAlerts: SecurityAlert[];
  suspiciousIps: { ip: string; failureCount: number }[];
  highVolumeUsers: { userId: string; requestCount: number }[];
} {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  const alertsByType: Record<string, number> = {};
  let last1h = 0;

  for (const alert of securityAlerts) {
    alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    if (new Date(alert.detectedAt).getTime() > hourAgo) last1h++;
  }

  const suspiciousIps = Array.from(ipFailures.entries())
    .filter(([, r]) => r.count >= 5)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([ip, r]) => ({ ip, failureCount: r.count }));

  const highVolumeUsers = Array.from(userRequests.entries())
    .filter(([, r]) => r.count >= 50)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([userId, r]) => ({ userId, requestCount: r.count }));

  return {
    totalAlerts: securityAlerts.length,
    alertsByType,
    last1h,
    recentAlerts: securityAlerts.slice(-10).reverse(),
    suspiciousIps,
    highVolumeUsers,
  };
}
