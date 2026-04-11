import { Router, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/requireAuth";
import { TTLCache } from "../lib/cache";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import { alpacaCircuit } from "../lib/circuitBreaker";

const alpacaCache = new TTLCache(60_000, 300);

const router = Router();

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
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

async function alpacaFetchRaw(url: string) {
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body, url }, "Alpaca API error");
    throw new Error(`Alpaca ${res.status}: ${body}`);
  }
  return res.json();
}

async function alpacaFetch(url: string, cacheKey?: string) {
  return alpacaCircuit.execute(
    () => retryWithBackoff(() => alpacaFetchRaw(url), { label: "alpaca", maxRetries: 4 }),
    cacheKey
      ? () => {
          const cached = alpacaCache.get(cacheKey);
          if (cached) return cached;
          throw new Error("Alpaca circuit open and no cached data available");
        }
      : undefined,
  );
}

router.get("/alpaca/snapshot/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
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

router.get("/alpaca/snapshots", async (req, res) => {
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

router.get("/alpaca/bars/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const timeframe = (req.query.timeframe as string) || "1Day";
    const limit = Math.min(parseInt(req.query.limit as string) || 60, 1000);
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

router.get("/alpaca/quote/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/quotes/latest?feed=iex`
    );
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca quote fetch failed");
    res.status(502).json({ error: "Failed to fetch quote" });
  }
});

router.get("/alpaca/trades/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/trades/latest?feed=iex`
    );
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "Alpaca trade fetch failed");
    res.status(502).json({ error: "Failed to fetch trade" });
  }
});

router.get("/alpaca/multibars", async (req, res) => {
  try {
    const symbols = (req.query.symbols as string) || "";
    const timeframe = (req.query.timeframe as string) || "1Day";
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 200);
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

export default router;
