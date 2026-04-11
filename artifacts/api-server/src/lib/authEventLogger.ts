import { logger } from "./logger";

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "oauth_callback"
  | "token_refresh"
  | "signup"
  | "auth_check_failed";

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

export function logAuthEvent(event: Omit<AuthEvent, "timestamp">): void {
  const fullEvent: AuthEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  authEvents.push(fullEvent);

  if (authEvents.length > MAX_EVENTS) {
    authEvents.splice(0, authEvents.length - MAX_EVENTS);
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
