import { logger } from "./logger";
import { TTLCache } from "./cache";

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const POLL_INTERVAL_MS = 2_000;
const PRICE_CHANGE_THRESHOLD = 0.0001;

function getAlpacaHeaders(): Record<string, string> {
  const candidates = [
    process.env.ALPACA_KEY_ID || "",
    process.env.ALPACA_API_KEY || "",
    process.env.ALPACA_API_SECRET || "",
  ].filter(Boolean);
  const keyId = candidates.find(v => v.startsWith("PK")) || candidates[0] || "";
  const secretKey = candidates.find(v => !v.startsWith("PK") && v.length > 30) || candidates[1] || "";
  return {
    "APCA-API-KEY-ID": keyId,
    "APCA-API-SECRET-KEY": secretKey,
    "Accept": "application/json",
  };
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

type PriceUpdateCallback = (updates: PriceUpdate[]) => void;

const currentPrices = new Map<string, PriceUpdate>();
const subscribers = new Map<string, Set<PriceUpdateCallback>>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let isPolling = false;

export const livePriceCache = new TTLCache<PriceUpdate>(5_000, 1000, "live-broadcaster");

function getWatchedSymbols(): string[] {
  return Array.from(subscribers.keys()).filter(sym => {
    const set = subscribers.get(sym);
    return set && set.size > 0;
  });
}

async function fetchPricesFromAlpaca(symbols: string[]): Promise<void> {
  if (symbols.length === 0) return;

  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 50) {
    chunks.push(symbols.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    try {
      const url = `${ALPACA_DATA_URL}/v2/stocks/snapshots?symbols=${encodeURIComponent(chunk.join(","))}`;
      const res = await fetch(url, {
        headers: getAlpacaHeaders(),
        signal: AbortSignal.timeout(4_000),
      });

      if (!res.ok) {
        logger.debug({ status: res.status }, "Alpaca snapshot non-OK in broadcaster");
        continue;
      }

      const data = await res.json() as Record<string, any>;
      const changedUpdates: PriceUpdate[] = [];

      for (const [symbol, snap] of Object.entries(data)) {
        const s = snap as Record<string, any>;
        const price: number =
          s.minuteBar?.c ||
          s.latestTrade?.p ||
          s.dailyBar?.c ||
          0;

        if (!price || price <= 0) continue;

        const open = s.dailyBar?.o || price;
        const changePercent = open > 0 ? ((price - open) / open) * 100 : 0;
        const high = s.dailyBar?.h || price;
        const low = s.dailyBar?.l || price;
        const volume = s.dailyBar?.v || s.minuteBar?.v || 0;

        const update: PriceUpdate = {
          symbol,
          price,
          changePercent,
          open,
          high,
          low,
          volume,
          timestamp: Date.now(),
        };

        const previous = currentPrices.get(symbol);
        const priceChanged = !previous || Math.abs(previous.price - price) / previous.price > PRICE_CHANGE_THRESHOLD;

        currentPrices.set(symbol, update);
        livePriceCache.set(`price:${symbol}`, update);

        if (priceChanged) {
          changedUpdates.push(update);
        }
      }

      if (changedUpdates.length > 0) {
        notifyGlobalHandlers(changedUpdates);
      }

      for (const update of changedUpdates) {
        const callbacks = subscribers.get(update.symbol);
        if (callbacks) {
          for (const cb of callbacks) {
            try { cb([update]); } catch (err) {
              logger.debug({ err }, "Price subscriber callback error");
            }
          }
        }
      }

    } catch (err) {
      logger.debug({ err, symbols: chunk }, "Broadcaster fetch error (non-fatal)");
    }
  }
}

function scheduleNextPoll() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    const watched = getWatchedSymbolsAll();
    if (watched.length > 0) {
      await fetchPricesFromAlpaca(watched);
    }
    scheduleNextPoll();
  }, POLL_INTERVAL_MS);
}

export function startBroadcaster() {
  if (isPolling) return;
  isPolling = true;
  scheduleNextPoll();
  logger.info("Live price broadcaster started");
}

export function stopBroadcaster() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
  isPolling = false;
  logger.info("Live price broadcaster stopped");
}

export function subscribeToSymbols(symbols: string[], callback: PriceUpdateCallback): () => void {
  for (const symbol of symbols) {
    if (!subscribers.has(symbol)) {
      subscribers.set(symbol, new Set());
    }
    subscribers.get(symbol)!.add(callback);
  }

  const initialUpdates = symbols
    .map(sym => currentPrices.get(sym))
    .filter((u): u is PriceUpdate => u !== undefined);

  if (initialUpdates.length > 0) {
    try { callback(initialUpdates); } catch (err) {
      logger.debug({ err }, "Error sending initial prices to subscriber");
    }
  }

  const fetchNow = async () => {
    const uncached = symbols.filter(sym => !currentPrices.has(sym));
    if (uncached.length > 0) {
      await fetchPricesFromAlpaca(uncached);
    }
  };
  fetchNow().catch(() => {});

  return function unsubscribe() {
    for (const symbol of symbols) {
      const set = subscribers.get(symbol);
      if (set) {
        set.delete(callback);
        if (set.size === 0) subscribers.delete(symbol);
      }
    }
  };
}

const permanentSymbols = new Set<string>();

export function ensureSymbolsWatched(symbols: string[]): void {
  for (const sym of symbols) {
    permanentSymbols.add(sym.toUpperCase());
  }
}

function getWatchedSymbolsAll(): string[] {
  const fromSubscribers = Array.from(subscribers.keys()).filter(sym => {
    const set = subscribers.get(sym);
    return set && set.size > 0;
  });
  const combined = new Set([...fromSubscribers, ...permanentSymbols]);
  return Array.from(combined);
}

export function getLatestPrice(symbol: string): PriceUpdate | undefined {
  return currentPrices.get(symbol.toUpperCase());
}

export function getLatestPrices(symbols: string[]): Record<string, PriceUpdate> {
  const result: Record<string, PriceUpdate> = {};
  for (const sym of symbols) {
    const p = currentPrices.get(sym.toUpperCase());
    if (p) result[sym.toUpperCase()] = p;
  }
  return result;
}

type GlobalPriceHandler = (updates: PriceUpdate[]) => void;
const globalHandlers: Set<GlobalPriceHandler> = new Set();

export function registerGlobalPriceHandler(handler: GlobalPriceHandler): () => void {
  globalHandlers.add(handler);
  return () => globalHandlers.delete(handler);
}

function notifyGlobalHandlers(updates: PriceUpdate[]) {
  if (globalHandlers.size === 0) return;
  for (const handler of globalHandlers) {
    try { handler(updates); } catch (err) {
      logger.debug({ err }, "Global price handler error");
    }
  }
}
