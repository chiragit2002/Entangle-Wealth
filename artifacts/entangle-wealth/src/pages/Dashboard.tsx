import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { QuantumViz } from "@/components/QuantumViz";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SignalHistory } from "@/components/SignalHistory";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { stockAlerts, optionsAlerts, unusualOptionsActivity, portfolioChartData, optionsIncomeData, agentLogMessages } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Activity, Zap, Minus, TrendingUp, Shield, RefreshCw, Search, BarChart3, X, Terminal, Globe, Layers, Clock, Keyboard, ChevronUp, ChevronDown, Eye, Trophy, Flame, Award } from "lucide-react";
import { generateMockOHLCV, runAllIndicators, getOverallSignal } from "@/lib/indicators";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";

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
    { symbol: "XRP", name: "Ripple", price: 2.48, change: -0.95 },
    { symbol: "ADA", name: "Cardano", price: 0.82, change: 1.23 },
    { symbol: "DOGE", name: "Dogecoin", price: 0.187, change: -2.15 },
  ],
  forex: [
    { symbol: "EUR/USD", price: 1.0842, change: -0.12 },
    { symbol: "GBP/USD", price: 1.2715, change: 0.08 },
    { symbol: "USD/JPY", price: 151.42, change: 0.34 },
    { symbol: "USD/CHF", price: 0.8845, change: -0.05 },
    { symbol: "AUD/USD", price: 0.6612, change: 0.22 },
    { symbol: "USD/CAD", price: 1.3648, change: -0.18 },
  ],
  commodities: [
    { symbol: "GOLD", name: "Gold", price: 2385.40, change: 0.42, unit: "/oz" },
    { symbol: "SILVER", name: "Silver", price: 28.92, change: 1.15, unit: "/oz" },
    { symbol: "WTI", name: "Crude Oil", price: 78.45, change: -1.23, unit: "/bbl" },
    { symbol: "BRENT", name: "Brent", price: 82.30, change: -0.98, unit: "/bbl" },
    { symbol: "NATGAS", name: "Nat Gas", price: 2.84, change: 3.45, unit: "/MMBtu" },
    { symbol: "COPPER", name: "Copper", price: 4.52, change: 0.67, unit: "/lb" },
  ],
  bonds: [
    { symbol: "US2Y", name: "2Y Treasury", yield: 4.72, change: -0.03 },
    { symbol: "US5Y", name: "5Y Treasury", yield: 4.35, change: -0.02 },
    { symbol: "US10Y", name: "10Y Treasury", yield: 4.28, change: 0.02 },
    { symbol: "US30Y", name: "30Y Treasury", yield: 4.45, change: 0.01 },
    { symbol: "TIPS10", name: "10Y TIPS", yield: 2.15, change: 0.01 },
    { symbol: "HYG", name: "HY Spread", yield: 3.42, change: -0.05 },
  ],
};

const MARKET_INTERNALS = {
  advDecl: { advancing: 1842, declining: 1156, unchanged: 247, ratio: 1.59 },
  tick: { current: 245, high: 892, low: -654 },
  trin: { value: 0.85, signal: "Bullish" },
  putCall: { ratio: 0.72, equity: 0.65, index: 1.12 },
  vix: { current: 14.32, change: -5.6, percentile: 22 },
  breadth: { above50sma: 62.4, above200sma: 71.2, newHighs: 148, newLows: 42 },
};

const timeRanges = ["1D", "1W", "1M", "3M"] as const;

const chartDataByRange = {
  "1D": portfolioChartData,
  "1W": [
    { time: "Mon", value: 14100 }, { time: "Tue", value: 14350 }, { time: "Wed", value: 14200 },
    { time: "Thu", value: 14680 }, { time: "Fri", value: 15100 }, { time: "Sat", value: 15300 }, { time: "Sun", value: 15620 },
  ],
  "1M": [
    { time: "Wk1", value: 12500 }, { time: "Wk2", value: 13100 }, { time: "Wk3", value: 12900 },
    { time: "Wk4", value: 14200 }, { time: "Now", value: 15620 },
  ],
  "3M": [
    { time: "Jan", value: 10200 }, { time: "Feb", value: 11400 }, { time: "Mar", value: 12800 },
    { time: "Apr", value: 13500 }, { time: "May", value: 14100 }, { time: "Jun", value: 15620 },
  ],
};

function PanelHeader({ title, icon, color = "cyan", rightContent }: { title: string; icon?: React.ReactNode; color?: string; rightContent?: React.ReactNode }) {
  const borderColor = color === "cyan" ? "border-l-[#00D4FF]" : color === "gold" ? "border-l-[#FFD700]" : color === "green" ? "border-l-[#00ff88]" : color === "red" ? "border-l-[#ff3366]" : color === "purple" ? "border-l-[#9c27b0]" : "border-l-white/20";
  const textColor = color === "cyan" ? "text-[#00D4FF]" : color === "gold" ? "text-[#FFD700]" : color === "green" ? "text-[#00ff88]" : color === "red" ? "text-[#ff3366]" : color === "purple" ? "text-[#9c27b0]" : "text-white/60";
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06] border-l-2 ${borderColor}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className={textColor}>{icon}</span>}
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${textColor}`}>{title}</span>
      </div>
      {rightContent}
    </div>
  );
}

function BloombergPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0a0a0f] border border-white/[0.06] rounded-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function DataRow({ label, value, change, mono = true, small = false }: { label: string; value: string; change?: number; mono?: boolean; small?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2 ${small ? 'py-0.5' : 'py-1'} hover:bg-white/[0.02] transition-colors`}>
      <span className={`${small ? 'text-[9px]' : 'text-[10px]'} text-white/40 ${mono ? 'font-mono' : ''}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`${small ? 'text-[9px]' : 'text-[10px]'} font-mono font-medium text-white/80`}>{value}</span>
        {change !== undefined && (
          <span className={`${small ? 'text-[8px]' : 'text-[9px]'} font-mono font-bold ${change >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

function GamificationBar() {
  const { isSignedIn, isLoaded } = useAuth();
  const [gamData, setGamData] = useState<{ rank: string; streak: string; badges: string } | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setGamData(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/gamification/leaderboard/rank");
        const rankData = res.ok ? await res.json() : null;
        const rankStr = rankData?.rank ? `#${rankData.rank}` : "#--";

        setGamData({ rank: rankStr, streak: "0 days", badges: "0/12" });
      } catch {
        setGamData({ rank: "#--", streak: "0 days", badges: "0/12" });
      }
    })();
  }, [isLoaded, isSignedIn]);

  if (isLoaded && !isSignedIn) {
    return (
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          { icon: <Trophy className="w-4 h-4 text-[#FFD700]" />, label: "RANK", color: "hover:border-[#FFD700]/20" },
          { icon: <Flame className="w-4 h-4 text-orange-400" />, label: "STREAK", color: "hover:border-orange-400/20" },
          { icon: <Award className="w-4 h-4 text-[#9c27b0]" />, label: "BADGES", color: "hover:border-[#9c27b0]/20" },
        ].map(({ icon, label, color }) => (
          <a key={label} href="/sign-in" className={`bg-[#0a0a0f] border border-white/[0.06] rounded-sm px-2.5 py-2 flex items-center gap-2 ${color} transition-colors cursor-pointer`}>
            {icon}
            <div>
              <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest">{label}</p>
              <p className="text-[10px] font-mono font-semibold text-white/30">Sign in to view</p>
            </div>
          </a>
        ))}
      </div>
    );
  }

  const data = gamData || { rank: "#--", streak: "0 days", badges: "0/12" };

  return (
    <div className="grid grid-cols-3 gap-1.5 mb-2">
      <a href="/leaderboard" className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm px-2.5 py-2 flex items-center gap-2 hover:border-[#FFD700]/20 transition-colors cursor-pointer">
        <Trophy className="w-4 h-4 text-[#FFD700]" />
        <div>
          <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest">RANK</p>
          <p className="text-[13px] font-mono font-black text-[#FFD700]">{data.rank}</p>
        </div>
      </a>
      <a href="/achievements" className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm px-2.5 py-2 flex items-center gap-2 hover:border-orange-400/20 transition-colors cursor-pointer">
        <Flame className="w-4 h-4 text-orange-400" />
        <div>
          <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest">STREAK</p>
          <p className="text-[13px] font-mono font-black text-orange-400">{data.streak}</p>
        </div>
      </a>
      <a href="/achievements" className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm px-2.5 py-2 flex items-center gap-2 hover:border-[#9c27b0]/20 transition-colors cursor-pointer">
        <Award className="w-4 h-4 text-[#9c27b0]" />
        <div>
          <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest">BADGES</p>
          <p className="text-[13px] font-mono font-black text-[#9c27b0]">{data.badges}</p>
        </div>
      </a>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [chartRange, setChartRange] = useState<typeof timeRanges[number]>("1D");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [quickAnalysis, setQuickAnalysis] = useState<QuickAnalysis | null>(null);
  const [analyzingSymbol, setAnalyzingSymbol] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeAssetTab, setActiveAssetTab] = useState<"crypto" | "forex" | "commodities" | "bonds">("crypto");
  const [visibleLogs, setVisibleLogs] = useState(5);
  const [clock, setClock] = useState("");
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const qaIdRef = useRef(0);
  const qaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { trackEvent("dashboard_viewed"); }, []);

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
    const timer = setInterval(() => {
      setVisibleLogs(prev => Math.min(prev + 1, agentLogMessages.length));
    }, 3000);
    return () => clearInterval(timer);
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

  const currentChartData = chartDataByRange[chartRange];
  const pctChange = ((currentChartData[currentChartData.length - 1].value - currentChartData[0].value) / currentChartData[0].value * 100).toFixed(1);
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

  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />
      <FinancialDisclaimerBanner pageKey="dashboard" />

      <div className="bg-[#040408] border-b border-white/[0.06] px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[11px] font-mono font-bold text-[#00D4FF] tracking-wider">ENTANGLEWEALTH COMMAND CENTER</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMarketOpen ? 'bg-[#00ff88]' : 'bg-[#FFD700]'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? 'bg-[#00ff88]' : 'bg-[#FFD700]'}`} />
            </span>
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isMarketOpen ? 'text-[#00ff88]' : 'text-[#FFD700]'}`}>
              {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
            </span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[9px] font-mono text-white/30">DEMO MODE · SIMULATED DATA</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
            <input
              data-cmd-search
              placeholder="Search ticker... ( / )"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) { e.preventDefault(); runQuickAnalysis(searchQuery.toUpperCase().trim()); } }}
              className="w-48 h-6 pl-7 pr-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/15 focus:outline-none focus:border-[#00D4FF]/30"
            />
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-0.5 bg-[#0a0a14] border border-white/10 rounded-sm z-50 shadow-2xl">
                {searchResults.map(s => (
                  <button key={s.symbol} onClick={() => { setSearchQuery(s.symbol); runQuickAnalysis(s.symbol); }}
                    className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-[#00D4FF]/[0.06] transition-colors border-b border-white/[0.03] last:border-0">
                    <span className="text-[10px] font-bold font-mono text-[#00D4FF]">{s.symbol}</span>
                    <span className="text-[9px] text-white/25 truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowShortcuts(v => !v)} aria-label="Show keyboard shortcuts" className="flex items-center gap-1 text-[9px] font-mono text-white/20 hover:text-white/40 transition-colors">
            <Keyboard className="w-3 h-3" />
            <span>?</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-white/20" />
            <span className="text-[11px] font-mono font-bold text-white/60 tabular-nums">{clock}</span>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="bg-[#0a0a14] border border-white/10 rounded-sm p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-mono font-bold text-[#00D4FF] tracking-wider">KEYBOARD SHORTCUTS</span>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close shortcuts" className="text-white/20 hover:text-white/40"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1">
              {[
                ["/", "Focus search"],
                ["1", "Dashboard"],
                ["2", "Terminal"],
                ["3", "Market Overview"],
                ["4", "Technical Analysis"],
                ["5", "Stock Explorer"],
                ["6", "Screener"],
                ["7", "Options"],
                ["?", "Toggle shortcuts"],
                ["Esc", "Close / Dismiss"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3 py-1">
                  <kbd className="min-w-[28px] text-center px-1.5 py-0.5 bg-white/[0.04] border border-white/10 rounded-sm text-[10px] font-mono font-bold text-white/60">{key}</kbd>
                  <span className="text-[10px] text-white/40">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-2 py-2 bg-[#020204]">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 mb-2">
          {[
            { label: "PORTFOLIO", value: `${Number(pctChange) >= 0 ? '+' : ''}${pctChange}%`, sub: "$15,620", color: Number(pctChange) >= 0 ? "#00ff88" : "#ff3366" },
            { label: "OPTIONS P&L", value: `+$${todayOptionsIncome}`, sub: "Theta today", color: "#FFD700" },
            { label: "WIN RATE", value: "80%", sub: "Last 10 signals", color: "#9c27b0" },
            { label: "RISK LEVEL", value: "8.4%", sub: "Exposure", color: "#00ff88" },
            { label: "VIX", value: MARKET_INTERNALS.vix.current.toFixed(2), sub: `${MARKET_INTERNALS.vix.change > 0 ? '+' : ''}${MARKET_INTERNALS.vix.change}%`, color: MARKET_INTERNALS.vix.change > 0 ? "#ff3366" : "#00ff88" },
            { label: "TICK", value: `${MARKET_INTERNALS.tick.current > 0 ? '+' : ''}${MARKET_INTERNALS.tick.current}`, sub: `H:${MARKET_INTERNALS.tick.high} L:${MARKET_INTERNALS.tick.low}`, color: MARKET_INTERNALS.tick.current > 0 ? "#00ff88" : "#ff3366" },
            { label: "A/D RATIO", value: MARKET_INTERNALS.advDecl.ratio.toFixed(2), sub: `${MARKET_INTERNALS.advDecl.advancing}/${MARKET_INTERNALS.advDecl.declining}`, color: MARKET_INTERNALS.advDecl.ratio > 1 ? "#00ff88" : "#ff3366" },
            { label: "P/C RATIO", value: MARKET_INTERNALS.putCall.ratio.toFixed(2), sub: `Eq:${MARKET_INTERNALS.putCall.equity} Ix:${MARKET_INTERNALS.putCall.index}`, color: MARKET_INTERNALS.putCall.ratio < 0.8 ? "#00ff88" : MARKET_INTERNALS.putCall.ratio > 1.0 ? "#ff3366" : "#FFD700" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm px-2.5 py-2 text-center">
              <p className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-[14px] font-mono font-black tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[8px] font-mono text-white/20">{stat.sub}</p>
            </div>
          ))}
        </div>

        <GamificationBar />

        {(quickAnalysis || analyzingSymbol) && (
          <div className="mb-2">
            <BloombergPanel>
              <PanelHeader title="QUICK ANALYSIS" icon={<BarChart3 className="w-3 h-3" />} color="cyan" rightContent={
                <button onClick={() => { setQuickAnalysis(null); setAnalyzingSymbol(""); }} className="text-white/20 hover:text-white/40"><X className="w-3 h-3" /></button>
              } />
              <div className="p-3">
                {analyzingSymbol ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#00D4FF] animate-spin" />
                    <span className="text-[10px] font-mono text-white/60">Running 55+ indicators on {analyzingSymbol}...</span>
                  </div>
                ) : quickAnalysis && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className={`text-[18px] font-mono font-black ${quickAnalysis.signal.includes("BUY") ? "text-[#00ff88]" : quickAnalysis.signal.includes("SELL") ? "text-[#ff3366]" : "text-[#FFD700]"}`}>{quickAnalysis.confidence}%</p>
                        <p className="text-[8px] font-mono text-white/20">CONFIDENCE</p>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-mono font-black text-white">{quickAnalysis.symbol}</span>
                          <span className="text-[9px] text-white/20">{quickAnalysis.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-sm ${quickAnalysis.signal.includes("BUY") ? "bg-[#00ff88]/10 text-[#00ff88]" : quickAnalysis.signal.includes("SELL") ? "bg-[#ff3366]/10 text-[#ff3366]" : "bg-[#FFD700]/10 text-[#FFD700]"}`}>
                            {quickAnalysis.signal.replace("_", " ")}
                          </span>
                          <span className="text-[9px] font-mono text-[#00ff88]">{quickAnalysis.buyCount} BUY</span>
                          <span className="text-[9px] font-mono text-[#ff3366]">{quickAnalysis.sellCount} SELL</span>
                        </div>
                      </div>
                    </div>
                    <a href="/technical" className="px-3 py-1.5 text-[9px] font-mono font-bold text-[#00D4FF] bg-[#00D4FF]/[0.06] border border-[#00D4FF]/20 rounded-sm hover:bg-[#00D4FF]/10 transition-colors">
                      FULL ANALYSIS →
                    </a>
                  </div>
                )}
              </div>
            </BloombergPanel>
          </div>
        )}

        <div className="grid grid-cols-12 gap-1.5">
          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-12 gap-1.5">
              <div className="col-span-12">
                <BloombergPanel>
                  <PanelHeader title="QUANTUM ENTANGLEMENT MATRIX" icon={<Activity className="w-3 h-3" />} color="cyan" rightContent={
                    <span className="text-[8px] font-mono text-white/20">6 MODELS · CONSENSUS SIGNAL</span>
                  } />
                  <div className="p-2">
                    <QuantumViz />
                  </div>
                </BloombergPanel>
              </div>

              <div className="col-span-12 lg:col-span-7">
                <BloombergPanel>
                  <PanelHeader title="PORTFOLIO VALUE" icon={<TrendingUp className="w-3 h-3" />} color="green" rightContent={
                    <div className="flex items-center gap-1">
                      {timeRanges.map(r => (
                        <button key={r} onClick={() => setChartRange(r)}
                          className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-sm transition-colors ${chartRange === r ? 'bg-[#00D4FF]/20 text-[#00D4FF]' : 'text-white/20 hover:text-white/40'}`}>
                          {r}
                        </button>
                      ))}
                      <span className={`ml-2 text-[10px] font-mono font-bold ${Number(pctChange) >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                        {Number(pctChange) >= 0 ? '+' : ''}{pctChange}%
                      </span>
                    </div>
                  } />
                  <div className="p-2">
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={currentChartData}>
                        <defs>
                          <linearGradient id="pgBB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="time" tick={{ fill: '#333', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#333', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={['dataMin - 200', 'dataMax + 200']} width={45} />
                        <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 2, color: '#fff', fontSize: 10, fontFamily: 'JetBrains Mono' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                        <Area type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={1.5} fill="url(#pgBB)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </BloombergPanel>
              </div>

              <div className="col-span-12 lg:col-span-5">
                <BloombergPanel>
                  <PanelHeader title="OPTIONS INCOME" icon={<Zap className="w-3 h-3" />} color="gold" rightContent={
                    <span className="text-[9px] font-mono text-[#FFD700]">${optionsIncomeData.reduce((a, b) => a + b.income, 0).toLocaleString()} wk</span>
                  } />
                  <div className="p-2">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={optionsIncomeData}>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="day" tick={{ fill: '#333', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#333', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={35} />
                        <Tooltip contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 2, color: '#fff', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <Bar dataKey="income" fill="#FFD700" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </BloombergPanel>
              </div>

              <div className="col-span-12">
                <BloombergPanel>
                  <PanelHeader title="STOCK SIGNALS" icon={<Activity className="w-3 h-3" />} color="green" rightContent={
                    <span className="text-[8px] font-mono text-white/20">{stockAlerts.length} ACTIVE</span>
                  } />
                  <div className="divide-y divide-white/[0.04]">
                    {stockAlerts.map((alert) => (
                      <div key={alert.id} className="hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => setExpandedSignal(expandedSignal === alert.id ? null : alert.id)}>
                        <div className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-mono font-black text-white w-12">{alert.symbol}</span>
                            <span className="text-[10px] font-mono text-white/40">${alert.price.toFixed(2)}</span>
                            <span className="text-[9px] text-white/20 hidden sm:inline">{alert.pattern}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-16">
                              <div className="flex justify-between text-[8px] font-mono mb-0.5">
                                <span className="text-white/20">CONF</span>
                                <span className="text-white/40">{alert.confidence}%</span>
                              </div>
                              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${alert.type === 'BUY' ? 'bg-[#00ff88]' : alert.type === 'SELL' ? 'bg-[#ff3366]' : 'bg-[#FFD700]'}`} style={{ width: `${alert.confidence}%` }} />
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-sm ${alert.type === 'BUY' ? 'bg-[#00ff88]/10 text-[#00ff88]' : alert.type === 'SELL' ? 'bg-[#ff3366]/10 text-[#ff3366]' : 'bg-[#FFD700]/10 text-[#FFD700]'}`}>
                              {alert.type}
                            </span>
                            {expandedSignal === alert.id ? <ChevronUp className="w-3 h-3 text-white/20" /> : <ChevronDown className="w-3 h-3 text-white/20" />}
                          </div>
                        </div>
                        {expandedSignal === alert.id && (
                          <div className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="bg-white/[0.02] rounded-sm p-2 text-[9px] font-mono text-white/40">
                              <div className="flex gap-3 mb-1">
                                <span className="text-[#00D4FF]">{alert.source}</span>
                                <span className="text-white/10">|</span>
                                <span>{alert.pattern}</span>
                              </div>
                              <p className="text-white/30">{alert.note}</p>
                              <div className="flex gap-4 mt-1.5">
                                <span>Risk: 2.0%</span>
                                <span>R:R: 1:{alert.confidence > 80 ? '4' : alert.confidence > 60 ? '3' : '2'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </BloombergPanel>
              </div>

              <div className="col-span-12">
                <BloombergPanel>
                  <PanelHeader title="OPTIONS FLOW" icon={<Zap className="w-3 h-3" />} color="gold" rightContent={
                    <span className="text-[8px] font-mono text-white/20">{optionsAlerts.length} ALERTS</span>
                  } />
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {["SYMBOL", "TYPE", "STRIKE", "EXP", "PREMIUM", "FLOW"].map(h => (
                            <th key={h} className="px-3 py-1.5 text-left text-[8px] font-mono font-bold text-white/20 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {optionsAlerts.map(a => (
                          <tr key={a.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-3 py-1.5 text-[10px] font-mono font-bold text-white">{a.symbol}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-sm ${a.type === 'CALL' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#ff3366]/10 text-[#ff3366]'}`}>{a.type}</span>
                            </td>
                            <td className="px-3 py-1.5 text-[10px] font-mono text-white/60">${a.strike}</td>
                            <td className="px-3 py-1.5 text-[10px] font-mono text-white/40">{new Date(a.exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                            <td className="px-3 py-1.5 text-[10px] font-mono font-bold text-[#FFD700]">{a.premium}</td>
                            <td className="px-3 py-1.5 text-[9px] font-mono text-white/30 max-w-[200px] truncate">{a.flowType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BloombergPanel>
              </div>

              <div className="col-span-12">
                <BloombergPanel>
                  <PanelHeader title="UNUSUAL OPTIONS + GREEKS" icon={<Layers className="w-3 h-3" />} color="purple" rightContent={
                    <span className="text-[8px] font-mono text-white/20">{unusualOptionsActivity.length} ENTRIES</span>
                  } />
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {["SYM", "TYPE", "STRIKE", "DELTA", "GAMMA", "THETA", "IV%", "STR", "STRATEGY"].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-[8px] font-mono font-bold text-white/20 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {unusualOptionsActivity.map(e => (
                          <tr key={e.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-2 py-1.5 text-[10px] font-mono font-bold text-white">{e.symbol}</td>
                            <td className="px-2 py-1.5">
                              <span className={`px-1 py-0.5 text-[8px] font-mono font-bold rounded-sm ${e.type === 'CALL' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#ff3366]/10 text-[#ff3366]'}`}>{e.type}</span>
                            </td>
                            <td className="px-2 py-1.5 text-[10px] font-mono text-white/60">${e.strike}</td>
                            <td className={`px-2 py-1.5 text-[10px] font-mono font-bold ${e.delta > 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>{e.delta > 0 ? '+' : ''}{e.delta}</td>
                            <td className="px-2 py-1.5 text-[10px] font-mono text-[#00D4FF]">{e.gamma}</td>
                            <td className="px-2 py-1.5 text-[10px] font-mono text-[#ff3366]">{e.theta}</td>
                            <td className={`px-2 py-1.5 text-[10px] font-mono font-bold ${e.ivRank >= 70 ? 'text-[#FFD700]' : 'text-white/40'}`}>{e.ivRank}%</td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <div className="w-10 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${e.strength >= 85 ? 'bg-[#00ff88]' : e.strength >= 60 ? 'bg-[#00D4FF]' : 'bg-white/20'}`} style={{ width: `${e.strength}%` }} />
                                </div>
                                <span className="text-[8px] font-mono text-white/30">{e.strength}%</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-[9px] font-mono text-[#00D4FF]/60">{e.strategy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BloombergPanel>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="flex flex-col gap-1.5">
              <BloombergPanel>
                <PanelHeader title="MARKET INTERNALS" icon={<Activity className="w-3 h-3" />} color="cyan" />
                <div className="divide-y divide-white/[0.03]">
                  <DataRow label="ADV/DECL" value={`${MARKET_INTERNALS.advDecl.advancing} / ${MARKET_INTERNALS.advDecl.declining}`} change={((MARKET_INTERNALS.advDecl.advancing / MARKET_INTERNALS.advDecl.declining) - 1) * 100} />
                  <DataRow label="UNCHANGED" value={`${MARKET_INTERNALS.advDecl.unchanged}`} />
                  <DataRow label="TICK" value={`${MARKET_INTERNALS.tick.current > 0 ? '+' : ''}${MARKET_INTERNALS.tick.current}`} />
                  <DataRow label="TICK HIGH/LOW" value={`${MARKET_INTERNALS.tick.high} / ${MARKET_INTERNALS.tick.low}`} />
                  <DataRow label="TRIN (ARMS)" value={MARKET_INTERNALS.trin.value.toFixed(2)} />
                  <DataRow label="P/C RATIO" value={MARKET_INTERNALS.putCall.ratio.toFixed(2)} />
                  <DataRow label="P/C EQUITY" value={MARKET_INTERNALS.putCall.equity.toFixed(2)} />
                  <DataRow label="P/C INDEX" value={MARKET_INTERNALS.putCall.index.toFixed(2)} />
                  <DataRow label="VIX" value={MARKET_INTERNALS.vix.current.toFixed(2)} change={MARKET_INTERNALS.vix.change} />
                  <DataRow label="VIX %ILE" value={`${MARKET_INTERNALS.vix.percentile}th`} />
                  <DataRow label=">50 SMA" value={`${MARKET_INTERNALS.breadth.above50sma}%`} />
                  <DataRow label=">200 SMA" value={`${MARKET_INTERNALS.breadth.above200sma}%`} />
                  <DataRow label="NEW HIGHS" value={`${MARKET_INTERNALS.breadth.newHighs}`} />
                  <DataRow label="NEW LOWS" value={`${MARKET_INTERNALS.breadth.newLows}`} />
                </div>
              </BloombergPanel>

              <BloombergPanel>
                <PanelHeader title="MULTI-ASSET" icon={<Globe className="w-3 h-3" />} color="gold" rightContent={
                  <div className="flex gap-0.5">
                    {(["crypto", "forex", "commodities", "bonds"] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveAssetTab(tab)}
                        className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase rounded-sm transition-colors ${activeAssetTab === tab ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'text-white/15 hover:text-white/30'}`}>
                        {tab === "commodities" ? "CMDTY" : tab.toUpperCase()}
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
              </BloombergPanel>

              <BloombergPanel>
                <PanelHeader title="FEAR & GREED" icon={<Shield className="w-3 h-3" />} color="green" />
                <div className="p-2">
                  <FearGreedGauge />
                </div>
              </BloombergPanel>

              <BloombergPanel>
                <PanelHeader title="WATCHLIST" icon={<Eye className="w-3 h-3" />} color="cyan" />
                <div className="p-1">
                  <WatchlistPanel />
                </div>
              </BloombergPanel>

              <BloombergPanel>
                <PanelHeader title="AI MODEL FEED" icon={<Eye className="w-3 h-3" />} color="purple" rightContent={
                  <span className="text-[8px] font-mono text-white/15">{visibleLogs} events</span>
                } />
                <div className="max-h-48 overflow-y-auto">
                  {agentLogMessages.slice(0, visibleLogs).map((log, i) => (
                    <div key={i} className="flex gap-2 px-2 py-1 text-[9px] font-mono border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                      <span className="text-[#00D4FF]/40 shrink-0 w-12">{log.time}</span>
                      <span className="text-white/30">{log.message}</span>
                    </div>
                  ))}
                </div>
              </BloombergPanel>
            </div>
          </div>

          <div className="col-span-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
              <BloombergPanel>
                <PanelHeader title="SIGNAL HISTORY" icon={<BarChart3 className="w-3 h-3" />} color="cyan" />
                <div className="p-2">
                  <SignalHistory />
                </div>
              </BloombergPanel>
              <BloombergPanel>
                <PanelHeader title="ECONOMIC CALENDAR" icon={<Clock className="w-3 h-3" />} color="gold" />
                <div className="p-2">
                  <EconomicCalendar />
                </div>
              </BloombergPanel>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-2 py-1 bg-[#0a0a0f] border border-white/[0.04] rounded-sm">
          <div className="flex items-center gap-4 text-[8px] font-mono text-white/15">
            <span>ENTANGLEWEALTH v3.0</span>
            <span>·</span>
            <span>6 AI MODELS</span>
            <span>·</span>
            <span>55+ INDICATORS</span>
            <span>·</span>
            <span>5,000 NASDAQ STOCKS</span>
          </div>
          <span className="text-[7px] font-mono text-white/10">Demo data · Not financial advice · Press ? for shortcuts</span>
        </div>
      </div>
    </Layout>
  );
}
