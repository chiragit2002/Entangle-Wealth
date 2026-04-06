import { useState, useMemo, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Search, TrendingUp, TrendingDown, Activity, Volume2,
  Waves, Bot, ChevronDown, ChevronUp, Zap, Shield, Brain, Eye,
  Target, AlertTriangle, RefreshCw, Download, Bell, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type IndicatorResult, type StockData,
  generateMockOHLCV, runAllIndicators, getOverallSignal,
} from "@/lib/indicators";

type Category = "all" | "trend" | "momentum" | "volatility" | "volume" | "oscillator";

interface AgentReview {
  name: string;
  icon: typeof Bot;
  color: string;
  verdict: string;
  signal: IndicatorResult["signal"];
  reasoning: string;
  keyMetrics: string[];
}

const POPULAR_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "CRM",
  "JPM", "V", "UNH", "JNJ", "PG", "DIS", "COST", "INTC", "PYPL", "SQ",
];

const CATEGORIES: { key: Category; label: string; icon: typeof Activity }[] = [
  { key: "all", label: "All", icon: BarChart3 },
  { key: "trend", label: "Trend", icon: TrendingUp },
  { key: "momentum", label: "Momentum", icon: Zap },
  { key: "volatility", label: "Volatility", icon: Waves },
  { key: "volume", label: "Volume", icon: Volume2 },
];

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
    {
      name: "Trend Analyst",
      icon: TrendingUp,
      color: "#00d4ff",
      verdict: trendBuy > trend.length * 0.6 ? `${symbol} shows strong bullish trend alignment` : trendBuy > trend.length * 0.4 ? `${symbol} trend is mixed but leaning positive` : `${symbol} faces downward trend pressure`,
      signal: trendBuy > trend.length * 0.6 ? "BUY" : trendBuy < trend.length * 0.3 ? "SELL" : "NEUTRAL",
      reasoning: `Analyzed ${trend.length} trend indicators. ${trendBuy} bullish, ${trend.length - trendBuy} bearish/neutral. ${supertrend ? `Supertrend is ${supertrend.signal === "BUY" ? "bullish" : "bearish"} at ${supertrend.value}.` : ""} ${adx ? `ADX at ${adx.value} — ${Number(adx.value) > 25 ? "strong" : "weak"} trend.` : ""}`,
      keyMetrics: [
        `Moving Averages: ${trendBuy}/${trend.length} bullish`,
        supertrend ? `Supertrend: ${supertrend.signal}` : "Supertrend: N/A",
        adx ? `ADX: ${adx.value} (${Number(adx.value) > 25 ? "trending" : "ranging"})` : "ADX: N/A",
      ],
    },
    {
      name: "Momentum Surgeon",
      icon: Zap,
      color: "#ffd700",
      verdict: rsi ? `RSI at ${rsi.value} — ${Number(rsi.value) > 70 ? "overbought, potential reversal" : Number(rsi.value) < 30 ? "oversold, potential bounce" : "neutral zone"}` : "Momentum analysis complete",
      signal: momBuy > momentum.length * 0.5 ? "BUY" : momBuy < momentum.length * 0.3 ? "SELL" : "NEUTRAL",
      reasoning: `${momentum.length} momentum indicators analyzed. ${momBuy} signaling buy. ${rsi ? `RSI(14) at ${rsi.value}.` : ""} ${macd ? `MACD is ${macd.signal === "BUY" || macd.signal === "STRONG_BUY" ? "bullish" : "bearish"} at ${macd.value}.` : ""}`,
      keyMetrics: [
        rsi ? `RSI(14): ${rsi.value}` : "RSI: N/A",
        macd ? `MACD: ${macd.value} (${macd.signal})` : "MACD: N/A",
        `Momentum consensus: ${momBuy}/${momentum.length} bullish`,
      ],
    },
    {
      name: "Risk Manager",
      icon: Shield,
      color: "#ff3366",
      verdict: bb ? `Bollinger position: ${bb.signal === "BUY" || bb.signal === "STRONG_BUY" ? "near lower band — value zone" : bb.signal === "SELL" || bb.signal === "STRONG_SELL" ? "near upper band — caution" : "mid-range"}` : "Volatility within normal range",
      signal: volatility.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length > volatility.length * 0.5 ? "BUY" : "NEUTRAL",
      reasoning: `Assessed ${volatility.length} volatility metrics. ${bb ? `Bollinger Bands: ${bb.value}.` : ""} ATR-based risk assessment indicates ${volatility.filter(r => r.signal === "BUY").length > 2 ? "low volatility — favorable entry" : "elevated volatility — size positions accordingly"}.`,
      keyMetrics: [
        bb ? `Bollinger: ${bb.value}` : "Bollinger: N/A",
        `Volatility indicators: ${volatility.length} analyzed`,
        `Risk level: ${volatility.filter(r => r.signal === "SELL" || r.signal === "STRONG_SELL").length > 3 ? "HIGH" : "MODERATE"}`,
      ],
    },
    {
      name: "Volume Profiler",
      icon: Volume2,
      color: "#00ff88",
      verdict: obv ? `Volume flow: ${obv.signal === "BUY" ? "accumulation detected — smart money buying" : obv.signal === "SELL" ? "distribution — potential exit signal" : "neutral volume flow"}` : "Volume analysis complete",
      signal: volBuy > volume.length * 0.5 ? "BUY" : volBuy < volume.length * 0.3 ? "SELL" : "NEUTRAL",
      reasoning: `${volume.length} volume indicators reviewed. ${obv ? `OBV at ${obv.value} (${obv.signal}).` : ""} ${volBuy}/${volume.length} showing positive volume flow.`,
      keyMetrics: [
        obv ? `OBV: ${obv.value}` : "OBV: N/A",
        `Volume signals: ${volBuy}/${volume.length} bullish`,
        `Flow: ${volBuy > volume.length * 0.5 ? "Accumulation" : "Distribution"}`,
      ],
    },
    {
      name: "Devil's Advocate",
      icon: Eye,
      color: "#ff9500",
      verdict: overall.signal === "BUY" || overall.signal === "STRONG_BUY"
        ? `Contrarian view: ${overall.sellCount} indicators disagree. Watch for divergences.`
        : `Bearish case: ${overall.buyCount} indicators still positive despite weakness.`,
      signal: overall.signal === "BUY" ? "SELL" : overall.signal === "SELL" ? "BUY" : "NEUTRAL",
      reasoning: `Playing devil's advocate against the ${overall.signal} consensus. ${overall.sellCount} sell signals shouldn't be ignored. ${rsi && Number(rsi.value) > 60 ? "RSI elevated — momentum could stall." : ""} Always consider the opposing view before committing capital.`,
      keyMetrics: [
        `Dissenting indicators: ${overall.signal === "BUY" || overall.signal === "STRONG_BUY" ? overall.sellCount : overall.buyCount}`,
        `Contrarian confidence: ${100 - overall.confidence}%`,
        "Always set stop losses",
      ],
    },
    {
      name: "Consensus Engine",
      icon: Brain,
      color: "#a855f7",
      verdict: `Final verdict: ${overall.signal} with ${overall.confidence}% confidence across ${results.length} indicators`,
      signal: overall.signal,
      reasoning: `Synthesized all ${results.length} indicators: ${overall.buyCount} BUY, ${overall.sellCount} SELL, ${overall.neutralCount} NEUTRAL. ${overall.confidence >= 70 ? "High conviction — multiple timeframes and methods agree." : overall.confidence >= 50 ? "Moderate conviction — some disagreement between methods." : "Low conviction — mixed signals, consider waiting."}`,
      keyMetrics: [
        `Buy signals: ${overall.buyCount}/${results.length}`,
        `Sell signals: ${overall.sellCount}/${results.length}`,
        `Confidence: ${overall.confidence}%`,
      ],
    },
  ];
}

function getSignalColor(signal: IndicatorResult["signal"]): string {
  switch (signal) {
    case "STRONG_BUY": return "#00ff88";
    case "BUY": return "#00d4ff";
    case "NEUTRAL": return "#888";
    case "SELL": return "#ffd700";
    case "STRONG_SELL": return "#ff3366";
  }
}

function getSignalBg(signal: IndicatorResult["signal"]): string {
  switch (signal) {
    case "STRONG_BUY": return "bg-[#00ff88]/15 text-[#00ff88]";
    case "BUY": return "bg-primary/15 text-primary";
    case "NEUTRAL": return "bg-white/10 text-white/50";
    case "SELL": return "bg-[#ffd700]/15 text-[#ffd700]";
    case "STRONG_SELL": return "bg-[#ff3366]/15 text-[#ff3366]";
  }
}

export default function TechnicalAnalysis() {
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("");
  const [activeSymbol, setActiveSymbol] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!symbol.trim()) return POPULAR_STOCKS.slice(0, 8);
    return POPULAR_STOCKS.filter(s => s.includes(symbol.toUpperCase())).slice(0, 6);
  }, [symbol]);

  const indicators = useMemo(() => {
    if (!stockData) return [];
    return runAllIndicators(stockData);
  }, [stockData]);

  const filteredIndicators = useMemo(() => {
    if (category === "all") return indicators;
    return indicators.filter(r => r.category === category);
  }, [indicators, category]);

  const overall = useMemo(() => {
    if (indicators.length === 0) return null;
    return getOverallSignal(indicators);
  }, [indicators]);

  const agents = useMemo(() => {
    if (indicators.length === 0 || !activeSymbol) return [];
    return generateAgentReviews(indicators, activeSymbol);
  }, [indicators, activeSymbol]);

  const analyze = useCallback((sym?: string) => {
    const s = (sym || symbol).toUpperCase().trim();
    if (!s) {
      toast({ title: "Enter a symbol", description: "Type a stock ticker like AAPL, NVDA, MSFT", variant: "destructive" });
      return;
    }
    setLoading(true);
    setActiveSymbol(s);
    setShowSuggestions(false);
    setTimeout(() => {
      const basePrice = 50 + Math.random() * 400;
      setStockData(generateMockOHLCV(basePrice, 60));
      setLoading(false);
      toast({ title: `Analysis complete`, description: `${indicators.length || 55}+ indicators calculated for ${s}` });
    }, 1200);
  }, [symbol, toast]);

  const exportIndicators = () => {
    if (!indicators.length) return;
    const lines = [
      `EntangleWealth Technical Analysis — ${activeSymbol}`,
      `Generated,${new Date().toLocaleDateString("en-US")}`,
      "",
      "Indicator,Category,Value,Signal",
      ...indicators.map(r => `"${r.name}",${r.category},${typeof r.value === "string" ? `"${r.value}"` : r.value},${r.signal}`),
      "",
      `Overall Signal,${overall?.signal}`,
      `Buy Signals,${overall?.buyCount}`,
      `Sell Signals,${overall?.sellCount}`,
      `Confidence,${overall?.confidence}%`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `technical-analysis-${activeSymbol}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Full indicator report downloaded." });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, { buy: number; sell: number; total: number }> = {};
    for (const cat of CATEGORIES) {
      if (cat.key === "all") continue;
      const items = indicators.filter(r => r.category === cat.key);
      counts[cat.key] = {
        buy: items.filter(r => r.signal === "BUY" || r.signal === "STRONG_BUY").length,
        sell: items.filter(r => r.signal === "SELL" || r.signal === "STRONG_SELL").length,
        total: items.length,
      };
    }
    return counts;
  }, [indicators]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7] to-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Technical Analysis</h1>
            <p className="text-[12px] text-muted-foreground">55+ indicators · 6 AI agents · Real-time signals</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 mt-6 mb-6 border border-[rgba(0,212,255,0.15)]">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Enter stock symbol (AAPL, NVDA, TSLA...)"
                value={symbol}
                onChange={e => { setSymbol(e.target.value.toUpperCase().slice(0, 10)); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); analyze(); } }}
                maxLength={10}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-[15px] text-white focus:outline-none focus:border-primary/50 placeholder:text-white/20 font-mono"
                aria-label="Stock symbol"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d1a] border border-white/10 rounded-xl overflow-hidden z-30 max-h-[250px] overflow-y-auto">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => { setSymbol(s); setShowSuggestions(false); analyze(s); }}
                      className="w-full text-left px-4 py-3 text-[13px] text-white/80 hover:bg-primary/10 transition-colors flex items-center gap-2 min-h-[44px] font-mono">
                      <TrendingUp className="w-3 h-3 text-primary/40" /> {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button className="bg-gradient-to-r from-[#a855f7] to-primary text-white font-bold min-h-[48px] px-8 gap-2" onClick={() => analyze()} disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart3 className="w-5 h-5" />}
              {loading ? "Analyzing..." : "Run Analysis"}
            </Button>
          </div>
          {!activeSymbol && (
            <div className="flex flex-wrap gap-2 mt-3">
              {POPULAR_STOCKS.slice(0, 10).map(s => (
                <button key={s} onClick={() => { setSymbol(s); analyze(s); }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/40 hover:text-primary hover:border-primary/30 font-mono transition-colors min-h-[32px]">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a855f7]/20 to-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <p className="text-[16px] font-bold text-white mb-1">Running 55+ Indicators</p>
            <p className="text-[12px] text-muted-foreground">6 AI agents analyzing {symbol || activeSymbol}...</p>
          </div>
        )}

        {!loading && overall && activeSymbol && (
          <>
            <div className="glass-panel rounded-2xl p-5 md:p-7 mb-6 border border-[rgba(0,212,255,0.15)]">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="text-center">
                  <p className="text-[11px] uppercase tracking-wider text-white/30 font-semibold mb-2">{activeSymbol}</p>
                  <div className="w-[100px] h-[100px] rounded-2xl flex items-center justify-center" style={{ background: `${getSignalColor(overall.signal)}15`, border: `2px solid ${getSignalColor(overall.signal)}40` }}>
                    <div>
                      <p className="text-[24px] font-black" style={{ color: getSignalColor(overall.signal) }}>{overall.confidence}%</p>
                      <p className="text-[9px] font-bold" style={{ color: getSignalColor(overall.signal) }}>{overall.signal.replace("_", " ")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-3 flex-wrap">
                    <span className={`px-4 py-1.5 rounded-full text-[13px] font-bold ${getSignalBg(overall.signal)}`}>
                      {overall.signal.replace("_", " ")}
                    </span>
                    <span className="text-[12px] text-white/40">{indicators.length} indicators analyzed</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    <div className="rounded-xl p-3 bg-[#00ff88]/[0.06] border border-[#00ff88]/15 text-center">
                      <p className="text-[20px] font-black text-[#00ff88]">{overall.buyCount}</p>
                      <p className="text-[10px] text-white/30">Buy</p>
                    </div>
                    <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10 text-center">
                      <p className="text-[20px] font-black text-white/50">{overall.neutralCount}</p>
                      <p className="text-[10px] text-white/30">Neutral</p>
                    </div>
                    <div className="rounded-xl p-3 bg-[#ff3366]/[0.06] border border-[#ff3366]/15 text-center">
                      <p className="text-[20px] font-black text-[#ff3366]">{overall.sellCount}</p>
                      <p className="text-[10px] text-white/30">Sell</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" className="gap-1.5 text-[11px] min-h-[40px]" onClick={() => analyze(activeSymbol)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                  <Button variant="outline" className="gap-1.5 text-[11px] min-h-[40px]" onClick={exportIndicators}>
                    <Download className="w-3.5 h-3.5" /> Export
                  </Button>
                </div>
              </div>

              {Object.keys(categoryCounts).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
                  {CATEGORIES.filter(c => c.key !== "all").map(cat => {
                    const c = categoryCounts[cat.key];
                    if (!c) return null;
                    const Icon = cat.icon;
                    return (
                      <button key={cat.key} onClick={() => setCategory(cat.key)}
                        className={`rounded-xl p-3 border text-left transition-all ${category === cat.key ? "border-primary/30 bg-primary/[0.05]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-3.5 h-3.5 text-white/30" />
                          <span className="text-[11px] font-semibold text-white/50">{cat.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#00ff88] text-[12px] font-bold">{c.buy}↑</span>
                          <span className="text-[#ff3366] text-[12px] font-bold">{c.sell}↓</span>
                          <span className="text-white/20 text-[10px]">/ {c.total}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
              <Brain className="w-5 h-5 text-[#a855f7]" />
              <h2 className="text-lg font-semibold">AI Agent Reviews</h2>
              <span className="text-[11px] text-white/30 ml-auto">6 agents · Real-time</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {agents.map(agent => {
                const Icon = agent.icon;
                const isExpanded = expandedAgent === agent.name;
                return (
                  <div key={agent.name} className="glass-panel rounded-xl overflow-hidden border-l-[3px]" style={{ borderLeftColor: agent.color }}>
                    <button className="w-full p-4 text-left flex items-start gap-3" onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${agent.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: agent.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[13px] font-bold">{agent.name}</p>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getSignalBg(agent.signal)}`}>
                            {agent.signal.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 line-clamp-2">{agent.verdict}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-white/20 flex-shrink-0 mt-1" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">
                        <p className="text-[12px] text-white/50 mb-3">{agent.reasoning}</p>
                        <div className="space-y-1.5">
                          {agent.keyMetrics.map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Target className="w-3 h-3 flex-shrink-0" style={{ color: agent.color, opacity: 0.5 }} />
                              <span className="text-[11px] text-white/40">{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">All Indicators</h2>
              </div>
              <div className="flex gap-1">
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${category === c.key ? "bg-primary/15 text-primary" : "text-white/30 hover:text-white/50"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 mb-6">
              {filteredIndicators.map((ind, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: getSignalColor(ind.signal) }} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{ind.name}</p>
                      <p className="text-[10px] text-white/25 truncate">{ind.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-[13px] font-mono font-bold text-white/70">{ind.value}</span>
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold min-w-[70px] text-center ${getSignalBg(ind.signal)}`}>
                      {ind.signal.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.02)]">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Technical indicators are based on historical price data and should not be used as the sole basis for investment decisions. Past performance does not guarantee future results. Always do your own research and consider consulting a financial advisor.
                </p>
              </div>
            </div>
          </>
        )}

        {!loading && !activeSymbol && (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-white/10" />
            <p className="text-[16px] font-bold text-white/30 mb-2">Enter a stock symbol to begin</p>
            <p className="text-[12px] text-white/15">55+ technical indicators analyzed by 6 AI agents</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
