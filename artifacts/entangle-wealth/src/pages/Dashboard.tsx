import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useAuth } from "@clerk/react";
import { AmbientDashboard } from "@/components/AmbientDashboard";
import { WealthSignalCard } from "@/components/WealthSignalCard";
import { CinematicAchievement, type AchievementCelebration } from "@/components/CinematicAchievement";
import { FirstAnalysisWow, useFirstAnalysisWow } from "@/components/FirstAnalysisWow";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { QuantumViz } from "@/components/QuantumViz";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SignalHistory } from "@/components/SignalHistory";
import { EconomicCalendar } from "@/components/EconomicCalendar";
import { authFetch } from "@/lib/authFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Activity, Zap, Minus, TrendingUp, Shield, RefreshCw, Search, BarChart3, X, Terminal, Globe, Layers, Clock, Keyboard, ChevronUp, ChevronDown, Eye, Atom, GitBranch, Brain, FileSearch, ChevronRight } from "lucide-react";
import { runAllIndicators, getOverallSignal, detectMarketConditions, type MarketCondition } from "@/lib/indicators";
import { fetchBars, barsToStockData } from "@/lib/alpaca";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { FinishSetupNudge } from "@/components/FinishSetupNudge";
import { ProgressiveProfileCard } from "@/components/onboarding/ProgressiveProfileCard";
import { EntangledInsightsFeed } from "@/components/EntanglementCard";
import { LossAversionNudge } from "@/components/LossAversionNudge";
import { SocialProofTicker } from "@/components/SocialProofTicker";
import { ZeigarnikProgressBar } from "@/components/ZeigarnikProgressBar";
import { IdentityLabel } from "@/components/IdentityLabel";
import { GoalGradientAccelerator } from "@/components/GoalGradientAccelerator";
import { FreshStartPrompt } from "@/components/FreshStartPrompt";
import { VariableSurpriseReward } from "@/components/VariableSurpriseReward";
import { SessionRecapOverlay } from "@/components/SessionRecapOverlay";
import { CommitmentEscalationFlow } from "@/components/CommitmentEscalationFlow";
import { useJourney } from "@/hooks/useJourney";
import { JourneyBridgeCard } from "@/components/journey/JourneyBridgeCard";
import { generateEntanglementInsights, type UserEntanglementContext } from "@/lib/entanglementEngine";
import { getActiveProfile } from "@/lib/taxflow-profile";
import { DynamicModuleGrid } from "@/components/dashboard/DynamicModuleGrid";

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

const MULTI_ASSET_SYMBOLS = {
  crypto: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD"],
  forex: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD"],
  commodities: ["GOLD", "SILVER", "WTI Oil", "Brent", "Nat Gas", "Copper"],
  bonds: ["US 2Y", "US 5Y", "US 10Y", "US 30Y", "TIPS 10Y", "HY Spread"],
};

const CRYPTO_DISPLAY_NAMES: Record<string, string> = {
  "BTC/USD": "Bitcoin", "ETH/USD": "Ethereum", "SOL/USD": "Solana",
  "XRP/USD": "Ripple", "ADA/USD": "Cardano", "DOGE/USD": "Dogecoin",
};

const MARKET_INTERNALS = {
  advDecl: { advancing: 1842, declining: 1156, unchanged: 247, ratio: 1.59 },
  tick: { current: 245, high: 892, low: 654 },
  trin: { value: 0.85, signal: "Bullish" },
  putCall: { ratio: 0.72, equity: 0.65, index: 1.12 },
  vix: { current: 14.32, change: -5.6, percentile: 22 },
  breadth: { above50sma: 62.4, above200sma: 71.2, newHighs: 148, newLows: 42 },
  volume: { relativeVolume: 0.38 },
};

const EDGE_PULSE_COUNT = 4;

function EdgePulseCard({ consensusAccuracy, vixLevel, adRatio }: {
  consensusAccuracy?: number;
  vixLevel?: number;
  adRatio?: number;
}) {
  const insights = useMemo(() => {
    const hasConsensus = consensusAccuracy != null;
    const hasVix = vixLevel != null;
    const consensus = consensusAccuracy ?? 0;
    const vix = vixLevel ?? 0;
    const adSignal = adRatio != null ? (adRatio > 1.2 ? "breadth is strongly positive" : adRatio < 0.8 ? "breadth is weakening" : "breadth is mixed") : null;
    return [
      {
        id: "consensus",
        icon: Atom,
        color: "#00B4D8",
        text: hasConsensus
          ? `Quantum Consensus Engine — ${consensus >= 85 ? "6 of 6 agents agree on the current signal direction." : "agents are split; high-conviction trades are paused."}`
          : "Quantum Consensus Engine cross-checks every signal across 6 independent AI agents. Connect your account to see live signals.",
        subtext: "Multi-model consensus",
        href: "/terminal",
        label: "View Terminal",
      },
      {
        id: "timeline",
        icon: GitBranch,
        color: "#00B4D8",
        text: "Alternate Timeline — see how one savings decision today branches into radically different 10-year futures.",
        subtext: "Alternate Timeline Simulator",
        href: "/alternate-timeline",
        label: "Explore Timelines",
      },
      {
        id: "taxgpt",
        icon: FileSearch,
        color: "#FFB800",
        text: hasVix && adSignal
          ? `Market ${adSignal} (VIX ${vix.toFixed(2)}) — a good time to review tax-loss harvesting opportunities with TaxGPT.`
          : "TaxGPT analyzes every trade for deductions and tax-loss harvesting opportunities in real time.",
        subtext: "Analyzes trades for deductions",
        href: "/taxgpt",
        label: "Check Savings",
      },
      {
        id: "coach",
        icon: Brain,
        color: "#a78bfa",
        text: "Your AI Coach will surface personalized habit insights based on your activity pattern.",
        subtext: "Behavioral finance coaching",
        href: "/ai-coach",
        label: "Talk to Coach",
      },
    ];
  }, [consensusAccuracy, vixLevel, adRatio]);

  const [idx, setIdx] = useState(() => Math.floor(Math.random() * EDGE_PULSE_COUNT));
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rotateInsight = () => {
    setAnimating(true);
    setTimeout(() => {
      setIdx((prev) => (prev + 1) % insights.length);
      setAnimating(false);
    }, 200);
  };

  useEffect(() => {
    intervalRef.current = setInterval(rotateInsight, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const insight = insights[idx];
  const Icon = insight.icon;

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        borderTop: `1px solid ${insight.color}25`,
        borderRight: `1px solid ${insight.color}25`,
        borderBottom: `1px solid ${insight.color}25`,
        borderLeft: `3px solid ${insight.color}`,
        background: "var(--glass-bg)",
      }}
    >
      <div
        className="relative rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `${insight.color}12`,
            border: `1px solid ${insight.color}25`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: insight.color }} />
        </div>

        <div
          className="flex-1 min-w-0 transition-all duration-200"
          style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(4px)" : "translateY(0)" }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: insight.color }}
            >
              Edge Pulse
            </span>
            <span className="text-[9px] text-muted-foreground/40 font-mono">·</span>
            <span className="text-[9px] text-muted-foreground/60 font-mono">{insight.subtext}</span>
          </div>
          <p className="text-xs text-foreground/70 leading-snug truncate">{insight.text}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={insight.href}
            onClick={() => trackEvent("edge_pulse_clicked", { insight: insight.id })}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              color: insight.color,
              background: `${insight.color}10`,
              border: `1px solid ${insight.color}25`,
            }}
          >
            {insight.label}
            <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              rotateInsight();
              intervalRef.current = setInterval(rotateInsight, 7000);
            }}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            title="Next insight"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

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

function MarketConditionBadges({ conditions }: { conditions: MarketCondition[] }) {
  if (conditions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      {conditions.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1"
          style={{
            background: c.bgColor,
            border: `1px solid ${c.borderColor}`,
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: c.color }}
          />
          <span
            className="text-[11px] font-bold tracking-wide"
            style={{ color: c.color }}
          >
            {c.label}
          </span>
          <span className="text-[10px] text-muted-foreground/70 font-mono">{c.subtext}</span>
        </div>
      ))}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bloomberg-panel overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ title, icon, rightContent }: { title: string; icon?: React.ReactNode; rightContent?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
        <span className="text-sm font-semibold text-muted-foreground">{title}</span>
      </div>
      {rightContent}
    </div>
  );
}

function DataRow({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors">
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium text-foreground/80">{value}</span>
        {change !== undefined && (
          <span className={`text-[10px] font-mono font-semibold ${change >= 0 ? 'text-[#00B4D8]' : 'text-red-400'}`}>
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
  const { onEvent } = useJourney();
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
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, { price: number; changePercent: number }>>({});
  const [cryptoPricesLoading, setCryptoPricesLoading] = useState(false);
  const [clock, setClock] = useState("");
  const [expandedSignal, setExpandedSignal] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const qaIdRef = useRef(0);
  const qaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWealthCard, setShowWealthCard] = useState(false);
  const [achievement, setAchievement] = useState<AchievementCelebration | null>(null);
  const [showFirstAnalysisWow, setShowFirstAnalysisWow] = useState(false);
  const [firstAnalysisSymbol, setFirstAnalysisSymbol] = useState("");
  const { isFirstAnalysis, markDone: markFirstAnalysisDone } = useFirstAnalysisWow();

  const queryClient = useQueryClient();
  const portfolioQuery = useQuery({
    queryKey: ["paper-trading-portfolio"],
    queryFn: async () => {
      const res = await authFetch("/paper-trading/portfolio", getToken);
      if (!res.ok) throw new Error("Failed to load portfolio");
      const data = await res.json();
      return {
        ...data,
        portfolioValue: data.portfolioValue ?? 0,
        totalValue: data.totalValue ?? data.cashBalance,
      } as PaperPortfolio;
    },
    enabled: !!isSignedIn,
    staleTime: 5_000,
  });

  const loadPortfolio = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["paper-trading-portfolio"] });
  }, [queryClient]);

  const portfolio = portfolioQuery.data ?? emptyPortfolio;

  const taxProfile = getActiveProfile();
  const entanglementCtx = useMemo<UserEntanglementContext>(() => {
    const pnl = portfolio.totalValue - 100_000;
    return {
      portfolioGainThisWeek: pnl > 0 ? Math.round(pnl) : undefined,
      portfolioPositions: portfolio.positions,
      hasCompletedTaxProfile: !!taxProfile,
      taxSavingsFound: taxProfile ? 4200 : undefined,
      currentIncome: taxProfile?.grossRevenue || 75000,
      recentlyAnalyzedSymbol: quickAnalysis?.symbol,
      recentlyAnalyzedSignal: quickAnalysis?.signal,
    };
  }, [portfolio, taxProfile, quickAnalysis]);

  const entanglementInsights = useMemo(
    () => generateEntanglementInsights(entanglementCtx),
    [entanglementCtx]
  );

  const marketConditions = detectMarketConditions({
    relativeVolume: MARKET_INTERNALS.volume.relativeVolume,
    adRatio: MARKET_INTERNALS.advDecl.ratio,
    newHighs: MARKET_INTERNALS.breadth.newHighs,
    newLows: MARKET_INTERNALS.breadth.newLows,
    above50sma: MARKET_INTERNALS.breadth.above50sma,
    tickCurrent: MARKET_INTERNALS.tick.current,
    tickHigh: MARKET_INTERNALS.tick.high,
    tickLow: -Math.abs(MARKET_INTERNALS.tick.low),
    trinValue: MARKET_INTERNALS.trin.value,
  });

  useEffect(() => {
    trackEvent("dashboard_viewed");
    onEvent("view_signal");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const fetchCryptoPrices = useCallback(async () => {
    setCryptoPricesLoading(true);
    try {
      const symbols = MULTI_ASSET_SYMBOLS.crypto.join(",");
      const res = await fetch(`${BASE_URL}/api/alpaca/snapshots?symbols=${encodeURIComponent(symbols)}`);
      if (!res.ok) return;
      const data = await res.json() as Record<string, { latestTrade?: { p: number }; minuteBar?: { c: number; o: number }; dailyBar?: { c: number; o: number } }>;
      const prices: Record<string, { price: number; changePercent: number }> = {};
      for (const sym of MULTI_ASSET_SYMBOLS.crypto) {
        const snap = data[sym];
        if (!snap) continue;
        const price = snap.latestTrade?.p ?? snap.minuteBar?.c ?? snap.dailyBar?.c ?? 0;
        const open = snap.minuteBar?.o ?? snap.dailyBar?.o ?? price;
        const changePercent = open > 0 ? ((price - open) / open) * 100 : 0;
        if (price > 0) prices[sym] = { price, changePercent };
      }
      setCryptoPrices(prices);
    } catch {
    } finally {
      setCryptoPricesLoading(false);
    }
  }, [BASE_URL]);

  useEffect(() => {
    if (activeAssetTab === "crypto") {
      fetchCryptoPrices();
      const interval = setInterval(fetchCryptoPrices, 15_000);
      return () => clearInterval(interval);
    }
  }, [activeAssetTab, fetchCryptoPrices]);

  const executeTrade = useCallback(async () => {
    if (!tradeSymbol.trim() || !tradeQty || !tradePrice) {
      toast({ title: "Missing fields", description: "Enter symbol, quantity, and price", variant: "destructive" });
      return;
    }
    const sym = tradeSymbol.toUpperCase();
    const qty = Number(tradeQty);
    const px = Number(tradePrice);
    const totalCost = qty * px;

    setTradeLoading(true);

    const prevPortfolio = queryClient.getQueryData<PaperPortfolio>(["paper-trading-portfolio"]);
    if (prevPortfolio) {
      const optimistic: PaperPortfolio = { ...prevPortfolio };
      if (tradeSide === "buy") {
        optimistic.cashBalance = Math.max(0, prevPortfolio.cashBalance - totalCost);
        const existingPos = prevPortfolio.positions.find(p => p.symbol === sym);
        if (existingPos) {
          optimistic.positions = prevPortfolio.positions.map(p =>
            p.symbol === sym ? { ...p, quantity: p.quantity + qty } : p
          );
        } else {
          optimistic.positions = [...prevPortfolio.positions, { id: -1, symbol: sym, quantity: qty, avgCost: px }];
        }
      } else if (tradeSide === "sell") {
        optimistic.cashBalance = prevPortfolio.cashBalance + totalCost;
        optimistic.positions = prevPortfolio.positions
          .map(p => p.symbol === sym ? { ...p, quantity: p.quantity - qty } : p)
          .filter(p => p.quantity > 0);
      }
      optimistic.totalValue = optimistic.cashBalance + (optimistic.portfolioValue || 0);
      queryClient.setQueryData(["paper-trading-portfolio"], optimistic);
    }

    try {
      const res = await authFetch("/paper-trading/trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, side: tradeSide, quantity: qty }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Trade Executed", description: data.message });
        onEvent("trade_executed");
        setTradeSymbol("");
        setTradeQty("");
        setTradePrice("");
        loadPortfolio();
      } else {
        if (prevPortfolio) queryClient.setQueryData(["paper-trading-portfolio"], prevPortfolio);
        toast({ title: "Trade Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      if (prevPortfolio) queryClient.setQueryData(["paper-trading-portfolio"], prevPortfolio);
      toast({ title: "Trade Failed", description: "Please sign in to trade", variant: "destructive" });
    } finally {
      setTradeLoading(false);
    }
  }, [tradeSymbol, tradeQty, tradePrice, tradeSide, getToken, toast, loadPortfolio, onEvent, queryClient]);

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

  const historyQuery = useQuery({
    queryKey: ["paper-trading-history"],
    queryFn: async () => {
      const res = await authFetch("/paper-trading/portfolio-history", getToken);
      if (!res.ok) return { snapshots: [] };
      return res.json() as Promise<{ snapshots: { snapshotDate: string; totalValue: number; cashBalance: number; positionsValue: number }[] }>;
    },
    enabled: !!isSignedIn,
    staleTime: 60_000,
  });

  const pnl = portfolio.totalValue - STARTING_CASH;
  const pnlPct = ((pnl / STARTING_CASH) * 100).toFixed(2);

  const snapshots = historyQuery.data?.snapshots ?? [];
  const portfolioChartPoints = snapshots.length >= 2
    ? snapshots.map(s => ({
        time: new Date(s.snapshotDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: s.totalValue,
      }))
    : portfolio.trades.length > 0
      ? portfolio.trades.slice().reverse().slice(0, 8).map((t, i) => ({
          time: new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          value: STARTING_CASH + (pnl * ((i + 1) / Math.max(portfolio.trades.length, 1))),
        }))
      : [{ time: "Now", value: 0 }];
  const hasRealHistory = snapshots.length >= 2;

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
      if (e.key === "3") navigate("/technical");
      if (e.key === "4") navigate("/stocks");
      if (e.key === "5") navigate("/screener");
      if (e.key === "6") navigate("/options");
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

  const runQuickAnalysis = useCallback(async (sym: string) => {
    const info = DASHBOARD_STOCKS.find(s => s.symbol === sym);
    if (qaTimerRef.current) clearTimeout(qaTimerRef.current);
    const id = ++qaIdRef.current;
    setAnalyzingSymbol(sym);
    setShowSearchDropdown(false);

    if (isFirstAnalysis) {
      setFirstAnalysisSymbol(sym);
      setShowFirstAnalysisWow(true);
    }

    if (isFirstAnalysis) {
      await new Promise(resolve => { qaTimerRef.current = setTimeout(resolve, 4200); });
    }

    if (qaIdRef.current !== id) return;

    try {
      const barsRes = await fetchBars(sym, { timeframe: "1Day", limit: 120 });
      if (qaIdRef.current !== id) return;

      if (barsRes.bars && barsRes.bars.length >= 10) {
        const sd = barsToStockData(barsRes.bars);
        const results = runAllIndicators(sd);
        const sig = getOverallSignal(results);
        setQuickAnalysis({ symbol: sym, name: info?.name || sym, signal: sig.signal, confidence: sig.confidence, buyCount: sig.buyCount, sellCount: sig.sellCount });
        if (!isFirstAnalysis) {
          toast({ title: `${sym} Analysis Complete`, description: `${sig.signal.replace("_", " ")} — ${sig.confidence}% confidence` });
        }
      } else {
        setQuickAnalysis({ symbol: sym, name: info?.name || sym, signal: "NO_DATA", confidence: 0, buyCount: 0, sellCount: 0 });
        if (!isFirstAnalysis) {
          toast({ title: `${sym} — No Data`, description: "Insufficient market data for this symbol", variant: "destructive" });
        }
      }
    } catch {
      if (qaIdRef.current !== id) return;
      setQuickAnalysis({ symbol: sym, name: info?.name || sym, signal: "NO_DATA", confidence: 0, buyCount: 0, sellCount: 0 });
      if (!isFirstAnalysis) {
        toast({ title: "Analysis unavailable", description: "Market data could not be retrieved", variant: "destructive" });
      }
    } finally {
      if (qaIdRef.current === id) setAnalyzingSymbol("");
    }
  }, [toast, isFirstAnalysis]);

  const todayOptionsIncome = 0;

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
      <div className="bg-background border-b border-border px-3 sm:px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMarketOpen ? 'bg-[#00B4D8]' : 'bg-[#FFB800]'} opacity-60`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? 'bg-[#00B4D8]' : 'bg-[#FFB800]'}`} />
            </span>
            <span role="status" aria-live="polite" className={`text-[10px] font-mono font-semibold tracking-wider whitespace-nowrap ${isMarketOpen ? 'text-[#00B4D8]' : 'text-[#FFB800]'}`}>
              {isMarketOpen ? "Market Open" : "Market Closed"}
            </span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">Simulated data · for practice only</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-muted-foreground/70" />
            <span className="text-[11px] font-mono font-semibold text-muted-foreground tabular-nums">{clock}</span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
              <input
                data-cmd-search
                placeholder="Search ticker..."
                aria-label="Search stock ticker symbol"
                role="combobox"
                aria-expanded={showSearchDropdown && searchResults.length > 0}
                aria-autocomplete="list"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                onKeyDown={(e) => { if (e.key === "Enter" && searchQuery.trim()) { e.preventDefault(); runQuickAnalysis(searchQuery.toUpperCase().trim()); } }}
                className="w-full sm:w-44 h-7 pl-7 pr-2 text-xs bg-muted/50 border border-border rounded-lg text-foregroundplaceholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40 transition-colors"
              />
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl z-50 shadow-2xl overflow-hidden">
                  {searchResults.map(s => (
                    <Button key={s.symbol} onClick={() => { setSearchQuery(s.symbol); runQuickAnalysis(s.symbol); }}
                      variant="ghost"
                      className="w-full justify-start px-3 py-2 h-auto rounded-none text-left flex items-center gap-2 hover:bg-primary/[0.06] border-b border-border/50 last:border-0">
                      <span className="text-xs font-bold font-mono text-primary">{s.symbol}</span>
                      <span className="text-[10px] text-muted-foreground/50 truncate">{s.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => setShowShortcuts(v => !v)} aria-label="Keyboard shortcuts" size="icon" variant="ghost" className="w-7 h-7 shrink-0 text-muted-foreground/40 hover:text-muted-foreground">
              <Keyboard className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 " onClick={() => setShowShortcuts(false)} role="dialog" aria-modal="true" aria-labelledby="shortcuts-dialog-title">
          <div className="bg-card border border-border rounded-sm p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span id="shortcuts-dialog-title" className="text-sm font-bold text-foreground">Keyboard Shortcuts</span>
              <Button onClick={() => setShowShortcuts(false)} aria-label="Close" size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground/50 hover:text-muted-foreground"><X className="w-4 h-4" /></Button>
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
                  <kbd className="min-w-[28px] text-center px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono font-bold text-muted-foreground">{key}</kbd>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-4 max-w-[1600px] mx-auto w-full">

        {/* Section 1: Hero — Portfolio + Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Portfolio",
              value: `$${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              sub: `${pnl >= 0 ? '+' : ''}${Math.abs(parseFloat(pnlPct)).toFixed(2)}% P&L`,
              color: pnl >= 0 ? "#00B4D8" : "#ff4757",
              isPositive: pnl >= 0,
            },
            {
              label: "Options Income",
              value: `+$${todayOptionsIncome}`,
              sub: "Theta today",
              color: "#FFB800",
              isPositive: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Edge Pulse */}
        <EdgePulseCard />

        {/* Wealth Signal Card trigger */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setShowWealthCard(true);
              setAchievement({ title: "Wealth Signal Generated", subtitle: "Your snapshot is ready to share.", tier: "platinum" });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold font-mono tracking-wider transition-all hover:opacity-90"
            style={{
              background: "rgba(0,180,216,0.08)",
              border: "1px solid rgba(0,180,216,0.2)",
              color: "rgba(0,180,216,0.8)",
            }}
          >
            <Eye className="w-3 h-3" />
            WEALTH SIGNAL
          </button>
        </div>

        {/* Quick Analysis result */}
        {(quickAnalysis || analyzingSymbol) && (
          <Panel>
            <PanelHeader title="Quick Analysis" icon={<BarChart3 className="w-3.5 h-3.5" />} rightContent={
              <Button onClick={() => { setQuickAnalysis(null); setAnalyzingSymbol(""); }} size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground/50 hover:text-muted-foreground"><X className="w-4 h-4" /></Button>
            } />
            <div className="px-4 py-4">
              {analyzingSymbol ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Running 55+ indicators on {analyzingSymbol}...</span>
                </div>
              ) : quickAnalysis && (
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${quickAnalysis.signal.includes("BUY") ? "text-[#00B4D8]" : quickAnalysis.signal.includes("SELL") ? "text-red-400" : "text-[#FFB800]"}`}>{quickAnalysis.confidence}%</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Confidence</p>
                    </div>
                    <div className="h-10 w-px bg-muted" />
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-bold text-foreground">{quickAnalysis.symbol}</span>
                        <span className="text-sm text-muted-foreground/50">{quickAnalysis.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${quickAnalysis.signal.includes("BUY") ? "bg-primary/10 text-primary" : quickAnalysis.signal.includes("SELL") ? "bg-red-400/10 text-red-400" : "bg-[#FFB800]/10 text-[#FFB800]"}`}>
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

        {/* Section: Personalized Financial Plan — primary module-driven view */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-foreground/70">Your Financial Plan</span>
              <span className="text-[10px] text-muted-foreground/50 font-mono">Personalized to your occupation</span>
            </div>
          </div>
          <DynamicModuleGrid />
        </div>

        {/* Behavioral nudges — stacked priority system */}
        <div className="grid grid-cols-12 gap-3">
          <FreshStartPrompt />
          <LossAversionNudge />
          <FinishSetupNudge />
        </div>

        {/* Identity nudge — contextual, below setup nudges */}
        <IdentityLabel variant="nudge" />

        {/* Social proof */}
        <SocialProofTicker />

        {/* Progressive profiling — deferred occupation/focus questions */}
        <ProgressiveProfileCard className="mb-1" />

        {/* Entangled Insights Feed */}
        {entanglementInsights.length > 0 && (
          <div className="glass-panel p-4">
            <EntangledInsightsFeed insights={entanglementInsights} maxItems={5} />
          </div>
        )}

        {/* Section 2: Hero Panels — QuantumViz + Portfolio + Watchlist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Panel>
              <PanelHeader title="Signal Matrix" icon={<Activity className="w-3.5 h-3.5" />} rightContent={
                <span className="text-xs text-muted-foreground/50">6 models · consensus view</span>
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
                  <Button onClick={() => setShowTradePanel(v => !v)} variant="outline" size="sm" className="text-xs font-semibold text-primary/70 hover:text-primary border-primary/20 rounded-lg h-7 px-2.5">
                    {showTradePanel ? "View Chart" : "Trade"}
                  </Button>
                </div>
              } />
              <div className="p-4">
                {showTradePanel ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Cash", value: `$${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-primary" },
                        { label: "Positions", value: `$${portfolio.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-foreground/70" },
                        { label: "Total", value: `$${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-foreground" },
                        { label: "P&L", value: `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: pnl >= 0 ? "text-primary" : "text-red-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground/60 mb-1">{s.label}</p>
                          <p className={`text-sm font-semibold font-mono ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setTradeSide("buy")} variant="ghost" className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${tradeSide === "buy" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground/70 border border-border"}`}>Buy</Button>
                      <Button onClick={() => setTradeSide("sell")} variant="ghost" className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${tradeSide === "sell" ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-muted/50 text-muted-foreground/70 border border-border"}`}>Sell</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input aria-label="Ticker symbol" value={tradeSymbol} onChange={e => setTradeSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="h-9 px-3 text-sm bg-muted/50 border border-border rounded-xl text-foregroundplaceholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40 transition-colors" />
                      <input aria-label="Quantity" value={tradeQty} onChange={e => setTradeQty(e.target.value)} placeholder="Qty" type="number" min="1" className="h-9 px-3 text-sm bg-muted/50 border border-border rounded-xl text-foregroundplaceholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40 transition-colors" />
                      <input aria-label="Price per share" value={tradePrice} onChange={e => setTradePrice(e.target.value)} placeholder="Price" type="number" step="0.01" min="0.01" className="h-9 px-3 text-sm bg-muted/50 border border-border rounded-xl text-foregroundplaceholder:text-muted-foreground/70 focus:outline-none focus:border-primary/40 transition-colors" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={executeTrade} disabled={tradeLoading || !isSignedIn} aria-label={`${tradeSide === "buy" ? "Buy" : "Sell"} order`} className={`flex-1 h-10 text-sm font-bold rounded-xl active:scale-[0.97] gap-1.5 ${tradeSide === "buy" ? "bg-primary text-black hover:bg-primary/90" : "bg-red-500 text-foregroundhover:bg-red-500/90"}`}>
                        {tradeLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executing...</> : `${tradeSide === "buy" ? "Buy" : "Sell"} Order`}
                      </Button>
                      <Button onClick={resetPortfolio} variant="outline" title="Reset portfolio to $100,000" className="px-4 h-10 text-sm font-medium text-muted-foreground/70 border-border rounded-xl hover:text-muted-foreground hover:border-border">
                        Reset
                      </Button>
                    </div>
                    {portfolio.positions.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground/60 mb-2">Open Positions</p>
                        {portfolio.positions.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                            <span className="text-sm font-semibold text-primary">{p.symbol}</span>
                            <span className="text-xs text-muted-foreground">{p.quantity} @ ${p.avgCost.toFixed(2)}</span>
                            <span className="text-sm font-mono text-foreground/70">${(p.quantity * p.avgCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isSignedIn && <p className="text-xs text-[#FFB800] text-center">Sign in to start paper trading</p>}
                  </div>
                ) : (
                  <div>
                    {portfolio.trades.length === 0 && !hasRealHistory ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <TrendingUp className="w-10 h-10 text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground mb-1">$100,000 starting balance</p>
                        <p className="text-xs text-muted-foreground/40 mb-4">Place your first paper trade to start tracking</p>
                        <Button onClick={() => setShowTradePanel(true)} variant="outline" className="text-sm font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 border-primary/20">
                          Place your first trade
                        </Button>
                      </div>
                    ) : (
                      <>
                        {hasRealHistory && (
                          <p className="text-[10px] font-mono text-muted-foreground/40 px-1 mb-1">Daily portfolio history · {snapshots.length} days</p>
                        )}
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={portfolioChartPoints}>
                            <defs>
                              <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={pnl >= 0 ? "#00B4D8" : "#ff4757"} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={pnl >= 0 ? "#00B4D8" : "#ff4757"} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.02)" />
                            <XAxis dataKey="time" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={['dataMin - 500', 'dataMax + 500']} width={48} />
                            <Tooltip contentStyle={{ background: '#0A0E1A', border: '1px solid rgba(0,180,216,0.15)', borderRadius: 12, color: '#fff', fontSize: 12 }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                            <Area type="monotone" dataKey="value" stroke={pnl >= 0 ? "#00B4D8" : "#ff4757"} strokeWidth={2} fill="url(#pgGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </>
                    )}
                    {portfolio.trades.length > 0 && (
                      <div className="mt-3">
                        <JourneyBridgeCard
                          title="Test this thesis in history"
                          desc="How would this trade have performed in 2020 or 2022? Use Time Machine to backtest and strengthen your conviction."
                          href="/time-machine"
                          phaseColor="#00D4FF"
                          cta="Open Time Machine →"
                        />
                      </div>
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
            <ZeigarnikProgressBar />
            <IdentityLabel variant="card" />
            <GoalGradientAccelerator />
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
                    <Button key={tab} onClick={() => setActiveAssetTab(tab)} variant="ghost" size="sm"
                      className={`px-2 py-0.5 h-auto text-xs font-semibold rounded-lg ${activeAssetTab === tab ? 'bg-[#FFB800]/15 text-[#FFB800]' : 'text-muted-foreground/50 hover:text-muted-foreground'}`}>
                      {tab === "commodities" ? "Cmdty" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Button>
                  ))}
                </div>
              } />
              {activeAssetTab !== "crypto" && (
                <div className="px-3 py-2 bg-muted/30 border-b border-white/[0.04]">
                  <p className="text-[9px] font-mono text-muted-foreground/40">&gt; AWAITING DATA FEED — {activeAssetTab.toUpperCase()} prices require market connection</p>
                </div>
              )}
              {activeAssetTab === "crypto" && cryptoPricesLoading && Object.keys(cryptoPrices).length === 0 && (
                <div className="px-3 py-3 text-[9px] font-mono text-muted-foreground/50 text-center">Loading crypto prices…</div>
              )}
              <div className="divide-y divide-border/50">
                {MULTI_ASSET_SYMBOLS[activeAssetTab].map(sym => {
                  if (activeAssetTab === "crypto") {
                    const p = cryptoPrices[sym];
                    const display = sym.replace("/USD", "");
                    const label = CRYPTO_DISPLAY_NAMES[sym] ?? display;
                    return (
                      <DataRow
                        key={sym}
                        label={`${display} · ${label}`}
                        value={p ? `$${p.price.toLocaleString(undefined, { minimumFractionDigits: p.price >= 1000 ? 0 : 2, maximumFractionDigits: p.price >= 1000 ? 0 : 4 })}` : "—"}
                        change={p ? p.changePercent : undefined}
                      />
                    );
                  }
                  return <DataRow key={sym} label={sym} value="NO FEED" change={undefined} />;
                })}
              </div>
            </Panel>
          </div>
        </div>

        {/* Section 3: Tabbed secondary data */}
        <Panel>
          <div className="border-b border-border">
            <div className="flex px-2 py-1 gap-1">
              {SECONDARY_TABS.map(t => (
                <Button
                  key={t.key}
                  onClick={() => setSecondaryTab(t.key)}
                  variant="ghost"
                  className={`px-4 py-2.5 h-auto text-sm font-semibold rounded-lg ${
                    secondaryTab === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground/70 hover:text-foreground/70 hover:bg-muted/50"
                  }`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {secondaryTab === "signals" && (
            <div className="px-4 py-8 text-center">
              <p className="text-[10px] font-mono text-muted-foreground/40">&gt; NO SIGNALS IN QUEUE — analysis engine idle</p>
              <p className="text-[9px] font-mono text-muted-foreground/30 mt-1">Run a stock analysis to generate signals</p>
            </div>
          )}

          {secondaryTab === "options" && (
            <div className="px-4 py-8 text-center">
              <p className="text-[10px] font-mono text-muted-foreground/40">&gt; OPTIONS FLOW OFFLINE — awaiting market feed</p>
              <p className="text-[9px] font-mono text-muted-foreground/30 mt-1">Unusual activity alerts will appear here when detected</p>
            </div>
          )}

          {secondaryTab === "market" && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
              <div className="divide-y divide-border/50">
                <div className="px-4 py-2.5">
                  <p className="text-xs text-muted-foreground font-semibold">Market Internals</p>
                </div>
                <MarketConditionBadges conditions={marketConditions} />
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
              <div className="divide-y divide-border/50">
                <div className="px-4 py-2.5">
                  <p className="text-xs text-muted-foreground font-semibold">Unusual Options Activity</p>
                </div>
                <div className="flex flex-col items-center justify-center py-6 text-center gap-1">
                  <p className="text-xs text-muted-foreground/40">No unusual activity detected</p>
                </div>
              </div>
            </div>
          )}

          {secondaryTab === "calendar" && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
              <div className="p-4">
                <p className="text-xs text-muted-foreground font-semibold mb-3">Signal History</p>
                <SignalHistory />
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground font-semibold mb-3">Economic Calendar</p>
                <EconomicCalendar />
              </div>
            </div>
          )}
        </Panel>

      </div>
      </PageErrorBoundary>

      {/* Ambient Dashboard Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <AmbientDashboard />
      </div>

      {/* Wealth Signal Card */}
      {showWealthCard && (
        <WealthSignalCard
          portfolioValue={portfolio.totalValue}
          portfolioChange={parseFloat(pnlPct)}
          onClose={() => setShowWealthCard(false)}
        />
      )}

      {/* Cinematic Achievement */}
      {achievement && (
        <CinematicAchievement
          achievement={achievement}
          onComplete={() => setAchievement(null)}
        />
      )}

      {/* First Analysis Wow Moment */}
      {showFirstAnalysisWow && (
        <FirstAnalysisWow
          symbol={firstAnalysisSymbol}
          onComplete={() => {
            setShowFirstAnalysisWow(false);
            markFirstAnalysisDone();
          }}
        />
      )}

      {/* Behavioral psychology layers */}
      <VariableSurpriseReward />
      <SessionRecapOverlay />
      <CommitmentEscalationFlow />
    </Layout>
  );
}
