import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { alertsTable, alertHistoryTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, gte, sql, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import { CircuitBreaker, registerCircuit } from "../lib/circuitBreaker";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import { isPromoActive } from "../lib/userDailyLimits";
import { sendPushNotificationToUser } from "./push";
import { getAuth } from "@clerk/express";
import { validateBody, validateQuery, validateParams, PaginationQuerySchema, IntIdParamsSchema, z } from "../lib/validateRequest";

const router = Router();

function flushSseResponse(res: Response): void {
  const r = res as unknown as { flush?: () => void };
  if (typeof r.flush === "function") r.flush();
}

const ALERT_TYPES = [
  "price_above",
  "price_below",
  "rsi_oversold",
  "rsi_overbought",
  "macd_crossover",
  "bollinger_breakout",
] as const;

type AlertType = (typeof ALERT_TYPES)[number];

function isValidAlertType(t: string): t is AlertType {
  return (ALERT_TYPES as readonly string[]).includes(t);
}

const FREE_DAILY_LIMIT = 10;

async function getUserTier(userId: string): Promise<string> {
  const [user] = await db
    .select({ tier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId));
  return user?.tier || "free";
}

async function getDailyAlertCount(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [result] = await db
    .select({ c: count() })
    .from(alertHistoryTable)
    .where(
      and(
        eq(alertHistoryTable.userId, userId),
        gte(alertHistoryTable.triggeredAt, todayStart)
      )
    );
  return result?.c || 0;
}

router.get("/alerts", requireAuth, validateQuery(PaginationQuerySchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };

    const [totalResult] = await db
      .select({ c: count() })
      .from(alertsTable)
      .where(eq(alertsTable.userId, userId));

    const rows = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.userId, userId))
      .orderBy(desc(alertsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const tier = await getUserTier(userId);
    const dailyCount = await getDailyAlertCount(userId);
    res.json({
      alerts: rows,
      total: totalResult?.c || 0,
      limit,
      offset,
      tier,
      dailyLimit: tier === "free" ? FREE_DAILY_LIMIT : null,
      dailyUsed: dailyCount,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch alerts");
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

const ALERT_TYPES_TUPLE = [...ALERT_TYPES] as [string, ...string[]];

const AlertCreateSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z0-9.]{1,10}$/, "Invalid symbol"),
  alertType: z.enum(ALERT_TYPES_TUPLE as [string, ...string[]]),
  threshold: z.number().optional(),
});

const AlertPatchSchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().optional(),
  alertType: z.enum(ALERT_TYPES_TUPLE as [string, ...string[]]).optional(),
});

const AlertMarkReadSchema = z.object({
  ids: z.array(z.number().int().positive()).max(500).optional(),
});

const DigestPreferenceSchema = z.object({
  frequency: z.enum(["off", "daily", "weekly"]),
});

router.post("/alerts", requireAuth, validateBody(AlertCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { symbol, alertType, threshold } = req.body;
  const sanitizedSymbol = String(symbol).toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 10);
  if (!sanitizedSymbol) {
    res.status(400).json({ error: "Invalid symbol" });
    return;
  }
  try {
    const existingCount = await db
      .select({ c: count() })
      .from(alertsTable)
      .where(eq(alertsTable.userId, userId));
    const tier = await getUserTier(userId);
    if (tier === "free" && !isPromoActive() && (existingCount[0]?.c || 0) >= 20) {
      res.status(403).json({ error: "Free tier limited to 20 alert rules. Upgrade to Pro for unlimited." });
      return;
    }
    const [alert] = await db
      .insert(alertsTable)
      .values({
        userId,
        symbol: sanitizedSymbol,
        alertType,
        threshold: threshold != null ? Number(threshold) : null,
        enabled: true,
      })
      .returning();
    res.status(201).json(alert);
  } catch (err) {
    logger.error({ err }, "Failed to create alert");
    res.status(500).json({ error: "Failed to create alert" });
  }
});

router.patch("/alerts/:id", requireAuth, validateParams(IntIdParamsSchema), validateBody(AlertPatchSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const alertId = req.params.id as unknown as number;
  const { enabled, threshold, alertType } = req.body;
  try {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof enabled === "boolean") patch.enabled = enabled;
    if (threshold != null) patch.threshold = Number(threshold);
    if (alertType && isValidAlertType(alertType)) patch.alertType = alertType;
    const [updated] = await db
      .update(alertsTable)
      .set(patch)
      .where(and(eq(alertsTable.id, alertId), eq(alertsTable.userId, userId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update alert");
    res.status(500).json({ error: "Failed to update alert" });
  }
});

router.delete("/alerts/:id", requireAuth, validateParams(IntIdParamsSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const alertId = req.params.id as unknown as number;
  try {
    const [deleted] = await db
      .delete(alertsTable)
      .where(and(eq(alertsTable.id, alertId), eq(alertsTable.userId, userId)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete alert");
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

router.get("/alerts/history", requireAuth, validateQuery(PaginationQuerySchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const rows = await db
      .select()
      .from(alertHistoryTable)
      .where(
        and(
          eq(alertHistoryTable.userId, userId),
          gte(alertHistoryTable.triggeredAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(alertHistoryTable.triggeredAt))
      .limit(limit)
      .offset(offset);
    const [totalResult] = await db
      .select({ c: count() })
      .from(alertHistoryTable)
      .where(
        and(
          eq(alertHistoryTable.userId, userId),
          gte(alertHistoryTable.triggeredAt, thirtyDaysAgo)
        )
      );
    res.json({ history: rows, total: totalResult?.c || 0, limit, offset });
  } catch (err) {
    logger.error({ err }, "Failed to fetch alert history");
    res.status(500).json({ error: "Failed to fetch alert history" });
  }
});

router.get("/alerts/unread-count", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [result] = await db
      .select({ c: count() })
      .from(alertHistoryTable)
      .where(and(eq(alertHistoryTable.userId, userId), eq(alertHistoryTable.read, false)));
    res.json({ count: result?.c || 0 });
  } catch (err) {
    logger.error({ err }, "Failed to fetch unread count");
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

router.post("/alerts/mark-read", requireAuth, validateBody(AlertMarkReadSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { ids } = req.body;
    if (Array.isArray(ids) && ids.length > 0) {
      for (const id of ids) {
        await db
          .update(alertHistoryTable)
          .set({ read: true })
          .where(and(eq(alertHistoryTable.id, Number(id)), eq(alertHistoryTable.userId, userId)));
      }
    } else {
      await db
        .update(alertHistoryTable)
        .set({ read: true })
        .where(eq(alertHistoryTable.userId, userId));
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to mark alerts read");
    res.status(500).json({ error: "Failed to mark alerts read" });
  }
});

const sseClients = new Map<string, Set<Response>>();

router.get("/alerts/stream", (req: Request, res: Response) => {
  const { userId } = getAuth(req);

  if (!userId) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write(`event: auth_error\ndata: ${JSON.stringify({ type: "auth_error", message: "Token expired or missing. Please refresh and reconnect." })}\n\n`);
    flushSseResponse(res);
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("data: {\"type\":\"connected\"}\n\n");
  flushSseResponse(res);

  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(userId);
    }
  });
});

export function pushAlertToUser(userId: string, data: Record<string, unknown>) {
  const clients = sseClients.get(userId);
  if (clients) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      try { res.write(payload); } catch { /* client gone */ }
    }
  }

  sendPushNotificationToUser(userId, {
    title: (data.symbol as string) ? `Alert: ${data.symbol}` : "Market Alert",
    body: (data.message as string) || "A market alert has been triggered.",
    icon: "/icons/icon-192.png",
    url: "/alerts",
  }).catch((err) => { logger.error({ err }, "Failed to send push notification for alert"); });
}

const ALPACA_DATA_URL = "https://data.alpaca.markets";

const alertsAlpacaCircuit = new CircuitBreaker({
  name: "alerts-alpaca",
  failureThreshold: 5,
  resetTimeMs: 60_000,
});
registerCircuit(alertsAlpacaCircuit);

function alpacaHeaders() {
  const keyId = process.env.ALPACA_KEY_ID || process.env.ALPACA_API_KEY || "";
  const secret = process.env.ALPACA_API_SECRET || "";
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secret,
    Accept: "application/json",
  };
}

async function fetchSnapshots(symbols: string[]): Promise<Record<string, SnapshotData>> {
  if (symbols.length === 0) return {};
  try {
    return await alertsAlpacaCircuit.execute(
      () =>
        retryWithBackoff(async () => {
          const url = `${ALPACA_DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols.join(","))}`;
          const res = await fetch(url, { headers: alpacaHeaders() });
          if (!res.ok) throw new Error(`Alpaca snapshots ${res.status}`);
          return (await res.json()) as Record<string, SnapshotData>;
        }, { label: "alpaca-alerts-snapshots", maxRetries: 4 })
    );
  } catch {
    return {};
  }
}

interface SnapshotData {
  latestTrade?: { p: number };
  minuteBar?: { c: number; o: number; h: number; l: number; v: number };
  dailyBar?: { c: number; o: number; h: number; l: number; v: number };
  prevDailyBar?: { c: number };
}

function computeRSI(closes: number[]): number {
  if (closes.length < 15) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - 14; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeMACD(closes: number[]): { macd: number; signal: number } {
  if (closes.length < 26) return { macd: 0, signal: 0 };
  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    let val = data[0];
    for (let i = 1; i < data.length; i++) {
      val = data[i] * k + val * (1 - k);
    }
    return val;
  };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdVal = ema12 - ema26;
  return { macd: macdVal, signal: macdVal * 0.8 };
}

function computeBollinger(closes: number[]): { upper: number; lower: number; price: number } {
  if (closes.length < 20) return { upper: 0, lower: 0, price: closes[closes.length - 1] || 0 };
  const recent = closes.slice(-20);
  const mean = recent.reduce((a, b) => a + b, 0) / 20;
  const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / 20;
  const stddev = Math.sqrt(variance);
  return {
    upper: mean + 2 * stddev,
    lower: mean - 2 * stddev,
    price: closes[closes.length - 1],
  };
}

async function fetchBars(symbol: string): Promise<number[]> {
  try {
    return await alertsAlpacaCircuit.execute(
      () =>
        retryWithBackoff(async () => {
          const url = `${ALPACA_DATA_URL}/v2/stocks/${symbol}/bars?timeframe=1Day&limit=30&adjustment=split&feed=iex&sort=asc`;
          const res = await fetch(url, { headers: alpacaHeaders() });
          if (!res.ok) throw new Error(`Alpaca bars ${res.status}`);
          const data = (await res.json()) as { bars?: Array<{ c: number }> };
          return (data.bars || []).map((b) => b.c);
        }, { label: "alpaca-alerts-bars", maxRetries: 4 })
    );
  } catch {
    return [];
  }
}

async function evaluateAlerts() {
  try {
    const activeAlerts = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.enabled, true));

    if (activeAlerts.length === 0) return;

    const symbolSet = new Set(activeAlerts.map((a) => a.symbol));
    const symbols = [...symbolSet];

    const snapshots = await fetchSnapshots(symbols);

    const barsCache = new Map<string, number[]>();

    for (const alert of activeAlerts) {
      const snap = snapshots[alert.symbol];
      if (!snap) continue;

      const price = snap.latestTrade?.p || snap.minuteBar?.c || snap.dailyBar?.c || 0;
      if (price === 0) continue;

      let triggered = false;
      let triggeredValue = price;
      let message = "";

      switch (alert.alertType) {
        case "price_above":
          if (alert.threshold && price >= alert.threshold) {
            triggered = true;
            message = `${alert.symbol} price $${price.toFixed(2)} crossed above $${alert.threshold.toFixed(2)}`;
          }
          break;
        case "price_below":
          if (alert.threshold && price <= alert.threshold) {
            triggered = true;
            message = `${alert.symbol} price $${price.toFixed(2)} dropped below $${alert.threshold.toFixed(2)}`;
          }
          break;
        case "rsi_oversold":
        case "rsi_overbought": {
          if (!barsCache.has(alert.symbol)) {
            barsCache.set(alert.symbol, await fetchBars(alert.symbol));
          }
          const closes = barsCache.get(alert.symbol) || [];
          const rsi = computeRSI(closes);
          triggeredValue = rsi;
          if (alert.alertType === "rsi_oversold" && rsi < 30) {
            triggered = true;
            message = `${alert.symbol} RSI at ${rsi.toFixed(1)} — oversold territory`;
          }
          if (alert.alertType === "rsi_overbought" && rsi > 70) {
            triggered = true;
            message = `${alert.symbol} RSI at ${rsi.toFixed(1)} — overbought territory`;
          }
          break;
        }
        case "macd_crossover": {
          if (!barsCache.has(alert.symbol)) {
            barsCache.set(alert.symbol, await fetchBars(alert.symbol));
          }
          const closes = barsCache.get(alert.symbol) || [];
          const { macd, signal } = computeMACD(closes);
          triggeredValue = macd;
          if (macd > signal && Math.abs(macd - signal) > 0.01) {
            triggered = true;
            message = `${alert.symbol} MACD bullish crossover detected (MACD: ${macd.toFixed(3)})`;
          }
          break;
        }
        case "bollinger_breakout": {
          if (!barsCache.has(alert.symbol)) {
            barsCache.set(alert.symbol, await fetchBars(alert.symbol));
          }
          const closes = barsCache.get(alert.symbol) || [];
          const { upper, lower, price: bbPrice } = computeBollinger(closes);
          triggeredValue = bbPrice;
          if (bbPrice > upper) {
            triggered = true;
            message = `${alert.symbol} broke above Bollinger upper band ($${upper.toFixed(2)})`;
          } else if (bbPrice < lower) {
            triggered = true;
            message = `${alert.symbol} broke below Bollinger lower band ($${lower.toFixed(2)})`;
          }
          break;
        }
      }

      if (triggered) {
        const tier = await getUserTier(alert.userId);
        if (tier === "free" && !isPromoActive()) {
          const dailyCount = await getDailyAlertCount(alert.userId);
          if (dailyCount >= FREE_DAILY_LIMIT) continue;
        }

        const recentDupe = await db
          .select({ id: alertHistoryTable.id })
          .from(alertHistoryTable)
          .where(
            and(
              eq(alertHistoryTable.alertId, alert.id),
              gte(alertHistoryTable.triggeredAt, new Date(Date.now() - 5 * 60 * 1000))
            )
          )
          .limit(1);

        if (recentDupe.length > 0) continue;

        const [histEntry] = await db
          .insert(alertHistoryTable)
          .values({
            userId: alert.userId,
            alertId: alert.id,
            symbol: alert.symbol,
            alertType: alert.alertType,
            triggeredValue,
            message,
            read: false,
          })
          .returning();

        pushAlertToUser(alert.userId, {
          type: "alert",
          id: histEntry.id,
          symbol: alert.symbol,
          alertType: alert.alertType,
          triggeredValue,
          message,
          triggeredAt: histEntry.triggeredAt?.toISOString(),
        });

        sendZapierWebhook("alert_triggered", {
          userId: alert.userId,
          alertType: alert.alertType,
          symbol: alert.symbol,
          condition: message,
          triggeredValue,
        }).catch(err => logger.warn({ err, userId: alert.userId, alertType: alert.alertType, symbol: alert.symbol }, 'Failed to send alert_triggered Zapier webhook'));
      }
    }
  } catch (err) {
    logger.error({ err }, "Alert evaluation cycle error");
  }
}

let evaluationInterval: ReturnType<typeof setInterval> | null = null;

router.get("/alerts/digest-preference", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [user] = await db
      .select({ alertEmailDigest: usersTable.alertEmailDigest })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));
    res.json({ digestFrequency: user?.alertEmailDigest || "off" });
  } catch (err) {
    logger.error({ err }, "Failed to get digest preference");
    res.status(500).json({ error: "Failed to get digest preference" });
  }
});

router.patch("/alerts/digest-preference", requireAuth, validateBody(DigestPreferenceSchema), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { frequency } = req.body;
  try {
    await db
      .update(usersTable)
      .set({ alertEmailDigest: frequency, updatedAt: new Date() })
      .where(eq(usersTable.clerkId, userId));
    res.json({ success: true, digestFrequency: frequency });
  } catch (err) {
    logger.error({ err }, "Failed to update digest preference");
    res.status(500).json({ error: "Failed to update digest preference" });
  }
});

export function startAlertEvaluator() {
  if (evaluationInterval) return;
  logger.info("Starting alert evaluation engine (60s interval)");
  evaluationInterval = setInterval(evaluateAlerts, 60_000);
  setTimeout(evaluateAlerts, 5_000);
}

export function stopAlertEvaluator() {
  if (evaluationInterval) {
    clearInterval(evaluationInterval);
    evaluationInterval = null;
  }
}

export default router;
