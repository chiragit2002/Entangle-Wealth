import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { getMarginalRate, TAX_RATES } from "@/lib/taxflow-rates";
import { XPBar } from "@/components/XPBar";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Star,
  Target,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LightweightChart = lazy(() => import("@/components/charts/LightweightChart"));

const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp" },
  { symbol: "NVDA", name: "NVIDIA Corp" },
  { symbol: "TSLA", name: "Tesla Inc" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMZN", name: "Amazon.com" },
  { symbol: "GOOGL", name: "Alphabet Inc" },
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq-100 ETF" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "NFLX", name: "Netflix Inc" },
];

const STEP_LABELS = [
  "Select Stock",
  "Analyze",
  "Order Details",
  "Tax Impact",
  "Execute",
  "Confirmed",
];

interface CandleBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchCandlestickData(symbol: string): Promise<CandleBar[]> {
  try {
    const res = await fetch(`/api/alpaca/bars/${symbol}?timeframe=1Day&limit=60`);
    if (!res.ok) return [];
    const data = await res.json() as { bars?: { t: string; o: number; h: number; l: number; c: number; v: number }[] };
    if (!data.bars?.length) return [];
    return data.bars.map(b => ({
      time: b.t.split("T")[0],
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v,
    }));
  } catch {
    return [];
  }
}

function generateOrderBook(price: number) {
  const bids = [];
  const asks = [];
  for (let i = 0; i < 8; i++) {
    bids.push({ price: +(price - (i + 1) * (price * 0.001)).toFixed(2), size: Math.floor(Math.random() * 5000 + 200) });
    asks.push({ price: +(price + (i + 1) * (price * 0.001)).toFixed(2), size: Math.floor(Math.random() * 5000 + 200) });
  }
  return { bids, asks };
}

interface GamificationData {
  xp: { totalXp: number; level: number; tier: string; monthlyXp: number };
  streak: { currentStreak: number; multiplier: number };
  levelProgress: number;
  xpToNextLevel: number;
  badges: { badge: { name: string; icon: string }; earnedAt: string }[];
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full px-2 py-2 border-b border-border">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={stepNum} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-mono font-bold transition-all ${
                isDone
                  ? "bg-[#00ff88] text-black"
                  : isActive
                  ? "bg-[#00B4D8] text-black ring-2 ring-[#00B4D8]/30"
                  : "bg-muted text-muted-foreground/50"
              }`}>
                {isDone ? "✓" : stepNum}
              </div>
              <span className={`text-[7px] font-mono mt-0.5 truncate max-w-[60px] text-center transition-colors ${
                isActive ? "text-[#00B4D8]" : isDone ? "text-[#00ff88]" : "text-muted-foreground/40"
              }`}>
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div className={`h-px flex-1 mx-0.5 transition-colors ${isDone ? "bg-[#00ff88]/50" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StockInfo {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  isPositive: boolean;
  volume: string;
  dayHigh: number;
  dayLow: number;
}

interface AlpacaSnapshot {
  minuteBar?: { c: number; v: number };
  dailyBar?: { c: number; o: number; h: number; l: number; v: number };
  latestTrade?: { p: number };
}

function buildStockInfo(symbol: string, snap: AlpacaSnapshot | undefined): StockInfo | null {
  const popular = POPULAR_TICKERS.find(p => p.symbol === symbol.toUpperCase());
  const price = snap?.minuteBar?.c || snap?.dailyBar?.c || snap?.latestTrade?.p || 0;
  if (!price && !popular) return null;
  const changePercent = snap?.dailyBar
    ? ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o) * 100
    : 0;
  const vol = snap?.dailyBar?.v || snap?.minuteBar?.v || 0;
  return {
    symbol: symbol.toUpperCase(),
    name: popular?.name ?? symbol.toUpperCase(),
    price,
    changePercent,
    isPositive: changePercent >= 0,
    volume: vol >= 1_000_000 ? `${(vol / 1_000_000).toFixed(1)}M` : vol >= 1_000 ? `${(vol / 1_000).toFixed(0)}K` : `${vol}`,
    dayHigh: snap?.dailyBar?.h || (price * 1.015),
    dayLow: snap?.dailyBar?.l || (price * 0.985),
  };
}

export function TradeFlowPanel() {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [chartData, setChartData] = useState<CandleBar[]>([]);
  const [orderBook, setOrderBook] = useState<ReturnType<typeof generateOrderBook> | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, AlpacaSnapshot>>({});

  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const [orderType, setOrderType] = useState<"Market" | "Limit" | "Stop">("Market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");

  const [tradeLoading, setTradeLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tradeResult, setTradeResult] = useState<{
    symbol: string; side: string; quantity: number; price: number; totalCost: number; xpEarned?: number; leveledUp?: boolean;
  } | null>(null);
  const [newBadges, setNewBadges] = useState<{ name: string; icon: string }[]>([]);
  const [bannerVisible, setBannerVisible] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const filteredTickers = searchQuery.trim().length > 0
    ? POPULAR_TICKERS.filter(t =>
        t.symbol.startsWith(searchQuery.toUpperCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_TICKERS;

  const selectStock = useCallback(async (symbol: string) => {
    const upper = symbol.toUpperCase();
    let snap = snapshots[upper];
    if (!snap) {
      try {
        const res = await fetch(`/api/alpaca/snapshots?symbols=${encodeURIComponent(upper)}`);
        if (res.ok) {
          const data = await res.json() as Record<string, AlpacaSnapshot>;
          snap = data[upper];
          if (snap) setSnapshots(prev => ({ ...prev, [upper]: snap }));
        }
      } catch {}
    }
    const info = buildStockInfo(upper, snap);
    if (!info && !POPULAR_TICKERS.find(p => p.symbol === upper)) return;
    const resolvedInfo: StockInfo = info ?? {
      symbol: upper,
      name: POPULAR_TICKERS.find(p => p.symbol === upper)?.name ?? upper,
      price: 0,
      changePercent: 0,
      isPositive: true,
      volume: "—",
      dayHigh: 0,
      dayLow: 0,
    };
    setSelectedStock(resolvedInfo);
    if (resolvedInfo.price > 0) {
      setOrderBook(generateOrderBook(resolvedInfo.price));
      setLimitPrice(resolvedInfo.price.toFixed(2));
    }
    setSearchQuery("");
    setStep(2);
    const bars = await fetchCandlestickData(upper);
    if (bars.length > 0) setChartData(bars);
  }, [snapshots]);

  useEffect(() => {
    const symbols = POPULAR_TICKERS.map(t => t.symbol).join(",");
    fetch(`/api/alpaca/snapshots?symbols=${encodeURIComponent(symbols)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: Record<string, AlpacaSnapshot> | null) => {
        if (data) setSnapshots(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    authFetch("/gamification/me", getToken)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setGamification(data); })
      .catch(() => {});
    authFetch("/gamification/challenges/me", getToken)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setChallenges(data.filter((c: Challenge) => !c.completed).slice(0, 3)); })
      .catch(() => {});
  }, [isSignedIn, getToken]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (step !== 5) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        setShowConfirmDialog(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  const execPrice = orderType === "Market"
    ? (selectedStock?.price ?? 0)
    : parseFloat(limitPrice) || 0;

  const estimatedCost = (parseFloat(quantity) || 0) * execPrice;

  const existingPosition = 0;
  const pnlImpact = side === "buy" ? -estimatedCost : estimatedCost;

  const marginalRate = getMarginalRate(100000, 2026);
  const shortTermGain = side === "sell" && estimatedCost > 0
    ? estimatedCost * 0.1 * marginalRate
    : 0;
  const longTermGain = side === "sell" && estimatedCost > 0
    ? estimatedCost * 0.1 * 0.15
    : 0;

  const executeTrade = useCallback(async () => {
    if (!selectedStock || !quantity) return;
    setTradeLoading(true);
    setShowConfirmDialog(false);
    try {
      const res = await authFetch("/paper-trading/trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          side,
          quantity: parseInt(quantity),
          price: execPrice,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = errData?.error || errData?.message || "Trade execution failed. Please try again.";
        toast({ title: "> TRADE FAILED", description: message, variant: "destructive" });
        setTradeLoading(false);
        return;
      }

      const xpRes = await authFetch("/gamification/xp", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "signal_used", category: "trading" }),
      });
      let xpData: { xpEarned?: number; leveledUp?: boolean } = {};
      if (xpRes.ok) xpData = await xpRes.json().catch(() => ({}));

      await authFetch("/gamification/streak/checkin", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});

      const gamRes = await authFetch("/gamification/me", getToken);
      if (gamRes.ok) {
        const gamData = await gamRes.json();
        setGamification(gamData);
        const prevBadgeIds = new Set((gamification?.badges ?? []).map((b) => b.badge.name));
        const earned = (gamData.badges ?? []).filter((b: { badge: { name: string; icon: string } }) => !prevBadgeIds.has(b.badge.name));
        if (earned.length > 0) setNewBadges(earned.map((b: { badge: { name: string; icon: string } }) => b.badge));
      }

      setTradeResult({
        symbol: selectedStock.symbol,
        side,
        quantity: parseInt(quantity),
        price: execPrice,
        totalCost: estimatedCost,
        xpEarned: xpData.xpEarned,
        leveledUp: xpData.leveledUp,
      });
      setStep(6);
      setBannerVisible(true);
      setTimeout(() => setBannerVisible(false), 6000);
    } catch {
      toast({ title: "> EXECUTION ERROR", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setTradeLoading(false);
    }
  }, [selectedStock, side, quantity, execPrice, estimatedCost, getToken, gamification, toast]);

  const resetFlow = () => {
    setStep(1);
    setSelectedStock(null);
    setChartData([]);
    setOrderBook(null);
    setQuantity("");
    setLimitPrice("");
    setOrderType("Market");
    setSide("buy");
    setTradeResult(null);
    setNewBadges([]);
    setShowConfirmDialog(false);
  };

  return (
    <div className="bg-[#0a0a0f] border border-border rounded-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border border-l-2 border-l-[#00B4D8]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-[#00B4D8]" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#00B4D8]">TRADE FLOW</span>
          <span className="text-[8px] font-mono text-muted-foreground/40 ml-1">6-STEP TERMINAL</span>
        </div>
        {selectedStock && (
          <div className="flex items-center gap-2 text-[9px] font-mono">
            <span className="text-[#00B4D8] font-bold">{selectedStock.symbol}</span>
            <span className="text-muted-foreground/70">${selectedStock.price.toFixed(2)}</span>
            <span className={selectedStock.isPositive ? "text-[#00ff88]" : "text-[#ff3366]"}>
              {selectedStock.changePercent >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%
            </span>
            <button onClick={resetFlow} className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors text-[8px] ml-2 border border-border px-1 py-0.5 rounded-sm">
              RESET
            </button>
          </div>
        )}
      </div>

      <StepIndicator currentStep={step} />

      <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
          >

            {step === 1 && (
              <div className="p-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && filteredTickers.length > 0) selectStock(filteredTickers[0].symbol);
                    }}
                    placeholder="Search ticker or company name..."
                    className="w-full h-8 pl-7 pr-3 text-[11px] font-mono bg-muted/50 border border-border rounded-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00B4D8]/40"
                    autoFocus
                  />
                </div>

                <div>
                  <p className="text-[8px] font-mono text-muted-foreground/40 uppercase mb-1.5">
                    {searchQuery ? `Results for "${searchQuery.toUpperCase()}"` : "Popular Stocks"}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {filteredTickers.slice(0, 12).map(t => {
                      const snap = snapshots[t.symbol];
                      const price = snap?.minuteBar?.c || snap?.dailyBar?.c || snap?.latestTrade?.p;
                      const changePercent = snap?.dailyBar
                        ? ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o) * 100
                        : null;
                      return (
                        <button
                          key={t.symbol}
                          onClick={() => selectStock(t.symbol)}
                          className="flex items-center justify-between px-2.5 py-2 bg-muted/30 hover:bg-[#00B4D8]/[0.06] border border-border hover:border-[#00B4D8]/20 rounded-sm transition-all group"
                        >
                          <div className="text-left">
                            <p className="text-[10px] font-mono font-bold text-foreground group-hover:text-[#00B4D8] transition-colors">{t.symbol}</p>
                            <p className="text-[8px] font-mono text-muted-foreground/50 truncate max-w-[80px]">{t.name}</p>
                          </div>
                          {price != null && price > 0 ? (
                            <div className="text-right">
                              <p className="text-[10px] font-mono text-muted-foreground">${price.toFixed(0)}</p>
                              {changePercent != null && (
                                <p className={`text-[8px] font-mono ${changePercent >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                                  {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-right text-[8px] font-mono text-muted-foreground/40">—</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && selectedStock && (
              <div className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-bold text-foreground">{selectedStock.symbol}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${selectedStock.isPositive ? "bg-[#00ff88]/10 text-[#00ff88]" : "bg-[#ff3366]/10 text-[#ff3366]"}`}>
                        {selectedStock.changePercent >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground/60">{selectedStock.name}</p>
                    <p className="text-[18px] font-mono font-bold text-foreground mt-0.5">${selectedStock.price.toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-right">
                    <div>
                      <p className="text-[7px] font-mono text-muted-foreground/40">DAY HIGH</p>
                      <p className="text-[9px] font-mono font-bold text-foreground/70">{selectedStock.dayHigh > 0 ? `$${selectedStock.dayHigh.toFixed(2)}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-mono text-muted-foreground/40">VOLUME</p>
                      <p className="text-[9px] font-mono font-bold text-foreground/70">{selectedStock.volume}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-mono text-muted-foreground/40">DAY LOW</p>
                      <p className="text-[9px] font-mono font-bold text-[#ff3366]">{selectedStock.dayLow > 0 ? `$${selectedStock.dayLow.toFixed(2)}` : "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm overflow-hidden border border-border">
                  <Suspense fallback={<div className="h-[160px] flex items-center justify-center text-[9px] font-mono text-muted-foreground/40">LOADING CHART...</div>}>
                    <LightweightChart data={chartData} height={160} showVolume={false} />
                  </Suspense>
                </div>

                {orderBook && (
                  <div>
                    <p className="text-[8px] font-mono text-muted-foreground/40 uppercase mb-1">ORDER BOOK DEPTH</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[7px] font-mono text-muted-foreground/40 mb-0.5 px-1">
                          <span>PRICE</span><span>SIZE</span>
                        </div>
                        {orderBook.bids.slice(0, 5).map((b, i) => {
                          const maxSize = Math.max(...orderBook.bids.map(x => x.size));
                          const barW = (b.size / maxSize) * 100;
                          return (
                            <div key={i} className="relative flex justify-between text-[8px] font-mono px-1 py-0.5">
                              <div className="absolute inset-0 bg-[#00ff88]/[0.04]" style={{ width: `${barW}%` }} />
                              <span className="relative text-[#00ff88]">${b.price}</span>
                              <span className="relative text-muted-foreground/70">{b.size.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <div className="flex justify-between text-[7px] font-mono text-muted-foreground/40 mb-0.5 px-1">
                          <span>PRICE</span><span>SIZE</span>
                        </div>
                        {orderBook.asks.slice(0, 5).map((a, i) => {
                          const maxSize = Math.max(...orderBook.asks.map(x => x.size));
                          const barW = (a.size / maxSize) * 100;
                          return (
                            <div key={i} className="relative flex justify-between text-[8px] font-mono px-1 py-0.5">
                              <div className="absolute inset-0 bg-[#ff3366]/[0.04]" style={{ width: `${barW}%` }} />
                              <span className="relative text-[#ff3366]">${a.price}</span>
                              <span className="relative text-muted-foreground/70">{a.size.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1 py-1 bg-muted/30 border-t border-b border-border">
                      <span className="text-[7px] font-mono text-muted-foreground/40">BID/ASK SPREAD</span>
                      <span className="text-[8px] font-mono text-[#FFD700] font-bold">
                        ${orderBook.bids[0].price} / ${orderBook.asks[0].price}
                      </span>
                      <span className="text-[7px] font-mono text-muted-foreground/40">
                        (${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)})
                      </span>
                    </div>
                  </div>
                )}

                {gamification && (
                  <div className="border border-border rounded-sm p-2 space-y-1.5 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3 h-3 text-[#FFD700]" />
                        <span className="text-[8px] font-mono text-muted-foreground/70 uppercase">Your Status</span>
                      </div>
                      <div className="flex items-center gap-2 text-[8px] font-mono">
                        <span className="text-[#FFD700] font-bold">{gamification.xp.tier}</span>
                        <span className="text-muted-foreground/50">Lv.{gamification.xp.level}</span>
                        <span className="text-muted-foreground/40">{gamification.xp.totalXp.toLocaleString()} XP</span>
                      </div>
                    </div>
                    <XPBar
                      level={gamification.xp.level}
                      levelProgress={gamification.levelProgress}
                      xpToNextLevel={gamification.xpToNextLevel}
                      tier={gamification.xp.tier}
                      variant="compact"
                    />
                    <div className="flex items-center gap-3 text-[8px] font-mono">
                      <div className="flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-[#ff7f00]" />
                        <span className="text-muted-foreground/70">Streak:</span>
                        <span className="text-[#ff7f00] font-bold">{gamification.streak.currentStreak}d</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-[#00B4D8]" />
                        <span className="text-muted-foreground/70">Multiplier:</span>
                        <span className="text-[#00B4D8] font-bold">{gamification.streak.multiplier.toFixed(1)}x</span>
                      </div>
                    </div>
                    {challenges.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[7px] font-mono text-muted-foreground/40 uppercase">Active Challenges</p>
                        {challenges.map(c => (
                          <div key={c.id} className="flex items-center gap-2">
                            <Target className="w-2.5 h-2.5 text-[#9c27b0] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-mono text-muted-foreground truncate">{c.title}</span>
                                <span className="text-[7px] font-mono text-[#FFD700]">+{c.xpReward} XP</span>
                              </div>
                              <div className="w-full h-0.5 bg-muted/50 rounded-full mt-0.5">
                                <div className="h-full bg-[#9c27b0] rounded-full" style={{ width: `${(c.progress / c.target) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-mono text-muted-foreground/70 bg-muted/30 border border-border rounded-sm hover:text-muted-foreground transition-colors">
                    <ChevronLeft className="w-3 h-3" />Back
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono font-bold text-black bg-[#00B4D8] hover:bg-[#00B4D8]/80 rounded-sm transition-colors">
                    Set Order Details<ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && selectedStock && (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground/70">
                  <span className="text-[#00B4D8] font-bold">{selectedStock.symbol}</span>
                  <span>${selectedStock.price.toFixed(2)}</span>
                </div>

                <div className="flex gap-1">
                  {(["buy", "sell"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSide(s)}
                      className={`flex-1 py-2 text-[10px] font-mono font-bold rounded-sm transition-all ${
                        side === s
                          ? s === "buy"
                            ? "bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40"
                            : "bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/40"
                          : "bg-muted/30 text-muted-foreground/50 border border-border hover:text-muted-foreground"
                      }`}
                    >
                      {s === "buy" ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-[7px] font-mono text-muted-foreground/40 uppercase mb-1">Order Type</p>
                  <div className="flex gap-1">
                    {(["Market", "Limit", "Stop"] as const).map(ot => (
                      <button
                        key={ot}
                        onClick={() => setOrderType(ot)}
                        className={`flex-1 py-1.5 text-[9px] font-mono font-bold rounded-sm transition-all ${
                          orderType === ot
                            ? "bg-[#00B4D8]/15 text-[#00B4D8] border border-[#00B4D8]/40"
                            : "bg-muted/30 text-muted-foreground/50 border border-border hover:text-muted-foreground"
                        }`}
                      >
                        {ot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[7px] font-mono text-muted-foreground/40 uppercase block mb-1">Quantity (Shares)</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder="100"
                      className="w-full h-8 px-2 text-[10px] font-mono bg-muted/50 border border-border rounded-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00B4D8]/40"
                    />
                  </div>
                  {orderType !== "Market" && (
                    <div>
                      <label className="text-[7px] font-mono text-muted-foreground/40 uppercase block mb-1">
                        {orderType === "Limit" ? "Limit Price" : "Stop Price"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={limitPrice}
                        onChange={e => setLimitPrice(e.target.value)}
                        placeholder={selectedStock.price.toFixed(2)}
                        className="w-full h-8 px-2 text-[10px] font-mono bg-muted/50 border border-border rounded-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00B4D8]/40"
                      />
                    </div>
                  )}
                </div>

                {estimatedCost > 0 && (
                  <div className="space-y-1 border border-border rounded-sm p-2 bg-muted/30">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-muted-foreground/70">Exec Price</span>
                      <span className="text-foreground font-bold">${execPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-muted-foreground/70">Shares</span>
                      <span className="text-foreground">{parseInt(quantity) || 0}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground/70">Estimated Total</span>
                      <span className="text-[#00B4D8] font-bold text-[10px]">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-muted-foreground/70">Portfolio P&L Impact</span>
                      <span className={`font-bold ${pnlImpact >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                        {pnlImpact >= 0 ? "+" : ""}${pnlImpact.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-mono text-muted-foreground/70 bg-muted/30 border border-border rounded-sm hover:text-muted-foreground transition-colors">
                    <ChevronLeft className="w-3 h-3" />Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={!quantity || parseFloat(quantity) <= 0}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono font-bold text-black bg-[#00B4D8] hover:bg-[#00B4D8]/80 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Review Tax Impact<ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && selectedStock && (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2 text-[8px] font-mono text-muted-foreground/70 mb-2">
                  <Shield className="w-3 h-3 text-[#FFD700]" />
                  <span className="text-[#FFD700] font-bold uppercase">Tax Impact Analysis</span>
                  <span className="ml-auto text-muted-foreground/40">2026 Tax Year</span>
                </div>

                <div className="border border-border rounded-sm p-2.5 bg-muted/30 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-muted-foreground/70">Trade</span>
                    <span className="text-foreground font-bold uppercase">{side} {parseInt(quantity) || 0} {selectedStock.symbol} @ ${execPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-muted-foreground/70">Estimated Cost</span>
                    <span className="text-foreground">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-muted-foreground/70">Your Marginal Rate</span>
                    <span className="text-[#FFD700] font-bold">{(marginalRate * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {side === "sell" && estimatedCost > 0 ? (
                  <div className="space-y-2">
                    <div className="border border-[#ff3366]/20 rounded-sm p-2.5 bg-[#ff3366]/[0.03]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3 h-3 text-[#ff3366]" />
                        <span className="text-[8px] font-mono text-[#ff3366] font-bold uppercase">Short-Term Capital Gains</span>
                      </div>
                      <p className="text-[8px] font-mono text-muted-foreground/50 mb-1">If held &lt; 1 year — taxed as ordinary income</p>
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-muted-foreground/70">Est. Gain</span>
                        <span className="text-foreground">${(estimatedCost * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-muted-foreground/70">Tax Owed</span>
                        <span className="text-[#ff3366] font-bold">${shortTermGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>

                    <div className="border border-[#00ff88]/20 rounded-sm p-2.5 bg-[#00ff88]/[0.02]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle className="w-3 h-3 text-[#00ff88]" />
                        <span className="text-[8px] font-mono text-[#00ff88] font-bold uppercase">Long-Term Capital Gains</span>
                      </div>
                      <p className="text-[8px] font-mono text-muted-foreground/50 mb-1">If held &gt; 1 year — 15% preferential rate</p>
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-muted-foreground/70">Est. Gain</span>
                        <span className="text-foreground">${(estimatedCost * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-muted-foreground/70">Tax Owed</span>
                        <span className="text-[#00ff88] font-bold">${longTermGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono mt-1 pt-1 border-t border-border">
                        <span className="text-muted-foreground/70">Potential Saving</span>
                        <span className="text-[#FFD700] font-bold">${(shortTermGain - longTermGain).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-[#00B4D8]/20 rounded-sm p-2.5 bg-[#00B4D8]/[0.02]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign className="w-3 h-3 text-[#00B4D8]" />
                      <span className="text-[8px] font-mono text-[#00B4D8] font-bold uppercase">Buy Order — No Immediate Tax Event</span>
                    </div>
                    <p className="text-[8px] font-mono text-muted-foreground/60 leading-relaxed">
                      Buying shares creates a cost basis. Capital gains tax is only triggered when you sell.
                      Hold for &gt;1 year to qualify for the long-term rate (15% vs {(marginalRate * 100).toFixed(0)}% short-term).
                    </p>
                    <div className="mt-2 pt-2 border-t border-border flex justify-between text-[9px] font-mono">
                      <span className="text-muted-foreground/70">Cost Basis Created</span>
                      <span className="text-[#00B4D8] font-bold">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setStep(3)} className="flex items-center gap-1 px-2 py-1.5 text-[9px] font-mono text-muted-foreground/70 bg-muted/30 border border-border rounded-sm hover:text-muted-foreground transition-colors">
                    <ChevronLeft className="w-3 h-3" />Back
                  </button>
                  <button onClick={() => setStep(5)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-mono font-bold text-black bg-[#00B4D8] hover:bg-[#00B4D8]/80 rounded-sm transition-colors">
                    Proceed to Execute<ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && selectedStock && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between text-[8px] font-mono">
                  <span className="text-muted-foreground/50 uppercase">Order Summary</span>
                  <span className="text-muted-foreground/40">Press ⌘+Enter to execute</span>
                </div>

                <div className="border border-border rounded-sm p-3 space-y-1.5 bg-muted/30">
                  {[
                    ["Symbol", selectedStock.symbol],
                    ["Side", side.toUpperCase()],
                    ["Type", orderType],
                    ["Quantity", `${parseInt(quantity) || 0} shares`],
                    ["Price", orderType === "Market" ? `Market (~$${execPrice.toFixed(2)})` : `$${execPrice.toFixed(2)}`],
                    ["Est. Cost", `$${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                    ["Tax Note", side === "sell" ? `~$${shortTermGain.toFixed(0)} ST gain tax` : "No immediate tax event"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center text-[9px] font-mono">
                      <span className="text-muted-foreground/70">{label}</span>
                      <span className={`font-bold ${
                        label === "Side" ? (side === "buy" ? "text-[#00ff88]" : "text-[#ff3366]")
                        : label === "Est. Cost" ? "text-[#00B4D8]"
                        : "text-foreground"
                      }`}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep(4)} className="flex items-center gap-1 px-2 py-2 text-[9px] font-mono text-muted-foreground/70 bg-muted/30 border border-border rounded-sm hover:text-muted-foreground transition-colors">
                    <ChevronLeft className="w-3 h-3" />Back
                  </button>
                  <button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!isSignedIn}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-mono font-bold rounded-sm transition-all disabled:opacity-30 ${
                      side === "buy"
                        ? "bg-[#00ff88] text-black hover:bg-[#00ff88]/80"
                        : "bg-[#ff3366] text-foreground hover:bg-[#ff3366]/80"
                    }`}
                  >
                    {side === "buy" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {side.toUpperCase()} {selectedStock.symbol}
                    <span className="opacity-60 text-[8px] ml-1">[⌘↵]</span>
                  </button>
                </div>
                {!isSignedIn && (
                  <p className="text-[9px] font-mono text-[#FFD700] text-center">Sign in to execute trades</p>
                )}
              </div>
            )}

            {step === 6 && tradeResult && (
              <div className="p-3 space-y-3">
                <AnimatePresence>
                  {bannerVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`border rounded-sm p-2.5 font-mono ${
                        tradeResult.side === "buy"
                          ? "border-[#00ff88]/40 bg-[#00ff88]/[0.06]"
                          : "border-[#ff3366]/40 bg-[#ff3366]/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[8px] text-muted-foreground/50">FILL NOTIFICATION</span>
                        <span className="text-[8px] text-muted-foreground/40 ml-auto">{new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
                      </div>
                      <p className={`text-[11px] font-bold ${tradeResult.side === "buy" ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                        ▶ ORDER FILLED: {tradeResult.side.toUpperCase()} {tradeResult.quantity} {tradeResult.symbol} @ ${tradeResult.price.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                        Total: ${tradeResult.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Paper Trading
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00ff88]" />
                  <div>
                    <p className="text-[11px] font-mono font-bold text-foreground">Trade Confirmed</p>
                    <p className="text-[8px] font-mono text-muted-foreground/50">Paper trading order filled successfully</p>
                  </div>
                </div>

                {(tradeResult.xpEarned || tradeResult.leveledUp) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border border-[#FFD700]/30 rounded-sm p-2.5 bg-[#FFD700]/[0.04] font-mono"
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span className="text-[9px] text-[#FFD700] font-bold uppercase">XP AWARDED</span>
                    </div>
                    {tradeResult.xpEarned && (
                      <p className="text-[11px] font-bold text-[#FFD700] mt-0.5">+{tradeResult.xpEarned} XP EARNED</p>
                    )}
                    {tradeResult.leveledUp && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">▶ LEVEL UP — Congratulations on advancing!</p>
                    )}
                    {gamification && (
                      <div className="mt-1.5">
                        <XPBar
                          level={gamification.xp.level}
                          levelProgress={gamification.levelProgress}
                          xpToNextLevel={gamification.xpToNextLevel}
                          tier={gamification.xp.tier}
                          variant="compact"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                <AnimatePresence>
                  {newBadges.map((badge, i) => (
                    <motion.div
                      key={badge.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="border border-[#9c27b0]/40 rounded-sm p-2 bg-[#9c27b0]/[0.06] font-mono flex items-center gap-2"
                    >
                      <span className="text-lg">{badge.icon}</span>
                      <div>
                        <p className="text-[8px] text-[#9c27b0] font-bold uppercase">BADGE UNLOCKED</p>
                        <p className="text-[9px] text-foreground font-bold">{badge.name}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <button
                  onClick={resetFlow}
                  className="w-full py-2 text-[9px] font-mono font-bold text-[#00B4D8] border border-[#00B4D8]/30 rounded-sm hover:bg-[#00B4D8]/[0.06] transition-colors"
                >
                  ▶ START NEW TRADE
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showConfirmDialog && selectedStock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-sm p-5 w-[340px]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-3.5 h-3.5 text-[#00B4D8]" />
                <span className="text-[11px] font-mono font-bold text-[#00B4D8] tracking-wider">CONFIRM ORDER</span>
              </div>
              <div className="space-y-1.5 mb-4">
                {[
                  ["Symbol", selectedStock.symbol],
                  ["Action", `${side.toUpperCase()} ${orderType}`],
                  ["Quantity", `${parseInt(quantity) || 0} shares`],
                  ["Price", orderType === "Market" ? `Market (~$${execPrice.toFixed(2)})` : `$${execPrice.toFixed(2)}`],
                  ["Est. Total", `$${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                  ["Tax Note", side === "sell" ? `~$${shortTermGain.toFixed(0)} short-term gain tax` : "No immediate tax event"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-[9px] font-mono">
                    <span className="text-muted-foreground/70">{label}</span>
                    <span className={`font-bold ${
                      label === "Action" ? (side === "buy" ? "text-[#00ff88]" : "text-[#ff3366]")
                      : label === "Est. Total" ? "text-[#00B4D8]"
                      : "text-foreground"
                    }`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 py-2 text-[9px] font-mono text-muted-foreground/70 border border-border rounded-sm hover:text-muted-foreground transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={executeTrade}
                  disabled={tradeLoading}
                  className={`flex-1 py-2 text-[9px] font-mono font-bold rounded-sm transition-all disabled:opacity-40 ${
                    side === "buy"
                      ? "bg-[#00ff88] text-black hover:bg-[#00ff88]/80"
                      : "bg-[#ff3366] text-foreground hover:bg-[#ff3366]/80"
                  }`}
                >
                  {tradeLoading ? "EXECUTING..." : `CONFIRM ${side.toUpperCase()}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
