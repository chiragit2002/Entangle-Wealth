import { useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { trackEvent } from "@/lib/trackEvent";
import { JourneyBridgeCard } from "@/components/journey/JourneyBridgeCard";
import { useJourney } from "@/hooks/useJourney";
import { Layout } from "@/components/layout/Layout";
import { fetchAlpacaBars, type AlpacaBar } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Clock, TrendingUp, TrendingDown, DollarSign, Calendar,
  ArrowRight, Zap, AlertTriangle, Trophy, Skull,
} from "lucide-react";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { showBacktestXpToast, showBadgeUnlockToast } from "@/components/BloombergToast";

interface TimeMachineResult {
  symbol: string;
  startDate: string;
  investAmount: number;
  startPrice: number;
  endPrice: number;
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownDate: string;
  bestDay: { date: string; pct: number };
  worstDay: { date: string; pct: number };
  sharesOwned: number;
  currentValue: number;
  tradingDays: number;
  journeyData: { date: string; value: number }[];
}

function computeResult(
  symbol: string, startDate: string, investAmount: number, bars: AlpacaBar[]
): TimeMachineResult {
  const startPrice = bars[0].o;
  const endPrice = bars[bars.length - 1].c;
  const sharesOwned = investAmount / startPrice;
  const currentValue = sharesOwned * endPrice;
  const totalReturn = currentValue - investAmount;
  const totalReturnPct = ((endPrice - startPrice) / startPrice) * 100;

  const startMs = new Date(bars[0].t).getTime();
  const endMs = new Date(bars[bars.length - 1].t).getTime();
  const years = Math.max((endMs - startMs) / (365.25 * 24 * 60 * 60 * 1000), 0.01);
  const annualizedReturn = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;

  let peak = bars[0].c;
  let maxDrawdown = 0;
  let maxDrawdownDate = "";
  let bestDay = { date: "", pct: -Infinity };
  let worstDay = { date: "", pct: Infinity };
  const journeyData: { date: string; value: number }[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const val = sharesOwned * bar.c;
    const dateStr = bar.t.split("T")[0];
    journeyData.push({ date: dateStr, value: Math.round(val * 100) / 100 });

    if (bar.c > peak) peak = bar.c;
    const dd = ((bar.c - peak) / peak) * 100;
    if (dd < maxDrawdown) { maxDrawdown = dd; maxDrawdownDate = dateStr; }

    if (i > 0) {
      const dayReturn = ((bar.c - bars[i - 1].c) / bars[i - 1].c) * 100;
      if (dayReturn > bestDay.pct) bestDay = { date: dateStr, pct: dayReturn };
      if (dayReturn < worstDay.pct) worstDay = { date: dateStr, pct: dayReturn };
    }
  }

  return {
    symbol, startDate, investAmount, startPrice, endPrice, totalReturn,
    totalReturnPct, annualizedReturn, maxDrawdown, maxDrawdownDate,
    bestDay, worstDay, sharesOwned, currentValue, tradingDays: bars.length, journeyData,
  };
}

function JourneyChart({ data, investAmount }: { data: { date: string; value: number }[]; investAmount: number }) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;
  const w = 800, h = 300;
  const pad = { top: 20, right: 20, bottom: 40, left: 70 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const points = data.map((d, i) => {
    const x = pad.left + (i / (data.length - 1)) * plotW;
    const y = pad.top + plotH - ((d.value - minVal) / range) * plotH;
    return `${x},${y}`;
  });

  const investY = pad.top + plotH - ((investAmount - minVal) / range) * plotH;
  const lastPoint = data[data.length - 1];
  const isProfit = lastPoint.value >= investAmount;
  const areaPoints = points.join(" ") + ` ${pad.left + plotW},${pad.top + plotH} ${pad.left},${pad.top + plotH}`;

  const yTicks = 5;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const val = minVal + (range / yTicks) * i;
    const y = pad.top + plotH - (i / yTicks) * plotH;
    return { val, y };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-4xl mx-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="journey-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isProfit ? "#00B4D8" : "#ff4466"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isProfit ? "#00B4D8" : "#ff4466"} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yLines.map((tick, i) => (
          <g key={i}>
            <line x1={pad.left} y1={tick.y} x2={pad.left + plotW} y2={tick.y} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 8} y={tick.y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="JetBrains Mono">
              ${tick.val >= 1000 ? `${(tick.val / 1000).toFixed(1)}k` : tick.val.toFixed(0)}
            </text>
          </g>
        ))}
        <line x1={pad.left} y1={investY} x2={pad.left + plotW} y2={investY}
          stroke="rgba(0,180,216,0.3)" strokeDasharray="6,4" strokeWidth="1" />
        <text x={pad.left + plotW + 4} y={investY + 4} fill="rgba(0,180,216,0.5)" fontSize="9" fontFamily="JetBrains Mono">
          Invested
        </text>
        <polygon points={areaPoints} fill="url(#journey-grad)" />
        <polyline points={points.join(" ")} fill="none" stroke={isProfit ? "#00B4D8" : "#ff4466"} strokeWidth="2" />
        <text x={pad.left} y={h - 5} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="JetBrains Mono">{data[0].date}</text>
        <text x={pad.left + plotW} y={h - 5} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="JetBrains Mono">{lastPoint.date}</text>
      </svg>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="mobile-card flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
        <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
      </div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const PRESETS = [
  { symbol: "NVDA", date: "2020-01-02", label: "NVDA Jan 2020" },
  { symbol: "AAPL", date: "2019-01-02", label: "AAPL Jan 2019" },
  { symbol: "TSLA", date: "2020-06-01", label: "TSLA Jun 2020" },
  { symbol: "AMD", date: "2020-03-23", label: "AMD COVID Bottom" },
  { symbol: "META", date: "2022-11-01", label: "META Nov 2022" },
  { symbol: "MSFT", date: "2020-03-23", label: "MSFT COVID Bottom" },
];

export default function TimeMachine() {
  const { isSignedIn, getToken } = useAuth();
  const { onEvent } = useJourney();
  const [symbol, setSymbol] = useState("NVDA");
  const [startDate, setStartDate] = useState("2020-01-02");
  const [amount, setAmount] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimeMachineResult | null>(null);
  const [error, setError] = useState("");

  const awardBacktestXp = useCallback(async (computed: TimeMachineResult) => {
    if (!isSignedIn) return;
    try {
      const { totalReturnPct, annualizedReturn } = computed;
      let reason = "backtest_run";
      if (totalReturnPct >= 1000) reason = "10x_bagger";
      else if (totalReturnPct > 0) reason = "winning_backtest";

      const res = await authFetch("/gamification/xp", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "backtesting",
          reason,
          metrics: { totalReturnPct, annualizedReturn },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.xpEarned > 0) {
          showBacktestXpToast(data.xpEarned);
        }
        if (data.newBadges?.length > 0) {
          for (const badge of data.newBadges) {
            setTimeout(() => showBadgeUnlockToast(badge), 600);
          }
        }
      }
    } catch {
      // silent — XP award failure should not block UI
    }
  }, [isSignedIn, getToken]);

  const run = useCallback(async (sym?: string, date?: string, amt?: string) => {
    const s = (sym || symbol).toUpperCase();
    const d = date || startDate;
    const a = parseFloat(amt || amount);
    if (!s || !d || isNaN(a) || a <= 0) {
      setError("Enter a valid symbol, date, and amount");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await fetchAlpacaBars(s, { timeframe: "1Day", limit: 1000, start: d });
      if (!data.bars || data.bars.length < 2) {
        setError(`No data found for ${s} from ${d}. Try a different date or symbol.`);
        setLoading(false);
        return;
      }
      trackEvent("time_machine_run", { symbol: s });
      const computed = computeResult(s, d, a, data.bars);
      setResult(computed);
      awardBacktestXp(computed);
      onEvent("time_machine_run");
    } catch {
      setError("Failed to fetch data. Check your symbol and try again.");
    } finally {
      setLoading(false);
    }
  }, [symbol, startDate, amount, awardBacktestXp]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl pb-20">
        <div className="mb-6">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight">
            <span className="electric-text">What If</span> Time Machine
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real market data. Real results.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">Stock Symbol</label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="NVDA" className="font-mono bg-muted/50 border-border" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="font-mono bg-muted/50 border-border" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1 block">Investment Amount</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" className="font-mono bg-muted/50 border-border" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => run()} disabled={loading} className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {loading ? (
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Computing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Travel Back</span>
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] text-muted-foreground py-1">Quick picks:</span>
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => { setSymbol(p.symbol); setStartDate(p.date); run(p.symbol, p.date, amount); }}
                className="text-[10px] px-2.5 py-1 rounded-full bg-muted/50 border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                {p.label}
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
            <div className="glass-panel rounded-xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                <div>
                  <h2 className="text-xl font-black"><span className="font-mono text-primary">{result.symbol}</span> Investment Journey</h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" /> {result.startDate} <ArrowRight className="w-3 h-3" />
                    {result.journeyData[result.journeyData.length - 1]?.date || "Today"}
                    <span>·</span><span>{result.tradingDays} trading days</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black font-mono ${result.totalReturn >= 0 ? "text-[#00B4D8]" : "text-[#ff4466]"}`}>
                    ${result.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className={`text-xs font-bold ${result.totalReturn >= 0 ? "text-[#00B4D8]" : "text-[#ff4466]"}`}>
                    {result.totalReturn >= 0 ? "+" : ""}${Math.abs(result.totalReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    {" "}({result.totalReturnPct >= 0 ? "+" : ""}{Math.abs(result.totalReturnPct).toFixed(1)}%)
                  </div>
                </div>
              </div>
              <JourneyChart data={result.journeyData} investAmount={result.investAmount} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Invested" value={`$${result.investAmount.toLocaleString()}`}
                sub={`${result.sharesOwned.toFixed(4)} shares @ $${result.startPrice.toFixed(2)}`} color="text-[#00B4D8]" />
              <StatCard icon={result.totalReturn >= 0 ? TrendingUp : TrendingDown} label="Current Value"
                value={`$${result.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                sub={`@ $${result.endPrice.toFixed(2)} per share`}
                color={result.totalReturn >= 0 ? "text-[#00B4D8]" : "text-[#ff4466]"} />
              <StatCard icon={Zap} label="Annualized" value={`${result.annualizedReturn >= 0 ? "+" : ""}${Math.abs(result.annualizedReturn).toFixed(1)}%`}
                sub="Compound annual growth" color={result.annualizedReturn >= 0 ? "text-[#00B4D8]" : "text-[#ff4466]"} />
              <StatCard icon={AlertTriangle} label="Max Drawdown" value={`${Math.abs(result.maxDrawdown).toFixed(1)}%`}
                sub={result.maxDrawdownDate || "N/A"} color="text-[#ff4466]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="mobile-card-glow">
                <div className="flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-[#00B4D8]" /><span className="text-xs font-bold text-[#00B4D8]">Best Day</span></div>
                <div className="font-mono text-lg font-bold text-[#00B4D8]">+{result.bestDay.pct.toFixed(2)}%</div>
                <div className="text-[10px] text-muted-foreground">{result.bestDay.date}</div>
              </div>
              <div className="mobile-card" style={{ borderColor: "rgba(255,68,102,0.12)" }}>
                <div className="flex items-center gap-2 mb-2"><Skull className="w-4 h-4 text-[#ff4466]" /><span className="text-xs font-bold text-[#ff4466]">Worst Day</span></div>
                <div className="font-mono text-lg font-bold text-[#ff4466]">{result.worstDay.pct.toFixed(2)}%</div>
                <div className="text-[10px] text-muted-foreground">{result.worstDay.date}</div>
              </div>
            </div>

            <JourneyBridgeCard
              title="Apply these insights to your live strategy"
              desc={`You've seen what ${result.symbol} did historically. Now project forward — use WealthSim to model what consistent investing looks like over your time horizon.`}
              href="/wealth-sim"
              phaseColor="#0099cc"
              cta="Open WealthSim →"
            />
          </div>
        )}

        {!result && !loading && !error && (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground mb-2">Travel Back in Time</h3>
            <p className="text-sm text-muted-foreground/60 max-w-md mx-auto">
              Pick a stock, choose a date, enter an amount, and see exactly what your investment would be worth today | powered by real historical market data.
            </p>
          </div>
        )}
      </div>
      <FinancialDisclaimerBanner pageKey="time-machine" />
    </Layout>
  );
}
