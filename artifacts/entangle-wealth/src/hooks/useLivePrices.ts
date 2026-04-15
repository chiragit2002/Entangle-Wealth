import { useState, useEffect, useRef, useCallback } from "react";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export interface LivePriceData {
  symbol: string;
  price: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export interface UseLivePricesResult {
  prices: Record<string, LivePriceData>;
  status: ConnectionStatus;
}

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];
const API_BASE = "/api";

export function useLivePrices(symbols: string[]): UseLivePricesResult {
  const [prices, setPrices] = useState<Record<string, LivePriceData>>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolsKeyRef = useRef("");
  const mountedRef = useRef(true);

  const symbolsKey = [...symbols]
    .map(s => s.toUpperCase())
    .sort()
    .join(",");

  const connect = useCallback((symKey: string) => {
    if (!symKey || !mountedRef.current) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus("connecting");

    const url = `${API_BASE}/price-stream?symbols=${encodeURIComponent(symKey)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      reconnectAttemptRef.current = 0;
      setStatus("connected");
    };

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected") {
          setStatus("connected");
        } else if (msg.type === "prices" && Array.isArray(msg.data)) {
          setPrices(prev => {
            const next = { ...prev };
            for (const update of msg.data as LivePriceData[]) {
              next[update.symbol] = update;
            }
            return next;
          });
        }
      } catch {
      }
    };

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      eventSourceRef.current = null;

      const attempt = reconnectAttemptRef.current;
      const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttemptRef.current++;

      setStatus(attempt === 0 ? "reconnecting" : "offline");

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect(symbolsKeyRef.current);
      }, delay);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!symbolsKey) return;

    symbolsKeyRef.current = symbolsKey;

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectAttemptRef.current = 0;

    connect(symbolsKey);

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [symbolsKey, connect]);

  return { prices, status };
}
