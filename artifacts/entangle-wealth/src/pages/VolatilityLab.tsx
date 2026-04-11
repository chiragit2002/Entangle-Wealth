import { useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { fetchAlpacaBars, type AlpacaBar } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Activity, TrendingUp, TrendingDown, Zap, BarChart3,
  AlertTriangle, Shield, Target,
} from "lucide-react";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";

interface VolResult {
  symbol: string;
  currentPrice: number;
  vol1W: number;
  vol1M: number;
  vol3M: number;
  vol6M: number;
  vol1Y: number;
  volTermStructure: { period: string; vol: number }[];
  regime: "low" | "normal" | "elevated" | "extreme";
  regimeLabel: string;
  dailyReturns: number[];
  avgDailyReturn: number;
  maxDailyGain: number;
  maxDailyLoss: number;
  sharpeProxy: number;
  sortino: number;
  calmar: number;
  maxDrawdown: number;
  returnDistribution: { bucket: string; count: number }[];
}

function computeVol(bars: AlpacaBar[], window: number): number {
  if (bars.length < window + 1) return 0;
  const recent = bars.slice(-(window + 1));
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push(Math.log(recent[i].c / recent[i - 1].c));
  }
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function computeResult(symbol: string, bars: AlpacaBar[]): VolResult {
  const currentPrice = bars.length > 0 ? bars[bars.length - 1].c : 0;
  const vol1W = computeVol(bars, 5);
  const vol1M = computeVol(bars, 21);
  const vol3M = computeVol(bars, 63);
  const vol6M = computeVol(bars, 126);
  const vol1Y = computeVol(bars, Math.min(252, bars.length - 1));

  const volTermStructure = [
    { period: "1W", vol: vol1W }, { period: "1M", vol: vol1M },
    { period: "3M", vol: vol3M }, { period: "6M", vol: vol6M }, { period: "1Y", vol: vol1Y },
  ];

  const regime: "low" | "normal" | "elevated" | "extreme" =
    vol1M < 15 ? "low" : vol1M < 25 ? "normal" : vol1M < 40 ? "elevated" : "extreme";
  const regimeLabels = { low: "Low Volatility", normal: "Normal", elevated: "Elevated", extreme: "Extreme" };

  const dailyReturns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    dailyReturns.push(((bars[i].c - bars[i - 1].c) / bars[i - 1].c) * 100);
  }
  const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const maxDailyGain = dailyReturns.length > 0 ? Math.max(...dailyReturns) : 0;
  const maxDailyLoss = dailyReturns.length > 0 ? Math.min(...dailyReturns) : 0;

  const annReturn = avgDailyReturn * 252;
  const annVol = vol1Y || vol1M || 1;
  const sharpeProxy = annVol > 0 ? (annReturn - 5) / annVol : 0;

  const downside = dailyReturns.filter((r) => r < 0);
  const downsideVar = downside.length > 1
    ? Math.sqrt(downside.reduce((a, b) => a + b ** 2, 0) / downside.length) * Math.sqrt(252) : 1;
  const sortino = downsideVar > 0 ? (annReturn - 5) / downsideVar : 0;

  let peak = bars[0]?.c || 0;
  let maxDrawdown = 0;
  for (const bar of bars) {
    if (bar.c > peak) peak = bar.c;
    const dd = ((bar.c - peak) / peak) * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }
  const calmar = maxDrawdown < 0 ? annReturn / Math.abs(maxDrawdown) : 0;

  const bucketDefs = [
    { label: "<-5", test: (r: number) => r <= -5 },
    { label: "-4", test: (r: number) => r > -5 && r <= -4 },
    { label: "-3", test: (r: number) => r > -4 && r <= -3 },
    { label: "-2", test: (r: number) => r > -3 && r <= -2 },
    { label: "-1", test: (r: number) => r > -2 && r <= -1 },
    { label: "0", test: (r: number) => r > -1 && r <= 0 },
    { label: "+1", test: (r: number) => r > 0 && r <= 1 },
    { label: "+2", test: (r: number) => r > 1 && r <= 2 },
    { label: "+3", test: (r: number) => r > 2 && r <= 3 },
    { label: "+4", test: (r: number) => r > 3 && r <= 5 },
    { label: ">+5", test: (r: number) => r > 5 },
  ];
  const returnDistribution = bucketDefs.map((b) => ({
    bucket: b.label,
    count: dailyReturns.filter(b.test).length,
  }));

  return {
    symbol, currentPrice, vol1W, vol1M, vol3M, vol6M, vol1Y,
    volTermStructure, regime, regimeLabel: regimeLabels[regime],
    dailyReturns, avgDailyReturn, maxDailyGain, maxDailyLoss,
    sharpeProxy, sortino, calmar, maxDrawdown, returnDistribution,
  };
}

function TermStructureChart({ data }: { data: { period: string; vol: number }[] }) {
  const maxVol = Math.max(...data.map((d) => d.vol), 1);
  const h = 200;
  const barW = 50;
  const gap = 25;
  const totalW = data.length * (barW + gap) + 40;

  return (
    <svg viewBox={`0 0 ${totalW} ${h + 40}`} className="w-full max-w-lg mx-auto">
      {data.map((d, i) => {
        const x = 20 + i * (barW + gap);
        const barH = (d.vol / maxVol) * (h - 20);
        const y = h - barH;
        const color = d.vol < 15 ? "#00e676" : d.vol < 25 ? "#00c8f8" : d.vol < 40 ? "#f5c842" : "#ff4466";
        return (
          <g key={d.period}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={color} opacity="0.3" />
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill="none" stroke={color} strokeWidth="1.5" />
            <text x={x + barW / 2} y={y - 8} textAnchor="middle" fill={color} fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
              {d.vol.toFixed(1)}%
            </text>
            <text x={x + barW / 2} y={h + 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="JetBrains Mono">
              {d.period}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DistributionChart({ data }: { data: { bucket: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const h = 140;
  const barW = 28;
  const gap = 5;
  const totalW = data.length * (barW + gap) + 40;

  return (
    <svg viewBox={`0 0 ${totalW} ${h + 30}`} className="w-full max-w-lg mx-auto">
      {data.map((d, i) => {
        const x = 20 + i * (barW + gap);
        const barH = (d.count / maxCount) * (h - 10);
        const y = h - barH;
        const isNeg = d.bucket.startsWith("-") || d.bucket.startsWith("<");
        const isPos = d.bucket.startsWith("+") || d.bucket.startsWith(">");
        const color = isNeg ? "#ff4466" : isPos ? "#00e676" : "#5a5a7a";
        return (
          <g key={d.bucket}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)} rx="3" fill={color} opacity="0.4" />
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="JetBrains Mono">{d.count}</text>
            )}
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="JetBrains Mono">{d.bucket}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function VolGauge({ vol, label }: { vol: number; label: string }) {
  const color = vol < 15 ? "#00e676" : vol < 25 ? "#00c8f8" : vol < 40 ? "#f5c842" : "#ff4466";
  return (
    <div className="mobile-card text-center">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</div>
      <div className="font-mono text-xl font-bold" style={{ color }}>{vol.toFixed(1)}%</div>
      <div className="h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(vol / 60 * 100, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

const POPULAR = ["NVDA", "AAPL", "TSLA", "AMD", "META", "AMZN", "GOOGL", "MSFT"];

export default function VolatilityLab() {
  const [symbol, setSymbol] = useState("NVDA");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VolResult | null>(null);
  const [error, setError] = useState("");

  const analyze = useCallback(async (sym?: string) => {
    const s = (sym || symbol).toUpperCase();
    if (!s) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const startDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const data = await fetchAlpacaBars(s, { timeframe: "1Day", limit: 1000, start: startDate });
      if (!data.bars || data.bars.length < 10) {
        setError(`Not enough data for ${s}. Try a different symbol.`);
        setLoading(false);
        return;
      }
      setResult(computeResult(s, data.bars));
    } catch {
      setError("Failed to fetch data. Check symbol and try again.");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const regimeColor =
    result?.regime === "low" ? "text-[#00e676]" :
    result?.regime === "normal" ? "text-[#00c8f8]" :
    result?.regime === "elevated" ? "text-[#f5c842]" : "text-[#ff4466]";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl pb-20">
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight">
            Volatility <span className="electric-text">Lab</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Multi-timeframe realized volatility analysis · Institutional-grade risk metrics
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4 md:p-6 mb-6">
          <div className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">Symbol</label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="NVDA"
                className="font-mono bg-black/50 border-white/10" onKeyDown={(e) => e.key === "Enter" && analyze()} />
            </div>
            <Button onClick={() => analyze()} disabled={loading} className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6">
              {loading ? <Activity className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" /> Analyze</>}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((s) => (
              <button key={s} onClick={() => { setSymbol(s); analyze(s); }}
                className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors font-mono">
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="glass-panel rounded-xl p-4 mb-6 border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 text-sm"><AlertTriangle className="w-4 h-4" /> {error}</div>
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-mono text-2xl font-black text-primary">{result.symbol}</span>
                <span className="text-muted-foreground ml-2">@ ${result.currentPrice.toFixed(2)}</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                result.regime === "low" ? "bg-[rgba(0,230,118,0.1)]" :
                result.regime === "normal" ? "bg-[rgba(0,200,248,0.1)]" :
                result.regime === "elevated" ? "bg-[rgba(245,200,66,0.1)]" : "bg-[rgba(255,68,102,0.1)]"
              }`}>
                <Activity className={`w-4 h-4 ${regimeColor}`} />
                <span className={`text-sm font-bold ${regimeColor}`}>{result.regimeLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {result.volTermStructure.map((v) => <VolGauge key={v.period} vol={v.vol} label={v.period} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel rounded-xl p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Volatility Term Structure</h3>
                <TermStructureChart data={result.volTermStructure} />
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  {result.vol1W > result.vol1Y
                    ? "Short-term vol > long-term: Market stress / event driven"
                    : "Short-term vol < long-term: Calm / mean-reverting conditions"}
                </p>
              </div>
              <div className="glass-panel rounded-xl p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Return Distribution</h3>
                <DistributionChart data={result.returnDistribution} />
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  Daily return frequency · {result.dailyReturns.length} trading days
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="mobile-card">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                  <Shield className="w-3 h-3 text-primary" /> Sharpe Ratio
                </div>
                <div className={`font-mono text-lg font-bold ${result.sharpeProxy > 0 ? "text-[#00e676]" : "text-[#ff4466]"}`}>
                  {result.sharpeProxy.toFixed(2)}
                </div>
                <div className="text-[9px] text-muted-foreground">Risk-adj return (5% rf)</div>
              </div>
              <div className="mobile-card">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                  <Target className="w-3 h-3 text-[#f5c842]" /> Sortino
                </div>
                <div className={`font-mono text-lg font-bold ${result.sortino > 0 ? "text-[#00e676]" : "text-[#ff4466]"}`}>
                  {result.sortino.toFixed(2)}
                </div>
                <div className="text-[9px] text-muted-foreground">Downside risk ratio</div>
              </div>
              <div className="mobile-card">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                  <TrendingUp className="w-3 h-3 text-[#00e676]" /> Best Day
                </div>
                <div className="font-mono text-lg font-bold text-[#00e676]">+{result.maxDailyGain.toFixed(2)}%</div>
              </div>
              <div className="mobile-card">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                  <TrendingDown className="w-3 h-3 text-[#ff4466]" /> Worst Day
                </div>
                <div className="font-mono text-lg font-bold text-[#ff4466]">{result.maxDailyLoss.toFixed(2)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="mobile-card">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-3 h-3 text-[#ff4466]" /> Max Drawdown
                </div>
                <div className="font-mono text-lg font-bold text-[#ff4466]">{result.maxDrawdown.toFixed(1)}%</div>
                <div className="text-[9px] text-muted-foreground">Peak-to-trough decline</div>
              </div>
              <div className="mobile-card">
                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-wider mb-1">
                  <BarChart3 className="w-3 h-3 text-[#00c8f8]" /> Calmar Ratio
                </div>
                <div className={`font-mono text-lg font-bold ${result.calmar > 0 ? "text-[#00e676]" : "text-[#ff4466]"}`}>
                  {result.calmar.toFixed(2)}
                </div>
                <div className="text-[9px] text-muted-foreground">Return / max drawdown</div>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="text-center py-16">
            <Activity className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground mb-2">Volatility Analysis</h3>
            <p className="text-sm text-muted-foreground/60 max-w-md mx-auto">
              Enter a stock symbol to see its multi-timeframe volatility surface, return distribution, and institutional-grade risk metrics like Sharpe, Sortino, and Calmar ratios.
            </p>
          </div>
        )}
      </div>
      <FinancialDisclaimerBanner pageKey="volatility" />
    </Layout>
  );
}
