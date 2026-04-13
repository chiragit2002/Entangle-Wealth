import { Router, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/requireAuth";
import { validateParams, validateQuery, z } from "../lib/validateRequest";
import { TTLCache } from "../lib/cache";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import { alpacaCircuit } from "../lib/circuitBreaker";
import { BoundedRateLimitMap } from "../lib/boundedMap";

const AlpacaSymbolParamsSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]+$/),
});

const AlpacaSymbolsQuerySchema = z.object({
  symbols: z.string().min(1).max(500),
});

const AlpacaBarsParamsSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]+$/),
});

const AlpacaBarsQuerySchema = z.object({
  timeframe: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  start: z.string().datetime({ offset: true }).optional(),
  end: z.string().datetime({ offset: true }).optional(),
});

const AlpacaMultiBarsQuerySchema = z.object({
  symbols: z.string().min(1).max(500),
  timeframe: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const alpacaCache = new TTLCache(60_000, 300);

const router = Router();

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

const rateLimitMap = new BoundedRateLimitMap(5_000, "alpaca-rateLimit");
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;

function alpacaRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    return;
  }
  next();
}

router.use("/alpaca", alpacaRateLimit);

function resolveAlpacaCreds() {
  const candidates = [
    process.env.ALPACA_KEY_ID || "",
    process.env.ALPACA_API_KEY || "",
    process.env.ALPACA_API_SECRET || "",
  ].filter(Boolean);
  const pk = candidates.find(v => v.startsWith("PK")) || candidates[0] || "";
  const secret = candidates.find(v => !v.startsWith("PK") && v.length > 30) || candidates[1] || "";
  return { keyId: pk, secretKey: secret };
}

let _logged = false;
function alpacaHeaders() {
  const { keyId, secretKey } = resolveAlpacaCreds();
  if (!_logged) {
    logger.info({ keyLen: keyId.length, secretLen: secretKey.length, keyPrefix: keyId.slice(0, 3) }, "Alpaca credentials resolved");
    _logged = true;
  }
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secretKey,
    "Accept": "application/json",
  };
}

async function alpacaFetchRaw(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body, url }, "Alpaca API error");
    throw new Error(`Alpaca ${res.status}: ${body}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function alpacaFetch(url: string, cacheKey?: string): Promise<Record<string, unknown>> {
  return alpacaCircuit.execute<Record<string, unknown>>(
    () => retryWithBackoff(() => alpacaFetchRaw(url), { label: "alpaca", maxRetries: 4 }),
    cacheKey
      ? () => {
          const cached = alpacaCache.get(cacheKey) as Record<string, unknown> | undefined;
          if (cached) return cached;
          throw new Error("Alpaca circuit open and no cached data available");
        }
      : undefined,
  );
}

router.get("/alpaca/snapshot/:symbol", validateParams(AlpacaSymbolParamsSchema), async (req, res) => {
  try {
    const symbol = (req.params.symbol as string).toUpperCase();
    const cacheKey = `snapshot:${symbol}`;
    const cached = alpacaCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/snapshot`,
      cacheKey
    );
    alpacaCache.set(cacheKey, data);
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca snapshot fetch failed");
    res.status(502).json({ error: "Failed to fetch snapshot" });
  }
});

router.get("/alpaca/snapshots", validateQuery(AlpacaSymbolsQuerySchema), async (req, res) => {
  try {
    const symbols = (req.query.symbols as string) || "";
    if (!symbols) {
      res.status(400).json({ error: "symbols query param required" });
      return;
    }
    const cacheKey = `snapshots:${symbols}`;
    const cached = alpacaCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols)}`,
      cacheKey
    );
    alpacaCache.set(cacheKey, data);
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca snapshots fetch failed");
    res.status(502).json({ error: "Failed to fetch snapshots" });
  }
});

router.get("/alpaca/bars/:symbol", validateParams(AlpacaBarsParamsSchema), validateQuery(AlpacaBarsQuerySchema), async (req, res) => {
  try {
    const symbol = (req.params.symbol as string).toUpperCase();
    const timeframe = (req.query.timeframe as string) || "1Day";
    const { limit } = req.query as unknown as { limit: number };
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    let url = `${ALPACA_DATA_URL}/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}&adjustment=split&feed=iex&sort=asc`;
    if (start) url += `&start=${encodeURIComponent(start)}`;
    if (end) url += `&end=${encodeURIComponent(end)}`;

    const data = await alpacaFetch(url);
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca bars fetch failed");
    res.status(502).json({ error: "Failed to fetch bars" });
  }
});

router.get("/alpaca/quote/:symbol", validateParams(AlpacaSymbolParamsSchema), async (req, res) => {
  try {
    const symbol = (req.params.symbol as string).toUpperCase();
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/quotes/latest?feed=iex`
    );
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca quote fetch failed");
    res.status(502).json({ error: "Failed to fetch quote" });
  }
});

router.get("/alpaca/trades/:symbol", validateParams(AlpacaSymbolParamsSchema), async (req, res) => {
  try {
    const symbol = (req.params.symbol as string).toUpperCase();
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/trades/latest?feed=iex`
    );
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca trade fetch failed");
    res.status(502).json({ error: "Failed to fetch trade" });
  }
});

router.get("/alpaca/multibars", validateQuery(AlpacaMultiBarsQuerySchema), async (req, res) => {
  try {
    const symbols = (req.query.symbols as string) || "";
    const timeframe = (req.query.timeframe as string) || "1Day";
    const { limit } = req.query as unknown as { limit: number };
    if (!symbols) {
      res.status(400).json({ error: "symbols query param required" });
      return;
    }
    const url = `${ALPACA_DATA_URL}/v2/stocks/bars?symbols=${encodeURIComponent(symbols)}&timeframe=${timeframe}&limit=${limit}&adjustment=split&feed=iex&sort=asc`;
    const data = await alpacaFetch(url);
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca multi bars fetch failed");
    res.status(502).json({ error: "Failed to fetch multi bars" });
  }
});

router.get("/alpaca/account", requireAuth, async (req, res) => {
  try {
    const data = await alpacaFetch(`${ALPACA_PAPER_URL}/v2/account`);
    res.json({
      status: data.status,
      buying_power: data.buying_power,
      portfolio_value: data.portfolio_value,
      equity: data.equity,
      currency: data.currency,
    });
  } catch (err: any) {
    logger.error({ err }, "Alpaca account fetch failed");
    res.status(502).json({ error: "Failed to fetch account" });
  }
});

router.get("/alpaca/movers", async (req, res) => {
  try {
    const cacheKey = "alpaca:movers";
    const cached = alpacaCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const topSymbols = "AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,AMD,NFLX,RKLB,PLTR,SOFI,COIN,SMCI,ARM,AVGO,CRM,UBER,SHOP,SNOW,JPM,V,BA,CRWD,PANW,LLY,UNH,XOM,GS,RIVN";
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(topSymbols)}`
    );

    const entries = Object.entries(data as Record<string, any>).map(([symbol, snap]: [string, any]) => ({
      symbol,
      price: snap.minuteBar?.c || snap.dailyBar?.c || snap.latestTrade?.p || 0,
      change: snap.dailyBar ? ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o * 100) : 0,
      volume: snap.dailyBar?.v || snap.minuteBar?.v || 0,
      high: snap.dailyBar?.h || 0,
      low: snap.dailyBar?.l || 0,
      open: snap.dailyBar?.o || 0,
      prevClose: snap.prevDailyBar?.c || 0,
    }));

    entries.sort((a, b) => b.change - a.change);

    const result = {
      gainers: entries.filter(e => e.change > 0).slice(0, 10),
      losers: entries.filter(e => e.change < 0).sort((a, b) => a.change - b.change).slice(0, 10),
      mostActive: [...entries].sort((a, b) => b.volume - a.volume).slice(0, 10),
      all: entries,
    };
    alpacaCache.set(cacheKey, result);
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, "Alpaca movers fetch failed");
    res.status(502).json({ error: "Failed to fetch movers" });
  }
});

const AlpacaOrderSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]+$/),
  qty: z.coerce.number().int().min(1).max(10000),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit"]).optional(),
  limit_price: z.coerce.number().min(0).optional(),
});

async function alpacaPost(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { ...alpacaHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text, url }, "Alpaca POST error");
    throw new Error(`Alpaca ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

router.post("/alpaca/orders", requireAuth, async (req, res) => {
  const parsed = AlpacaOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order params", details: parsed.error.flatten() });
    return;
  }
  const { symbol, qty, side, type = "market", limit_price } = parsed.data;
  try {
    const orderBody: Record<string, unknown> = {
      symbol: symbol.toUpperCase(),
      qty: qty.toString(),
      side,
      type,
      time_in_force: "day",
    };
    if (type === "limit" && limit_price) {
      orderBody.limit_price = limit_price.toFixed(2);
    }
    const data = await alpacaPost(`${ALPACA_PAPER_URL}/v2/orders`, orderBody);
    res.json({
      id: data.id,
      symbol: data.symbol,
      qty: data.qty,
      side: data.side,
      type: data.type,
      status: data.status,
      submitted_at: data.submitted_at,
      filled_avg_price: data.filled_avg_price,
    });
  } catch (err: any) {
    logger.error({ err }, "Alpaca order submit failed");
    res.status(502).json({ error: err.message || "Failed to submit order" });
  }
});

router.get("/alpaca/positions", requireAuth, async (req, res) => {
  try {
    const data = await alpacaFetch(`${ALPACA_PAPER_URL}/v2/positions`);
    res.json(Array.isArray(data) ? data.map((p: any) => ({
      symbol: p.symbol,
      qty: p.qty,
      market_value: p.market_value,
      cost_basis: p.cost_basis,
      unrealized_pl: p.unrealized_pl,
      unrealized_plpc: p.unrealized_plpc,
      current_price: p.current_price,
      avg_entry_price: p.avg_entry_price,
      side: p.side,
    })) : []);
  } catch (err: any) {
    logger.error({ err }, "Alpaca positions fetch failed");
    res.status(502).json({ error: "Failed to fetch positions" });
  }
});

router.get("/alpaca/orders", requireAuth, async (req, res) => {
  try {
    const status = (req.query.status as string) || "all";
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const data = await alpacaFetch(`${ALPACA_PAPER_URL}/v2/orders?status=${status}&limit=${limit}&direction=desc`);
    res.json(Array.isArray(data) ? data.map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      qty: o.qty,
      filled_qty: o.filled_qty,
      side: o.side,
      type: o.type,
      status: o.status,
      submitted_at: o.submitted_at,
      filled_at: o.filled_at,
      filled_avg_price: o.filled_avg_price,
    })) : []);
  } catch (err: any) {
    logger.error({ err }, "Alpaca orders fetch failed");
    res.status(502).json({ error: "Failed to fetch orders" });
  }
});

export default router;
