import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  TrendingUp, TrendingDown, Activity, Globe, BarChart3,
  ArrowUpRight, ArrowDownRight, RefreshCw, Zap,
  DollarSign, Landmark, Fuel, Bitcoin, Wheat, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchSnapshots, fetchMovers, type AlpacaSnapshot, type AlpacaMover } from "@/lib/alpaca";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";

interface MarketIndex {
  name: string;
  ticker: string;
  value: number;
  change: number;
  changePercent: number;
}

interface SectorBlock {
  name: string;
  ticker: string;
  change: number;
  marketCap: string;
  volume: string;
  stocks: { symbol: string; change: number }[];
}

interface GlobalMarket {
  name: string;
  region: string;
  value: number;
  change: number;
}

interface EconIndicator {
  name: string;
  value: string;
  prev: string;
  status: "up" | "down" | "flat";
  date: string;
}

const INDICES: MarketIndex[] = [
  { name: "S&P 500", ticker: "SPX", value: 5248.49, change: 38.25, changePercent: 0.73 },
  { name: "NASDAQ Comp", ticker: "IXIC", value: 16399.52, change: 145.12, changePercent: 0.89 },
  { name: "Dow Jones", ticker: "DJI", value: 39127.14, change: 42.77, changePercent: 0.11 },
  { name: "Russell 2000", ticker: "RUT", value: 2070.13, change: 18.45, changePercent: 0.90 },
  { name: "VIX", ticker: "VIX", value: 14.32, change: 0.85, changePercent: 5.60 },
  { name: "10Y Treasury", ticker: "TNX", value: 4.28, change: 0.02, changePercent: 0.47 },
];

const SECTORS: SectorBlock[] = [
  { name: "Technology", ticker: "XLK", change: 1.84, marketCap: "$16.2T", volume: "High",
    stocks: [{ symbol: "NVDA", change: 4.2 }, { symbol: "AAPL", change: 0.3 }, { symbol: "MSFT", change: 1.1 }, { symbol: "AMD", change: 2.8 }, { symbol: "AVGO", change: 1.5 }, { symbol: "CRM", change: 0.9 }] },
  { name: "Healthcare", ticker: "XLV", change: 0.62, marketCap: "$7.1T", volume: "Normal",
    stocks: [{ symbol: "LLY", change: 1.8 }, { symbol: "UNH", change: 1.2 }, { symbol: "JNJ", change: 0.4 }, { symbol: "ABBV", change: 0.6 }, { symbol: "PFE", change: 2.1 }, { symbol: "MRNA", change: 3.4 }] },
  { name: "Financials", ticker: "XLF", change: 0.95, marketCap: "$8.4T", volume: "High",
    stocks: [{ symbol: "JPM", change: 1.2 }, { symbol: "BAC", change: 0.8 }, { symbol: "GS", change: 1.5 }, { symbol: "V", change: 0.4 }, { symbol: "MS", change: 0.9 }, { symbol: "C", change: 0.3 }] },
  { name: "Consumer Disc.", ticker: "XLY", change: 0.41, marketCap: "$6.8T", volume: "Normal",
    stocks: [{ symbol: "AMZN", change: 1.3 }, { symbol: "TSLA", change: 1.8 }, { symbol: "MCD", change: 0.2 }, { symbol: "NKE", change: 0.5 }, { symbol: "SBUX", change: 0.7 }, { symbol: "HD", change: 0.3 }] },
  { name: "Energy", ticker: "XLE", change: 1.23, marketCap: "$3.2T", volume: "Low",
    stocks: [{ symbol: "XOM", change: 1.5 }, { symbol: "CVX", change: 0.9 }, { symbol: "COP", change: 1.8 }, { symbol: "DVN", change: 2.1 }, { symbol: "HAL", change: 0.7 }, { symbol: "OXY", change: 1.2 }] },
  { name: "Industrials", ticker: "XLI", change: 0.72, marketCap: "$5.6T", volume: "High",
    stocks: [{ symbol: "CAT", change: 1.4 }, { symbol: "BA", change: 0.8 }, { symbol: "GE", change: 2.1 }, { symbol: "HON", change: 0.5 }, { symbol: "RKLB", change: 5.2 }, { symbol: "LMT", change: 0.3 }] },
  { name: "Comm. Services", ticker: "XLC", change: 1.15, marketCap: "$5.9T", volume: "High",
    stocks: [{ symbol: "META", change: 1.8 }, { symbol: "GOOGL", change: 1.2 }, { symbol: "NFLX", change: 2.4 }, { symbol: "DIS", change: 0.6 }, { symbol: "T", change: 0.1 }, { symbol: "SPOT", change: 3.1 }] },
  { name: "Real Estate", ticker: "XLRE", change: 0.38, marketCap: "$1.2T", volume: "Low",
    stocks: [{ symbol: "AMT", change: 0.2 }, { symbol: "PLD", change: 0.5 }, { symbol: "CCI", change: 0.3 }, { symbol: "O", change: 0.1 }, { symbol: "SPG", change: 0.4 }, { symbol: "EQIX", change: 0.8 }] },
  { name: "Utilities", ticker: "XLU", change: 0.18, marketCap: "$1.5T", volume: "Low",
    stocks: [{ symbol: "NEE", change: 0.4 }, { symbol: "DUK", change: 0.2 }, { symbol: "SO", change: 0.1 }, { symbol: "AEP", change: 0.3 }, { symbol: "D", change: 0.1 }, { symbol: "EXC", change: 0.2 }] },
  { name: "Consumer Def.", ticker: "XLP", change: 0.34, marketCap: "$4.1T", volume: "Normal",
    stocks: [{ symbol: "PG", change: 0.5 }, { symbol: "KO", change: 0.2 }, { symbol: "PEP", change: 0.1 }, { symbol: "COST", change: 0.8 }, { symbol: "WMT", change: 0.4 }, { symbol: "PM", change: 0.6 }] },
  { name: "Materials", ticker: "XLB", change: 0.52, marketCap: "$1.8T", volume: "Normal",
    stocks: [{ symbol: "LIN", change: 0.3 }, { symbol: "APD", change: 0.7 }, { symbol: "SHW", change: 0.2 }, { symbol: "FCX", change: 1.4 }, { symbol: "NEM", change: 1.1 }, { symbol: "DOW", change: 0.5 }] },
];

const GLOBAL_MARKETS: GlobalMarket[] = [
  { name: "EUR/USD", region: "Forex", value: 1.0842, change: 0.15 },
  { name: "GBP/USD", region: "Forex", value: 1.2654, change: 0.08 },
  { name: "USD/JPY", region: "Forex", value: 151.42, change: 0.22 },
  { name: "Bitcoin", region: "Crypto", value: 69420.50, change: 2.34 },
  { name: "Ethereum", region: "Crypto", value: 3485.20, change: 1.87 },
  { name: "Gold", region: "Commodity", value: 2345.80, change: 0.42 },
  { name: "Crude Oil", region: "Commodity", value: 78.65, change: 1.12 },
  { name: "Natural Gas", region: "Commodity", value: 1.82, change: 2.45 },
  { name: "Silver", region: "Commodity", value: 27.85, change: 0.68 },
  { name: "S&P Futures", region: "Futures", value: 5252.25, change: 0.12 },
  { name: "NASDAQ Fut.", region: "Futures", value: 18245.50, change: 0.24 },
  { name: "Nikkei 225", region: "Asia", value: 40168.07, change: 0.32 },
  { name: "FTSE 100", region: "Europe", value: 7952.62, change: 0.45 },
  { name: "DAX", region: "Europe", value: 18492.49, change: 0.58 },
  { name: "Hang Seng", region: "Asia", value: 16541.42, change: 1.24 },
];

const ECON_INDICATORS: EconIndicator[] = [
  { name: "GDP Growth", value: "3.4%", prev: "4.9%", status: "down", date: "Q4 2024" },
  { name: "CPI (YoY)", value: "3.2%", prev: "3.4%", status: "down", date: "Feb 2025" },
  { name: "Unemployment", value: "3.9%", prev: "3.7%", status: "up", date: "Feb 2025" },
  { name: "Fed Rate", value: "5.25-5.50%", prev: "5.25-5.50%", status: "flat", date: "Current" },
  { name: "PCE Core", value: "2.8%", prev: "2.9%", status: "down", date: "Jan 2025" },
  { name: "10Y Yield", value: "4.28%", prev: "4.25%", status: "up", date: "Live" },
];

const TOP_GAINERS = [
  { symbol: "SMCI", name: "Super Micro", change: 8.42, price: 892.50 },
  { symbol: "RKLB", name: "Rocket Lab", change: 5.18, price: 18.45 },
  { symbol: "NVDA", name: "NVIDIA", change: 4.22, price: 878.35 },
  { symbol: "MRNA", name: "Moderna", change: 3.41, price: 102.80 },
  { symbol: "NFLX", name: "Netflix", change: 2.85, price: 618.20 },
  { symbol: "COIN", name: "Coinbase", change: 2.64, price: 245.30 },
  { symbol: "ARM", name: "Arm Holdings", change: 2.31, price: 142.70 },
  { symbol: "SPOT", name: "Spotify", change: 2.12, price: 285.40 },
];

const TOP_LOSERS = [
  { symbol: "PLUG", name: "Plug Power", change: 6.82, price: 3.45 },
  { symbol: "LCID", name: "Lucid Group", change: 4.15, price: 2.78 },
  { symbol: "DVN", name: "Devon Energy", change: 2.14, price: 44.20 },
  { symbol: "PFE", name: "Pfizer", change: 2.08, price: 26.85 },
  { symbol: "NIO", name: "NIO Inc.", change: 1.92, price: 5.12 },
  { symbol: "TSLA", name: "Tesla", change: 1.78, price: 195.30 },
  { symbol: "COP", name: "ConocoPhillips", change: 1.54, price: 112.40 },
  { symbol: "XOM", name: "Exxon Mobil", change: 1.48, price: 104.65 },
];

function heatColor(change: number): string {
  if (change >= 3) return "bg-[#00ff88] text-black";
  if (change >= 1.5) return "bg-[#00ff88]/70 text-black";
  if (change >= 0.5) return "bg-[#00ff88]/40 text-white";
  if (change > 0) return "bg-[#00ff88]/20 text-[#00ff88]";
  if (change === 0) return "bg-white/5 text-white/40";
  if (change > -0.5) return "bg-[#ff3366]/20 text-[#ff3366]";
  if (change > -1.5) return "bg-[#ff3366]/40 text-white";
  if (change > -3) return "bg-[#ff3366]/70 text-white";
  return "bg-[#ff3366] text-white";
}

function sectorHeatBg(change: number): string {
  if (change >= 1.5) return "from-[#00ff88]/25 to-[#00ff88]/5";
  if (change >= 0.5) return "from-[#00ff88]/15 to-[#00ff88]/3";
  if (change > 0) return "from-[#00ff88]/8 to-transparent";
  if (change > -0.5) return "from-[#ff3366]/8 to-transparent";
  if (change > -1.5) return "from-[#ff3366]/15 to-[#ff3366]/3";
  return "from-[#ff3366]/25 to-[#ff3366]/5";
}

export default function MarketOverview() {
  const { toast } = useToast();
  const [clock, setClock] = useState(new Date());
  const [marketStatus] = useState<"open" | "pre" | "after" | "closed">("open");
  const [liveSnapshots, setLiveSnapshots] = useState<Record<string, AlpacaSnapshot>>({});
  const [liveMovers, setLiveMovers] = useState<{ gainers: AlpacaMover[]; losers: AlpacaMover[] } | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const allSectorSymbols = useMemo(() => {
    const syms = new Set<string>();
    SECTORS.forEach(s => s.stocks.forEach(st => syms.add(st.symbol)));
    return [...syms];
  }, []);

  const loadLiveData = useCallback(async () => {
    setLiveLoading(true);
    setIsLive(false);
    try {
      const [snaps, movers] = await Promise.all([
        fetchSnapshots(allSectorSymbols),
        fetchMovers(),
      ]);
      setLiveSnapshots(snaps);
      setLiveMovers({ gainers: movers.gainers, losers: movers.losers });
      setIsLive(true);
    } catch {
      setIsLive(false);
    } finally {
      setLiveLoading(false);
    }
  }, [allSectorSymbols]);

  useEffect(() => { loadLiveData(); }, [loadLiveData]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const liveSectors = useMemo(() => {
    if (!isLive) return SECTORS;
    return SECTORS.map(sector => {
      const stocks = sector.stocks.map(st => {
        const snap = liveSnapshots[st.symbol];
        if (!snap?.dailyBar) return st;
        const change = ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o) * 100;
        return { ...st, change: +change.toFixed(2) };
      });
      const avgChange = stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length;
      return { ...sector, stocks, change: +avgChange.toFixed(2) };
    });
  }, [isLive, liveSnapshots]);

  const liveGainers = useMemo(() => {
    if (liveMovers) return liveMovers.gainers.slice(0, 8).map(m => ({
      symbol: m.symbol, name: m.symbol, change: +m.change.toFixed(2), price: +m.price.toFixed(2),
    }));
    return TOP_GAINERS;
  }, [liveMovers]);

  const liveLosers = useMemo(() => {
    if (liveMovers) return liveMovers.losers.slice(0, 8).map(m => ({
      symbol: m.symbol, name: m.symbol, change: +Math.abs(m.change).toFixed(2), price: +m.price.toFixed(2),
    }));
    return TOP_LOSERS;
  }, [liveMovers]);

  const advDecl = useMemo(() => {
    let adv = 0, decl = 0;
    liveSectors.forEach(s => s.stocks.forEach(st => st.change >= 0 ? adv++ : decl++));
    return { adv, decl, ratio: (adv / (adv + decl) * 100).toFixed(0) };
  }, [liveSectors]);

  return (
    <Layout>
      <FinancialDisclaimerBanner pageKey="market-overview" />
      <div className="w-full border-b border-white/[0.04] bg-[#060610]">
        <div className="container mx-auto px-4 max-w-[1600px]">
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-bold">Market Overview</span>
              {isLive && <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] animate-pulse">LIVE</span>}
              {liveLoading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${marketStatus === "open" ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ffd700]/10 text-[#ffd700]"}`}>
                {marketStatus === "open" ? "MARKET OPEN" : "PRE-MARKET"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-mono text-white/40">
                {clock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} ET
              </span>
              <span className="text-[10px] text-white/50">A/D: <span className="text-[#00ff88]">{advDecl.adv}</span>/<span className="text-[#ff3366]">{advDecl.decl}</span> ({advDecl.ratio}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1600px] py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {INDICES.map(idx => (
            <div key={idx.ticker} className="bg-[#0a0a16] border border-white/[0.06] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/30 font-bold">{idx.ticker}</span>
                {idx.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3 text-[#00ff88]" /> : <ArrowDownRight className="w-3 h-3 text-[#ff3366]" />}
              </div>
              <p className="text-[16px] font-black font-mono">{idx.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[11px] font-mono font-bold ${idx.changePercent >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                  {idx.change >= 0 ? "+" : ""}{Math.abs(idx.change).toFixed(2)}
                </span>
                <span className={`text-[10px] font-mono ${idx.changePercent >= 0 ? "text-[#00ff88]/60" : "text-[#ff3366]/60"}`}>
                  ({idx.changePercent >= 0 ? "+" : ""}{Math.abs(idx.changePercent).toFixed(2)}%)
                </span>
              </div>
              <p className="text-[9px] text-white/40 mt-1">{idx.name}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-5">
          {ECON_INDICATORS.map(e => (
            <div key={e.name} className="bg-[#0a0a16] border border-white/[0.04] rounded-lg px-3 py-2">
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">{e.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[14px] font-black font-mono">{e.value}</span>
                {e.status === "up" ? <ArrowUpRight className="w-3 h-3 text-[#ff3366]" /> : e.status === "down" ? <ArrowDownRight className="w-3 h-3 text-[#00ff88]" /> : <Activity className="w-3 h-3 text-white/40" />}
              </div>
              <p className="text-[8px] text-white/10 mt-0.5">Prev: {e.prev} · {e.date}</p>
            </div>
          ))}
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary/60" />
            <span className="text-[12px] font-bold text-white/50">SECTOR HEAT MAP</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {liveSectors.slice(0, 9).map(sector => (
              <div key={sector.ticker} className={`bg-gradient-to-br ${sectorHeatBg(sector.change)} bg-[#0a0a16] border border-white/[0.04] rounded-xl p-3 hover:border-white/10 transition-all`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[12px] font-bold">{sector.name}</span>
                    <span className="text-[9px] text-white/40 ml-2 font-mono">{sector.ticker}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/40">{sector.volume} vol</span>
                    <span className={`text-[13px] font-black font-mono ${sector.change >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                      {sector.change >= 0 ? "+" : ""}{Math.abs(sector.change).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {sector.stocks.map(st => (
                    <div key={st.symbol} className={`rounded-md px-1.5 py-1.5 text-center ${heatColor(st.change)}`}>
                      <p className="text-[9px] font-bold font-mono leading-none">{st.symbol}</p>
                      <p className="text-[8px] font-mono leading-none mt-0.5">{st.change >= 0 ? "+" : ""}{Math.abs(st.change)}%</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[8px] text-white/10">
                  <span>MCap: {sector.marketCap}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-[#0a0a16] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
              <TrendingUp className="w-3.5 h-3.5 text-[#00ff88]/60" />
              <span className="text-[11px] font-bold text-white/50">TOP GAINERS</span>
            </div>
            <div>
              {liveGainers.map((s, i) => (
                <div key={s.symbol} className="flex items-center px-4 py-2 border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <span className="text-[10px] text-white/10 font-mono w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-bold font-mono">{s.symbol}</span>
                    <span className="text-[10px] text-white/50 ml-2">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/40 mr-3">${s.price.toFixed(2)}</span>
                  <span className="text-[12px] font-mono font-bold text-[#00ff88]">+{s.change.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0a0a16] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
              <TrendingDown className="w-3.5 h-3.5 text-[#ff3366]/60" />
              <span className="text-[11px] font-bold text-white/50">TOP LOSERS</span>
            </div>
            <div>
              {liveLosers.map((s, i) => (
                <div key={s.symbol} className="flex items-center px-4 py-2 border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <span className="text-[10px] text-white/10 font-mono w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-bold font-mono">{s.symbol}</span>
                    <span className="text-[10px] text-white/50 ml-2">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/40 mr-3">${s.price.toFixed(2)}</span>
                  <span className="text-[12px] font-mono font-bold text-[#ff3366]">{s.change.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary/60" />
            <span className="text-[12px] font-bold text-white/50">GLOBAL MARKETS & ASSETS</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {GLOBAL_MARKETS.map(m => (
              <div key={m.name} className="bg-[#0a0a16] border border-white/[0.04] rounded-lg px-3 py-2.5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-white/40 font-bold uppercase">{m.region}</span>
                  {m.change >= 0 ? <ArrowUpRight className="w-2.5 h-2.5 text-[#00ff88]/50" /> : <ArrowDownRight className="w-2.5 h-2.5 text-[#ff3366]/50" />}
                </div>
                <p className="text-[11px] font-bold truncate">{m.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px] font-black font-mono">{m.value >= 1000 ? m.value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : m.value.toFixed(m.value < 10 ? 4 : 2)}</span>
                  <span className={`text-[10px] font-mono font-bold ${m.change >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                    {m.change >= 0 ? "+" : ""}{Math.abs(m.change).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white/[0.01] border border-white/[0.04] p-3">
          <p className="text-[10px] text-white/50 text-center">
            {isLive ? "Live market data powered by Alpaca Markets. Stock prices and heat map reflect real-time trading data via IEX feed." : "Loading live data... Falling back to illustrative values."} Economic indicators and global markets are for reference only.
          </p>
        </div>
      </div>
    </Layout>
  );
}
