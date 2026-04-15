import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { type LivePriceData, type ConnectionStatus } from "@/hooks/useLivePrices";

interface LivePriceContextValue {
  prices: Record<string, LivePriceData>;
  status: ConnectionStatus;
  registerSymbols: (symbols: string[]) => () => void;
}

const LivePriceContext = createContext<LivePriceContextValue>({
  prices: {},
  status: "offline",
  registerSymbols: () => () => {},
});

const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];
const API_BASE = "/api";

export function LivePriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, LivePriceData>>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const symbolRegistryRef = useRef<Map<string, number>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSymbolsRef = useRef<string>("");
  const mountedRef = useRef(true);
  const [symbolVersion, setSymbolVersion] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const getSymbolsKey = useCallback(() => {
    return Array.from(symbolRegistryRef.current.keys()).sort().join(",");
  }, []);

  const connectFn = useCallback((symKey: string) => {
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
            for (const u of msg.data as LivePriceData[]) next[u.symbol] = u;
            return next;
          });
        }
      } catch {}
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
        if (mountedRef.current) connectFn(currentSymbolsRef.current);
      }, delay);
    };
  }, []);

  useEffect(() => {
    const symKey = getSymbolsKey();
    if (!symKey) return;
    if (symKey === currentSymbolsRef.current) return;
    currentSymbolsRef.current = symKey;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectAttemptRef.current = 0;
    connectFn(symKey);
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [symbolVersion, connectFn, getSymbolsKey]);

  const registerSymbols = useCallback((symbols: string[]): (() => void) => {
    const upper = symbols.map(s => s.toUpperCase());
    for (const sym of upper) {
      symbolRegistryRef.current.set(sym, (symbolRegistryRef.current.get(sym) ?? 0) + 1);
    }
    setSymbolVersion(v => v + 1);
    return () => {
      for (const sym of upper) {
        const count = symbolRegistryRef.current.get(sym) ?? 0;
        if (count <= 1) symbolRegistryRef.current.delete(sym);
        else symbolRegistryRef.current.set(sym, count - 1);
      }
      setSymbolVersion(v => v + 1);
    };
  }, []);

  const value = useMemo<LivePriceContextValue>(() => ({
    prices,
    status,
    registerSymbols,
  }), [prices, status, registerSymbols]);

  return (
    <LivePriceContext.Provider value={value}>
      {children}
    </LivePriceContext.Provider>
  );
}

export function useLivePriceContext() {
  return useContext(LivePriceContext);
}

export function useSymbolPrices(symbols: string[]): {
  prices: Record<string, LivePriceData>;
  status: ConnectionStatus;
} {
  const { prices, status, registerSymbols } = useContext(LivePriceContext);
  const symbolsKey = useMemo(() =>
    symbols.map(s => s.toUpperCase()).sort().join(","),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [symbols.join(",")]
  );

  useEffect(() => {
    if (!symbolsKey) return;
    const syms = symbolsKey.split(",").filter(Boolean);
    return registerSymbols(syms);
  }, [symbolsKey, registerSymbols]);

  return { prices, status };
}
