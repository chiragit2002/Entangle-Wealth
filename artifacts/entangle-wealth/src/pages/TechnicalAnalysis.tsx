import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import {
  BarChart3, Search, TrendingUp, TrendingDown, Activity, Volume2,
  Waves, ChevronDown, ChevronUp, Zap, Shield, Brain, Eye,
  Target, AlertTriangle, RefreshCw, Download, Loader2,
  Plus, X, Star, ArrowUpRight, ArrowDownRight, Bookmark, BookmarkCheck,
  Bell, BellOff, ChevronRight, FlaskConical, PlayCircle, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  type IndicatorResult, type StockData,
  generateMockOHLCV, runAllIndicators, getOverallSignal,
} from "@/lib/indicators";
import { CandlestickChart } from "@/components/CandlestickChart";
import { fetchBars, fetchSnapshot, barsToStockData, type AlpacaBar } from "@/lib/alpaca";
import { trackEvent } from "@/lib/trackEvent";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { StockTradePanel } from "@/components/StockTradePanel";

type Category = "all" | "trend" | "momentum" | "volatility" | "volume";

interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  signal?: IndicatorResult["signal"];
  confidence?: number;
  lastAnalyzed?: string;
}

interface AgentReview {
  name: string;
  role: string;
  color: string;
  signal: IndicatorResult["signal"];
  verdict: string;
  reasoning: string;
  keyMetrics: string[];
}

const ALL_STOCKS: { symbol: string; name: string; sector: string }[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical" },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology" },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Communication" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication" },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology" },
  { symbol: "RKLB", name: "Rocket Lab USA Inc.", sector: "Industrials" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology" },
  { symbol: "SOFI", name: "SoFi Technologies Inc.", sector: "Financial" },
  { symbol: "RIVN", name: "Rivian Automotive Inc.", sector: "Consumer Cyclical" },
  { symbol: "LCID", name: "Lucid Group Inc.", sector: "Consumer Cyclical" },
  { symbol: "NIO", name: "NIO Inc.", sector: "Consumer Cyclical" },
  { symbol: "COIN", name: "Coinbase Global Inc.", sector: "Financial" },
  { symbol: "SNOW", name: "Snowflake Inc.", sector: "Technology" },
  { symbol: "SQ", name: "Block Inc.", sector: "Financial" },
  { symbol: "SHOP", name: "Shopify Inc.", sector: "Technology" },
  { symbol: "ROKU", name: "Roku Inc.", sector: "Communication" },
  { symbol: "DKNG", name: "DraftKings Inc.", sector: "Consumer Cyclical" },
  { symbol: "MARA", name: "Marathon Digital Holdings", sector: "Financial" },
  { symbol: "RIOT", name: "Riot Platforms Inc.", sector: "Financial" },
  { symbol: "HOOD", name: "Robinhood Markets Inc.", sector: "Financial" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial" },
  { symbol: "V", name: "Visa Inc.", sector: "Financial" },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer Defensive" },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Communication" },
  { symbol: "COST", name: "Costco Wholesale Corp.", sector: "Consumer Defensive" },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Financial" },
  { symbol: "BA", name: "Boeing Co.", sector: "Industrials" },
  { symbol: "UBER", name: "Uber Technologies Inc.", sector: "Technology" },
  { symbol: "ABNB", name: "Airbnb Inc.", sector: "Consumer Cyclical" },
  { symbol: "SPOT", name: "Spotify Technology S.A.", sector: "Communication" },
  { symbol: "SNAP", name: "Snap Inc.", sector: "Communication" },
  { symbol: "PINS", name: "Pinterest Inc.", sector: "Communication" },
  { symbol: "BABA", name: "Alibaba Group", sector: "Consumer Cyclical" },
  { symbol: "TSM", name: "Taiwan Semiconductor", sector: "Technology" },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology" },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology" },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology" },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer Defensive" },
  { symbol: "KO", name: "Coca-Cola Co.", sector: "Consumer Defensive" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive" },
  { symbol: "MCD", name: "McDonald's Corp.", sector: "Consumer Cyclical" },
  { symbol: "SBUX", name: "Starbucks Corp.", sector: "Consumer Cyclical" },
  { symbol: "GS", name: "Goldman Sachs Group", sector: "Financial" },
  { symbol: "MS", name: "Morgan Stanley", sector: "Financial" },
  { symbol: "BAC", name: "Bank of America Corp.", sector: "Financial" },
  { symbol: "C", name: "Citigroup Inc.", sector: "Financial" },
  { symbol: "WFC", name: "Wells Fargo & Co.", sector: "Financial" },
  { symbol: "T", name: "AT&T Inc.", sector: "Communication" },
  { symbol: "VZ", name: "Verizon Communications", sector: "Communication" },
  { symbol: "QCOM", name: "QUALCOMM Inc.", sector: "Technology" },
  { symbol: "TXN", name: "Texas Instruments", sector: "Technology" },
  { symbol: "MU", name: "Micron Technology", sector: "Technology" },
  { symbol: "LRCX", name: "Lam Research Corp.", sector: "Technology" },
  { symbol: "AMAT", name: "Applied Materials", sector: "Technology" },
  { symbol: "KLAC", name: "KLA Corporation", sector: "Technology" },
  { symbol: "MRVL", name: "Marvell Technology", sector: "Technology" },
  { symbol: "ON", name: "ON Semiconductor", sector: "Technology" },
  { symbol: "PANW", name: "Palo Alto Networks", sector: "Technology" },
  { symbol: "CRWD", name: "CrowdStrike Holdings", sector: "Technology" },
  { symbol: "ZS", name: "Zscaler Inc.", sector: "Technology" },
  { symbol: "NET", name: "Cloudflare Inc.", sector: "Technology" },
  { symbol: "DDOG", name: "Datadog Inc.", sector: "Technology" },
  { symbol: "MDB", name: "MongoDB Inc.", sector: "Technology" },
  { symbol: "TEAM", name: "Atlassian Corp.", sector: "Technology" },
  { symbol: "WDAY", name: "Workday Inc.", sector: "Technology" },
  { symbol: "NOW", name: "ServiceNow Inc.", sector: "Technology" },
  { symbol: "INTU", name: "Intuit Inc.", sector: "Technology" },
  { symbol: "ISRG", name: "Intuitive Surgical", sector: "Healthcare" },
  { symbol: "REGN", name: "Regeneron Pharmaceuticals", sector: "Healthcare" },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals", sector: "Healthcare" },
  { symbol: "MRNA", name: "Moderna Inc.", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly and Co.", sector: "Healthcare" },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare" },
  { symbol: "BMY", name: "Bristol-Myers Squibb", sector: "Healthcare" },
  { symbol: "GILD", name: "Gilead Sciences", sector: "Healthcare" },
  { symbol: "AMGN", name: "Amgen Inc.", sector: "Healthcare" },
  { symbol: "XOM", name: "Exxon Mobil Corp.", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corporation", sector: "Energy" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy" },
  { symbol: "DVN", name: "Devon Energy Corp.", sector: "Energy" },
  { symbol: "HAL", name: "Halliburton Co.", sector: "Energy" },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials" },
  { symbol: "DE", name: "Deere & Co.", sector: "Industrials" },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials" },
  { symbol: "HON", name: "Honeywell International", sector: "Industrials" },
  { symbol: "LMT", name: "Lockheed Martin Corp.", sector: "Industrials" },
  { symbol: "RTX", name: "RTX Corporation", sector: "Industrials" },
  { symbol: "NOC", name: "Northrop Grumman Corp.", sector: "Industrials" },
  { symbol: "SPCE", name: "Virgin Galactic Holdings", sector: "Industrials" },
  { symbol: "ASTR", name: "Astra Space Inc.", sector: "Industrials" },
  { symbol: "LUNR", name: "Intuitive Machines Inc.", sector: "Industrials" },
  { symbol: "ASTS", name: "AST SpaceMobile Inc.", sector: "Communication" },
  { symbol: "GME", name: "GameStop Corp.", sector: "Consumer Cyclical" },
  { symbol: "AMC", name: "AMC Entertainment", sector: "Communication" },
  { symbol: "BB", name: "BlackBerry Limited", sector: "Technology" },
  { symbol: "PLUG", name: "Plug Power Inc.", sector: "Industrials" },
  { symbol: "FSLR", name: "First Solar Inc.", sector: "Technology" },
  { symbol: "ENPH", name: "Enphase Energy Inc.", sector: "Technology" },
  { symbol: "SMCI", name: "Super Micro Computer", sector: "Technology" },
  { symbol: "ARM", name: "Arm Holdings PLC", sector: "Technology" },
  { symbol: "IONQ", name: "IonQ Inc.", sector: "Technology" },
  { symbol: "RGTI", name: "Rigetti Computing", sector: "Technology" },
  { symbol: "AI", name: "C3.ai Inc.", sector: "Technology" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology" },
  { symbol: "PATH", name: "UiPath Inc.", sector: "Technology" },
  { symbol: "U", name: "Unity Software Inc.", sector: "Technology" },
  { symbol: "TTWO", name: "Take-Two Interactive", sector: "Communication" },
  { symbol: "EA", name: "Electronic Arts Inc.", sector: "Communication" },
  { symbol: "RBLX", name: "Roblox Corporation", sector: "Communication" },
  { symbol: "SE", name: "Sea Limited", sector: "Consumer Cyclical" },
  { symbol: "GRAB", name: "Grab Holdings Limited", sector: "Technology" },
  { symbol: "MELI", name: "MercadoLibre Inc.", sector: "Consumer Cyclical" },
  { symbol: "NU", name: "Nu Holdings Ltd.", sector: "Financial" },
  { symbol: "UPST", name: "Upstart Holdings Inc.", sector: "Financial" },
  { symbol: "AFRM", name: "Affirm Holdings Inc.", sector: "Financial" },
  { symbol: "LC", name: "LendingClub Corp.", sector: "Financial" },
  { symbol: "BILL", name: "BILL Holdings Inc.", sector: "Technology" },
  { symbol: "HUBS", name: "HubSpot Inc.", sector: "Technology" },
  { symbol: "TTD", name: "The Trade Desk Inc.", sector: "Technology" },
  { symbol: "TWLO", name: "Twilio Inc.", sector: "Technology" },
  { symbol: "ZM", name: "Zoom Video Comm.", sector: "Technology" },
  { symbol: "DOCU", name: "DocuSign Inc.", sector: "Technology" },
  { symbol: "OKTA", name: "Okta Inc.", sector: "Technology" },
  { symbol: "CFLT", name: "Confluent Inc.", sector: "Technology" },
  { symbol: "ESTC", name: "Elastic N.V.", sector: "Technology" },
  { symbol: "GTLB", name: "GitLab Inc.", sector: "Technology" },
];

const CATEGORIES: { key: Category; label: string; icon: typeof Activity }[] = [
  { key: "all", label: "All Indicators", icon: BarChart3 },
  { key: "trend", label: "Trend", icon: TrendingUp },
  { key: "momentum", label: "Momentum", icon: Zap },
  { key: "volatility", label: "Volatility", icon: Waves },
  { key: "volume", label: "Volume", icon: Volume2 },
];

const WL_KEY = "entangle-watchlist";
const PRICE_MAP_KEY = "entangle-stock-prices";

function mockPrice(sym: string): number {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = ((h << 5) - h + sym.charCodeAt(i)) | 0;
  return 10 + Math.abs(h % 900) + Math.random() * 5;
}

function mockChange(): number {
  return +(Math.random() * 8 - 3).toFixed(2);
}

function generateAgentReviews(results: IndicatorResult[], symbol: string): AgentReview[] {
  const overall = getOverallSignal(results);
  const trend = results.filter(r => r.category === "trend");
  const momentum = results.filter(r => r.category === "momentum");
  const volatility = results.filter(r => r.category === "volatility");
  const volume = results.filter(r => r.category === "volume");
  const trendBuy = trend.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length;
  const momBuy = momentum.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length;
  const volBuy = volume.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length;
  const rsi = results.find(r => r.name.startsWith("RSI (14)"));
  const macd = results.find(r => r.name.startsWith("MACD"));
  const adx = results.find(r => r.name.startsWith("ADX"));
  const bb = results.find(r => r.name.startsWith("Bollinger"));
  const obv = results.find(r => r.name === "OBV");
  const supertrend = results.find(r => r.name === "Supertrend");
  return [
    { name: "Trend Analyst", role: "Moving Averages & Direction", color: "#00d4ff",
      signal: trendBuy > trend.length * 0.6 ? "BUY" : trendBuy < trend.length * 0.3 ? "SELL" : "NEUTRAL",
      verdict: trendBuy > trend.length * 0.6 ? `${symbol} bullish trend alignment across ${trendBuy}/${trend.length} indicators` : `${symbol} trend mixed | ${trendBuy}/${trend.length} bullish`,
      reasoning: `${supertrend ? `Supertrend: ${supertrend.signal} at ${supertrend.value}.` : ""} ${adx ? `ADX: ${adx.value} (${Number(adx.value) > 25 ? "trending" : "ranging"}).` : ""} ${trendBuy}/${trend.length} trend indicators bullish.`,
      keyMetrics: [`MA Consensus: ${trendBuy}/${trend.length}`, supertrend ? `Supertrend: ${supertrend.signal}` : "", adx ? `ADX: ${adx.value}` : ""].filter(Boolean),
    },
    { name: "Momentum Surgeon", role: "RSI, MACD & Oscillators", color: "#FFB800",
      signal: momBuy > momentum.length * 0.5 ? "BUY" : momBuy < momentum.length * 0.3 ? "SELL" : "NEUTRAL",
      verdict: rsi ? `RSI ${rsi.value} | ${Number(rsi.value) > 70 ? "overbought" : Number(rsi.value) < 30 ? "oversold" : "neutral"}` : `Momentum ${momBuy > momentum.length * 0.5 ? "bullish" : "bearish"}`,
      reasoning: `${rsi ? `RSI(14): ${rsi.value}.` : ""} ${macd ? `MACD: ${macd.value} (${macd.signal}).` : ""} ${momBuy}/${momentum.length} momentum bullish.`,
      keyMetrics: [rsi ? `RSI: ${rsi.value}` : "", macd ? `MACD: ${macd.value}` : "", `Consensus: ${momBuy}/${momentum.length}`].filter(Boolean),
    },
    { name: "Risk Manager", role: "Volatility & Bands", color: "#ff3366",
      signal: volatility.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length > volatility.length * 0.5 ? "BUY" : "NEUTRAL",
      verdict: bb ? `Bollinger: ${bb.signal === "BUY" ? "near lower band" : bb.signal === "SELL" ? "near upper band" : "mid-range"}` : "Volatility within range",
      reasoning: `${bb ? `Bollinger Bands: ${bb.value}.` : ""} ${volatility.length} volatility indicators assessed.`,
      keyMetrics: [bb ? `Bollinger: ${bb.value}` : "", `Vol indicators: ${volatility.length}`, `Risk: ${volatility.filter(r => r.signal === "SELL" || r.signal === "STRONG_SELL").length > 3 ? "HIGH" : "MODERATE"}`].filter(Boolean),
    },
    { name: "Volume Profiler", role: "OBV, CMF & Flow", color: "#00B4D8",
      signal: volBuy > volume.length * 0.5 ? "BUY" : volBuy < volume.length * 0.3 ? "SELL" : "NEUTRAL",
      verdict: obv ? `OBV: ${obv.signal === "BUY" ? "accumulation" : obv.signal === "SELL" ? "distribution" : "neutral"}` : "Volume neutral",
      reasoning: `${obv ? `OBV: ${obv.value} (${obv.signal}).` : ""} ${volBuy}/${volume.length} volume bullish.`,
      keyMetrics: [obv ? `OBV: ${obv.value}` : "", `Flow: ${volBuy}/${volume.length} bullish`].filter(Boolean),
    },
    { name: "Devil's Advocate", role: "Contrarian Analysis", color: "#ff9500",
      signal: overall.signal === "BUY" ? "SELL" : overall.signal === "SELL" ? "BUY" : "NEUTRAL",
      verdict: `${overall.sellCount} indicators dissent against ${overall.signal} consensus`,
      reasoning: `Contrarian view: ${overall.signal === "BUY" || overall.signal === "STRONG_BUY" ? overall.sellCount : overall.buyCount} indicators disagree. Always consider opposing signals.`,
      keyMetrics: [`Dissenting: ${overall.signal === "BUY" ? overall.sellCount : overall.buyCount}`, `Contrarian confidence: ${100 - overall.confidence}%`],
    },
    { name: "Consensus Engine", role: "Final Synthesis", color: "#a855f7",
      signal: overall.signal,
      verdict: `${overall.signal.replace("_", " ")} | ${overall.confidence}% confidence across ${results.length} indicators`,
      reasoning: `${overall.buyCount} BUY, ${overall.sellCount} SELL, ${overall.neutralCount} NEUTRAL. ${overall.confidence >= 70 ? "High conviction." : "Mixed signals."}`,
      keyMetrics: [`Buy: ${overall.buyCount}`, `Sell: ${overall.sellCount}`, `Confidence: ${overall.confidence}%`],
    },
  ];
}

function sigColor(s: IndicatorResult["signal"]) {
  return s === "STRONG_BUY" ? "#00B4D8" : s === "BUY" ? "#00d4ff" : s === "SELL" ? "#FFB800" : s === "STRONG_SELL" ? "#ff3366" : "#666";
}
function sigBg(s: IndicatorResult["signal"]) {
  return s === "STRONG_BUY" ? "bg-[#00B4D8]/10 text-[#00B4D8] border-[#00B4D8]/20" : s === "BUY" ? "bg-primary/10 text-primary border-primary/20" : s === "SELL" ? "bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/20" : s === "STRONG_SELL" ? "bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/20" : "bg-white/5 text-white/40 border-white/10";
}

export default function TechnicalAnalysis() {
  const { toast } = useToast();
  const { getToken, isSignedIn } = useAuth();
  const [search, setSearch] = useState("");
  const [activeSymbol, setActiveSymbol] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>(() => {
    try { const s = localStorage.getItem(WL_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [agentView, setAgentView] = useState(true);
  const [showStrategyLab, setShowStrategyLab] = useState(false);
  const [streamingAgents, setStreamingAgents] = useState<Array<{
    id: number; name: string; domain: string; signal: string; confidence: number; reasoning: string; keyMetric: string;
  }>>([]);
  const [streamStatus, setStreamStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [streamSummary, setStreamSummary] = useState<string>("");
  const sseRef = useRef<EventSource | null>(null);
  const [stratIndicator, setStratIndicator] = useState<"RSI" | "SMA" | "EMA" | "MACD">("RSI");
  const [stratCondition, setStratCondition] = useState<"crossAbove" | "crossBelow" | "above" | "below">("below");
  const [stratThreshold, setStratThreshold] = useState(30);
  const [stratPeriod, setStratPeriod] = useState(14);
  const [stratRunning, setStratRunning] = useState(false);
  const [stratResult, setStratResult] = useState<{
    trades: { entry: number; exit: number; pnl: number; entryIdx: number; exitIdx: number }[];
    winRate: number; sharpe: number; maxDrawdown: number; totalReturn: number;
    equityCurve: { bar: number; equity: number }[];
  } | null>(null);

  const backtestCountRef = useRef<number>(
    (() => { try { return parseInt(localStorage.getItem("ew_backtest_count") || "0", 10) || 0; } catch { return 0; } })()
  );

  const awardBacktesterXP = useCallback(async (result: {
    totalReturn: number; sharpe: number; winRate: number; trades: unknown[];
  }) => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;

      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

      await fetch("/api/gamification/xp", {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: "backtest_run", category: "backtester" }),
      });

      const beatBenchmark = result.totalReturn > 10 && result.sharpe > 1.0;
      if (beatBenchmark) {
        await fetch("/api/gamification/xp", {
          method: "POST",
          headers,
          body: JSON.stringify({ reason: "backtest_beats_benchmark", category: "backtester" }),
        });
      }

      const count = backtestCountRef.current + 1;
      backtestCountRef.current = count;
      try { localStorage.setItem("ew_backtest_count", String(count)); } catch {}

      await fetch("/api/gamification/backtester/award-badges", {
        method: "POST",
        headers,
        body: JSON.stringify({
          backtestCount: count,
          totalReturn: result.totalReturn,
          sharpe: result.sharpe,
          winRate: result.winRate,
          tradeCount: result.trades.length,
          beatBenchmark,
        }),
      });

      if (beatBenchmark) {
        toast({
          title: "Strategy beat the benchmark!",
          description: `+bonus XP earned. Check Achievements for new badges.`,
          duration: 4000,
        });
      }
    } catch {}
  }, [isSignedIn, getToken, toast]);

  useEffect(() => { trackEvent("signal_viewed"); }, []);
  const analyzeIdRef = useRef(0);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { localStorage.setItem(WL_KEY, JSON.stringify(watchlist)); }, [watchlist]);
  useEffect(() => { return () => { if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current); }; }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return ALL_STOCKS.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 12);
  }, [search]);

  const indicators = useMemo(() => stockData ? runAllIndicators(stockData) : [], [stockData]);
  const filteredIndicators = useMemo(() => category === "all" ? indicators : indicators.filter(r => r.category === category), [indicators, category]);
  const overall = useMemo(() => indicators.length ? getOverallSignal(indicators) : null, [indicators]);
  const agents = useMemo(() => indicators.length && activeSymbol ? generateAgentReviews(indicators, activeSymbol) : [], [indicators, activeSymbol]);
  const stockInfo = useMemo(() => ALL_STOCKS.find(s => s.symbol === activeSymbol), [activeSymbol]);

  const analyze = useCallback((sym: string) => {
    const s = sym.toUpperCase().trim();
    if (!s) return;
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    const id = ++analyzeIdRef.current;
    setLoading(true);
    setActiveSymbol(s);
    setSearch("");
    setShowSearch(false);
    setExpandedAgent(null);

    (async () => {
      try {
        const barsRes = await fetchBars(s, { timeframe: "1Day", limit: 120 });
        if (analyzeIdRef.current !== id) return;
        if (barsRes.bars && barsRes.bars.length >= 10) {
          const sd = barsToStockData(barsRes.bars);
          setStockData({
            ...sd,
            ohlcv: barsRes.bars.map(b => ({
              open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
            })),
          } as StockData);
        } else {
          const bp = mockPrice(s);
          setStockData(generateMockOHLCV(bp, 60));
        }
      } catch {
        if (analyzeIdRef.current !== id) return;
        const bp = mockPrice(s);
        setStockData(generateMockOHLCV(bp, 60));
      } finally {
        if (analyzeIdRef.current === id) setLoading(false);
      }
    })();
  }, []);

  const addToWatchlist = useCallback((sym: string) => {
    if (watchlist.some(w => w.symbol === sym)) {
      toast({ title: "Already in watchlist", description: `${sym} is already tracked.` });
      return;
    }
    const info = ALL_STOCKS.find(s => s.symbol === sym);
    const price = mockPrice(sym);
    const data = generateMockOHLCV(price, 60);
    const results = runAllIndicators(data);
    const sig = getOverallSignal(results);
    const item: WatchlistStock = {
      symbol: sym,
      name: info?.name || sym,
      price: +price.toFixed(2),
      change: mockChange(),
      signal: sig.signal,
      confidence: sig.confidence,
      lastAnalyzed: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setWatchlist(prev => [item, ...prev]);
    toast({ title: "Added to watchlist", description: `${sym} | ${sig.signal.replace("_", " ")} (${sig.confidence}%)` });
  }, [watchlist, toast]);

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
  }, []);

  const isInWatchlist = useCallback((sym: string) => watchlist.some(w => w.symbol === sym), [watchlist]);

  const refreshWatchlist = useCallback(() => {
    setWatchlist(prev => prev.map(w => {
      const data = generateMockOHLCV(w.price, 60);
      const results = runAllIndicators(data);
      const sig = getOverallSignal(results);
      return { ...w, change: mockChange(), signal: sig.signal, confidence: sig.confidence, lastAnalyzed: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) };
    }));
    toast({ title: "Watchlist refreshed", description: "All signals updated." });
  }, [toast]);

  const exportCSV = () => {
    if (!indicators.length) return;
    const escape = (v: string) => {
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return `"${v.replace(/"/g, '""')}"`;
    };
    const lines = [
      `EntangleWealth Technical Analysis | ${activeSymbol}`,
      `Generated,${new Date().toLocaleDateString("en-US")}`, "",
      "Indicator,Category,Value,Signal",
      ...indicators.map(r => `${escape(r.name)},${r.category},${escape(String(r.value))},${r.signal}`),
      "", `Overall Signal,${overall?.signal}`, `Buy Signals,${overall?.buyCount}`, `Sell Signals,${overall?.sellCount}`, `Confidence,${overall?.confidence}%`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ta-${activeSymbol}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Indicator report downloaded." });
  };

  const runBacktest = useCallback(async () => {
    if (!stockData) return;
    setStratRunning(true);
    setStratResult(null);
    await new Promise(r => setTimeout(r, 300));

    const { prices, highs, lows, closes } = stockData;
    const data = closes.length > 10 ? closes : prices;
    const n = data.length;

    function calcRSIArr(arr: number[], period: number): number[] {
      const out: number[] = Array(period).fill(50);
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const d = arr[i] - arr[i - 1];
        if (d > 0) gains += d; else losses -= d;
      }
      let ag = gains / period, al = losses / period;
      for (let i = period; i < arr.length; i++) {
        const d = arr[i] - arr[i - 1];
        const g = Math.max(d, 0), l = Math.max(-d, 0);
        ag = (ag * (period - 1) + g) / period;
        al = (al * (period - 1) + l) / period;
        out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
      }
      return out;
    }

    function calcSMAArr(arr: number[], period: number): number[] {
      const out: number[] = [];
      for (let i = 0; i < arr.length; i++) {
        if (i < period - 1) { out.push(arr[i]); continue; }
        const sl = arr.slice(i - period + 1, i + 1);
        out.push(sl.reduce((a, b) => a + b, 0) / period);
      }
      return out;
    }

    function calcEMAArr(arr: number[], period: number): number[] {
      const k = 2 / (period + 1);
      const out: number[] = [arr[0]];
      for (let i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k));
      return out;
    }

    let indicatorArr: number[];
    if (stratIndicator === "RSI") indicatorArr = calcRSIArr(data, stratPeriod);
    else if (stratIndicator === "SMA") indicatorArr = calcSMAArr(data, stratPeriod);
    else if (stratIndicator === "EMA") indicatorArr = calcEMAArr(data, stratPeriod);
    else {
      const fast = calcEMAArr(data, 12);
      const slow = calcEMAArr(data, 26);
      indicatorArr = fast.map((v, i) => v - slow[i]);
    }

    const trades: { entry: number; exit: number; pnl: number; entryIdx: number; exitIdx: number }[] = [];
    let inTrade = false;
    let entryPrice = 0;
    let entryIdx = 0;
    const holding = 10;

    for (let i = 1; i < n; i++) {
      const ind = indicatorArr[i];
      const prev = indicatorArr[i - 1];
      const price = data[i];

      const isBuy =
        stratCondition === "below" ? ind < stratThreshold :
        stratCondition === "above" ? ind > stratThreshold :
        stratCondition === "crossAbove" ? ind >= stratThreshold && prev < stratThreshold :
        ind <= stratThreshold && prev > stratThreshold;

      const isSell =
        stratCondition === "below" ? ind > stratThreshold + 10 :
        stratCondition === "above" ? ind < stratThreshold - 10 :
        stratCondition === "crossAbove" ? ind <= stratThreshold - 5 && prev > stratThreshold - 5 :
        ind >= stratThreshold + 5 && prev < stratThreshold + 5;

      if (!inTrade && isBuy && i > 0) {
        inTrade = true;
        entryPrice = price;
        entryIdx = i;
      } else if (inTrade && (isSell || (i - entryIdx >= holding))) {
        const exitPrice = price;
        const pnl = (exitPrice - entryPrice) / entryPrice * 100;
        trades.push({ entry: entryPrice, exit: exitPrice, pnl, entryIdx, exitIdx: i });
        inTrade = false;
      }
    }

    if (trades.length === 0) {
      setStratRunning(false);
      setStratResult({ trades: [], winRate: 0, sharpe: 0, maxDrawdown: 0, totalReturn: 0, equityCurve: [{ bar: 0, equity: 10000 }] });
      awardBacktesterXP({ totalReturn: 0, sharpe: 0, winRate: 0, trades: [] });
      return;
    }

    const wins = trades.filter(t => t.pnl > 0).length;
    const winRate = wins / trades.length;

    let equity = 10000;
    let peak = equity;
    let maxDrawdown = 0;
    const equityCurve: { bar: number; equity: number }[] = [{ bar: 0, equity: 10000 }];

    for (let i = 0; i < trades.length; i++) {
      equity = equity * (1 + trades[i].pnl / 100);
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
      equityCurve.push({ bar: trades[i].exitIdx, equity: Math.round(equity) });
    }

    const totalReturn = (equity - 10000) / 10000 * 100;
    const rets = trades.map(t => t.pnl / 100);
    const meanR = rets.reduce((a, b) => a + b, 0) / rets.length;
    const stdR = Math.sqrt(rets.reduce((a, b) => a + Math.pow(b - meanR, 2), 0) / rets.length);
    const sharpe = stdR === 0 ? 0 : (meanR / stdR) * Math.sqrt(252 / (n / trades.length));

    const result = { trades, winRate, sharpe, maxDrawdown, totalReturn, equityCurve };
    setStratResult(result);
    setStratRunning(false);
    awardBacktesterXP({ totalReturn, sharpe, winRate, trades });
  }, [stockData, stratIndicator, stratCondition, stratThreshold, stratPeriod, awardBacktesterXP]);

  const startFlashCouncilStream = useCallback(() => {
    if (!activeSymbol || streamStatus === "streaming") return;
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setStreamingAgents([]);
    setStreamSummary("");
    setStreamStatus("streaming");

    const url = `/api/stocks/${encodeURIComponent(activeSymbol)}/analyze-stream`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.addEventListener("agent", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setStreamingAgents(prev => [...prev, data.agent]);
      } catch {}
    });

    es.addEventListener("complete", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setStreamSummary(data.flashCouncilSummary || "");
      } catch {}
      setStreamStatus("done");
      es.close();
      sseRef.current = null;
    });

    es.addEventListener("error", () => {
      setStreamStatus("error");
      es.close();
      sseRef.current = null;
    });
  }, [activeSymbol, streamStatus]);

  useEffect(() => {
    return () => { sseRef.current?.close(); };
  }, []);

  useEffect(() => {
    if (activeSymbol) {
      setStreamingAgents([]);
      setStreamSummary("");
      setStreamStatus("idle");
    }
  }, [activeSymbol]);

  const categoryCounts = useMemo(() => {
    const c: Record<string, { buy: number; sell: number; total: number }> = {};
    for (const cat of CATEGORIES) {
      if (cat.key === "all") continue;
      const items = indicators.filter(r => r.category === cat.key);
      c[cat.key] = { buy: items.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length, sell: items.filter(r => r.signal === "SELL" || r.signal === "STRONG_SELL").length, total: items.length };
    }
    return c;
  }, [indicators]);

  return (
    <Layout>
      <PageErrorBoundary fallbackTitle="Technical Analysis encountered an error">
      <FinancialDisclaimerBanner pageKey="technical-analysis" />
      <div className="w-full border-b border-white/[0.06] bg-[#060610]">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-[15px] font-bold leading-tight">Technical Analysis</h1>
                <p className="text-[10px] text-white/25 leading-tight">55+ indicators · 6 AI agents</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg overflow-hidden">
                  <Search className="w-3.5 h-3.5 text-white/40 ml-3" />
                  <input value={search} onChange={e => { setSearch(e.target.value.toUpperCase().slice(0, 10)); setShowSearch(true); }}
                    onFocus={() => setShowSearch(true)} onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    onKeyDown={e => { if (e.key === "Enter" && search.trim()) { e.preventDefault(); analyze(search); } }}
                    placeholder="Search any ticker or name..." maxLength={30}
                    className="bg-transparent px-2 py-2 text-[13px] text-white w-[220px] md:w-[300px] focus:outline-none placeholder:text-white/40 font-mono" aria-label="Search stocks" />
                </div>
                {showSearch && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0c0c1a] border border-white/10 rounded-xl z-50 max-h-[400px] overflow-y-auto shadow-2xl shadow-black/80">
                    {searchResults.map(s => (
                      <div key={s.symbol} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-primary/[0.06] transition-colors border-b border-white/[0.03] last:border-0 min-h-[44px] cursor-pointer"
                        role="option" onClick={() => { analyze(s.symbol); }}>
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[11px] font-bold text-primary/60 font-mono flex-shrink-0">{s.symbol.slice(0, 2)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold font-mono truncate">{s.symbol}</p>
                          <p className="text-[10px] text-white/30 truncate">{s.name}</p>
                        </div>
                        <span className="text-[9px] text-white/40 px-2 py-0.5 rounded border border-white/[0.06]">{s.sector}</span>
                        <button onClick={e => { e.stopPropagation(); addToWatchlist(s.symbol); }}
                          className={`p-1.5 rounded-lg transition-colors ${isInWatchlist(s.symbol) ? "text-[#FFB800]" : "text-white/40 hover:text-white/40"}`}>
                          {isInWatchlist(s.symbol) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {activeSymbol && (
                <>
                  <Button variant="outline" size="sm" className="border-white/[0.08] text-white/40 text-[11px] h-8 gap-1 hidden md:flex" onClick={() => analyze(activeSymbol)}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/[0.08] text-white/40 text-[11px] h-8 gap-1 hidden md:flex" onClick={exportCSV}>
                    <Download className="w-3 h-3" /> Export
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1400px] py-4">
        <div className="flex gap-4">
          {showWatchlist && (
            <div className="hidden lg:block w-[260px] flex-shrink-0">
              <div className="sticky top-20">
                <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-[#FFB800]/60" />
                      <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Watchlist</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={refreshWatchlist} className="p-1 text-white/40 hover:text-primary transition-colors" title="Refresh all signals"><RefreshCw className="w-3 h-3" /></button>
                      <span className="text-[9px] text-white/40 font-mono">{watchlist.length}</span>
                    </div>
                  </div>
                  {watchlist.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <Plus className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[11px] text-white/50">Search and add stocks</p>
                      <p className="text-[9px] text-white/10 mt-1">AI agents auto-analyze your watchlist</p>
                    </div>
                  ) : (
                    <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
                      {watchlist.map(w => (
                        <div key={w.symbol} onClick={() => analyze(w.symbol)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter") analyze(w.symbol); }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] group cursor-pointer ${activeSymbol === w.symbol ? "bg-primary/[0.04] border-l-2 border-l-primary" : ""}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold font-mono">{w.symbol}</span>
                              {w.signal && <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${sigBg(w.signal)}`}>{w.signal.replace("_", " ")}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-white/50 font-mono">${w.price.toFixed(2)}</span>
                              <span className={`text-[10px] font-mono font-bold ${w.change >= 0 ? "text-[#00B4D8]" : "text-[#ff3366]"}`}>{w.change >= 0 ? "+" : ""}{Math.abs(w.change).toFixed(2)}%</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {w.confidence != null && <span className="text-[10px] font-mono text-white/25">{w.confidence}%</span>}
                            <button onClick={e => { e.stopPropagation(); removeFromWatchlist(w.symbol); }} className="p-0.5 text-white/0 group-hover:text-white/20 hover:!text-[#ff3366] transition-colors"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
                  <p className="text-[14px] font-bold text-white/60">Analyzing {activeSymbol}</p>
                  <p className="text-[11px] text-white/50">Running 55+ indicators...</p>
                </div>
              </div>
            )}

            {!loading && !activeSymbol && (
              <div className="py-16 text-center">
                <div className="w-20 h-20 rounded-sm bg-gradient-to-br from-[#a855f7]/10 to-primary/10 border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                  <BarChart3 className="w-10 h-10 text-white/40" />
                </div>
                <h2 className="text-xl font-bold text-white/40 mb-2">Search any stock to begin</h2>
                <p className="text-[13px] text-white/40 mb-8 max-w-md mx-auto">Type a ticker symbol or company name. 55+ technical indicators analyzed by 6 AI agents with buy/sell signals.</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                  {["RKLB", "NVDA", "AAPL", "TSLA", "AMD", "PLTR", "SOFI", "COIN", "META", "MSFT", "AMZN", "GOOGL"].map(s => (
                    <button key={s} onClick={() => analyze(s)}
                      className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[12px] text-white/30 hover:text-primary hover:border-primary/20 font-mono transition-all min-h-[40px]">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && overall && activeSymbol && (
              <>
                <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl p-4 md:p-5 mb-4">
                  <div className="flex flex-col md:flex-row items-start gap-5">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${sigColor(overall.signal)}08`, border: `1px solid ${sigColor(overall.signal)}25` }}>
                        <div className="text-center">
                          <p className="text-[18px] font-black font-mono leading-none" style={{ color: sigColor(overall.signal) }}>{overall.confidence}%</p>
                          <p className="text-[7px] font-bold mt-0.5" style={{ color: sigColor(overall.signal), opacity: 0.6 }}>CONF</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-black font-mono">{activeSymbol}</h2>
                          {stockInfo && <span className="text-[11px] text-white/25">{stockInfo.name}</span>}
                          <button onClick={() => isInWatchlist(activeSymbol) ? removeFromWatchlist(activeSymbol) : addToWatchlist(activeSymbol)}
                            className={`p-1.5 rounded-lg transition-colors ml-1 ${isInWatchlist(activeSymbol) ? "text-[#FFB800]" : "text-white/40 hover:text-white/30"}`} title={isInWatchlist(activeSymbol) ? "Remove from watchlist" : "Add to watchlist"}>
                            {isInWatchlist(activeSymbol) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-md text-[11px] font-black border ${sigBg(overall.signal)}`}>
                            {overall.signal.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-white/50 font-mono">{indicators.length} indicators</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 md:gap-3">
                      <div className="text-center px-3 py-2 rounded-lg bg-[#00B4D8]/[0.04] border border-[#00B4D8]/10 min-w-[60px]">
                        <p className="text-[18px] font-black text-[#00B4D8] font-mono leading-none">{overall.buyCount}</p>
                        <p className="text-[8px] text-[#00B4D8]/40 font-bold mt-1">BUY</p>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] min-w-[60px]">
                        <p className="text-[18px] font-black text-white/30 font-mono leading-none">{overall.neutralCount}</p>
                        <p className="text-[8px] text-white/40 font-bold mt-1">HOLD</p>
                      </div>
                      <div className="text-center px-3 py-2 rounded-lg bg-[#ff3366]/[0.04] border border-[#ff3366]/10 min-w-[60px]">
                        <p className="text-[18px] font-black text-[#ff3366] font-mono leading-none">{overall.sellCount}</p>
                        <p className="text-[8px] text-[#ff3366]/40 font-bold mt-1">SELL</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                    {CATEGORIES.filter(c => c.key !== "all").map(cat => {
                      const c = categoryCounts[cat.key];
                      if (!c) return null;
                      const Icon = cat.icon;
                      return (
                        <button key={cat.key} onClick={() => setCategory(cat.key)}
                          className={`rounded-lg p-2.5 border transition-all text-left ${category === cat.key ? "border-primary/20 bg-primary/[0.04]" : "border-white/[0.04] bg-white/[0.01] hover:border-white/10"}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="w-3 h-3 text-white/40" />
                            <span className="text-[10px] font-bold text-white/40">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#00B4D8] text-[11px] font-bold font-mono">{c.buy}↑</span>
                            <span className="text-[#ff3366] text-[11px] font-bold font-mono">{c.sell}↓</span>
                            <span className="text-white/10 text-[9px] font-mono ml-auto">{c.total}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {stockData && (
                  <div className="mb-4">
                    <CandlestickChart data={stockData} symbol={activeSymbol} />
                  </div>
                )}

                {activeSymbol && (
                  <div className="mb-4">
                    <StockTradePanel
                      symbol={activeSymbol}
                      currentPrice={stockData ? stockData.ohlcv[stockData.ohlcv.length - 1]?.close : undefined}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setAgentView(true)} className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors ${agentView ? "bg-[#a855f7]/10 text-[#a855f7]" : "text-white/25 hover:text-white/40"}`}>
                      <Brain className="w-3.5 h-3.5 inline mr-1.5" />AI Agents
                    </button>
                    <button onClick={() => setAgentView(false)} className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors ${!agentView ? "bg-primary/10 text-primary" : "text-white/25 hover:text-white/40"}`}>
                      <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" />Indicators
                    </button>
                    {agentView && (
                      <button
                        onClick={startFlashCouncilStream}
                        disabled={streamStatus === "streaming"}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${streamStatus === "streaming" ? "bg-amber-400/10 text-amber-400" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                      >
                        {streamStatus === "streaming" ? <><Loader2 className="w-3 h-3 animate-spin" />Streaming...</> : <><Zap className="w-3 h-3" />Flash Council</>}
                      </button>
                    )}
                  </div>
                  {!agentView && (
                    <div className="flex gap-1">
                      {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => setCategory(c.key)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${category === c.key ? "bg-primary/10 text-primary" : "text-white/40 hover:text-white/30"}`}>
                          {c.label === "All Indicators" ? "All" : c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {agentView && streamingAgents.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[11px] font-bold text-amber-400/70">Flash Council — Live AI Feed</span>
                      {streamStatus === "done" && <span className="text-[9px] text-white/30 ml-auto">Analysis complete</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {streamingAgents.map((agent, i) => {
                        const sigColor2 = agent.signal === "BULLISH" ? "#00ff88" : agent.signal === "BEARISH" ? "#ff3366" : "#666";
                        const sigBg2 = agent.signal === "BULLISH" ? "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20" : agent.signal === "BEARISH" ? "bg-[#ff3366]/10 text-[#ff3366] border-[#ff3366]/20" : "bg-white/5 text-white/40 border-white/10";
                        return (
                          <div key={i} className="bg-[#0a0a16] border border-white/[0.06] rounded-xl p-3.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                                <span className="text-[12px] font-bold">{agent.name}</span>
                              </div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${sigBg2}`}>{agent.signal}</span>
                            </div>
                            <p className="text-[10px] text-primary/50 mb-1">{agent.domain}</p>
                            <p className="text-[11px] text-white/50">{agent.reasoning}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-mono text-white/30">{agent.keyMetric}</span>
                              <span className="text-[9px] font-bold font-mono ml-auto" style={{ color: sigColor2 }}>{agent.confidence}% conf</span>
                            </div>
                          </div>
                        );
                      })}
                      {streamStatus === "streaming" && (
                        <div className="bg-[#0a0a16] border border-white/[0.04] rounded-xl p-3.5 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                          <span className="text-[11px] text-white/30">Agent analyzing...</span>
                        </div>
                      )}
                    </div>
                    {streamSummary && (
                      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(250,190,60,0.04)", border: "1px solid rgba(250,190,60,0.15)" }}>
                        <div className="text-[10px] text-amber-400/60 font-mono uppercase tracking-wider mb-1">Flash Council Consensus</div>
                        <p className="text-[12px] text-white/70">{streamSummary}</p>
                      </div>
                    )}
                  </div>
                )}

                {agentView ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
                    {agents.map(agent => {
                      const isExp = expandedAgent === agent.name;
                      return (
                        <div key={agent.name} className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-all">
                          <button className="w-full p-3.5 text-left" onClick={() => setExpandedAgent(isExp ? null : agent.name)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                                <span className="text-[12px] font-bold">{agent.name}</span>
                              </div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${sigBg(agent.signal)}`}>{agent.signal.replace("_", " ")}</span>
                            </div>
                            <p className="text-[10px] text-white/50 mb-1">{agent.role}</p>
                            <p className="text-[11px] text-white/45 line-clamp-2">{agent.verdict}</p>
                          </button>
                          {isExp && (
                            <div className="px-3.5 pb-3.5 border-t border-white/[0.04] pt-3 space-y-2">
                              <p className="text-[11px] text-white/35">{agent.reasoning}</p>
                              {agent.keyMetrics.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: agent.color, opacity: 0.4 }} />
                                  <span className="text-[10px] text-white/25 font-mono">{m}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
                    <div className="grid grid-cols-[1fr_100px_90px] md:grid-cols-[1fr_120px_100px] items-center px-4 py-2 border-b border-white/[0.04] text-[9px] font-bold text-white/40 uppercase tracking-wider">
                      <span>Indicator</span>
                      <span className="text-right">Value</span>
                      <span className="text-right">Signal</span>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                      {filteredIndicators.map((ind, i) => (
                        <div key={i} className="grid grid-cols-[1fr_100px_90px] md:grid-cols-[1fr_120px_100px] items-center px-4 py-2 border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: sigColor(ind.signal), opacity: 0.6 }} />
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold truncate">{ind.name}</p>
                              <p className="text-[9px] text-white/40 truncate hidden md:block">{ind.description}</p>
                            </div>
                          </div>
                          <span className="text-[12px] font-mono font-bold text-white/50 text-right truncate">{typeof ind.value === "number" ? Math.abs(ind.value) : ind.value}</span>
                          <div className="flex justify-end">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${sigBg(ind.signal)}`}>{ind.signal.replace("_", " ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(168,85,247,0.25)" }}>
                  <button
                    onClick={() => setShowStrategyLab(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-[#a855f7]" />
                      <span className="font-bold text-sm text-[#a855f7]">Strategy Builder &amp; Backtester</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#a855f7] font-bold">LAB</span>
                    </div>
                    {showStrategyLab ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                  </button>

                  {showStrategyLab && (
                    <div className="px-4 pb-5 space-y-4">
                      <p className="text-xs text-white/50">Build an entry rule using a technical indicator and backtest it against {activeSymbol}'s price history. Results show win rate, Sharpe ratio, max drawdown, and equity curve.</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-1">Indicator</label>
                          <select value={stratIndicator} onChange={e => setStratIndicator(e.target.value as any)}
                            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#a855f7]/40">
                            <option value="RSI">RSI</option>
                            <option value="SMA">SMA</option>
                            <option value="EMA">EMA</option>
                            <option value="MACD">MACD</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-1">Condition</label>
                          <select value={stratCondition} onChange={e => setStratCondition(e.target.value as any)}
                            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#a855f7]/40">
                            <option value="below">Below threshold (BUY)</option>
                            <option value="above">Above threshold (BUY)</option>
                            <option value="crossAbove">Crosses above</option>
                            <option value="crossBelow">Crosses below</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-1">Threshold</label>
                          <input type="number" value={stratThreshold} onChange={e => setStratThreshold(Number(e.target.value))}
                            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#a855f7]/40" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 font-mono uppercase tracking-wider block mb-1">Period</label>
                          <input type="number" value={stratPeriod} onChange={e => setStratPeriod(Math.max(2, Number(e.target.value)))} min={2} max={50}
                            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#a855f7]/40" />
                        </div>
                      </div>

                      <div className="rounded-xl p-3 bg-[#a855f7]/5 border border-[#a855f7]/15 text-[11px] text-[#a855f7]/80 font-mono">
                        Entry Rule: BUY when {stratIndicator}({stratPeriod}) {stratCondition === "below" ? `&lt; ${stratThreshold}` : stratCondition === "above" ? `&gt; ${stratThreshold}` : stratCondition === "crossAbove" ? `crosses above ${stratThreshold}` : `crosses below ${stratThreshold}`} · Exit: after 10 bars or reverse signal
                      </div>

                      <button
                        onClick={runBacktest}
                        disabled={stratRunning || !stockData}
                        className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                        style={{ background: "rgba(168,85,247,0.8)", color: "white" }}
                      >
                        {stratRunning ? <><RefreshCw className="w-4 h-4 animate-spin" />Running backtest...</> : <><PlayCircle className="w-4 h-4" />Run Backtest on {activeSymbol}</>}
                      </button>

                      {stratResult && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: "Win Rate", value: `${(stratResult.winRate * 100).toFixed(1)}%`, color: stratResult.winRate > 0.5 ? "#00ff88" : "#ff3366" },
                              { label: "Sharpe Ratio", value: stratResult.sharpe.toFixed(2), color: stratResult.sharpe > 1 ? "#00ff88" : stratResult.sharpe > 0 ? "#ffd700" : "#ff3366" },
                              { label: "Max Drawdown", value: `-${stratResult.maxDrawdown.toFixed(1)}%`, color: stratResult.maxDrawdown < 10 ? "#00ff88" : stratResult.maxDrawdown < 25 ? "#ffd700" : "#ff3366" },
                              { label: "Total Return", value: `${stratResult.totalReturn >= 0 ? "+" : ""}${stratResult.totalReturn.toFixed(1)}%`, color: stratResult.totalReturn >= 0 ? "#00ff88" : "#ff3366" },
                            ].map(m => (
                              <div key={m.label} className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">{m.label}</div>
                                <div className="text-lg font-black font-mono mt-1" style={{ color: m.color }}>{m.value}</div>
                              </div>
                            ))}
                          </div>

                          <div className="text-[10px] text-white/40 mb-1">Trades: {stratResult.trades.length} | Winners: {stratResult.trades.filter(t => t.pnl > 0).length} | Losers: {stratResult.trades.filter(t => t.pnl <= 0).length}</div>

                          {stratResult.equityCurve.length > 1 && (
                            <div className="h-40">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stratResult.equityCurve} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                                  <XAxis dataKey="bar" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
                                  <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={44} />
                                  <Tooltip contentStyle={{ background: "#0a0a18", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                                    formatter={(val: number) => [`$${val.toLocaleString()}`, "Portfolio"]} />
                                  <Line type="monotone" dataKey="equity" stroke="#a855f7" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          <div className="rounded-lg bg-amber-400/5 border border-amber-400/15 p-2.5 text-[10px] text-amber-400/70">
                            Backtest results are based on historical simulated data. Past performance does not guarantee future results.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-white/[0.01] border border-white/[0.04] p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFB800]/30 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Technical indicators use simulated data and should not be the sole basis for investment decisions. Past performance does not guarantee future results. Always do your own research.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </PageErrorBoundary>
    </Layout>
  );
}
