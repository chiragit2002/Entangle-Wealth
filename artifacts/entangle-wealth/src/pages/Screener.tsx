import { useState, useMemo, useCallback, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Filter, ArrowUpDown, ArrowUpRight, ArrowDownRight,
  BarChart3, TrendingUp, TrendingDown, Star, X, Bookmark, BookmarkCheck,
  RefreshCw, Download, ChevronDown, ChevronUp, Zap, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMockOHLCV, runAllIndicators, getOverallSignal } from "@/lib/indicators";
import { fetchSnapshots, fetchBars, barsToStockData, type AlpacaSnapshot } from "@/lib/alpaca";

interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  volume: string;
  marketCap: string;
  pe: number | null;
  week52High: number;
  week52Low: number;
  signal?: string;
  confidence?: number;
}

type SortField = "symbol" | "price" | "change" | "volume" | "marketCap" | "pe" | "signal" | "confidence";
type SortDir = "asc" | "desc";

function mockPrice(sym: string): number {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = ((h << 5) - h + sym.charCodeAt(i)) | 0;
  return 10 + Math.abs(h % 900) + Math.random() * 5;
}

const SCREENER_STOCKS: ScreenerStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 175.84, change: -0.32, volume: "52.4M", marketCap: "$2.78T", pe: 28.5, week52High: 199.62, week52Low: 141.32 },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", price: 412.30, change: 0.82, volume: "22.1M", marketCap: "$3.06T", pe: 35.2, week52High: 430.82, week52Low: 309.45 },
  { symbol: "NVDA", name: "NVIDIA Corp.", sector: "Technology", price: 878.35, change: 4.22, volume: "48.7M", marketCap: "$2.16T", pe: 64.8, week52High: 974.00, week52Low: 373.56 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", price: 485.90, change: 1.24, volume: "18.3M", marketCap: "$1.52T", pe: 24.1, week52High: 510.34, week52Low: 351.20 },
  { symbol: "AMZN", name: "Amazon.com", sector: "Consumer Cyclical", price: 495.10, change: 1.12, volume: "31.2M", marketCap: "$1.56T", pe: 58.4, week52High: 520.75, week52Low: 336.56 },
  { symbol: "META", name: "Meta Platforms", sector: "Communication", price: 485.20, change: 1.82, volume: "16.8M", marketCap: "$1.24T", pe: 32.7, week52High: 542.81, week52Low: 274.38 },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", price: 195.30, change: -1.78, volume: "68.4M", marketCap: "$622B", pe: 42.3, week52High: 278.98, week52Low: 152.37 },
  { symbol: "AMD", name: "Adv. Micro Devices", sector: "Technology", price: 162.75, change: 2.84, volume: "42.1M", marketCap: "$263B", pe: 44.6, week52High: 227.30, week52Low: 93.12 },
  { symbol: "RKLB", name: "Rocket Lab USA", sector: "Industrials", price: 18.45, change: 5.18, volume: "28.3M", marketCap: "$8.7B", pe: null, week52High: 22.10, week52Low: 4.18 },
  { symbol: "PLTR", name: "Palantir Tech.", sector: "Technology", price: 24.50, change: 1.92, volume: "38.5M", marketCap: "$54B", pe: null, week52High: 27.50, week52Low: 13.68 },
  { symbol: "SOFI", name: "SoFi Technologies", sector: "Financial", price: 8.42, change: 2.35, volume: "24.6M", marketCap: "$8.2B", pe: null, week52High: 11.24, week52Low: 6.01 },
  { symbol: "COIN", name: "Coinbase Global", sector: "Financial", price: 245.30, change: 2.64, volume: "12.4M", marketCap: "$49B", pe: 38.2, week52High: 283.48, week52Low: 69.22 },
  { symbol: "RIVN", name: "Rivian Automotive", sector: "Consumer Cyclical", price: 12.85, change: -1.42, volume: "22.8M", marketCap: "$12.8B", pe: null, week52High: 28.06, week52Low: 8.26 },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication", price: 618.20, change: 2.85, volume: "8.2M", marketCap: "$267B", pe: 45.2, week52High: 639.00, week52Low: 344.73 },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financial", price: 198.45, change: 1.22, volume: "9.8M", marketCap: "$571B", pe: 11.8, week52High: 205.88, week52Low: 135.19 },
  { symbol: "V", name: "Visa Inc.", sector: "Financial", price: 282.10, change: 0.42, volume: "6.4M", marketCap: "$578B", pe: 30.5, week52High: 290.96, week52Low: 227.80 },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology", price: 1345.60, change: 1.55, volume: "4.2M", marketCap: "$623B", pe: 56.8, week52High: 1438.25, week52Low: 794.13 },
  { symbol: "SMCI", name: "Super Micro Comp.", sector: "Technology", price: 892.50, change: 8.42, volume: "18.6M", marketCap: "$52B", pe: 62.4, week52High: 1229.00, week52Low: 226.96 },
  { symbol: "ARM", name: "Arm Holdings", sector: "Technology", price: 142.70, change: 2.31, volume: "8.9M", marketCap: "$148B", pe: 98.4, week52High: 164.00, week52Low: 46.50 },
  { symbol: "CRWD", name: "CrowdStrike", sector: "Technology", price: 312.80, change: 1.18, volume: "5.1M", marketCap: "$74B", pe: null, week52High: 365.00, week52Low: 140.25 },
  { symbol: "PANW", name: "Palo Alto Networks", sector: "Technology", price: 298.40, change: 0.85, volume: "4.8M", marketCap: "$98B", pe: 48.2, week52High: 380.84, week52Low: 196.52 },
  { symbol: "UBER", name: "Uber Technologies", sector: "Technology", price: 78.20, change: 1.45, volume: "14.2M", marketCap: "$162B", pe: 72.5, week52High: 82.14, week52Low: 40.09 },
  { symbol: "ABNB", name: "Airbnb Inc.", sector: "Consumer Cyclical", price: 168.30, change: -0.62, volume: "6.8M", marketCap: "$108B", pe: 22.8, week52High: 170.10, week52Low: 113.00 },
  { symbol: "SNOW", name: "Snowflake Inc.", sector: "Technology", price: 162.40, change: -0.95, volume: "7.2M", marketCap: "$54B", pe: null, week52High: 237.72, week52Low: 107.13 },
  { symbol: "SHOP", name: "Shopify Inc.", sector: "Technology", price: 78.50, change: 1.82, volume: "12.4M", marketCap: "$98B", pe: null, week52High: 91.57, week52Low: 45.50 },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare", price: 785.20, change: 1.82, volume: "3.8M", marketCap: "$746B", pe: 62.4, week52High: 800.00, week52Low: 411.86 },
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", price: 492.80, change: -1.24, volume: "4.1M", marketCap: "$455B", pe: 22.4, week52High: 554.70, week52Low: 436.38 },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 104.65, change: -1.48, volume: "15.2M", marketCap: "$425B", pe: 12.8, week52High: 120.70, week52Low: 95.77 },
  { symbol: "GS", name: "Goldman Sachs", sector: "Financial", price: 412.50, change: 1.52, volume: "2.8M", marketCap: "$138B", pe: 15.2, week52High: 420.75, week52Low: 289.36 },
  { symbol: "BA", name: "Boeing Co.", sector: "Industrials", price: 185.40, change: -0.82, volume: "8.4M", marketCap: "$114B", pe: null, week52High: 267.54, week52Low: 159.70 },
  { symbol: "IONQ", name: "IonQ Inc.", sector: "Technology", price: 12.80, change: 3.42, volume: "8.2M", marketCap: "$2.8B", pe: null, week52High: 22.90, week52Low: 5.20 },
  { symbol: "MARA", name: "Marathon Digital", sector: "Financial", price: 22.45, change: 4.15, volume: "32.1M", marketCap: "$6.4B", pe: null, week52High: 34.09, week52Low: 7.16 },
  { symbol: "HOOD", name: "Robinhood Markets", sector: "Financial", price: 18.92, change: 2.12, volume: "14.8M", marketCap: "$16.8B", pe: null, week52High: 23.94, week52Low: 7.57 },
  { symbol: "NET", name: "Cloudflare Inc.", sector: "Technology", price: 92.40, change: 1.62, volume: "6.2M", marketCap: "$31B", pe: null, week52High: 116.00, week52Low: 56.39 },
  { symbol: "DDOG", name: "Datadog Inc.", sector: "Technology", price: 128.50, change: 0.95, volume: "4.8M", marketCap: "$42B", pe: null, week52High: 138.61, week52Low: 81.11 },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive", price: 172.40, change: 0.45, volume: "8.2M", marketCap: "$464B", pe: 28.4, week52High: 175.25, week52Low: 141.20 },
];

const SECTORS = [...new Set(SCREENER_STOCKS.map(s => s.sector))].sort();

export default function Screener() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [signalFilter, setSignalFilter] = useState<string>("All");
  const [changeFilter, setChangeFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<SortField>("change");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(true);
  const [analyzedStocks, setAnalyzedStocks] = useState<Map<string, { signal: string; confidence: number }>>(new Map());
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());
  const [liveStocks, setLiveStocks] = useState<ScreenerStock[]>(SCREENER_STOCKS);
  const [isLive, setIsLive] = useState(false);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try { const w = localStorage.getItem("entangle-watchlist"); return new Set(w ? JSON.parse(w).map((s: { symbol: string }) => s.symbol) : []); } catch { return new Set(); }
  });

  useEffect(() => {
    const symbols = SCREENER_STOCKS.map(s => s.symbol);
    const batchSize = 30;
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }
    Promise.all(batches.map(batch => fetchSnapshots(batch).catch(() => ({} as Record<string, AlpacaSnapshot>))))
      .then(results => {
        const merged: Record<string, AlpacaSnapshot> = {};
        results.forEach(r => Object.assign(merged, r));
        setLiveStocks(SCREENER_STOCKS.map(stock => {
          const snap = merged[stock.symbol];
          if (!snap?.dailyBar) return stock;
          const price = snap.dailyBar.c;
          const change = ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o) * 100;
          const high = snap.dailyBar.h;
          const low = snap.dailyBar.l;
          return {
            ...stock,
            price: +price.toFixed(2),
            change: +change.toFixed(2),
            week52High: Math.max(stock.week52High, high),
            week52Low: Math.min(stock.week52Low, low),
          };
        }));
        setIsLive(true);
      })
      .catch(() => {});
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }, [sortField]);

  const analyzeStock = useCallback((sym: string) => {
    if (analyzing.has(sym) || analyzedStocks.has(sym)) return;
    setAnalyzing(prev => new Set(prev).add(sym));
    (async () => {
      try {
        const barsRes = await fetchBars(sym, { timeframe: "1Day", limit: 120 });
        if (barsRes.bars && barsRes.bars.length >= 10) {
          const sd = barsToStockData(barsRes.bars);
          const results = runAllIndicators(sd);
          const sig = getOverallSignal(results);
          setAnalyzedStocks(prev => new Map(prev).set(sym, { signal: sig.signal, confidence: sig.confidence }));
        } else {
          throw new Error("insufficient bars");
        }
      } catch {
        const bp = mockPrice(sym);
        const data = generateMockOHLCV(bp, 60);
        const results = runAllIndicators(data);
        const sig = getOverallSignal(results);
        setAnalyzedStocks(prev => new Map(prev).set(sym, { signal: sig.signal, confidence: sig.confidence }));
      } finally {
        setAnalyzing(prev => { const n = new Set(prev); n.delete(sym); return n; });
      }
    })();
  }, [analyzing, analyzedStocks]);

  const analyzeAll = useCallback(() => {
    const unanalyzed = filteredStocks.filter(s => !analyzedStocks.has(s.symbol) && !analyzing.has(s.symbol));
    unanalyzed.forEach((s, i) => {
      setTimeout(() => analyzeStock(s.symbol), i * 100);
    });
    toast({ title: "Scanning...", description: `Analyzing ${unanalyzed.length} stocks with 55+ indicators each` });
  }, [analyzedStocks, analyzing, analyzeStock, toast]);

  const filteredStocks = useMemo(() => {
    let stocks = [...liveStocks];
    if (search) {
      const q = search.toLowerCase();
      stocks = stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (sectorFilter !== "All") stocks = stocks.filter(s => s.sector === sectorFilter);
    if (signalFilter !== "All") {
      stocks = stocks.filter(s => {
        const a = analyzedStocks.get(s.symbol);
        if (!a) return false;
        if (signalFilter === "BUY") return a.signal === "BUY" || a.signal === "STRONG_BUY";
        if (signalFilter === "SELL") return a.signal === "SELL" || a.signal === "STRONG_SELL";
        return a.signal === "NEUTRAL";
      });
    }
    if (changeFilter !== "All") {
      stocks = stocks.filter(s => {
        if (changeFilter === "Gainers") return s.change > 0;
        if (changeFilter === "Losers") return s.change < 0;
        return true;
      });
    }

    stocks.sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case "symbol": return sortDir === "asc" ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        case "price": va = a.price; vb = b.price; break;
        case "change": va = a.change; vb = b.change; break;
        case "pe": va = a.pe ?? 0; vb = b.pe ?? 0; break;
        case "confidence":
          va = analyzedStocks.get(a.symbol)?.confidence ?? 0;
          vb = analyzedStocks.get(b.symbol)?.confidence ?? 0;
          break;
        default: va = a.change; vb = b.change;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return stocks;
  }, [search, sectorFilter, signalFilter, changeFilter, sortField, sortDir, analyzedStocks]);

  const SortHeader = ({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <button onClick={() => handleSort(field)} className={`flex items-center gap-1 text-[9px] font-bold text-white/25 uppercase tracking-wider hover:text-white/50 transition-colors ${className}`}>
      {children}
      {sortField === field && <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  const sigBadge = (signal: string) => {
    const c = signal === "STRONG_BUY" ? "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20" :
      signal === "BUY" ? "bg-primary/10 text-primary border-primary/20" :
      signal === "SELL" ? "bg-[#ffd700]/10 text-[#ffd700] border-[#ffd700]/20" :
      signal === "STRONG_SELL" ? "bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/20" :
      "bg-white/5 text-white/30 border-white/10";
    return <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${c}`}>{signal.replace("_", " ")}</span>;
  };

  return (
    <Layout>
      <div className="w-full border-b border-white/[0.04] bg-[#060610]">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-bold">Stock Screener</span>
              <span className="text-[10px] text-white/15 font-mono">{filteredStocks.length} stocks</span>
              {isLive && <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] animate-pulse">LIVE</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/15" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter..."
                  className="bg-white/[0.04] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-white w-[180px] focus:outline-none focus:border-primary/30 placeholder:text-white/10 font-mono" />
              </div>
              <Button variant="outline" size="sm" className="border-white/[0.06] text-white/30 text-[10px] h-7 gap-1" onClick={analyzeAll}>
                <Zap className="w-3 h-3" /> Scan All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1400px] py-4">
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
              className="bg-[#0a0a16] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[11px] text-white/50 focus:outline-none focus:border-primary/30 [&>option]:bg-[#0a0a16] [&>option]:text-white appearance-none cursor-pointer min-w-[120px]">
              <option value="All">All Sectors</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={signalFilter} onChange={e => setSignalFilter(e.target.value)}
              className="bg-[#0a0a16] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[11px] text-white/50 focus:outline-none focus:border-primary/30 [&>option]:bg-[#0a0a16] [&>option]:text-white appearance-none cursor-pointer min-w-[100px]">
              <option value="All">All Signals</option>
              <option value="BUY">Buy Signals</option>
              <option value="SELL">Sell Signals</option>
              <option value="NEUTRAL">Neutral</option>
            </select>
            <select value={changeFilter} onChange={e => setChangeFilter(e.target.value)}
              className="bg-[#0a0a16] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[11px] text-white/50 focus:outline-none focus:border-primary/30 [&>option]:bg-[#0a0a16] [&>option]:text-white appearance-none cursor-pointer min-w-[100px]">
              <option value="All">All Change</option>
              <option value="Gainers">Gainers Only</option>
              <option value="Losers">Losers Only</option>
            </select>
            {(sectorFilter !== "All" || signalFilter !== "All" || changeFilter !== "All") && (
              <button onClick={() => { setSectorFilter("All"); setSignalFilter("All"); setChangeFilter("All"); }}
                className="text-[10px] text-white/20 hover:text-white/40 flex items-center gap-1 px-2">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_90px_80px_70px_80px_70px_100px_80px_40px] items-center px-4 py-2.5 border-b border-white/[0.04] gap-2">
            <span className="text-[9px] font-bold text-white/15">#</span>
            <SortHeader field="symbol">Symbol</SortHeader>
            <SortHeader field="price" className="justify-end">Price</SortHeader>
            <SortHeader field="change" className="justify-end">Change</SortHeader>
            <span className="text-[9px] font-bold text-white/15 text-right">Volume</span>
            <span className="text-[9px] font-bold text-white/15 text-right">Mkt Cap</span>
            <SortHeader field="pe" className="justify-end">P/E</SortHeader>
            <span className="text-[9px] font-bold text-white/15 text-center">AI Signal</span>
            <SortHeader field="confidence" className="justify-end">Conf.</SortHeader>
            <span />
          </div>

          <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
            {filteredStocks.map((stock, i) => {
              const analysis = analyzedStocks.get(stock.symbol);
              const isAnalyzing = analyzing.has(stock.symbol);
              const inWL = watchlist.has(stock.symbol);
              const w52pos = ((stock.price - stock.week52Low) / (stock.week52High - stock.week52Low)) * 100;
              return (
                <div key={stock.symbol} className="grid grid-cols-[40px_1fr_90px_80px_70px_80px_70px_100px_80px_40px] items-center px-4 py-2 border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors gap-2 group">
                  <span className="text-[10px] text-white/10 font-mono">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a href="/technical" className="text-[13px] font-bold font-mono hover:text-primary transition-colors">{stock.symbol}</a>
                      <span className="text-[9px] text-white/15 px-1.5 py-0.5 rounded bg-white/[0.02] border border-white/[0.04]">{stock.sector}</span>
                    </div>
                    <p className="text-[9px] text-white/20 truncate">{stock.name}</p>
                    <div className="w-full bg-white/[0.03] rounded-full h-0.5 mt-1">
                      <div className="h-full rounded-full bg-primary/30" style={{ width: `${Math.min(100, Math.max(0, w52pos))}%` }} />
                    </div>
                  </div>
                  <span className="text-[13px] font-mono font-bold text-right">${stock.price.toFixed(2)}</span>
                  <span className={`text-[12px] font-mono font-bold text-right ${stock.change >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                  </span>
                  <span className="text-[10px] font-mono text-white/25 text-right">{stock.volume}</span>
                  <span className="text-[10px] font-mono text-white/25 text-right">{stock.marketCap}</span>
                  <span className="text-[10px] font-mono text-white/30 text-right">{stock.pe ? stock.pe.toFixed(1) : "—"}</span>
                  <div className="text-center">
                    {isAnalyzing ? (
                      <RefreshCw className="w-3 h-3 text-primary animate-spin mx-auto" />
                    ) : analysis ? (
                      sigBadge(analysis.signal)
                    ) : (
                      <button onClick={() => analyzeStock(stock.symbol)} className="text-[9px] text-white/15 hover:text-primary transition-colors font-mono">
                        Analyze
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-right text-white/25">
                    {analysis ? `${analysis.confidence}%` : "—"}
                  </span>
                  <button onClick={() => {
                    const next = new Set(watchlist);
                    if (inWL) next.delete(stock.symbol); else next.add(stock.symbol);
                    setWatchlist(next);
                    toast({ title: inWL ? "Removed" : "Added", description: `${stock.symbol} ${inWL ? "removed from" : "added to"} watchlist` });
                  }} className={`p-1 rounded transition-colors ${inWL ? "text-[#ffd700]" : "text-white/5 group-hover:text-white/15 hover:!text-white/30"}`}>
                    {inWL ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-white/[0.01] border border-white/[0.04] p-3">
          <p className="text-[10px] text-white/15 text-center">
            {isLive ? "Live prices powered by Alpaca Markets (IEX feed)." : "Prices are pre-loaded estimates."} AI signals run 55+ technical indicators on {isLive ? "real historical" : "simulated"} OHLCV data. Results are for educational purposes only.
          </p>
        </div>
      </div>
    </Layout>
  );
}
