import { logger } from "./logger";
import { TTLCache } from "./cache";
import WebSocket from "ws";

const ALPACA_DATA_URL = "https://data.alpaca.markets";
const ALPACA_WS_URL = "wss://stream.data.alpaca.markets/v2/iex";
const ALPACA_CRYPTO_WS_URL = "wss://stream.data.alpaca.markets/v1beta3/crypto/us";

export function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes("/");
}

const POLL_INTERVAL_MS = 2_000;
const PRICE_CHANGE_THRESHOLD = 0.0001;
const WS_RECONNECT_BASE_MS = 1_000;
const WS_RECONNECT_MAX_MS = 30_000;
const WS_STALE_THRESHOLD_MS = 15_000;
const WS_WATCHDOG_INTERVAL_MS = 5_000;
const MAX_CACHED_SYMBOLS = 2_000;
const MAX_SUBSCRIBERS = 5_000;
const MAX_PERMANENT_SYMBOLS = 500;
const MAX_WS_SUBSCRIPTIONS = 1_000;

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

function getAlpacaCredentials() {
  const headers = getAlpacaHeaders();
  return {
    key: headers["APCA-API-KEY-ID"],
    secret: headers["APCA-API-SECRET-KEY"],
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
  version: number;
}

type PriceUpdateCallback = (updates: PriceUpdate[]) => void;

let globalVersion = 0;
function nextVersion(): number {
  return ++globalVersion;
}

const currentPrices = new Map<string, PriceUpdate>();
const subscribers = new Map<string, Set<PriceUpdateCallback>>();
const permanentSymbols = new Set<string>();

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

export const livePriceCache = new TTLCache<PriceUpdate>(5_000, 1000, "live-broadcaster");

type DataSource = "websocket" | "rest_fallback" | "rest_on_demand";
let activeSource: DataSource = "rest_fallback";
let wsConnection: WebSocket | null = null;
let wsAuthenticated = false;
let wsReconnectAttempts = 0;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsWatchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastWsMessageTime = 0;
let wsSubscribedSymbols = new Set<string>();
let fallbackActive = false;

let cryptoWsConnection: WebSocket | null = null;
let cryptoWsAuthenticated = false;
let cryptoWsReconnectAttempts = 0;
let cryptoWsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let cryptoWsSubscribedSymbols = new Set<string>();

function getWatchedSymbolsAll(): string[] {
  const fromSubscribers = Array.from(subscribers.keys()).filter(sym => {
    const set = subscribers.get(sym);
    return set && set.size > 0;
  });
  const combined = new Set([...fromSubscribers, ...permanentSymbols]);
  return Array.from(combined);
}

function upsertPrice(
  symbol: string,
  price: number,
  dailyOpen?: number,
  high?: number,
  low?: number,
  volume?: number,
  source?: DataSource,
): PriceUpdate | null {
  if (!price || price <= 0) return null;

  const open = dailyOpen || price;
  const changePercent = open > 0 ? ((price - open) / open) * 100 : 0;

  const previous = currentPrices.get(symbol);
  const priceChanged = !previous || Math.abs(previous.price - price) / previous.price > PRICE_CHANGE_THRESHOLD;

  if (!priceChanged) return null;

  if (currentPrices.size >= MAX_CACHED_SYMBOLS && !currentPrices.has(symbol)) {
    const oldest = Array.from(currentPrices.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) {
      currentPrices.delete(oldest[0]);
      livePriceCache.delete(`price:${oldest[0]}`);
    }
  }

  const update: PriceUpdate = {
    symbol,
    price,
    changePercent,
    open,
    high: high || previous?.high || price,
    low: low || previous?.low || price,
    volume: volume || previous?.volume || 0,
    timestamp: Date.now(),
    version: nextVersion(),
  };

  currentPrices.set(symbol, update);
  livePriceCache.set(`price:${symbol}`, update);

  return update;
}

function dispatchUpdates(updates: PriceUpdate[]): void {
  if (updates.length === 0) return;

  notifyGlobalHandlers(updates);

  for (const update of updates) {
    const callbacks = subscribers.get(update.symbol);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb([update]);
        } catch (err) {
          logger.debug({ err }, "Price subscriber callback error");
        }
      }
    }
  }
}

function connectWebSocket(): void {
  const creds = getAlpacaCredentials();
  if (!creds.key || !creds.secret) {
    logger.info("No Alpaca credentials — skipping WebSocket, using REST fallback");
    activateFallback();
    return;
  }

  try {
    wsConnection = new WebSocket(ALPACA_WS_URL);
  } catch (err) {
    logger.warn({ err }, "WebSocket construction failed — using REST fallback");
    activateFallback();
    return;
  }

  wsConnection.on("open", () => {
    logger.info("Alpaca WebSocket connected — authenticating");
    wsConnection?.send(JSON.stringify({
      action: "auth",
      key: creds.key,
      secret: creds.secret,
    }));
  });

  wsConnection.on("message", (raw: WebSocket.Data) => {
    lastWsMessageTime = Date.now();

    try {
      const messages = JSON.parse(raw.toString()) as any[];
      if (!Array.isArray(messages)) return;

      for (const msg of messages) {
        if (msg.T === "success" && msg.msg === "authenticated") {
          wsAuthenticated = true;
          wsReconnectAttempts = 0;
          activeSource = "websocket";
          logger.info("Alpaca WebSocket authenticated — switching to WebSocket source");

          deactivateFallback();

          const symbols = getWatchedSymbolsAll().filter(s => !isCryptoSymbol(s));
          if (symbols.length > 0) {
            wsSubscribeSymbols(symbols);
          }
          continue;
        }

        if (msg.T === "error") {
          logger.error({ code: msg.code, msg: msg.msg }, "Alpaca WebSocket error");
          if (msg.code === 402 || msg.code === 406) {
            wsAuthenticated = false;
            activateFallback();
          }
          continue;
        }

        if (msg.T === "t") {
          const symbol = msg.S as string;
          const tradePrice = msg.p as number;
          const prev = currentPrices.get(symbol);

          const changed = upsertPrice(
            symbol,
            tradePrice,
            prev?.open,
            prev?.high ? Math.max(prev.high, tradePrice) : tradePrice,
            prev?.low ? Math.min(prev.low, tradePrice) : tradePrice,
            (prev?.volume || 0) + (msg.s || 0),
            "websocket",
          );
          if (changed) dispatchUpdates([changed]);
        }

        if (msg.T === "q") {
          const symbol = msg.S as string;
          const midPrice = ((msg.bp || 0) + (msg.ap || 0)) / 2;
          if (midPrice > 0) {
            const changed = upsertPrice(symbol, midPrice, undefined, undefined, undefined, undefined, "websocket");
            if (changed) dispatchUpdates([changed]);
          }
        }

        if (msg.T === "b") {
          const symbol = msg.S as string;
          const changed = upsertPrice(
            symbol,
            msg.c as number,
            msg.o as number,
            msg.h as number,
            msg.l as number,
            msg.v as number,
            "websocket",
          );
          if (changed) dispatchUpdates([changed]);
        }
      }
    } catch (err) {
      logger.debug({ err }, "WebSocket message parse error");
    }
  });

  wsConnection.on("error", (err: Error) => {
    logger.warn({ err: err.message }, "Alpaca WebSocket error — will reconnect");
  });

  wsConnection.on("close", (code: number, reason: Buffer) => {
    logger.warn({ code, reason: reason?.toString() }, "Alpaca WebSocket closed");
    wsAuthenticated = false;
    wsConnection = null;
    if (!isRunning) return;
    activateFallback();
    scheduleWsReconnect();
  });
}

function wsSubscribeSymbols(symbols: string[]): void {
  if (!wsConnection || !wsAuthenticated) return;

  const newSymbols = symbols.filter(s => !wsSubscribedSymbols.has(s) && !isCryptoSymbol(s));
  if (newSymbols.length === 0) return;

  const remaining = MAX_WS_SUBSCRIPTIONS - wsSubscribedSymbols.size;
  if (remaining <= 0) {
    logger.warn({ size: wsSubscribedSymbols.size }, "WS subscription limit reached");
    return;
  }
  const toSubscribe = newSymbols.slice(0, remaining);

  wsConnection.send(JSON.stringify({
    action: "subscribe",
    trades: toSubscribe,
    bars: toSubscribe,
  }));

  for (const s of toSubscribe) wsSubscribedSymbols.add(s);
  logger.info({ count: toSubscribe.length, total: wsSubscribedSymbols.size }, "WebSocket subscribed to symbols");
}

function wsUnsubscribeSymbols(symbols: string[]): void {
  if (!wsConnection || !wsAuthenticated) return;

  const toRemove = symbols.filter(s => wsSubscribedSymbols.has(s));
  if (toRemove.length === 0) return;

  wsConnection.send(JSON.stringify({
    action: "unsubscribe",
    trades: toRemove,
    bars: toRemove,
  }));

  for (const s of toRemove) wsSubscribedSymbols.delete(s);
}

function scheduleWsReconnect(): void {
  if (wsReconnectTimer) return;

  const delay = Math.min(
    WS_RECONNECT_BASE_MS * Math.pow(2, wsReconnectAttempts),
    WS_RECONNECT_MAX_MS,
  );
  wsReconnectAttempts++;

  logger.info({ delay, attempt: wsReconnectAttempts }, "Scheduling WebSocket reconnect");

  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    if (isRunning) {
      wsSubscribedSymbols.clear();
      connectWebSocket();
    }
  }, delay);
}

function startWsWatchdog(): void {
  if (wsWatchdogTimer) return;

  wsWatchdogTimer = setInterval(() => {
    if (!isRunning || activeSource !== "websocket") return;

    const elapsed = Date.now() - lastWsMessageTime;
    if (elapsed > WS_STALE_THRESHOLD_MS && wsAuthenticated) {
      logger.warn({ staleSec: Math.round(elapsed / 1000) }, "WebSocket stale — forcing reconnect + REST fallback");
      activateFallback();
      if (wsConnection) {
        try { wsConnection.close(); } catch (err) {
          logger.debug({ err }, "Error closing stale WebSocket");
        }
        wsConnection = null;
      }
      wsAuthenticated = false;
      scheduleWsReconnect();
    }
  }, WS_WATCHDOG_INTERVAL_MS);
}

function activateFallback(): void {
  if (fallbackActive) return;
  fallbackActive = true;
  activeSource = "rest_fallback";
  logger.info("REST fallback activated");
  scheduleRestPoll();
}

function deactivateFallback(): void {
  if (!fallbackActive) return;
  fallbackActive = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  logger.info("REST fallback deactivated — WebSocket is primary");
}

async function fetchEquityPricesFromAlpaca(symbols: string[]): Promise<void> {
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
        logger.debug({ status: res.status }, "Alpaca equity snapshot non-OK in broadcaster");
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

        const open = s.dailyBar?.o || price;
        const high = s.dailyBar?.h || price;
        const low = s.dailyBar?.l || price;
        const volume = s.dailyBar?.v || s.minuteBar?.v || 0;

        const changed = upsertPrice(symbol, price, open, high, low, volume, "rest_fallback");
        if (changed) changedUpdates.push(changed);
      }

      if (changedUpdates.length > 0) {
        dispatchUpdates(changedUpdates);
      }
    } catch (err) {
      logger.debug({ err, symbols: chunk }, "Broadcaster equity REST fetch error (non-fatal)");
    }
  }
}

async function fetchCryptoPricesFromAlpaca(symbols: string[]): Promise<void> {
  if (symbols.length === 0) return;

  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 20) {
    chunks.push(symbols.slice(i, i + 20));
  }

  for (const chunk of chunks) {
    try {
      const url = `${ALPACA_DATA_URL}/v1beta3/crypto/us/snapshots?symbols=${encodeURIComponent(chunk.join(","))}`;
      const res = await fetch(url, {
        headers: getAlpacaHeaders(),
        signal: AbortSignal.timeout(4_000),
      });

      if (!res.ok) {
        logger.debug({ status: res.status }, "Alpaca crypto snapshot non-OK in broadcaster");
        continue;
      }

      const data = await res.json() as { snapshots?: Record<string, any> };
      const snapshots = data.snapshots ?? data as Record<string, any>;
      const changedUpdates: PriceUpdate[] = [];

      for (const [symbol, snap] of Object.entries(snapshots)) {
        const s = snap as Record<string, any>;
        const price: number =
          s.minuteBar?.c ||
          s.latestTrade?.p ||
          s.dailyBar?.c ||
          s.latestQuote?.ap ||
          0;

        const open = s.dailyBar?.o || price;
        const high = s.dailyBar?.h || price;
        const low = s.dailyBar?.l || price;
        const volume = s.dailyBar?.v || s.minuteBar?.v || 0;

        const changed = upsertPrice(symbol, price, open, high, low, volume, "rest_fallback");
        if (changed) changedUpdates.push(changed);
      }

      if (changedUpdates.length > 0) {
        dispatchUpdates(changedUpdates);
      }
    } catch (err) {
      logger.debug({ err, symbols: chunk }, "Broadcaster crypto REST fetch error (non-fatal)");
    }
  }
}

async function fetchPricesFromAlpaca(symbols: string[]): Promise<void> {
  if (symbols.length === 0) return;
  const equitySymbols = symbols.filter(s => !isCryptoSymbol(s));
  const cryptoSymbols = symbols.filter(s => isCryptoSymbol(s));
  await Promise.all([
    fetchEquityPricesFromAlpaca(equitySymbols),
    fetchCryptoPricesFromAlpaca(cryptoSymbols),
  ]);
}

function connectCryptoWebSocket(): void {
  const creds = getAlpacaCredentials();
  if (!creds.key || !creds.secret) return;

  try {
    cryptoWsConnection = new WebSocket(ALPACA_CRYPTO_WS_URL);
  } catch (err) {
    logger.warn({ err }, "Crypto WebSocket construction failed");
    return;
  }

  cryptoWsConnection.on("open", () => {
    logger.info("Alpaca Crypto WebSocket connected — authenticating");
    cryptoWsConnection?.send(JSON.stringify({
      action: "auth",
      key: creds.key,
      secret: creds.secret,
    }));
  });

  cryptoWsConnection.on("message", (raw: WebSocket.Data) => {
    try {
      const messages = JSON.parse(raw.toString()) as any[];
      if (!Array.isArray(messages)) return;

      for (const msg of messages) {
        if (msg.T === "success" && msg.msg === "authenticated") {
          cryptoWsAuthenticated = true;
          cryptoWsReconnectAttempts = 0;
          logger.info("Alpaca Crypto WebSocket authenticated");

          const cryptoSymbols = getWatchedSymbolsAll().filter(s => isCryptoSymbol(s));
          if (cryptoSymbols.length > 0) {
            cryptoWsSubscribeSymbols(cryptoSymbols);
          }
          continue;
        }

        if (msg.T === "error") {
          logger.error({ code: msg.code, msg: msg.msg }, "Alpaca Crypto WebSocket error");
          continue;
        }

        if (msg.T === "t") {
          const symbol = msg.S as string;
          const prev = currentPrices.get(symbol);
          const changed = upsertPrice(
            symbol, msg.p as number, prev?.open,
            prev?.high ? Math.max(prev.high, msg.p) : msg.p,
            prev?.low ? Math.min(prev.low, msg.p) : msg.p,
            (prev?.volume || 0) + (msg.s || 0), "websocket",
          );
          if (changed) dispatchUpdates([changed]);
        }

        if (msg.T === "b") {
          const symbol = msg.S as string;
          const changed = upsertPrice(
            symbol, msg.c as number, msg.o as number,
            msg.h as number, msg.l as number, msg.v as number, "websocket",
          );
          if (changed) dispatchUpdates([changed]);
        }

        if (msg.T === "q") {
          const symbol = msg.S as string;
          const midPrice = ((msg.bp || 0) + (msg.ap || 0)) / 2;
          if (midPrice > 0) {
            const changed = upsertPrice(symbol, midPrice, undefined, undefined, undefined, undefined, "websocket");
            if (changed) dispatchUpdates([changed]);
          }
        }
      }
    } catch (err) {
      logger.debug({ err }, "Crypto WebSocket message parse error");
    }
  });

  cryptoWsConnection.on("error", (err: Error) => {
    logger.warn({ err: err.message }, "Alpaca Crypto WebSocket error");
  });

  cryptoWsConnection.on("close", (code: number) => {
    logger.warn({ code }, "Alpaca Crypto WebSocket closed");
    cryptoWsAuthenticated = false;
    cryptoWsConnection = null;
    if (!isRunning) return;
    scheduleCryptoWsReconnect();
  });
}

function cryptoWsSubscribeSymbols(symbols: string[]): void {
  if (!cryptoWsConnection || !cryptoWsAuthenticated) return;

  const newSymbols = symbols.filter(s => !cryptoWsSubscribedSymbols.has(s));
  if (newSymbols.length === 0) return;

  cryptoWsConnection.send(JSON.stringify({
    action: "subscribe",
    trades: newSymbols,
    bars: newSymbols,
  }));

  for (const s of newSymbols) cryptoWsSubscribedSymbols.add(s);
  logger.info({ count: newSymbols.length }, "Crypto WebSocket subscribed to symbols");
}

function scheduleCryptoWsReconnect(): void {
  if (cryptoWsReconnectTimer) return;

  const delay = Math.min(
    WS_RECONNECT_BASE_MS * Math.pow(2, cryptoWsReconnectAttempts),
    WS_RECONNECT_MAX_MS,
  );
  cryptoWsReconnectAttempts++;

  cryptoWsReconnectTimer = setTimeout(() => {
    cryptoWsReconnectTimer = null;
    if (isRunning) {
      cryptoWsSubscribedSymbols.clear();
      connectCryptoWebSocket();
    }
  }, delay);
}

function scheduleRestPoll(): void {
  if (pollTimer) clearTimeout(pollTimer);
  if (!fallbackActive && !isRunning) return;

  pollTimer = setTimeout(async () => {
    const watched = getWatchedSymbolsAll();
    if (watched.length > 0) {
      await fetchPricesFromAlpaca(watched);
    }
    if (fallbackActive) scheduleRestPoll();
  }, POLL_INTERVAL_MS);
}

export function startBroadcaster(): void {
  if (isRunning) return;
  isRunning = true;

  connectWebSocket();
  connectCryptoWebSocket();
  startWsWatchdog();

  activateFallback();

  logger.info("Live price broadcaster started (WebSocket + Crypto WebSocket + REST fallback)");
}

export function stopBroadcaster(): void {
  isRunning = false;
  fallbackActive = false;

  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
  if (wsWatchdogTimer) { clearInterval(wsWatchdogTimer); wsWatchdogTimer = null; }
  if (cryptoWsReconnectTimer) { clearTimeout(cryptoWsReconnectTimer); cryptoWsReconnectTimer = null; }

  if (wsConnection) {
    try { wsConnection.close(); } catch (err) {
      logger.debug({ err }, "Error closing equity WebSocket during shutdown");
    }
    wsConnection = null;
  }
  if (cryptoWsConnection) {
    try { cryptoWsConnection.close(); } catch (err) {
      logger.debug({ err }, "Error closing crypto WebSocket during shutdown");
    }
    cryptoWsConnection = null;
  }
  wsAuthenticated = false;
  cryptoWsAuthenticated = false;
  wsSubscribedSymbols.clear();
  cryptoWsSubscribedSymbols.clear();

  logger.info("Live price broadcaster stopped");
}

export function subscribeToSymbols(symbols: string[], callback: PriceUpdateCallback): () => void {
  for (const symbol of symbols) {
    if (!subscribers.has(symbol)) {
      if (subscribers.size >= MAX_SUBSCRIBERS) {
        logger.warn({ size: subscribers.size }, "Subscriber map at capacity — rejecting new symbol subscription");
        continue;
      }
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

  const equitySymbols = symbols.filter(s => !isCryptoSymbol(s));
  const cryptoSymbols = symbols.filter(s => isCryptoSymbol(s));

  if (wsAuthenticated && equitySymbols.length > 0) {
    wsSubscribeSymbols(equitySymbols);
  }
  if (cryptoWsAuthenticated && cryptoSymbols.length > 0) {
    cryptoWsSubscribeSymbols(cryptoSymbols);
  }

  const fetchNow = async () => {
    const uncached = symbols.filter(sym => !currentPrices.has(sym));
    if (uncached.length > 0) {
      await fetchPricesFromAlpaca(uncached);
    }
  };
  fetchNow().catch(err => logger.debug({ err }, "Background symbol fetch failed (non-fatal)"));

  return function unsubscribe() {
    const orphaned: string[] = [];
    for (const symbol of symbols) {
      const set = subscribers.get(symbol);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          subscribers.delete(symbol);
          if (!permanentSymbols.has(symbol)) {
            orphaned.push(symbol);
          }
        }
      }
    }
    const orphanedEquity = orphaned.filter(s => !isCryptoSymbol(s));
    if (orphanedEquity.length > 0) {
      wsUnsubscribeSymbols(orphanedEquity);
    }
  };
}

export function ensureSymbolsWatched(symbols: string[]): void {
  for (const sym of symbols) {
    if (permanentSymbols.size >= MAX_PERMANENT_SYMBOLS) {
      logger.warn({ size: permanentSymbols.size }, "Permanent symbols at capacity");
      break;
    }
    permanentSymbols.add(sym.toUpperCase());
  }
  const equitySymbols = symbols.map(s => s.toUpperCase()).filter(s => !isCryptoSymbol(s));
  const cryptoSymbols = symbols.map(s => s.toUpperCase()).filter(s => isCryptoSymbol(s));
  if (wsAuthenticated && equitySymbols.length > 0) {
    wsSubscribeSymbols(equitySymbols);
  }
  if (cryptoWsAuthenticated && cryptoSymbols.length > 0) {
    cryptoWsSubscribeSymbols(cryptoSymbols);
  }
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

export function getCachedPricesWithVersion(symbols: string[]): Record<string, { price: number; version: number; last_update: number }> {
  const result: Record<string, { price: number; version: number; last_update: number }> = {};
  for (const sym of symbols) {
    const p = currentPrices.get(sym.toUpperCase());
    if (p) {
      result[sym.toUpperCase()] = {
        price: p.price,
        version: p.version,
        last_update: Math.floor(p.timestamp / 1000),
      };
    }
  }
  return result;
}

export function getPipelineStatus() {
  return {
    activeSource,
    wsConnected: wsConnection?.readyState === WebSocket.OPEN,
    wsAuthenticated,
    wsSubscribedCount: wsSubscribedSymbols.size,
    fallbackActive,
    cachedSymbolCount: currentPrices.size,
    globalVersion,
    wsReconnectAttempts,
    lastWsMessageAge: lastWsMessageTime > 0 ? Date.now() - lastWsMessageTime : null,
  };
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

export { fetchPricesFromAlpaca };
