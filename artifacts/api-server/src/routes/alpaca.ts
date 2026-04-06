import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const ALPACA_PAPER_URL = "https://paper-api.alpaca.markets";

function alpacaHeaders() {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY || "",
    "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET || "",
    "Accept": "application/json",
  };
}

async function alpacaFetch(url: string) {
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body, url }, "Alpaca API error");
    throw new Error(`Alpaca ${res.status}: ${body}`);
  }
  return res.json();
}

router.get("/alpaca/snapshot/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/${symbol}/snapshot`
    );
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to fetch snapshot" });
  }
});

router.get("/alpaca/snapshots", async (req, res) => {
  try {
    const symbols = (req.query.symbols as string) || "";
    if (!symbols) {
      res.status(400).json({ error: "symbols query param required" });
      return;
    }
    const data = await alpacaFetch(
      `${ALPACA_DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols)}`
    );
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to fetch snapshots" });
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
    res.status(502).json({ error: err.message || "Failed to fetch bars" });
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
    res.status(502).json({ error: err.message || "Failed to fetch quote" });
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
    res.status(502).json({ error: err.message || "Failed to fetch trade" });
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
    res.status(502).json({ error: err.message || "Failed to fetch multi bars" });
  }
});

router.get("/alpaca/account", async (req, res) => {
  try {
    const data = await alpacaFetch(`${ALPACA_PAPER_URL}/v2/account`);
    res.json({
      id: data.id,
      status: data.status,
      buying_power: data.buying_power,
      cash: data.cash,
      portfolio_value: data.portfolio_value,
      equity: data.equity,
      currency: data.currency,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to fetch account" });
  }
});

router.get("/alpaca/movers", async (req, res) => {
  try {
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

    res.json({
      gainers: entries.filter(e => e.change > 0).slice(0, 10),
      losers: entries.filter(e => e.change < 0).sort((a, b) => a.change - b.change).slice(0, 10),
      mostActive: [...entries].sort((a, b) => b.volume - a.volume).slice(0, 10),
      all: entries,
    });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to fetch movers" });
  }
});

export default router;
