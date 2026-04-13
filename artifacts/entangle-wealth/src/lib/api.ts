const API_BASE = "/api";

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  capTier: "mega" | "large" | "mid" | "small" | "micro";
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  week52High: number;
  week52Low: number;
}

export interface StocksResponse {
  stocks: Stock[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuickAnalysis {
  signal: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  summary: string;
  keyLevel: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  disclaimer: string;
}

export interface AgentAnalysis {
  id: number;
  name: string;
  domain: string;
  signal: "BULLISH" | "NEUTRAL" | "BEARISH";
  confidence: number;
  reasoning: string;
  keyMetric: string;
}

export interface FullAnalysis {
  symbol: string;
  name: string;
  overallSignal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  confidenceScore: number;
  consensusReached: boolean;
  agents: AgentAnalysis[];
  flashCouncilSummary: string;
  riskFactors: string[];
  catalysts: string[];
  priceTargets: {
    bear: number;
    base: number;
    bull: number;
  };
  timeHorizon: string;
  disclaimer: string;
}

export interface SectorSummary {
  sector: string;
  count: number;
  avgChange: number;
}

export interface Movers {
  gainers: Stock[];
  losers: Stock[];
}

export async function fetchStocks(params: {
  q?: string;
  sector?: string;
  capTier?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}): Promise<StocksResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.sector) sp.set("sector", params.sector);
  if (params.capTier) sp.set("capTier", params.capTier);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.sortDir) sp.set("sortDir", params.sortDir);

  const res = await fetch(`${API_BASE}/stocks?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch stocks");
  return res.json();
}

export async function fetchStock(symbol: string): Promise<Stock> {
  const res = await fetch(`${API_BASE}/stocks/${symbol}`);
  if (!res.ok) throw new Error("Stock not found");
  return res.json();
}

export async function fetchMovers(): Promise<Movers> {
  const res = await fetch(`${API_BASE}/stocks/movers`);
  if (!res.ok) throw new Error("Failed to fetch movers");
  return res.json();
}

export async function fetchSectors(): Promise<{ sectors: SectorSummary[] }> {
  const res = await fetch(`${API_BASE}/stocks/sectors`);
  if (!res.ok) throw new Error("Failed to fetch sectors");
  return res.json();
}

export async function analyzeStock(symbol: string): Promise<FullAnalysis> {
  const res = await fetch(`${API_BASE}/stocks/${symbol}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Something went wrong — please try again" }));
    throw new Error(err.error || "Something went wrong — please try again");
  }
  return res.json();
}

export async function quickAnalyzeStock(symbol: string): Promise<QuickAnalysis> {
  const res = await fetch(`${API_BASE}/stocks/${symbol}/quick-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Quick analysis failed" }));
    throw new Error(err.error || "Quick analysis failed");
  }
  return res.json();
}

export function formatMarketCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toLocaleString();
}

export interface NewsItem {
  id: string;
  topic: string;
  title: string;
  link: string;
  source: string;
  published: string;
  publishedAt: number;
  summary: string;
  score: number;
  sentiment: "positive" | "negative" | "neutral";
  tickers: string[];
}

export interface NewsResponse {
  items: NewsItem[];
  total: number;
  topics: Record<string, number>;
  cachedAt: number;
  feedCount: number;
}

export interface AlpacaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export async function fetchAlpacaBars(symbol: string, params?: {
  timeframe?: string;
  limit?: number;
  start?: string;
  end?: string;
}): Promise<{ bars: AlpacaBar[] }> {
  const sp = new URLSearchParams();
  if (params?.timeframe) sp.set("timeframe", params.timeframe);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.start) sp.set("start", params.start);
  if (params?.end) sp.set("end", params.end);
  const res = await fetch(`${API_BASE}/alpaca/bars/${symbol}?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch bars");
  return res.json();
}

export async function fetchAlpacaSnapshots(symbols: string[]): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/alpaca/snapshots?symbols=${symbols.join(",")}`);
  if (!res.ok) throw new Error("Failed to fetch snapshots");
  return res.json();
}

export async function fetchNews(params?: {
  topic?: string;
  search?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<NewsResponse> {
  const sp = new URLSearchParams();
  if (params?.topic) sp.set("topic", params.topic);
  if (params?.search) sp.set("search", params.search);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  const res = await fetch(`${API_BASE}/news?${sp.toString()}`, { signal: params?.signal });
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}
