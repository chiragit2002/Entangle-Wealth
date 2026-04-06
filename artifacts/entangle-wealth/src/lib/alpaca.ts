const API_BASE = import.meta.env.VITE_API_URL || "";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
}

export interface AlpacaSnapshot {
  latestTrade: { p: number; s: number; t: string };
  latestQuote: { ap: number; as: number; bp: number; bs: number; t: string };
  minuteBar: AlpacaBar;
  dailyBar: AlpacaBar;
  prevDailyBar: AlpacaBar;
}

export interface AlpacaMover {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

export interface AlpacaMoversResponse {
  gainers: AlpacaMover[];
  losers: AlpacaMover[];
  mostActive: AlpacaMover[];
  all: AlpacaMover[];
}

export async function fetchSnapshot(symbol: string): Promise<AlpacaSnapshot> {
  return apiFetch(`/alpaca/snapshot/${symbol.toUpperCase()}`);
}

export async function fetchSnapshots(symbols: string[]): Promise<Record<string, AlpacaSnapshot>> {
  return apiFetch(`/alpaca/snapshots?symbols=${symbols.join(",")}`);
}

export async function fetchBars(
  symbol: string,
  opts?: { timeframe?: string; limit?: number; start?: string; end?: string }
): Promise<{ bars: AlpacaBar[]; symbol: string; next_page_token?: string }> {
  const tf = opts?.timeframe || "1Day";
  const limit = opts?.limit || 60;
  let url = `/alpaca/bars/${symbol.toUpperCase()}?timeframe=${tf}&limit=${limit}`;
  if (opts?.start) url += `&start=${opts.start}`;
  if (opts?.end) url += `&end=${opts.end}`;
  return apiFetch(url);
}

export async function fetchMovers(): Promise<AlpacaMoversResponse> {
  return apiFetch("/alpaca/movers");
}

export async function fetchMultiBars(
  symbols: string[],
  opts?: { timeframe?: string; limit?: number }
): Promise<{ bars: Record<string, AlpacaBar[]> }> {
  const tf = opts?.timeframe || "1Day";
  const limit = opts?.limit || 30;
  return apiFetch(`/alpaca/multibars?symbols=${symbols.join(",")}&timeframe=${tf}&limit=${limit}`);
}

export async function fetchAccount(): Promise<{
  id: string;
  status: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  currency: string;
}> {
  return apiFetch("/alpaca/account");
}

export function barsToStockData(bars: AlpacaBar[]) {
  return {
    prices: bars.map(b => b.c),
    highs: bars.map(b => b.h),
    lows: bars.map(b => b.l),
    closes: bars.map(b => b.c),
    volumes: bars.map(b => b.v),
    timestamps: bars.map(b => b.t),
  };
}
