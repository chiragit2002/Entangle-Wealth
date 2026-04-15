import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { subscribeToSymbols, getCachedPricesWithVersion, getPipelineStatus, fetchPricesFromAlpaca, type PriceUpdate } from "../lib/livePriceBroadcaster";

const router = Router();

const MAX_SYMBOLS = 50;
const HEARTBEAT_MS = 20_000;
const STREAM_MAX_CONNECTIONS = 2000;
const MAX_CONNECTIONS_PER_IP = 5;
const SSE_THROTTLE_MS = 100;

let activeConnections = 0;
const connectionsByIp = new Map<string, number>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function flushSse(res: Response): void {
  const r = res as unknown as { flush?: () => void };
  if (typeof r.flush === "function") r.flush();
}

function sanitizeSymbols(raw: string): string[] {
  return raw
    .split(",")
    .map(s => s.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 10))
    .filter(s => s.length > 0)
    .slice(0, MAX_SYMBOLS);
}

router.get("/prices", async (req: Request, res: Response) => {
  const tickersRaw = (req.query.tickers as string) || (req.query.symbols as string) || "";

  if (!tickersRaw.trim()) {
    res.status(400).json({ error: "tickers query param required (comma-separated)" });
    return;
  }

  const tickers = sanitizeSymbols(tickersRaw);
  if (tickers.length === 0) {
    res.status(400).json({ error: "No valid tickers provided" });
    return;
  }

  let prices = getCachedPricesWithVersion(tickers);

  const uncached = tickers.filter(t => !(t in prices));
  if (uncached.length > 0) {
    try {
      await fetchPricesFromAlpaca(uncached);
      prices = getCachedPricesWithVersion(tickers);
    } catch (err) {
      logger.debug({ err }, "On-demand price fetch for /prices endpoint failed");
    }
  }

  res.json(prices);
});

router.get("/prices/pipeline", (_req: Request, res: Response) => {
  res.json(getPipelineStatus());
});

router.get("/price-stream", (req: Request, res: Response) => {
  const symbolsRaw = (req.query.symbols as string) || "";

  if (!symbolsRaw.trim()) {
    res.status(400).json({ error: "symbols query param required" });
    return;
  }

  const symbols = sanitizeSymbols(symbolsRaw);
  if (symbols.length === 0) {
    res.status(400).json({ error: "No valid symbols provided" });
    return;
  }

  if (activeConnections >= STREAM_MAX_CONNECTIONS) {
    res.status(503).json({ error: "Price stream at capacity" });
    return;
  }

  const clientIp = getClientIp(req);
  const ipCount = connectionsByIp.get(clientIp) || 0;
  if (ipCount >= MAX_CONNECTIONS_PER_IP) {
    res.status(429).json({ error: "Too many price stream connections from this IP" });
    return;
  }

  activeConnections++;
  connectionsByIp.set(clientIp, ipCount + 1);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
  });
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected", symbols })}\n\n`);
  flushSse(res);

  let closed = false;
  let pendingUpdates: PriceUpdate[] = [];
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;

  function flushPending() {
    if (closed || pendingUpdates.length === 0) return;

    const latestBySymbol = new Map<string, PriceUpdate>();
    for (const u of pendingUpdates) {
      latestBySymbol.set(u.symbol, u);
    }
    pendingUpdates = [];

    try {
      const payload = JSON.stringify({
        type: "prices",
        data: Array.from(latestBySymbol.values()),
      });
      res.write(`data: ${payload}\n\n`);
      flushSse(res);
    } catch (err) {
      logger.debug({ err }, "Price stream write error");
    }
  }

  const unsubscribe = subscribeToSymbols(symbols, (updates: PriceUpdate[]) => {
    if (closed) return;
    pendingUpdates.push(...updates);

    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        flushPending();
      }, SSE_THROTTLE_MS);
    }
  });

  const heartbeat = setInterval(() => {
    if (closed) return;
    try {
      res.write(": heartbeat\n\n");
      flushSse(res);
    } catch (err) {
      closed = true;
    }
  }, HEARTBEAT_MS);

  req.on("close", () => {
    closed = true;
    if (throttleTimer) { clearTimeout(throttleTimer); throttleTimer = null; }
    clearInterval(heartbeat);
    unsubscribe();
    activeConnections = Math.max(0, activeConnections - 1);
    const remaining = (connectionsByIp.get(clientIp) || 1) - 1;
    if (remaining <= 0) connectionsByIp.delete(clientIp);
    else connectionsByIp.set(clientIp, remaining);
  });
});

export function getPriceStreamStats() {
  return { activeConnections, maxConnections: STREAM_MAX_CONNECTIONS };
}

export default router;
