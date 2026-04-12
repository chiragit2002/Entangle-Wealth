import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import {
  Search, TrendingUp, TrendingDown, Activity, Settings, Plus, X, Star,
  ChevronDown, ChevronRight, Bell, BellOff, Trash2, Edit3, Minus, BarChart3,
  ArrowUpRight, ArrowDownRight, Loader2, AlertTriangle, Eye, EyeOff,
  Download, RefreshCw, Maximize2, Crosshair, Grid3X3, Zap, Brain,
  Target, LineChart, Pencil, Type, Circle, Square, Triangle,
} from "lucide-react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries,
  type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData,
  type LineData, ColorType, CrosshairMode, type Time, LineStyle,
} from "lightweight-charts";
import { fetchBars, barsToStockData, type AlpacaBar } from "@/lib/alpaca";
import { type StockData, generateMockOHLCV, runAllIndicators, getOverallSignal } from "@/lib/indicators";
import {
  type IndicatorSeries, AVAILABLE_INDICATORS, computeIndicator,
} from "@/lib/chartIndicators";
import { detectCandlestickPatterns, detectChartPatterns, type PatternResult, type ChartPattern } from "@/lib/patterns";
import { trackEvent } from "@/lib/trackEvent";
import { runScanner, runClaudeAnalysis, type ScanResult, type ClaudeAnalysis, SCAN_TICKERS } from "@/lib/scanner";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { PaperTradingWidget } from "@/components/PaperTradingWidget";

const TIMEFRAMES = [
  { label: "1m", tf: "1Min", limit: 390 },
  { label: "5m", tf: "5Min", limit: 390 },
  { label: "15m", tf: "15Min", limit: 300 },
  { label: "30m", tf: "30Min", limit: 200 },
  { label: "1H", tf: "1Hour", limit: 200 },
  { label: "4H", tf: "4Hour", limit: 200 },
  { label: "1D", tf: "1Day", limit: 500 },
  { label: "1W", tf: "1Week", limit: 260 },
  { label: "1M", tf: "1Month", limit: 120 },
];

const CANDLE_STYLES = ["Candlestick", "Heikin-Ashi", "Hollow"] as const;
type CandleStyle = typeof CANDLE_STYLES[number];

interface DrawingTool {
  id: string;
  type: "hline" | "trendline" | "fib" | "rect" | "text";
  data: any;
}

interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  condition: "above" | "below";
  triggered: boolean;
}

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  signal?: string;
  color?: string;
  notes?: string;
}

const WL_STORAGE = "ew-charts-watchlist";
const ALERTS_STORAGE = "ew-charts-alerts";
const DRAWINGS_STORAGE = "ew-charts-drawings";
const SETTINGS_STORAGE = "ew-charts-settings";
const CLAUDE_KEY_STORAGE = "ew-claude-api-key-session";

function sigColor(s: string) {
  if (s === "STRONG_BUY") return "#00E676";
  if (s === "BUY") return "#26A69A";
  if (s === "SELL") return "#EF5350";
  if (s === "STRONG_SELL") return "#FF1744";
  return "#787B86";
}

function toHeikinAshi(bars: { time: string; open: number; high: number; low: number; close: number }[]) {
  const ha: typeof bars = [];
  for (let i = 0; i < bars.length; i++) {
    const c = (bars[i].open + bars[i].high + bars[i].low + bars[i].close) / 4;
    const o = i === 0 ? (bars[i].open + bars[i].close) / 2 : (ha[i - 1].open + ha[i - 1].close) / 2;
    ha.push({ time: bars[i].time, open: o, high: Math.max(bars[i].high, o, c), low: Math.min(bars[i].low, o, c), close: c });
  }
  return ha;
}

function dedup<T extends { time: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => { if (seen.has(item.time)) return false; seen.add(item.time); return true; });
}

export default function Charts() {
  const { toast } = useToast();

  useEffect(() => { trackEvent("chart_viewed"); }, []);

  const [symbol, setSymbol] = useState("AAPL");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [timeframe, setTimeframe] = useState("1D");
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [bars, setBars] = useState<{ time: string; open: number; high: number; low: number; close: number; volume: number }[]>([]);

  const [activeIndicators, setActiveIndicators] = useState<string[]>(["sma20", "sma50"]);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [indicatorSearch, setIndicatorSearch] = useState("");

  const [candlestickPatterns, setCandlestickPatterns] = useState<PatternResult[]>([]);
  const [chartPatterns, setChartPatterns] = useState<ChartPattern[]>([]);

  const [showDrawTools, setShowDrawTools] = useState(false);
  const [drawings, setDrawings] = useState<DrawingTool[]>(() => {
    try { const s = localStorage.getItem(DRAWINGS_STORAGE); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [scanTab, setScanTab] = useState<"buy" | "call" | "put">("buy");

  const [claudeKey, setClaudeKey] = useState(() => {
    try { return sessionStorage.getItem(CLAUDE_KEY_STORAGE) || ""; } catch { return ""; }
  });
  const [claudeAnalysis, setClaudeAnalysis] = useState<ClaudeAnalysis | null>(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [showClaudeModal, setShowClaudeModal] = useState(false);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try { const s = localStorage.getItem(WL_STORAGE); return s ? JSON.parse(s) : [
      { symbol: "AAPL", name: "Apple Inc.", price: 0, change: 0 },
      { symbol: "NVDA", name: "NVIDIA Corporation", price: 0, change: 0 },
      { symbol: "TSLA", name: "Tesla Inc.", price: 0, change: 0 },
      { symbol: "MSFT", name: "Microsoft", price: 0, change: 0 },
      { symbol: "AMZN", name: "Amazon.com", price: 0, change: 0 },
    ]; } catch { return []; }
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try { const s = localStorage.getItem(ALERTS_STORAGE); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [showSettings, setShowSettings] = useState(false);
  const [candleStyle, setCandleStyle] = useState<CandleStyle>("Candlestick");
  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [logScale, setLogScale] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<"watchlist" | "scanner" | "alerts" | "patterns">("watchlist");
  const [bottomOpen, setBottomOpen] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<any>[]>([]);
  const subPaneRefs = useRef<{ container: HTMLDivElement; chart: IChartApi }[]>([]);

  useEffect(() => { localStorage.setItem(WL_STORAGE, JSON.stringify(watchlist)); }, [watchlist]);
  useEffect(() => { localStorage.setItem(ALERTS_STORAGE, JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem(DRAWINGS_STORAGE, JSON.stringify(drawings)); }, [drawings]);
  useEffect(() => {
    try { if (claudeKey) sessionStorage.setItem(CLAUDE_KEY_STORAGE, claudeKey); else sessionStorage.removeItem(CLAUDE_KEY_STORAGE); } catch {}
  }, [claudeKey]);

  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const q = searchText.toLowerCase();
    return SCAN_TICKERS.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 12);
  }, [searchText]);

  const filteredIndicators = useMemo(() => {
    if (!indicatorSearch.trim()) return AVAILABLE_INDICATORS;
    const q = indicatorSearch.toLowerCase();
    return AVAILABLE_INDICATORS.filter(ind => ind.name.toLowerCase().includes(q) || ind.group.toLowerCase().includes(q));
  }, [indicatorSearch]);

  const loadVersionRef = useRef(0);

  const loadChart = useCallback(async (sym: string, tf: string) => {
    const version = ++loadVersionRef.current;
    setLoading(true);
    const tfConfig = TIMEFRAMES.find(t => t.label === tf) || TIMEFRAMES[6];
    const isDaily = tf === "1D" || tf === "1W" || tf === "1M";
    try {
      const res = await fetchBars(sym, { timeframe: tfConfig.tf, limit: tfConfig.limit });
      if (version !== loadVersionRef.current) return;
      if (res.bars && res.bars.length >= 5) {
        const sd = barsToStockData(res.bars);
        const ohlcv = res.bars.map((b: AlpacaBar) => ({
          open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
        }));
        setStockData({ ...sd, ohlcv } as StockData);
        const mapped = res.bars.map((b: AlpacaBar) => ({
          time: isDaily ? b.t.slice(0, 10) : String(Math.floor(new Date(b.t).getTime() / 1000)),
          open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
        }));
        setBars(mapped);
      } else throw new Error("Insufficient data");
    } catch {
      if (version !== loadVersionRef.current) return;
      const bp = 100 + Math.random() * 200;
      const sd = generateMockOHLCV(bp, 120);
      setStockData(sd);
      const mapped = sd.closes.map((c, i) => {
        const d = new Date(); d.setDate(d.getDate() - (sd.closes.length - 1 - i));
        return {
          time: d.toISOString().slice(0, 10),
          open: i === 0 ? c * 0.99 : sd.closes[i - 1],
          high: sd.highs[i], low: sd.lows[i], close: c, volume: sd.volumes[i],
        };
      });
      setBars(mapped);
    } finally {
      if (version === loadVersionRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { loadChart(symbol, timeframe); }, [symbol, timeframe, loadChart]);

  useEffect(() => {
    if (!stockData || bars.length === 0) return;
    const opens = bars.map(b => b.open);
    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);
    setCandlestickPatterns(detectCandlestickPatterns(opens, highs, lows, closes, volumes).slice(-20));
    setChartPatterns(detectChartPatterns(highs, lows, closes));
  }, [stockData, bars]);

  useEffect(() => {
    if (!chartContainerRef.current || bars.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    overlaySeriesRef.current = [];

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787B86",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
      },
      grid: {
        vertLines: { color: showGrid ? "rgba(255,255,255,0.03)" : "transparent" },
        horzLines: { color: showGrid ? "rgba(255,255,255,0.03)" : "transparent" },
      },
      crosshair: {
        mode: showCrosshair ? CrosshairMode.Normal : CrosshairMode.Hidden,
        vertLine: { color: "rgba(255,255,255,0.3)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2A2E39" },
        horzLine: { color: "rgba(255,255,255,0.3)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2A2E39" },
      },
      rightPriceScale: {
        borderColor: "#363A45",
        scaleMargins: { top: 0.05, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "#363A45",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    let displayBars = bars;
    if (candleStyle === "Heikin-Ashi") {
      displayBars = toHeikinAshi(bars).map((b, i) => ({ ...b, volume: bars[i].volume }));
    }

    const dedupedBars = dedup(displayBars);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26A69A",
      downColor: "#EF5350",
      borderUpColor: "#26A69A",
      borderDownColor: "#EF5350",
      wickUpColor: "#26A69A",
      wickDownColor: "#EF5350",
    });

    if (candleStyle === "Hollow") {
      candleSeries.applyOptions({
        upColor: "transparent",
        borderUpColor: "#26A69A",
      });
    }

    const parseTime = (t: string): Time => {
      const n = Number(t);
      return (isNaN(n) ? t : n) as Time;
    };
    const candleData: CandlestickData[] = dedupedBars.map(b => ({
      time: parseTime(b.time), open: b.open, high: b.high, low: b.low, close: b.close,
    }));
    candleSeries.setData(candleData);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    const volumeData: HistogramData[] = dedupedBars.map(b => ({
      time: parseTime(b.time),
      value: b.volume,
      color: b.close >= b.open ? "rgba(38,166,154,0.2)" : "rgba(239,83,80,0.2)",
    }));
    volumeSeries.setData(volumeData);

    if (stockData) {
      for (const indId of activeIndicators) {
        const series = computeIndicator(indId, stockData);
        if (!series || series.type !== "overlay") continue;
        for (const line of series.lines) {
          const lineSeries = chart.addSeries(LineSeries, {
            color: line.color,
            lineWidth: (line.width || 1.5) as 1 | 2 | 3 | 4,
            priceLineVisible: false,
            lastValueVisible: false,
            lineStyle: line.style === "dashed" ? LineStyle.Dashed : line.style === "dotted" ? LineStyle.Dotted : LineStyle.Solid,
          });
          const lineData: LineData[] = [];
          for (let i = 0; i < Math.min(dedupedBars.length, line.data.length); i++) {
            if (line.data[i] != null) {
              lineData.push({ time: parseTime(dedupedBars[i].time), value: line.data[i]! });
            }
          }
          if (lineData.length > 1) {
            lineSeries.setData(lineData);
            overlaySeriesRef.current.push(lineSeries);
          }
        }
      }
    }

    try {
      const markers: any[] = [];
      for (const p of candlestickPatterns) {
        if (p.index >= 0 && p.index < dedupedBars.length) {
          markers.push({
            time: parseTime(dedupedBars[p.index].time),
            position: p.type === "bullish" ? "belowBar" : "aboveBar",
            color: p.type === "bullish" ? "#26A69A" : p.type === "bearish" ? "#EF5350" : "#787B86",
            shape: p.type === "bullish" ? "arrowUp" : "arrowDown",
            text: p.name.slice(0, 3),
          });
        }
      }
      if (markers.length > 0 && typeof (candleSeries as any).setMarkers === "function") {
        (candleSeries as any).setMarkers(markers.sort((a: any, b: any) => (a.time > b.time ? 1 : -1)));
      }
    } catch {}

    for (const d of drawings) {
      if (d.type === "hline" && d.data?.price) {
        const priceLine = {
          price: d.data.price,
          color: d.data.color || "#2962FF",
          lineWidth: 1 as 1 | 2 | 3 | 4,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: d.data.label || "",
        };
        candleSeries.createPriceLine(priceLine);
      }
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    ro.observe(chartContainerRef.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; overlaySeriesRef.current = []; };
  }, [bars, candleStyle, showGrid, showCrosshair, activeIndicators, stockData, candlestickPatterns, drawings]);

  const subPaneIndicators = useMemo(() => {
    if (!stockData) return [];
    return activeIndicators
      .map(id => computeIndicator(id, stockData))
      .filter((s): s is IndicatorSeries => s != null && s.type === "subpane")
      .slice(0, 4);
  }, [activeIndicators, stockData]);

  const selectSymbol = useCallback((sym: string) => {
    setSymbol(sym);
    setSearchText("");
    setShowSearch(false);
  }, []);

  const addToWatchlist = useCallback((sym: string) => {
    if (watchlist.some(w => w.symbol === sym)) return;
    const info = SCAN_TICKERS.find(s => s.symbol === sym);
    setWatchlist(prev => [...prev, { symbol: sym, name: info?.name || sym, price: 0, change: 0 }]);
  }, [watchlist]);

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== sym));
  }, []);

  const addAlert = useCallback((price: number, condition: "above" | "below") => {
    const alert: PriceAlert = { id: Date.now().toString(), symbol, price, condition, triggered: false };
    setAlerts(prev => [...prev, alert]);
    toast({ title: "Alert Set", description: `${condition === "above" ? "Above" : "Below"} $${price.toFixed(2)} for ${symbol}` });
  }, [symbol, toast]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addHLine = useCallback(() => {
    if (!bars.length) return;
    const price = bars[bars.length - 1].close;
    const drawing: DrawingTool = { id: Date.now().toString(), type: "hline", data: { price, color: "#2962FF", label: `$${price.toFixed(2)}` } };
    setDrawings(prev => [...prev, drawing]);
  }, [bars]);

  const addFibRetracement = useCallback(() => {
    if (bars.length < 10) return;
    const recent = bars.slice(-50);
    const high = Math.max(...recent.map(b => b.high));
    const low = Math.min(...recent.map(b => b.low));
    const fibs = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map(level => ({
      price: high - (high - low) * level,
      label: `${(level * 100).toFixed(1)}%`,
    }));
    for (const fib of fibs) {
      setDrawings(prev => [...prev, {
        id: `fib-${Date.now()}-${fib.label}`,
        type: "hline" as const,
        data: { price: fib.price, color: "#FF9800", label: `Fib ${fib.label}` },
      }]);
    }
  }, [bars]);

  const clearDrawings = useCallback(() => setDrawings([]), []);

  const startScan = useCallback(async () => {
    setScanning(true);
    setScanProgress({ done: 0, total: SCAN_TICKERS.length });
    setBottomOpen(true);
    try {
      const results = await runScanner((done, total) => setScanProgress({ done, total }));
      setScanResults(results);
      toast({ title: "Scan Complete", description: `${results.length} tickers analyzed` });
    } catch (err) {
      toast({ title: "Scan Failed", description: "Error running scanner", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }, [toast]);

  const runClaudeForSymbol = useCallback(async (scanResult: ScanResult) => {
    if (!claudeKey) {
      toast({ title: "API Key Required", description: "Enter your Anthropic API key in settings", variant: "destructive" });
      return;
    }
    setClaudeLoading(true);
    const analysis = await runClaudeAnalysis(claudeKey, scanResult.symbol, scanResult);
    setClaudeAnalysis(analysis);
    setClaudeLoading(false);
    if (analysis) setShowClaudeModal(true);
    else toast({ title: "Analysis Failed", description: "Claude API error | check your API key", variant: "destructive" });
  }, [claudeKey, toast]);

  const buySignals = useMemo(() => scanResults.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").sort((a, b) => b.score - a.score), [scanResults]);
  const callSignals = useMemo(() => scanResults.filter(r => r.optionSetup?.type === "CALL").sort((a, b) => b.score - a.score), [scanResults]);
  const putSignals = useMemo(() => scanResults.filter(r => r.optionSetup?.type === "PUT").sort((a, b) => a.score - b.score), [scanResults]);

  const currentPrice = bars.length > 0 ? bars[bars.length - 1].close : 0;
  const prevClose = bars.length > 1 ? bars[bars.length - 2].close : currentPrice;
  const priceChange = prevClose ? ((currentPrice - prevClose) / prevClose * 100) : 0;
  const isUp = currentPrice >= prevClose;

  const overall = useMemo(() => stockData ? getOverallSignal(runAllIndicators(stockData)) : null, [stockData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "+" || e.key === "=") chartRef.current?.timeScale().scrollToPosition(5, true);
      if (e.key === "-") chartRef.current?.timeScale().scrollToPosition(-5, true);
      if (e.key === "ArrowLeft") chartRef.current?.timeScale().scrollToPosition(-3, false);
      if (e.key === "ArrowRight") chartRef.current?.timeScale().scrollToPosition(3, false);
      if (e.altKey && e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key) - 1;
        if (idx < TIMEFRAMES.length) {
          e.preventDefault();
          setTimeframe(TIMEFRAMES[idx].label);
        }
      }
      if (e.key === "f" || e.key === "F") chartRef.current?.timeScale().fitContent();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!bars.length || !alerts.length) return;
    const price = bars[bars.length - 1].close;
    for (const alert of alerts) {
      if (alert.triggered || alert.symbol !== symbol) continue;
      if ((alert.condition === "above" && price >= alert.price) || (alert.condition === "below" && price <= alert.price)) {
        alert.triggered = true;
        setAlerts([...alerts]);
        if (Notification.permission === "granted") {
          new Notification(`Price Alert: ${symbol}`, { body: `Price ${alert.condition} $${alert.price.toFixed(2)} | now $${price.toFixed(2)}` });
        }
        toast({ title: `Alert Triggered: ${symbol}`, description: `Price ${alert.condition} $${alert.price.toFixed(2)}` });
      }
    }
  }, [bars, alerts, symbol, toast]);

  return (
    <Layout>
      <PageErrorBoundary fallbackTitle="Charts encountered an error">
      <div className="flex flex-col h-[calc(100vh-64px)] bg-[#131722] text-[#D1D4DC] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center h-10 bg-[#1E222D] border-b border-[#363A45] px-2 gap-1 shrink-0">
          <div className="flex items-center gap-2 min-w-[200px]">
            <BarChart3 className="w-4 h-4 text-[#2962FF]" />
            <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{symbol}</span>
            <span className={`text-[10px] font-mono ${isUp ? "text-[#26A69A]" : "text-[#EF5350]"}`}>
              ${currentPrice.toFixed(2)} {isUp ? "+" : ""}{Math.abs(priceChange).toFixed(2)}%
            </span>
          </div>

          <div className="relative flex-1 max-w-[300px]">
            <div className="flex items-center bg-[#2A2E39] rounded h-7 px-2">
              <Search className="w-3 h-3 text-[#787B86] mr-1" />
              <input
                value={searchText}
                onChange={e => { setSearchText(e.target.value.toUpperCase()); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                placeholder="Search ticker..."
                className="bg-transparent text-xs text-[#D1D4DC] outline-none w-full font-mono placeholder:text-[#787B86]"
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-8 left-0 w-full bg-[#2A2E39] border border-[#363A45] rounded shadow-xl z-50 max-h-48 overflow-y-auto">
                {searchResults.map(s => (
                  <button key={s.symbol} onMouseDown={() => selectSymbol(s.symbol)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[#363A45] text-left">
                    <span className="font-mono font-bold">{s.symbol}</span>
                    <span className="text-[#787B86] truncate ml-2">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 mx-2">
            {TIMEFRAMES.map(tf => (
              <button key={tf.label} onClick={() => setTimeframe(tf.label)}
                className={`px-2 py-1 text-[10px] font-mono rounded ${timeframe === tf.label ? "bg-[#2962FF] text-white" : "text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]"}`}>
                {tf.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39] rounded">
              <Activity className="w-3 h-3" /> Indicators
            </button>
            <button onClick={() => setShowDrawTools(!showDrawTools)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39] rounded">
              <Pencil className="w-3 h-3" /> Draw
            </button>
            <button onClick={startScan} disabled={scanning}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-[#2962FF] text-white rounded hover:bg-[#1E53E4] disabled:opacity-50">
              {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {scanning ? `${scanProgress.done}/${scanProgress.total}` : "Scan"}
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className="p-1 text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39] rounded">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Indicator Panel Dropdown */}
        {showIndicatorPanel && (
          <div className="absolute top-[104px] left-1/2 -translate-x-1/2 w-[400px] bg-[#1E222D] border border-[#363A45] rounded-lg shadow-2xl z-50 max-h-[60vh] overflow-hidden">
            <div className="p-3 border-b border-[#363A45]">
              <div className="flex items-center bg-[#2A2E39] rounded px-2 h-8">
                <Search className="w-3 h-3 text-[#787B86] mr-2" />
                <input value={indicatorSearch} onChange={e => setIndicatorSearch(e.target.value)}
                  placeholder="Search indicators..." className="bg-transparent text-xs text-[#D1D4DC] outline-none w-full" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {Object.entries(filteredIndicators.reduce((acc, ind) => {
                (acc[ind.group] = acc[ind.group] || []).push(ind);
                return acc;
              }, {} as Record<string, typeof AVAILABLE_INDICATORS>)).map(([group, inds]) => (
                <div key={group} className="mb-2">
                  <div className="text-[9px] uppercase tracking-wider text-[#787B86] px-2 py-1">{group}</div>
                  {inds.map(ind => {
                    const active = activeIndicators.includes(ind.id);
                    return (
                      <button key={ind.id}
                        onClick={() => setActiveIndicators(prev => active ? prev.filter(id => id !== ind.id) : [...prev, ind.id])}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded ${active ? "bg-[#2962FF]/20 text-[#2962FF]" : "text-[#D1D4DC] hover:bg-[#2A2E39]"}`}>
                        <span>{ind.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${ind.type === "overlay" ? "bg-[#26A69A]/20 text-[#26A69A]" : "bg-[#9C27B0]/20 text-[#9C27B0]"}`}>
                          {ind.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[#363A45] flex items-center justify-between">
              <span className="text-[10px] text-[#787B86]">{activeIndicators.length} active</span>
              <button onClick={() => setShowIndicatorPanel(false)} className="text-[10px] text-[#2962FF] hover:underline">Close</button>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-[104px] right-4 w-[300px] bg-[#1E222D] border border-[#363A45] rounded-lg shadow-2xl z-50">
            <div className="p-3 border-b border-[#363A45] flex items-center justify-between">
              <span className="text-xs font-bold">Chart Settings</span>
              <button onClick={() => setShowSettings(false)}><X className="w-3.5 h-3.5 text-[#787B86]" /></button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#787B86] block mb-1">Candle Style</label>
                <div className="flex gap-1">
                  {CANDLE_STYLES.map(s => (
                    <button key={s} onClick={() => setCandleStyle(s)}
                      className={`px-2 py-1 text-[10px] rounded ${candleStyle === s ? "bg-[#2962FF] text-white" : "bg-[#2A2E39] text-[#787B86]"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Show Grid</span>
                <button onClick={() => setShowGrid(!showGrid)} className={`w-8 h-4 rounded-full ${showGrid ? "bg-[#2962FF]" : "bg-[#363A45]"} relative`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${showGrid ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Show Crosshair</span>
                <button onClick={() => setShowCrosshair(!showCrosshair)} className={`w-8 h-4 rounded-full ${showCrosshair ? "bg-[#2962FF]" : "bg-[#363A45]"} relative`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${showCrosshair ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
              <div className="border-t border-[#363A45] pt-3">
                <label className="text-[9px] uppercase tracking-wider text-[#787B86] block mb-1">Claude API Key (optional)</label>
                <input value={claudeKey} onChange={e => setClaudeKey(e.target.value)}
                  type="password" placeholder="Enter API key..."
                  className="w-full bg-[#2A2E39] text-xs text-[#D1D4DC] rounded px-2 py-1.5 outline-none border border-[#363A45] focus:border-[#2962FF]" />
                <p className="text-[9px] text-[#787B86] mt-1">Stored in session memory only (cleared on tab close). Enables AI deep analysis on scanner results.</p>
              </div>
            </div>
          </div>
        )}

        {/* Drawing Tools Bar */}
        {showDrawTools && (
          <div className="flex items-center h-8 bg-[#1E222D] border-b border-[#363A45] px-3 gap-2 shrink-0">
            <button onClick={addHLine} className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39] rounded">
              <Minus className="w-3 h-3" /> H-Line
            </button>
            <button onClick={addFibRetracement} className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39] rounded">
              <Triangle className="w-3 h-3" /> Fibonacci
            </button>
            <button onClick={() => {
              if (bars.length) addAlert(bars[bars.length - 1].close, "above");
            }} className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39] rounded">
              <Bell className="w-3 h-3" /> Alert
            </button>
            <div className="flex-1" />
            <button onClick={clearDrawings} className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#EF5350] hover:bg-[#2A2E39] rounded">
              <Trash2 className="w-3 h-3" /> Clear All
            </button>
            <span className="text-[9px] text-[#787B86]">{drawings.length} drawings</span>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-56 bg-[#1E222D] border-r border-[#363A45] flex flex-col shrink-0 overflow-hidden">
            <div className="flex border-b border-[#363A45]">
              {(["watchlist", "scanner", "alerts", "patterns"] as const).map(tab => (
                <button key={tab} onClick={() => setSidebarTab(tab)}
                  className={`flex-1 py-2 text-[9px] uppercase tracking-wider ${sidebarTab === tab ? "text-[#2962FF] border-b-2 border-[#2962FF]" : "text-[#787B86] hover:text-[#D1D4DC]"}`}>
                  {tab === "watchlist" ? "Watch" : tab === "scanner" ? "Scan" : tab === "alerts" ? "Alerts" : "Pat."}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "watchlist" && (
                <div>
                  <div className="p-2 border-b border-[#2A2E39]">
                    <div className="flex items-center gap-1">
                      <input placeholder="Add ticker..." className="flex-1 bg-[#2A2E39] text-[10px] text-[#D1D4DC] rounded px-2 py-1 outline-none font-mono"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.toUpperCase().trim();
                            if (v) { addToWatchlist(v); (e.target as HTMLInputElement).value = ""; }
                          }
                        }}
                      />
                      <button onClick={() => loadChart(symbol, timeframe)} className="p-1 text-[#787B86] hover:text-[#D1D4DC]">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {watchlist.map(w => (
                    <div key={w.symbol} onClick={() => selectSymbol(w.symbol)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#2A2E39] border-b border-[#2A2E39]/50 cursor-pointer group ${w.symbol === symbol ? "bg-[#2A2E39]" : ""}`}>
                      <div className="text-left">
                        <div className="font-mono font-bold text-[11px]">{w.symbol}</div>
                        <div className="text-[9px] text-[#787B86] truncate max-w-[80px]">{w.name}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span onClick={e => { e.stopPropagation(); removeFromWatchlist(w.symbol); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-[#787B86] hover:text-[#EF5350] cursor-pointer">
                          <X className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === "scanner" && (
                <div>
                  {scanResults.length === 0 ? (
                    <div className="p-4 text-center">
                      <Zap className="w-6 h-6 text-[#787B86] mx-auto mb-2" />
                      <p className="text-[10px] text-[#787B86]">Run the AI Scanner to analyze 100+ tickers</p>
                      <button onClick={startScan} disabled={scanning}
                        className="mt-2 px-3 py-1.5 text-[10px] bg-[#2962FF] text-white rounded hover:bg-[#1E53E4] disabled:opacity-50">
                        {scanning ? "Scanning..." : "Start Scan"}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {scanResults.slice(0, 20).map(r => (
                        <button key={r.symbol} onClick={() => selectSymbol(r.symbol)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] hover:bg-[#2A2E39] border-b border-[#2A2E39]/50">
                          <div className="flex items-center gap-2">
                            <div className="w-5 text-right font-mono font-bold" style={{ color: sigColor(r.signal) }}>{r.score}</div>
                            <span className="font-mono">{r.symbol}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: sigColor(r.signal), backgroundColor: `${sigColor(r.signal)}15` }}>
                            {r.signal.replace("_", " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sidebarTab === "alerts" && (
                <div>
                  <div className="p-2">
                    <button onClick={() => { if (bars.length) addAlert(bars[bars.length - 1].close * 1.02, "above"); }}
                      className="w-full px-2 py-1.5 text-[10px] bg-[#2A2E39] text-[#787B86] rounded hover:text-[#D1D4DC] mb-1">
                      + Add Alert Above
                    </button>
                    <button onClick={() => { if (bars.length) addAlert(bars[bars.length - 1].close * 0.98, "below"); }}
                      className="w-full px-2 py-1.5 text-[10px] bg-[#2A2E39] text-[#787B86] rounded hover:text-[#D1D4DC]">
                      + Add Alert Below
                    </button>
                  </div>
                  {alerts.filter(a => a.symbol === symbol).map(a => (
                    <div key={a.id} className={`flex items-center justify-between px-3 py-2 text-[10px] border-b border-[#2A2E39]/50 ${a.triggered ? "opacity-50" : ""}`}>
                      <div>
                        <span className={a.condition === "above" ? "text-[#26A69A]" : "text-[#EF5350]"}>
                          {a.condition === "above" ? "▲" : "▼"} ${a.price.toFixed(2)}
                        </span>
                        {a.triggered && <span className="ml-1 text-[#787B86]">(triggered)</span>}
                      </div>
                      <button onClick={() => removeAlert(a.id)} className="text-[#787B86] hover:text-[#EF5350]">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {sidebarTab === "patterns" && (
                <div>
                  {candlestickPatterns.length === 0 && chartPatterns.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-[#787B86]">Load a chart to detect patterns</div>
                  ) : (
                    <>
                      {chartPatterns.map((p, i) => (
                        <div key={i} className="px-3 py-2 text-[10px] border-b border-[#2A2E39]/50">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${p.type === "bullish" ? "bg-[#26A69A]" : p.type === "bearish" ? "bg-[#EF5350]" : "bg-[#787B86]"}`} />
                            <span className="font-bold">{p.name}</span>
                          </div>
                          <p className="text-[9px] text-[#787B86] mt-0.5">{p.description}</p>
                        </div>
                      ))}
                      {candlestickPatterns.slice(-10).map((p, i) => (
                        <div key={`cp-${i}`} className="px-3 py-1.5 text-[10px] border-b border-[#2A2E39]/50">
                          <div className="flex items-center gap-1.5">
                            <span className={p.type === "bullish" ? "text-[#26A69A]" : p.type === "bearish" ? "text-[#EF5350]" : "text-[#787B86]"}>
                              {p.type === "bullish" ? "▲" : p.type === "bearish" ? "▼" : "●"}
                            </span>
                            <span>{p.name}</span>
                            <span className="text-[8px] text-[#787B86]">({p.reliability})</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Active indicators bar */}
            {activeIndicators.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-[#1E222D] border-b border-[#363A45] flex-wrap shrink-0">
                {activeIndicators.map(id => {
                  const ind = AVAILABLE_INDICATORS.find(i => i.id === id);
                  return ind ? (
                    <span key={id} className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] bg-[#2A2E39] rounded text-[#D1D4DC]">
                      {ind.name}
                      <button onClick={() => setActiveIndicators(prev => prev.filter(i => i !== id))} className="text-[#787B86] hover:text-[#EF5350]">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Overall signal bar */}
            {overall && (
              <div className="flex items-center justify-between px-3 py-1 bg-[#1E222D] border-b border-[#363A45] shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold" style={{ color: sigColor(overall.signal) }}>
                    {overall.signal.replace("_", " ")}
                  </span>
                  <span className="text-[9px] text-[#787B86]">{overall.confidence}% confidence</span>
                  <span className="text-[9px] text-[#26A69A]">↑{overall.buyCount}</span>
                  <span className="text-[9px] text-[#EF5350]">↓{overall.sellCount}</span>
                  <span className="text-[9px] text-[#787B86]">●{overall.neutralCount}</span>
                </div>
                {claudeKey && (
                  <button onClick={() => {
                    const sr = scanResults.find(r => r.symbol === symbol);
                    if (sr) runClaudeForSymbol(sr);
                    else {
                      const mockSR: ScanResult = {
                        symbol, name: "", sector: "", price: currentPrice, change: priceChange,
                        score: overall.confidence, signal: overall.signal,
                        buyCount: overall.buyCount, sellCount: overall.sellCount, neutralCount: overall.neutralCount,
                        confidence: overall.confidence, bullPoints: [], bearPoints: [],
                      };
                      runClaudeForSymbol(mockSR);
                    }
                  }} disabled={claudeLoading}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] bg-[#9C27B0]/20 text-[#CE93D8] rounded hover:bg-[#9C27B0]/30">
                    {claudeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    AI Analysis
                  </button>
                )}
              </div>
            )}

            {/* Main Chart Canvas */}
            <div className="flex-1 relative min-h-0">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-10">
                  <Loader2 className="w-8 h-8 text-[#2962FF] animate-spin" />
                </div>
              )}
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <span className="text-6xl font-bold text-white/[0.04] font-mono select-none">{symbol}</span>
              </div>
              <div ref={chartContainerRef} className="w-full h-full" />
            </div>

            {/* Sub-panes for indicators */}
            {subPaneIndicators.map((ind, idx) => (
              <SubPane key={`${ind.name}-${idx}`} indicator={ind} bars={bars} height={120} />
            ))}
          </div>
        </div>

        {/* Bottom Panel - Scanner Results */}
        {bottomOpen && scanResults.length > 0 && (
          <div className="h-56 bg-[#1E222D] border-t border-[#363A45] flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 h-8 border-b border-[#363A45]">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#2962FF]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Signal Engine</span>
                <div className="flex gap-0.5 ml-3">
                  {(["buy", "call", "put"] as const).map(tab => (
                    <button key={tab} onClick={() => setScanTab(tab)}
                      className={`px-2.5 py-0.5 text-[9px] uppercase rounded ${scanTab === tab
                        ? tab === "buy" ? "bg-[#26A69A]/20 text-[#26A69A]" : tab === "call" ? "bg-[#2962FF]/20 text-[#2962FF]" : "bg-[#EF5350]/20 text-[#EF5350]"
                        : "text-[#787B86] hover:text-[#D1D4DC]"}`}>
                      {tab === "buy" ? `Buy (${buySignals.length})` : tab === "call" ? `Call (${callSignals.length})` : `Put (${putSignals.length})`}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setBottomOpen(false)} className="text-[#787B86] hover:text-[#D1D4DC]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-[#1E222D]">
                  <tr className="text-[#787B86] text-left">
                    <th className="px-3 py-1.5 font-normal">Ticker</th>
                    <th className="px-2 py-1.5 font-normal">Price</th>
                    <th className="px-2 py-1.5 font-normal">Score</th>
                    <th className="px-2 py-1.5 font-normal">Signal</th>
                    <th className="px-2 py-1.5 font-normal">Buy/Sell</th>
                    {(scanTab === "call" || scanTab === "put") && (
                      <>
                        <th className="px-2 py-1.5 font-normal">Strategy</th>
                        <th className="px-2 py-1.5 font-normal">Entry</th>
                        <th className="px-2 py-1.5 font-normal">Target</th>
                        <th className="px-2 py-1.5 font-normal">R/R</th>
                      </>
                    )}
                    <th className="px-2 py-1.5 font-normal">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(scanTab === "buy" ? buySignals : scanTab === "call" ? callSignals : putSignals).map(r => (
                    <tr key={r.symbol} className="border-b border-[#2A2E39]/50 hover:bg-[#2A2E39]/50 cursor-pointer" onClick={() => selectSymbol(r.symbol)}>
                      <td className="px-3 py-1.5">
                        <span className="font-mono font-bold">{r.symbol}</span>
                        <span className="ml-1.5 text-[#787B86]">{r.name.slice(0, 15)}</span>
                      </td>
                      <td className="px-2 py-1.5 font-mono">${r.price.toFixed(2)}</td>
                      <td className="px-2 py-1.5">
                        <span className="font-mono font-bold" style={{ color: sigColor(r.signal) }}>{r.score}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ color: sigColor(r.signal), backgroundColor: `${sigColor(r.signal)}15` }}>
                          {r.signal.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono">
                        <span className="text-[#26A69A]">{r.buyCount}</span>/<span className="text-[#EF5350]">{r.sellCount}</span>
                      </td>
                      {(scanTab === "call" || scanTab === "put") && r.optionSetup && (
                        <>
                          <td className="px-2 py-1.5 text-[9px]">{r.optionSetup.strategy}</td>
                          <td className="px-2 py-1.5 font-mono">{r.optionSetup.entry}</td>
                          <td className="px-2 py-1.5 font-mono">{r.optionSetup.target}</td>
                          <td className="px-2 py-1.5 font-mono">{r.optionSetup.riskReward}</td>
                        </>
                      )}
                      <td className="px-2 py-1.5">
                        {claudeKey && (
                          <button onClick={e => { e.stopPropagation(); runClaudeForSymbol(r); }}
                            className="text-[9px] text-[#CE93D8] hover:underline">
                            <Brain className="w-3 h-3 inline" /> AI
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-1 border-t border-[#363A45] text-[8px] text-[#787B86]">
              This scanner provides technical analysis signals only and does not constitute financial advice. Options trading involves substantial risk. Past performance does not guarantee future results. Always do your own research.
            </div>
          </div>
        )}

        {/* Claude Analysis Modal */}
        {showClaudeModal && claudeAnalysis && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowClaudeModal(false)}>
            <div className="bg-[#1E222D] border border-[#363A45] rounded-lg w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-[#363A45] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#CE93D8]" />
                  <span className="text-sm font-bold">AI Deep Analysis</span>
                </div>
                <button onClick={() => setShowClaudeModal(false)}><X className="w-4 h-4 text-[#787B86]" /></button>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <span className="text-2xl font-bold mr-2" style={{ color: sigColor(claudeAnalysis.direction === "BULLISH" ? "BUY" : claudeAnalysis.direction === "BEARISH" ? "SELL" : "NEUTRAL") }}>
                    {claudeAnalysis.direction}
                  </span>
                  <span className="text-[#787B86]">{claudeAnalysis.confidence}% confidence</span>
                </div>
                <p className="text-[#D1D4DC]">{claudeAnalysis.summary}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#2A2E39] rounded p-2">
                    <div className="text-[9px] text-[#787B86] uppercase">Entry</div>
                    <div className="font-mono font-bold text-[#26A69A]">{claudeAnalysis.entry}</div>
                  </div>
                  <div className="bg-[#2A2E39] rounded p-2">
                    <div className="text-[9px] text-[#787B86] uppercase">Target</div>
                    <div className="font-mono font-bold text-[#2962FF]">{claudeAnalysis.target}</div>
                  </div>
                  <div className="bg-[#2A2E39] rounded p-2">
                    <div className="text-[9px] text-[#787B86] uppercase">Stop</div>
                    <div className="font-mono font-bold text-[#EF5350]">{claudeAnalysis.stop}</div>
                  </div>
                </div>
                <div className="bg-[#2A2E39] rounded p-2">
                  <div className="text-[9px] text-[#787B86] uppercase mb-1">Risk/Reward</div>
                  <div className="font-mono">{claudeAnalysis.riskReward}</div>
                </div>
                {claudeAnalysis.callSetup && (
                  <div className="bg-[#26A69A]/10 border border-[#26A69A]/20 rounded p-2">
                    <div className="text-[9px] text-[#26A69A] uppercase mb-1">Call Setup</div>
                    <div>{claudeAnalysis.callSetup}</div>
                  </div>
                )}
                {claudeAnalysis.putSetup && (
                  <div className="bg-[#EF5350]/10 border border-[#EF5350]/20 rounded p-2">
                    <div className="text-[9px] text-[#EF5350] uppercase mb-1">Put Setup</div>
                    <div>{claudeAnalysis.putSetup}</div>
                  </div>
                )}
                {claudeAnalysis.keyLevels.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[#787B86] uppercase mb-1">Key Levels</div>
                    <div className="flex flex-wrap gap-1">{claudeAnalysis.keyLevels.map((l, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#2A2E39] rounded text-[10px]">{l}</span>
                    ))}</div>
                  </div>
                )}
                {claudeAnalysis.risks.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[#EF5350] uppercase mb-1">Risks</div>
                    {claudeAnalysis.risks.map((r, i) => (
                      <div key={i} className="text-[10px] text-[#787B86]">• {r}</div>
                    ))}
                  </div>
                )}
                {claudeAnalysis.catalysts.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[#26A69A] uppercase mb-1">Catalysts</div>
                    {claudeAnalysis.catalysts.map((c, i) => (
                      <div key={i} className="text-[10px] text-[#787B86]">• {c}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <FinancialDisclaimerBanner pageKey="charts" />
      <PaperTradingWidget variant="floating" initialSymbol={symbol} />
      </PageErrorBoundary>
    </Layout>
  );
}

function SubPane({ indicator, bars, height }: { indicator: IndicatorSeries; bars: { time: string }[]; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const parseBarTime = (t: string): Time => {
    const n = Number(t);
    return (isNaN(n) ? t : n) as Time;
  };

  const dedupedBars = useMemo(() => {
    const seen = new Set<string>();
    return bars.filter(b => { if (seen.has(b.time)) return false; seen.add(b.time); return true; });
  }, [bars]);

  useEffect(() => {
    if (!ref.current || dedupedBars.length === 0) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787B86",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.02)" },
        horzLines: { color: "rgba(255,255,255,0.02)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.2)", width: 1, style: LineStyle.Dashed, labelVisible: false },
        horzLine: { color: "rgba(255,255,255,0.2)", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#2A2E39" },
      },
      rightPriceScale: { borderColor: "#363A45", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { visible: false },
    });
    chartRef.current = chart;

    for (const line of indicator.lines) {
      const lineSeries = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: (line.width || 1.5) as 1 | 2 | 3 | 4,
        priceLineVisible: false,
        lastValueVisible: true,
        lineStyle: line.style === "dashed" ? LineStyle.Dashed : line.style === "dotted" ? LineStyle.Dotted : LineStyle.Solid,
      });
      const data: LineData[] = [];
      for (let i = 0; i < Math.min(dedupedBars.length, line.data.length); i++) {
        if (line.data[i] != null) data.push({ time: parseBarTime(dedupedBars[i].time), value: line.data[i]! });
      }
      if (data.length > 1) lineSeries.setData(data);
    }

    if (indicator.histograms) {
      for (const hist of indicator.histograms) {
        const histSeries = chart.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const data: HistogramData[] = [];
        for (let i = 0; i < Math.min(dedupedBars.length, hist.data.length); i++) {
          if (hist.data[i] != null) {
            data.push({
              time: parseBarTime(dedupedBars[i].time),
              value: hist.data[i]!,
              color: hist.colors[i] || "#787B86",
            });
          }
        }
        if (data.length > 0) histSeries.setData(data);
      }
    }

    if (indicator.zones) {
      for (const zone of indicator.zones) {
        const tempSeries = chart.addSeries(LineSeries, {
          color: zone.color,
          lineWidth: 1,
          lineStyle: zone.style === "dashed" ? LineStyle.Dashed : LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        const zoneData: LineData[] = [];
        for (let i = 0; i < dedupedBars.length; i++) {
          zoneData.push({ time: parseBarTime(dedupedBars[i].time), value: zone.value });
        }
        if (zoneData.length > 1) tempSeries.setData(zoneData);
      }
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(ref.current);

    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [indicator, dedupedBars, height]);

  return (
    <div className="border-t border-[#363A45] shrink-0" style={{ height }}>
      <div className="flex items-center justify-between px-2 py-0.5 bg-[#1E222D]">
        <span className="text-[9px] text-[#787B86] uppercase tracking-wider">{indicator.name}</span>
      </div>
      <div ref={ref} className="w-full" style={{ height: height - 20 }} />
    </div>
  );
}
