import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { QuantumViz } from "@/components/QuantumViz";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SignalHistory } from "@/components/SignalHistory";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { stockAlerts, optionsAlerts, unusualOptionsActivity, optionsIncomeData, agentLogMessages } from "@/lib/mock-data";
import { authFetch } from "@/lib/authFetch";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Activity, Zap, Minus, TrendingUp, Shield, RefreshCw, Search, BarChart3, X, Terminal, Globe, Layers, Clock, Keyboard, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { generateMockOHLCV, runAllIndicators, getOverallSignal } from "@/lib/indicators";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { FinishSetupNudge } from "@/components/FinishSetupNudge";

const DASHBOARD_STOCKS: { symbol: string; name: string }[] = [
  { symbol: "AAPL", name: "Apple Inc." }, { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." }, { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" }, { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla Inc." }, { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "NFLX", name: "Netflix Inc." }, { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "RKLB", name: "Rocket Lab USA" }, { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "SOFI", name: "SoFi Technologies" }, { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "LCID", name: "Lucid Group" }, { symbol: "NIO", name: "NIO Inc." },
  { symbol: "COIN", name: "Coinbase Global" }, { symbol: "SNOW", name: "Snowflake Inc." },
  { symbol: "SQ", name: "Block Inc." }, { symbol: "SHOP", name: "Shopify Inc." },
  { symbol: "ROKU", name: "Roku Inc." }, { symbol: "DKNG", name: "DraftKings" },
  { symbol: "HOOD", name: "Robinhood Markets" }, { symbol: "UBER", name: "Uber Technologies" },
  { symbol: "ABNB", name: "Airbnb Inc." }, { symbol: "SPOT", name: "Spotify Technology" },
  { symbol: "JPM", name: "JPMorgan Chase" }, { symbol: "V", name: "Visa Inc." },
  { symbol: "UNH", name: "UnitedHealth Group" }, { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "PG", name: "Procter & Gamble" }, { symbol: "DIS", name: "Walt Disney" },
  { symbol: "COST", name: "Costco Wholesale" }, { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "PYPL", name: "PayPal Holdings" }, { symbol: "BA", name: "Boeing Co." },
  { symbol: "AVGO", name: "Broadcom Inc." }, { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ADBE", name: "Adobe Inc." }, { symbol: "QCOM", name: "QUALCOMM Inc." },
  { symbol: "MU", name: "Micron Technology" }, { symbol: "PANW", name: "Palo Alto Networks" },
  { symbol: "CRWD", name: "CrowdStrike Holdings" }, { symbol: "NET", name: "Cloudflare Inc." },
  { symbol: "SMCI", name: "Super Micro Computer" }, { symbol: "ARM", name: "Arm Holdings" },
  { symbol: "MARA", name: "Marathon Digital" }, { symbol: "RIOT", name: "Riot Platforms" },
  { symbol: "LLY", name: "Eli Lilly" }, { symbol: "MRNA", name: "Moderna Inc." },
  { symbol: "XOM", name: "Exxon Mobil" }, { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "GS", name: "Goldman Sachs" }, { symbol: "BAC", name: "Bank of America" },
  { symbol: "WMT", name: "Walmart Inc." }, { symbol: "MCD", name: "McDonald's Corp." },
];

interface QuickAnalysis {
  symbol: string;
  name: string;
  signal: string;
  confidence: number;
  buyCount: number;
  sellCount: number;
}

const MULTI_ASSET_DATA = {
  crypto: [
    { symbol: "BTC", name: "Bitcoin", price: 97450.20, change: 2.34 },
    { symbol: "ETH", name: "Ethereum", price: 3842.15, change: 1.87 },
    { symbol: "SOL", name: "Solana", price: 248.90, change: 4.12 },
    { symbol: "XRP", name: "Ripple", price: 2.48, change: 0.95 },
    { symbol: "ADA", name: "Cardano", price: 0.82, change: 1.23 },
    { symbol: "DOGE", name: "Dogecoin", price: 0.187, change: 2.15 },
  ],
  forex: [
    { symbol: "EUR/USD", price: 1.0842, change: 0.12 },
    { symbol: "GBP/USD", price: 1.2715, change: 0.08 },
    { symbol: "USD/JPY", price: 151.42, change: 0.34 },
    { symbol: "USD/CHF", price: 0.8845, change: 0.05 },
    { symbol: "AUD/USD", price: 0.6612, change: 0.22 },
    { symbol: "USD/CAD", price: 1.3648, change: 0.18 },
  ],
  commodities: [
    { symbol: "GOLD", name: "Gold", price: 2385.40, change: 0.42, unit: "/oz" },
    { symbol: "SILVER", name: "Silver", price: 28.92, change: 1.15, unit: "/oz" },
    { symbol: "WTI", name: "Crude Oil", price: 78.45, change: 1.23, unit: "/bbl" },
    { symbol: "BRENT", name: "Brent", price: 82.30, change: 0.98, unit: "/bbl" },
    { symbol: "NATGAS", name: "Nat Gas", price: 2.84, change: 3.45, unit: "/MMBtu" },
    { symbol: "COPPER", name: "Copper", price: 4.52, change: 0.67, unit: "/lb" },
  ],
  bonds: [
    { symbol: "US2Y", name: "2Y Treasury", yield: 4.72, change: 0.03 },
    { symbol: "US5Y", name: "5Y Treasury", yield: 4.35, change: 0.02 },
    { symbol: "US10Y", name: "10Y Treasury", yield: 4.28, change: 0.02 },
    { symbol: "US30Y", name: "30Y Treasury", yield: 4.45, change: 0.01 },
    { symbol: "TIPS10", name: "10Y TIPS", yield: 2.15, change: 0.01 },
    { symbol: "HYG", name: "HY Spread", yield: 3.42, change: 0.05 },
  ],
};

const MARKET_INTERNALS = {
  advDecl: { advancing: 1842, declining: 1156, unchanged: 247, ratio: 1.59 },
  tick: { current: 245, high: 892, low: 654 },
  trin: { value: 0.85, signal: "Bullish" },
  putCall: { ratio: 0.72, equity: 0.65, index: 1.12 },
  vix: { current: 14.32, change: -5.6, percentile: 22 },
  breadth: { above50sma: 62.4, above200sma: 71.2, newHighs: 148, newLows: 42 },
};

const STARTING_CASH = 100_000;

interface PaperPortfolio {
  cashBalance: number;
  positions: { id: number; symbol: string; quantity: number; avgCost: number }[];
  trades: { id: number; symbol: string; side: string; quantity: number; price: number; totalCost: number; createdAt: string }[];
  portfolioValue: number;
  totalValue: number;
}

const emptyPortfolio: PaperPortfolio = {
  cashBalance: STARTING_CASH,
  positions: [],
  trades: [],
  portfolioValue: 0,
  totalValue: STARTING_CASH,
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0a0a0f] border border-white/[0.06] rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ title, icon, rightContent }: { title: string; icon?: React.ReactNode; rightContent?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
      <div className="flex items-center gap-2">
        {icon && <span className="text-white/35">{icon}</span>}
        <span className="text-sm font-semibold text-white/60">{title}</span>
      </div>
      {rightContent}
    </div>
  );
}

function DataRow({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 hover:bg-white/[0.02] transition-colors">
      <span className="text-xs text-white/40 font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium text-white/80">{value}</span>
        {change !== undefined && (
          <span className={`text-[10px] font-mono font-semibold ${change >= 0 ? 'text-[#00D4FF]' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

type SecondaryTab = "signals" | "options" | "market" | "calendar";

export default function Dashboard() {
  const { toast } = useToast();
  const { isSignedIn, getToken } = useAuth();
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(emptyPortfolio);
  const [tradeSymbol, setTradeSymbol] = useState("");
  const [tradeQty, setTradeQty] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [quickAnalysis, setQuickAnalysis] = useState<QuickAnalysis | null>(null);
  const [analyzingSymbol, setAnalyzingSymbol] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeAssetTab, setActiveAssetTab] = useState<"crypto" | "forex" | "commodities" | "bonds">("crypto");
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>("signals");
  const [clock, setClock] = useState("");
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const qaIdRef = useRef(0);
  const qaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { trackEvent("dashboard_viewed"); }, []);

  const loadPortfolio = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/portfolio", getToken);
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch { /* not signed in or auth error */ }
  }, [isSignedIn, getToken]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const executeTrade = useCallback(async () => {
    if (!tradeSymbol.trim() || !tradeQty || !tradePrice) {
      toast({ title: "Missing fields", description: "Enter symbol, quantity, and price", variant: "destructive" });
      return;
    }
    setTradeLoading(true);
    try {
      const res = await authFetch("/paper-trading/trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: tradeSymbol.toUpperCase(), side: tradeSide, quantity: Number(tradeQty), price: Number(tradePrice) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Trade Executed", description: data.message });
        setTradeSymbol("");
        setTradeQty("");
        setTradePrice("");
        loadPortfolio();
      } else {
        toast({ title: "Trade Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Trade Failed", description: "Please sign in to trade", variant: "destructive" });
    } finally {
      setTradeLoading(false);
    }
  }, [tradeSymbol, tradeQty, tradePrice, tradeSide, getToken, toast, loadPortfolio]);

  const resetPortfolio = useCallback(async () => {
    try {
      const res = await authFetch("/paper-trading/reset", getToken, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Portfolio Reset", description: data.message });
        loadPortfolio();
      }
    } catch {
      toast({ title: "Reset Failed", description: "Please try again", variant: "destructive" });
    }
  }, [getToken, toast, loadPortfolio]);

  const pnl = portfolio.totalValue - STARTING_CASH;
  const pnlPct = ((pnl / STARTING_CASH) * 100).toFixed(2);
  const portfolioChartPoints = portfolio.trades.length > 0
    ? portfolio.trades.slice().reverse().slice(0, 8).map((t, i) => ({
        time: new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: STARTING_CASH + (pnl * ((i + 1) / Math.max(portfolio.trades.length, 1))),
      }))
    : [{ time: "Now", value: 0 }];

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) { setShowShortcuts(v => !v); return; }
      if (e.key === "Escape") { setShowShortcuts(false); setQuickAnalysis(null); return; }
      if (e.key === "1") navigate("/dashboard");
      if (e.key === "2") navigate("/terminal");
      if (e.key === "3") navigate("/market-overview");
      if (e.key === "4") navigate("/technical");
      if (e.key === "5") navigate("/stocks");
      if (e.key === "6") navigate("/screener");
      if (e.key === "7") navigate("/options");
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-cmd-search]')?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  useEffect(() => { return () => { if (qaTimerRef.current) clearTimeout(qaTimerRef.current); }; }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return DASHBOARD_STOCKS.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  const runQuickAnalysis = useCallback((sym: string) => {
    const info = DASHBOARD_STOCKS.find(s => s.symbol === sym);
    if (qaTimerRef.current) clearTimeout(qaTimerRef.current);
    const id = ++qaIdRef.current;
    setAnalyzingSymbol(sym);
    setShowSearchDropdown(false);
    qaTimerRef.current = setTimeout(() => {
      if (qaIdRef.current !== id) return;
      const bp = 50 + Math.abs([...sym].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0) % 900) + Math.random() * 5;
      const data = generateMockOHLCV(bp, 60);
      const results = runAllIndicators(data);
      const sig = getOverallSignal(results);
      setQuickAnalysis({ symbol: sym, name: info?.name || sym, signal: sig.signal, confidence: sig.confidence, buyCount: sig.buyCount, sellCount: sig.sellCount });
      setAnalyzingSymbol("");
      toast({ title: `${sym} Analysis Complete`, description: `${sig.signal.replace("_", " ")} — ${sig.confidence}% confidence` });
    }, 700);
  }, [toast]);

  const todayOptionsIncome = optionsIncomeData[optionsIncomeData.length - 1].income;

  const isMarketOpen = (() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const min = now.getUTCMinutes();
    const day = now.getUTCDay();
    if (day === 0 || day === 6) return false;
    const totalMin = hour * 60 + min;
    return totalMin >= 13 * 60 + 30 && totalMin < 20 * 60;
  })();

  const SECONDARY_TABS: { key: SecondaryTab; label: string }[] = [
    { key: "signals", label: "Stock Signals" },
    { key: "options", label: "Options Flow" },
    { key: "market", label: "Market Data" },
    { key: "calendar", label: "Calendar" },
  ];

  return (
    <Layout>
      <PageErrorBoundary fallbackTitle="Dashboard encountered an error">
      <FlashCouncil />
      <MarketTicker />
      <FinancialDisclaimerBanner pageKey="dashboard" />

      {/* Command Bar */}
      <div className="bg-[#040408] border-b border-white/[0.05] px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMarketOpen ? 'bg-[#00D4FF]' : 'bg-[#FFD700]'} opacity-60`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? 'bg-[#00D4FF]' : 'bg-[#FFD700]'}`} />
            </span>
            <span className={`text-[10px] font-mono font-semibold tracking-wider ${isMarketOpen ? 'text-[#00D4FF]' : 'text-[#FFD700]'}`}>
              {isMarketOpen ? "Market Open" : "Market Closed"}
            </span>
          </div>
          <span className="text-[9px] font-mono text-white/20 hidden sm:inline">Simulated data · for practice only</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              data-cmd-search
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) { e.preventDefault(); runQuickAnalysis(searchQuery.toUpperCase().trim()); } }}
              className="w-44 h-7 pl-7 pr-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors"
            />
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a14] border border-white/10 rounded-xl z-50 shadow-2xl overflow-hidden">
                {searchResults.map(s => (
                  <button key={s.symbol} onClick={() => { setSearchQuery(s.symbol); runQuickAnalysis(s.symbol); }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-primary/[0.06] transition-colors border-b border-white/[0.03] last:border-0">
                    <span className="text-xs font-bold font-mono text-primary">{s.symbol}</span>
                    <span className="text-[10px] text-white/30 truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowShortcuts(v => !v)} aria-label="Keyboard shortcuts" className="text-white/25 hover:text-white/50 transition-colors">
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-white/20" />
            <span className="text-[11px] font-mono font-semibold text-white/50 tabular-nums">{clock}</span>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="bg-[#0a0a14] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-bold text-white">Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close" className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {[
                ["/", "Focus search"],
                ["1", "Dashboard"],
                ["2", "Terminal"],
                ["3", "Markets"],
                ["4", "Technical Analysis"],
                ["5", "Stocks"],
                ["6", "Screener"],
                ["?", "Toggle shortcuts"],
                ["Esc", "Close / Dismiss"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="min-w-[28px] text-center px-1.5 py-0.5 bg-white/[0.06] border border-white/10 rounded text-[10px] font-mono font-bold text-white/50">{key}</kbd>
                  <span className="text-xs text-white/40">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4 max-w-[1600px] mx-auto w-full">

        {/* Section 1: Hero — Portfolio + Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Portfolio",
              value: `$${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              sub: `${pnl >= 0 ? '+' : ''}${Math.abs(parseFloat(pnlPct)).toFixed(2)}% P&L`,
              color: pnl >= 0 ? "#00D4FF" : "#ff4757",
              isPositive: pnl >= 0,
            },
            {
              label: "Options Income",
              value: `+$${todayOptionsIncome}`,
              sub: "Theta today",
              color: "#FFD700",
              isPositive: true,
            },
            {
              label: "VIX",
              value: MARKET_INTERNALS.vix.current.toFixed(2),
              sub: `${MARKET_INTERNALS.vix.change > 0 ? '+' : ''}${MARKET_INTERNALS.vix.change}% · ${MARKET_INTERNALS.vix.percentile}th %ile`,
              color: MARKET_INTERNALS.vix.change > 0 ? "#ff4757" : "#00D4FF",
              isPositive: MARKET_INTERNALS.vix.change <= 0,
            },
            {
              label: "A/D Ratio",
              value: MARKET_INTERNALS.advDecl.ratio.toFixed(2),
              sub: `${MARKET_INTERNALS.advDecl.advancing} adv / ${MARKET_INTERNALS.advDecl.declining} dec`,
              color: MARKET_INTERNALS.advDecl.ratio > 1 ? "#00D4FF" : "#ff4757",
              isPositive: MARKET_INTERNALS.advDecl.ratio > 1,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0f] border border-white/[0.06] rounded-xl px-4 py-4">
              <p className="text-xs font-medium text-white/50 mb-1.5">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-white/35 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Analysis result */}
        {(quickAnalysis || analyzingSymbol) && (
          <Panel>
            <PanelHeader title="Quick Analysis" icon={<BarChart3 className="w-3.5 h-3.5" />} rightContent={
              <button onClick={() => { setQuickAnalysis(null); setAnalyzingSymbol(""); }} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
            } />
            <div className="px-4 py-4">
              {analyzingSymbol ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-white/60">Running 55+ indicators on {analyzingSymbol}...</span>
                </div>
              ) : quickAnalysis && (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${quickAnalysis.signal.includes("BUY") ? "text-[#00D4FF]" : quickAnalysis.signal.includes("SELL") ? "text-red-400" : "text-[#FFD700]"}`}>{quickAnalysis.confidence}%</p>
                      <p className="text-xs text-white/35 mt-0.5">Confidence</p>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-bold text-white">{quickAnalysis.symbol}</span>
                        <span className="text-sm text-white/30">{quickAnalysis.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${quickAnalysis.signal.includes("BUY") ? "bg-primary/10 text-primary" : quickAnalysis.signal.includes("SELL") ? "bg-red-400/10 text-red-400" : "bg-[#FFD700]/10 text-[#FFD700]"}`}>
                          {quickAnalysis.signal.replace("_", " ")}
                        </span>
                        <span className="text-xs text-primary/70">{quickAnalysis.buyCount} buy signals</span>
                        <span className="text-xs text-red-400/70">{quickAnalysis.sellCount} sell signals</span>
                      </div>
                    </div>
                  </div>
                  <Link href="/technical" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                    Full Analysis →
                  </Link>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Nudge — setup reminder only (highest priority) */}
        <div className="grid grid-cols-12 gap-3">
          <FinishSetupNudge />
        </div>

        {/* Section 2: Hero Panels — QuantumViz + Portfolio + Watchlist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Panel>
              <PanelHeader title="Signal Matrix" icon={<Activity className="w-3.5 h-3.5" />} rightContent={
                <span className="text-xs text-white/30">6 models · consensus view</span>
              } />
              <div className="p-4">
                <QuantumViz />
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Paper Portfolio" icon={<TrendingUp className="w-3.5 h-3.5" />} rightContent={
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${pnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}{Math.abs(parseFloat(pnlPct)).toFixed(2)}%
                  </span>
                  <button onClick={() => setShowTradePanel(v => !v)} className="text-xs font-semibold text-primary/70 hover:text-primary transition-colors border border-primary/20 rounded-lg px-2.5 py-1">
                    {showTradePanel ? "View Chart" : "Trade"}
                  </button>
                </div>
              } />
              <div className="p-4">
                {showTradePanel ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Cash", value: `$${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-primary" },
                        { label: "Positions", value: `$${portfolio.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-white/70" },
                        { label: "Total", value: `$${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-white" },
                        { label: "P&L", value: `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: pnl >= 0 ? "text-primary" : "text-red-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
                          <p className="text-xs text-white/35 mb-1">{s.label}</p>
                          <p className={`text-sm font-semibold font-mono ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setTradeSide("buy")} className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${tradeSide === "buy" ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/[0.03] text-white/40 border border-white/[0.06]"}`}>Buy</button>
                      <button onClick={() => setTradeSide("sell")} className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${tradeSide === "sell" ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-white/[0.03] text-white/40 border border-white/[0.06]"}`}>Sell</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input aria-label="Ticker symbol" value={tradeSymbol} onChange={e => setTradeSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="h-9 px-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors" />
                      <input aria-label="Quantity" value={tradeQty} onChange={e => setTradeQty(e.target.value)} placeholder="Qty" type="number" min="1" className="h-9 px-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors" />
                      <input aria-label="Price per share" value={tradePrice} onChange={e => setTradePrice(e.target.value)} placeholder="Price" type="number" step="0.01" min="0.01" className="h-9 px-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={executeTrade} disabled={tradeLoading || !isSignedIn} aria-label={`${tradeSide === "buy" ? "Buy" : "Sell"} order`} className={`flex-1 h-10 text-sm font-bold rounded-xl active:scale-[0.97] transition-all duration-150 ${tradeSide === "buy" ? "bg-primary text-black hover:bg-primary/90" : "bg-red-500 text-white hover:bg-red-500/90"} disabled:opacity-40 disabled:cursor-not-allowed`}>
                        {tradeLoading ? <span className="flex items-center justify-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Executing...</span> : `${tradeSide === "buy" ? "Buy" : "Sell"} Order`}
                      </button>
                      <button onClick={resetPortfolio} title="Reset portfolio to $100,000" className="px-4 h-10 text-sm font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:text-white/60 hover:border-white/10 transition-colors active:scale-[0.98]">
                        Reset
                      </button>
                    </div>
                    {portfolio.positions.length > 0 && (
                      <div className="border-t border-white/[0.06] pt-3">
                        <p className="text-xs text-white/35 mb-2">Open Positions</p>
                        {portfolio.positions.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                            <span className="text-sm font-semibold text-primary">{p.symbol}</span>
                            <span className="text-xs text-white/40">{p.quantity} @ ${p.avgCost.toFixed(2)}</span>
                            <span className="text-sm font-mono text-white/70">${(p.quantity * p.avgCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isSignedIn && <p className="text-xs text-[#FFD700] text-center">Sign in to start paper trading</p>}
                  </div>
                ) : (
                  <div>
                    {portfolio.trades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <TrendingUp className="w-10 h-10 text-white/10 mb-3" />
                        <p className="text-sm text-white/40 mb-1">$100,000 starting balance</p>
                        <p className="text-xs text-white/25 mb-4">Place your first paper trade to start tracking</p>
                        <button onClick={() => setShowTradePanel(true)} className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 active:scale-[0.97] transition-all duration-150 border border-primary/20">
                          Place your first trade
                        </button>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={portfolioChartPoints}>
                          <defs>
                            <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={pnl >= 0 ? "#00D4FF" : "#ff4757"} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={pnl >= 0 ? "#00D4FF" : "#ff4757"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.02)" />
                          <XAxis dataKey="time" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={['dataMin - 500', 'dataMax + 500']} width={48} />
                          <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, color: '#fff', fontSize: 12 }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                          <Area type="monotone" dataKey="value" stroke={pnl >= 0 ? "#00D4FF" : "#ff4757"} strokeWidth={2} fill="url(#pgGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel>
              <PanelHeader title="Fear & Greed" icon={<Shield className="w-3.5 h-3.5" />} />
              <div className="p-4">
                <FearGreedGauge />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Watchlist" icon={<Eye className="w-3.5 h-3.5" />} />
              <div className="p-2">
                <WatchlistPanel />
              </div>
            </Panel>
            <Panel>
              <PanelHeader title="Multi-Asset" icon={<Globe className="w-3.5 h-3.5" />} rightContent={
                <div className="flex gap-1">
                  {(["crypto", "forex", "commodities", "bonds"] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveAssetTab(tab)}
                      className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors ${activeAssetTab === tab ? 'bg-[#FFD700]/15 text-[#FFD700]' : 'text-white/30 hover:text-white/60'}`}>
                      {tab === "commodities" ? "Cmdty" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              } />
              <div className="divide-y divide-white/[0.03]">
                {activeAssetTab === "crypto" && MULTI_ASSET_DATA.crypto.map(c => (
                  <DataRow key={c.symbol} label={c.symbol} value={c.price >= 100 ? `$${c.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${c.price.toFixed(c.price < 1 ? 3 : 2)}`} change={c.change} />
                ))}
                {activeAssetTab === "forex" && MULTI_ASSET_DATA.forex.map(f => (
                  <DataRow key={f.symbol} label={f.symbol} value={f.price.toFixed(4)} change={f.change} />
                ))}
                {activeAssetTab === "commodities" && MULTI_ASSET_DATA.commodities.map(c => (
                  <DataRow key={c.symbol} label={c.symbol} value={`$${c.price.toFixed(2)}`} change={c.change} />
                ))}
                {activeAssetTab === "bonds" && MULTI_ASSET_DATA.bonds.map(b => (
                  <DataRow key={b.symbol} label={b.symbol} value={`${b.yield.toFixed(2)}%`} change={b.change} />
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {/* Section 3: Tabbed secondary data */}
        <Panel>
          <div className="border-b border-white/[0.06]">
            <div className="flex px-2 py-1 gap-1">
              {SECONDARY_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSecondaryTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    secondaryTab === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {secondaryTab === "signals" && (
            <div className="divide-y divide-white/[0.04]">
              {stockAlerts.map((alert) => (
                <div key={alert.id} className="hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => setExpandedSignal(expandedSignal === alert.id ? null : alert.id)}>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold font-mono text-white w-14">{alert.symbol}</span>
                      <span className="text-xs text-white/40">${alert.price.toFixed(2)}</span>
                      <span className="text-xs text-white/25 hidden md:inline">{alert.pattern}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 hidden sm:block">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/30">Conf.</span>
                          <span className="text-white/50">{alert.confidence}%</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${alert.type === 'BUY' ? 'bg-primary' : alert.type === 'SELL' ? 'bg-red-400' : 'bg-[#FFD700]'}`} style={{ width: `${alert.confidence}%` }} />
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${alert.type === 'BUY' ? 'bg-primary/10 text-primary' : alert.type === 'SELL' ? 'bg-red-400/10 text-red-400' : 'bg-[#FFD700]/10 text-[#FFD700]'}`}>
                        {alert.type}
                      </span>
                      {expandedSignal === alert.id ? <ChevronUp className="w-4 h-4 text-white/25" /> : <ChevronDown className="w-4 h-4 text-white/25" />}
                    </div>
                  </div>
                  {expandedSignal === alert.id && (
                    <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="bg-white/[0.02] rounded-xl p-3 text-xs text-white/40 space-y-1">
                        <div className="flex gap-3">
                          <span className="text-primary">{alert.source}</span>
                          <span>·</span>
                          <span>{alert.pattern}</span>
                        </div>
                        <p>{alert.note}</p>
                        <div className="flex gap-4 pt-1">
                          <span>Risk: 2.0%</span>
                          <span>R:R 1:{alert.confidence > 80 ? '4' : alert.confidence > 60 ? '3' : '2'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {secondaryTab === "options" && (
            <div>
              <div className="divide-y divide-white/[0.04]">
                {optionsAlerts.map(a => (
                  <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors flex-wrap">
                    <span className="text-sm font-bold text-white w-14">{a.symbol}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${a.type === 'CALL' ? 'bg-primary/10 text-primary' : 'bg-red-400/10 text-red-400'}`}>{a.type}</span>
                    <span className="text-xs text-white/50">${a.strike}</span>
                    <span className="text-xs text-white/30">{new Date(a.exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="text-sm font-semibold text-[#FFD700]">{a.premium}</span>
                    <span className="text-xs text-white/30 ml-auto hidden md:inline truncate max-w-[200px]">{a.flowType}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] p-4">
                <p className="text-xs text-white/40 font-semibold mb-3">Options Income (Weekly)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={optionsIncomeData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={40} />
                    <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 12, color: '#fff', fontSize: 11 }} />
                    <Bar dataKey="income" fill="#FFD700" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {secondaryTab === "market" && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
              <div className="divide-y divide-white/[0.03]">
                <div className="px-4 py-2.5">
                  <p className="text-xs text-white/40 font-semibold">Market Internals</p>
                </div>
                <DataRow label="Advancing / Declining" value={`${MARKET_INTERNALS.advDecl.advancing} / ${MARKET_INTERNALS.advDecl.declining}`} change={((MARKET_INTERNALS.advDecl.advancing / MARKET_INTERNALS.advDecl.declining) - 1) * 100} />
                <DataRow label="TICK" value={`${MARKET_INTERNALS.tick.current > 0 ? '+' : ''}${Math.abs(MARKET_INTERNALS.tick.current)}`} />
                <DataRow label="TRIN (ARMS)" value={MARKET_INTERNALS.trin.value.toFixed(2)} />
                <DataRow label="Put/Call Ratio" value={MARKET_INTERNALS.putCall.ratio.toFixed(2)} />
                <DataRow label="VIX" value={MARKET_INTERNALS.vix.current.toFixed(2)} change={MARKET_INTERNALS.vix.change} />
                <DataRow label="VIX Percentile" value={`${MARKET_INTERNALS.vix.percentile}th`} />
                <DataRow label="Above 50 SMA" value={`${MARKET_INTERNALS.breadth.above50sma}%`} />
                <DataRow label="Above 200 SMA" value={`${MARKET_INTERNALS.breadth.above200sma}%`} />
                <DataRow label="New Highs / Lows" value={`${MARKET_INTERNALS.breadth.newHighs} / ${MARKET_INTERNALS.breadth.newLows}`} />
              </div>
              <div className="divide-y divide-white/[0.03]">
                <div className="px-4 py-2.5">
                  <p className="text-xs text-white/40 font-semibold">Unusual Options Activity</p>
                </div>
                {unusualOptionsActivity.slice(0, 8).map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.01] transition-colors">
                    <span className="text-xs font-bold text-white w-12">{e.symbol}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${e.type === 'CALL' ? 'bg-primary/10 text-primary' : 'bg-red-400/10 text-red-400'}`}>{e.type}</span>
                    <span className="text-[10px] text-white/40">${e.strike}</span>
                    <span className={`text-[10px] font-mono font-semibold ml-auto ${e.delta > 0 ? 'text-primary' : 'text-red-400'}`}>Δ {e.delta > 0 ? '+' : ''}{Math.abs(e.delta)}</span>
                    <span className={`text-[10px] font-semibold ${e.ivRank >= 70 ? 'text-[#FFD700]' : 'text-white/30'}`}>IV {e.ivRank}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {secondaryTab === "calendar" && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
              <div className="p-4">
                <p className="text-xs text-white/40 font-semibold mb-3">Signal History</p>
                <SignalHistory />
              </div>
              <div className="p-4">
                <p className="text-xs text-white/40 font-semibold mb-3">Economic Calendar</p>
                <EconomicCalendar />
              </div>
            </div>
          )}
        </Panel>

      </div>
      </PageErrorBoundary>
    </Layout>
  );
}
