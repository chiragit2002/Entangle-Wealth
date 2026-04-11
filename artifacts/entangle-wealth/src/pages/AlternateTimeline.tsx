import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceArea,
} from "recharts";
import {
  GitBranch, Save, Trash2, RefreshCw, BookmarkCheck,
  TrendingUp, AlertTriangle, Star, Zap, Shield, Target,
  ChevronDown, ChevronUp, Info, CheckCircle2,
  ArrowRight, Flame, Compass, Clock, Layers, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { useAuth } from "@clerk/react";

const API_BASE = "/api";

interface HorizonResult {
  horizon: string;
  months: number;
  projectedNetWorth: number;
  savingsAccumulated: number;
  debtRemaining: number;
  investmentValue: number;
  stabilityScore: number;
  stressIndex: number;
  opportunityScore: number;
  milestones: string[];
}

interface SimResult {
  params: TimelineParams;
  results: HorizonResult[];
  simulatedAt: string;
}

interface TimelineParams {
  monthlyIncome: number;
  savingsRate: number;
  monthlyDebt: number;
  investmentRate: number;
  currentNetWorth: number;
  emergencyFundMonths: number;
}

interface SavedTimeline {
  id: number;
  name: string;
  annotation?: string;
  isBaseline: boolean;
  monthlyIncome: number;
  savingsRate: number;
  monthlyDebt: number;
  investmentRate: number;
  currentNetWorth: number;
  emergencyFundMonths: number;
  createdAt: string;
  results: HorizonResult[];
}

interface DeltaRow {
  horizon: string;
  deltaNetWorth: number;
  deltaStress: number;
  deltaOpportunity: number;
  deltaStability: number;
  deltaSavings: number;
  deltaDebt: number;
}

interface CompareResult {
  resultsA: HorizonResult[];
  resultsB: HorizonResult[];
  deltas: DeltaRow[];
  summary: {
    deltaNetWorth5yr: number;
    deltaNetWorth10yr: number;
    deltaNetWorth20yr: number;
    deltaStress: number;
    deltaOpportunity: number;
  };
}

const STAGES = ["Aware", "Experimenting", "Building", "Strategic"] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<Stage, string> = {
  Aware: "text-blue-400",
  Experimenting: "text-amber-400",
  Building: "text-emerald-400",
  Strategic: "text-purple-400",
};

const STAGE_DESCS: Record<Stage, string> = {
  Aware: "You're exploring your financial future — great first step.",
  Experimenting: "Testing different scenarios to find what works for you.",
  Building: "Actively building better financial habits through comparison.",
  Strategic: "You think in systems. Multiple timelines, deliberate choices.",
};

const DISPLAY_HORIZONS = ["30d", "90d", "180d", "1yr", "5yr", "10yr", "20yr"];

function fmt(n: number, decimals = 0): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(decimals === 0 ? 0 : 1)}k`;
  return `$${n.toFixed(decimals)}`;
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const from = startRef.current;
    const to = value;
    if (from === to) return;
    const duration = 600;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;

    const step = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplayed(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        startRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  const abs = Math.abs(displayed);
  const sign = displayed < 0 ? "-" : "";
  const formatted = abs >= 1_000_000
    ? `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M${suffix}`
    : abs >= 1_000
    ? `${sign}${prefix}${(abs / 1_000).toFixed(0)}k${suffix}`
    : `${sign}${prefix}${abs.toFixed(0)}${suffix}`;

  return <>{formatted}</>;
}

function GaugeBar({
  value, label, color, ariaLabel,
}: {
  value: number; label: string; color: string; ariaLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/50 uppercase tracking-wider font-mono">{label}</span>
        <span className={`font-mono font-bold ${color}`}>{value.toFixed(0)}</span>
      </div>
      <div
        className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || label}
      >
        <motion.div
          className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function getExperienceLabel(result: HorizonResult, monthlyIncome: number): string | null {
  const nw = result.projectedNetWorth;
  const savings = result.savingsAccumulated;
  const monthlyExpense = monthlyIncome * 0.7;
  const months = result.months;

  if (nw <= 0) return null;
  if (months <= 6) {
    const coveredMonths = Math.floor(savings / Math.max(1, monthlyExpense));
    if (coveredMonths >= 3) return `${coveredMonths} months of expenses covered`;
    return null;
  }
  if (months <= 12) {
    if (result.debtRemaining < 100) return "Debt-free window approaching";
    if (savings > monthlyIncome * 6) return "Strong 6-month runway built";
    return null;
  }
  if (months <= 60) {
    if (nw > 80_000) return "Ready for a home down payment";
    if (nw > 40_000) return "Career transition buffer ready";
    if (nw > 20_000) return "Emergency cushion secured";
    return null;
  }
  if (months <= 120) {
    if (nw > 300_000) return "Financial independence in reach";
    if (nw > 150_000) return "Ready for major life investments";
    if (nw > 50_000) return "Solid mid-career foundation";
    return null;
  }
  if (nw > 1_000_000) return "Retirement-ready wealth built";
  if (nw > 500_000) return "20+ years of retirement runway";
  if (nw > 200_000) return "Meaningful generational head start";
  return null;
}

interface PaneProps {
  label: string;
  borderColor: string;
  params: TimelineParams;
  onParam: (key: keyof TimelineParams, val: number) => void;
  result: SimResult | null;
  selectedHorizon: string;
  isExploration?: boolean;
  isAmber?: boolean;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

function TimelinePane({
  label, borderColor, params, onParam, result, selectedHorizon, isExploration, isAmber,
}: PaneProps) {
  const horizonResult = result?.results.find(r => r.horizon === selectedHorizon);
  const expLabel = horizonResult ? getExperienceLabel(horizonResult, params.monthlyIncome) : null;
  const paneSlug = slugify(label);

  const paneBg = isAmber
    ? "rgba(20,14,2,0.92)"
    : "rgba(8,8,20,0.85)";
  const borderStyle = isAmber && isExploration
    ? "rgba(251,191,36,0.35)"
    : borderColor;

  const sliders: Array<{
    key: keyof TimelineParams;
    label: string;
    min: number;
    max: number;
    step: number;
    display: string;
    ariaLabel: string;
  }> = [
    { key: "monthlyIncome", label: "Monthly Income", min: 1000, max: 50000, step: 250, display: `${fmt(params.monthlyIncome)}/mo`, ariaLabel: "Monthly income slider" },
    { key: "savingsRate", label: "Savings Rate", min: 0, max: 0.8, step: 0.01, display: `${(params.savingsRate * 100).toFixed(0)}%`, ariaLabel: "Savings rate slider" },
    { key: "monthlyDebt", label: "Monthly Debt Payments", min: 0, max: 5000, step: 50, display: `${fmt(params.monthlyDebt)}/mo`, ariaLabel: "Monthly debt payments slider" },
    { key: "investmentRate", label: "Investment Return Rate", min: 0.02, max: 0.25, step: 0.005, display: `${(params.investmentRate * 100).toFixed(1)}%/yr`, ariaLabel: "Investment return rate slider" },
    { key: "currentNetWorth", label: "Current Net Worth", min: -50000, max: 500000, step: 1000, display: fmt(params.currentNetWorth), ariaLabel: "Current net worth slider" },
    { key: "emergencyFundMonths", label: "Emergency Fund", min: 0, max: 12, step: 0.5, display: `${params.emergencyFundMonths.toFixed(0)} months saved`, ariaLabel: "Emergency fund months slider" },
  ];

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-4 flex-1 min-w-0"
      style={{
        background: paneBg,
        border: `1px solid ${borderStyle}`,
        boxShadow: `0 0 40px ${borderStyle}20`,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} />
        <span className="font-bold text-sm tracking-wide" style={{ color: borderColor }}>{label}</span>
        {isExploration && (
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold uppercase tracking-wider ml-auto">
            Exploration Mode
          </span>
        )}
      </div>

      <div className="space-y-4">
        {sliders.map(s => (
          <div key={s.key}>
            <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
              <label htmlFor={`${paneSlug}-${s.key}`}>{s.label}</label>
              <span className="text-white/80 font-bold">{s.display}</span>
            </div>
            <Slider
              id={`${paneSlug}-${s.key}`}
              min={s.min}
              max={s.max}
              step={s.step}
              value={[params[s.key] as number]}
              onValueChange={([v]) => onParam(s.key, v)}
              aria-label={s.ariaLabel}
              aria-valuemin={s.min}
              aria-valuemax={s.max}
              aria-valuenow={params[s.key] as number}
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {horizonResult && (
          <motion.div
            key={`${selectedHorizon}-${horizonResult.projectedNetWorth.toFixed(0)}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="space-y-3 pt-3 border-t border-white/[0.06]"
          >
            <div className="text-center">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1">Net Worth @ {selectedHorizon}</div>
              <div className="text-2xl font-black font-mono" style={{ color: borderColor }} aria-live="polite" aria-label={`Net worth at ${selectedHorizon}: ${fmt(horizonResult.projectedNetWorth)}`}>
                <AnimatedNumber value={horizonResult.projectedNetWorth} prefix="$" />
              </div>
              {expLabel && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold"
                  style={{ background: `${borderColor}15`, border: `1px solid ${borderColor}30`, color: borderColor }}
                >
                  <Star className="w-2.5 h-2.5" />
                  {expLabel}
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Savings", value: horizonResult.savingsAccumulated, color: "text-emerald-400" },
                { label: "Investments", value: horizonResult.investmentValue, color: "text-blue-400" },
                { label: "Debt Left", value: horizonResult.debtRemaining, color: "text-red-400" },
              ].map(({ label: l, value, color }) => (
                <div key={l}>
                  <div className="text-[9px] text-white/40 font-mono uppercase">{l}</div>
                  <div className={`text-xs font-bold font-mono ${color}`}>
                    <AnimatedNumber value={value} prefix="$" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <GaugeBar value={horizonResult.stabilityScore} label="Stability" color="text-blue-400" ariaLabel={`Stability score: ${horizonResult.stabilityScore.toFixed(0)} out of 100`} />
              <GaugeBar value={100 - horizonResult.stressIndex} label="Calm Index" color="text-emerald-400" ariaLabel={`Calm index: ${(100 - horizonResult.stressIndex).toFixed(0)} out of 100`} />
              <GaugeBar value={horizonResult.opportunityScore} label="Opportunity" color="text-amber-400" ariaLabel={`Opportunity score: ${horizonResult.opportunityScore.toFixed(0)} out of 100`} />
            </div>

            {horizonResult.milestones.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-1.5"
                aria-label="Milestones reached"
              >
                {horizonResult.milestones.map(m => (
                  <span key={m} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" /> {m}
                  </span>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DecisionImpactLayer({ compareResult, selectedHorizon }: {
  compareResult: CompareResult | null;
  selectedHorizon: string;
}) {
  if (!compareResult) return null;

  const delta = compareResult.deltas.find(d => d.horizon === selectedHorizon);
  const s = compareResult.summary;

  const impactMessages: string[] = [];
  if (s.deltaNetWorth5yr > 1000) impactMessages.push(`In 5 years, the better path gives you ${fmt(s.deltaNetWorth5yr)} more flexibility`);
  if (s.deltaNetWorth10yr > 1000) impactMessages.push(`At 10 years, the difference compounds to ${fmt(s.deltaNetWorth10yr)}`);
  if (s.deltaNetWorth20yr > 5000) impactMessages.push(`Over 20 years, you're looking at a ${fmt(s.deltaNetWorth20yr)} divergence`);
  if (s.deltaStress > 5) impactMessages.push(`The better path reduces financial stress by ${s.deltaStress.toFixed(0)} points`);
  if (s.deltaOpportunity > 5) impactMessages.push(`Your opportunity window grows by ${s.deltaOpportunity.toFixed(0)} points`);

  const selectedDelta = delta?.deltaNetWorth || 0;
  const isPositive = selectedDelta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
      aria-label="Decision Impact Layer"
    >
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="font-bold text-sm">Decision Impact</span>
        <span className="text-[10px] text-white/40 ml-auto font-mono">@ {selectedHorizon}</span>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-2 h-2 rounded-full bg-[#00c8f8]" />
          <div className="text-[9px] text-white/40 font-mono">Current Path</div>
        </div>
        <div className="flex-1 relative h-2 flex items-center">
          <div className="absolute inset-0 flex items-center">
            <motion.div
              className="h-px w-full"
              style={{ background: isPositive ? "linear-gradient(to right, #00c8f8, #00e676)" : "linear-gradient(to right, #00c8f8, #ef4444)" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <motion.div
            className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black font-mono px-1.5 py-0.5 rounded-full ${isPositive ? "bg-emerald-400/20 text-emerald-400" : "bg-red-400/20 text-red-400"}`}
            key={selectedDelta}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ top: "50%" }}
          >
            {isPositive ? "+" : ""}{fmt(selectedDelta)}
          </motion.div>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <div className="text-[9px] text-white/40 font-mono">Better Path</div>
          <div className="w-2 h-2 rounded-full bg-[#00e676]" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: isPositive ? "rgba(0,230,118,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${isPositive ? "rgba(0,230,118,0.15)" : "rgba(239,68,68,0.15)"}` }}>
        <div className="text-xs text-white/50 font-mono">Path difference @ {selectedHorizon}</div>
        <motion.div
          key={selectedDelta}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-lg font-black font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}
          aria-live="polite"
          aria-label={`Path difference at ${selectedHorizon}: ${isPositive ? "+" : ""}${fmt(selectedDelta)}`}
        >
          {isPositive ? "+" : ""}<AnimatedNumber value={selectedDelta} prefix="$" />
        </motion.div>
      </div>

      {impactMessages.length > 0 && (
        <div className="space-y-1.5">
          {impactMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 text-[11px] text-white/60"
            >
              <ArrowRight className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" aria-hidden="true" />
              {msg}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function DivergenceBands({ compareResult }: { compareResult: CompareResult | null }) {
  if (!compareResult) return null;
  return (
    <>
      {DISPLAY_HORIZONS.slice(0, -1).map((h, i) => {
        const curr = compareResult.deltas.find(d => d.horizon === h);
        const next = compareResult.deltas.find(d => d.horizon === DISPLAY_HORIZONS[i + 1]);
        if (!curr || !next) return null;
        const isPositive = curr.deltaNetWorth >= 0;
        const fill = isPositive ? "rgba(0,230,118,0.10)" : "rgba(239,68,68,0.10)";
        return (
          <ReferenceArea
            key={h}
            x1={h}
            x2={DISPLAY_HORIZONS[i + 1]}
            fill={fill}
            stroke="none"
          />
        );
      })}
    </>
  );
}

function ChartSection({
  resultA, resultB, compareResult,
}: {
  resultA: SimResult | null;
  resultB: SimResult | null;
  compareResult: CompareResult | null;
}) {
  if (!resultA && !resultB) return null;

  const deltaData = compareResult?.deltas || null;

  const chartData = DISPLAY_HORIZONS.map(h => {
    const a = resultA?.results.find(r => r.horizon === h);
    const b = resultB?.results.find(r => r.horizon === h);
    return {
      horizon: h,
      "Current Path": a?.projectedNetWorth,
      "Better Path": b?.projectedNetWorth,
    };
  });

  const allVals = chartData.flatMap(d => [d["Current Path"], d["Better Path"]]).filter(Boolean) as number[];
  const minVal = allVals.length > 0 ? Math.min(...allVals) : 0;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : 100;

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="font-bold text-sm">Net Worth Projection</span>
        <span className="text-[10px] text-white/40 ml-auto font-mono">Simulation — not financial advice</span>
      </div>
      <div className="h-52" role="img" aria-label="Net worth projection chart comparing two financial paths over time">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="horizon" tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[Math.min(0, minVal * 0.9), maxVal * 1.1]}
              tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
            />
            <Tooltip
              contentStyle={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
              formatter={(value: number, name: string) => [fmt(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <DivergenceBands compareResult={compareResult} />
            {resultA && <Line type="monotone" dataKey="Current Path" stroke="#00c8f8" strokeWidth={2} dot={{ r: 3, fill: "#00c8f8" }} connectNulls animationDuration={800} />}
            {resultB && <Line type="monotone" dataKey="Better Path" stroke="#00e676" strokeWidth={2} dot={{ r: 3, fill: "#00e676" }} connectNulls animationDuration={800} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {deltaData && (
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/50 uppercase tracking-wider font-mono mb-2">Decision Impact — Difference Between Paths</div>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2" role="list" aria-label="Net worth delta by time horizon">
            {deltaData.map(d => (
              <div key={d.horizon} className="text-center" role="listitem">
                <div className="text-[9px] text-white/40 font-mono">{d.horizon}</div>
                <motion.div
                  key={d.deltaNetWorth}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  className={`text-xs font-bold font-mono ${d.deltaNetWorth >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  aria-label={`${d.horizon} delta: ${d.deltaNetWorth >= 0 ? "+" : ""}${fmt(d.deltaNetWorth)}`}
                >
                  {d.deltaNetWorth >= 0 ? "+" : ""}{fmt(d.deltaNetWorth)}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackCards({ resultA, resultB, compareResult }: {
  resultA: SimResult | null;
  resultB: SimResult | null;
  compareResult: CompareResult | null;
}) {
  if (!resultA || !resultB || !compareResult) return null;

  const deltas = compareResult.deltas;
  const getD = (h: string) => deltas.find(d => d.horizon === h);

  const d30 = getD("30d");
  const d90 = getD("90d");
  const d180 = getD("180d");
  const d5 = getD("5yr");
  const d10 = getD("10yr");
  const d20 = getD("20yr");

  const compoundingDivergenceData = ["5yr", "10yr", "20yr"].map(h => {
    const d = getD(h);
    return { horizon: h, gap: d?.deltaNetWorth || 0 };
  });

  const immediateDeltas = ([d30, d90, d180].filter(d => d != null)) as DeltaRow[];
  const immediatePositive = immediateDeltas.every(d => d.deltaNetWorth >= 0);
  const immediateNW = immediateDeltas[immediateDeltas.length - 1]?.deltaNetWorth || 0;

  return (
    <div className="space-y-4">
      <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider flex items-center gap-1.5">
        <Flame className="w-3 h-3" aria-hidden="true" />
        Feedback Layers
      </div>

      <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
        aria-label="Immediate feedback: slider changes update instantly"
        style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <Zap className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <div className="text-xs font-bold text-white/70">Immediate — Sliders Update Instantly</div>
          <div className="text-[11px] text-white/40 mt-0.5">
            Every slider change recalculates both timelines in real time. Numbers animate to their new values as you explore.
          </div>
        </div>
        <div className={`text-xs font-black font-mono shrink-0 ${immediatePositive ? "text-emerald-400" : "text-red-400"}`}>
          {immediatePositive ? "+" : ""}{fmt(immediateNW)} @ 180d
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <span className="font-bold text-sm">Near-Term Outlook</span>
            <span className="text-[10px] text-white/30 ml-auto font-mono">30 / 90 / 180 days</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "30d", d: d30 },
              { label: "90d", d: d90 },
              { label: "180d", d: d180 },
            ].map(({ label, d }) => (
              <div key={label} className="rounded-xl p-2 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[9px] text-white/40 font-mono mb-1">{label}</div>
                <div className={`text-xs font-bold font-mono ${(d?.deltaNetWorth || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(d?.deltaNetWorth || 0) >= 0 ? "+" : ""}{fmt(d?.deltaNetWorth || 0)}
                </div>
                <div className={`text-[9px] mt-0.5 ${(d?.deltaSavings || 0) >= 0 ? "text-blue-400/60" : "text-red-400/60"} font-mono`}>
                  {(d?.deltaSavings || 0) >= 0 ? "+" : ""}{fmt(d?.deltaSavings || 0)} savings
                </div>
                <div className={`text-[9px] mt-0.5 ${(d?.deltaDebt || 0) >= 0 ? "text-emerald-400/60" : "text-red-400/60"} font-mono`}>
                  {(d?.deltaDebt || 0) >= 0 ? "-" : "+"}{fmt(Math.abs(d?.deltaDebt || 0))} debt
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg px-3 py-2 text-[11px] text-white/50"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            {(d90?.deltaNetWorth || 0) > 0
              ? `In 90 days, the better path puts you ${fmt(d90?.deltaNetWorth || 0)} ahead — and clears ${fmt(d90?.deltaDebt || 0)} more debt.`
              : `The paths are close now. Differences grow significantly over time.`}
          </div>
        </div>

        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="font-bold text-sm">Long-Term Divergence</span>
            <span className="text-[10px] text-white/30 ml-auto font-mono">Small changes, big gap</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "5yr", d: d5 },
              { label: "10yr", d: d10 },
              { label: "20yr", d: d20 },
            ].map(({ label, d }) => (
              <div key={label} className="rounded-xl p-2 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[9px] text-white/40 font-mono mb-1">{label}</div>
                <div className={`text-xs font-bold font-mono ${(d?.deltaNetWorth || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(d?.deltaNetWorth || 0) >= 0 ? "+" : ""}{fmt(d?.deltaNetWorth || 0)}
                </div>
              </div>
            ))}
          </div>
          <div className="h-12" role="img" aria-label="Compounding divergence chart showing widening gap over 5, 10, and 20 years">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compoundingDivergenceData}>
                <Line
                  type="monotone"
                  dataKey="gap"
                  stroke={((d20?.deltaNetWorth || 0) >= 0) ? "#00e676" : "#ef4444"}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  animationDuration={900}
                />
                <XAxis dataKey="horizon" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 10 }}
                  formatter={(v: number) => [fmt(v), "Gap"]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg px-3 py-2 text-[11px] text-white/50"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            {(d20?.deltaNetWorth || 0) > 10_000
              ? `By year 20, the gap is ${fmt(d20?.deltaNetWorth || 0)} — compounding does most of the work.`
              : `Paths converge long-term. Try increasing savings rate in Path B to widen the gap.`}
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentityBadge({ stage }: { stage: Stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
      role="status"
      aria-label={`Your financial explorer stage: ${stage} — ${STAGE_DESCS[stage]}`}
    >
      <div className="flex gap-1" aria-hidden="true">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-500 ${i <= idx ? "w-6" : "w-2 opacity-20"}`}
            style={{ backgroundColor: i <= idx ? "#00c8f8" : "#555" }}
          />
        ))}
      </div>
      <div>
        <div className={`text-xs font-bold font-mono ${STAGE_COLORS[stage]}`}>{stage}</div>
        <div className="text-[10px] text-white/40">{STAGE_DESCS[stage]}</div>
      </div>
    </div>
  );
}

function EnhancedSnapshotCompare({
  savedTimelines,
  onLoad,
  onDelete,
}: {
  savedTimelines: SavedTimeline[];
  onLoad: (tl: SavedTimeline, which: "A" | "B") => void;
  onDelete: (id: number) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 5
        ? [...prev, id]
        : prev
    );
  };

  const selectedTLs = savedTimelines.filter(tl => selectedIds.includes(tl.id));

  const compareChartData = DISPLAY_HORIZONS.map(h => {
    const row: Record<string, number | string> = { horizon: h };
    selectedTLs.forEach(tl => {
      const r = tl.results.find(rr => rr.horizon === h);
      row[tl.name] = r?.projectedNetWorth || 0;
    });
    return row;
  });

  const COLORS = ["#00c8f8", "#00e676", "#f59e0b", "#a78bfa", "#f87171"];

  const generateAnnotation = (tl: SavedTimeline): string => {
    const r5 = tl.results.find(r => r.horizon === "5yr");
    const r20 = tl.results.find(r => r.horizon === "20yr");
    const parts: string[] = [];
    if (r5) parts.push(`$${Math.round(r5.projectedNetWorth / 1000)}k NW @ 5yr`);
    if (r20) parts.push(`$${Math.round(r20.projectedNetWorth / 1000)}k @ 20yr`);
    parts.push(`${(tl.savingsRate * 100).toFixed(0)}% savings rate`);
    return parts.join(" · ");
  };

  const generateDeltaInsights = (base: SavedTimeline, compare: SavedTimeline): string[] => {
    const b5 = base.results.find(r => r.horizon === "5yr");
    const c5 = compare.results.find(r => r.horizon === "5yr");
    const b20 = base.results.find(r => r.horizon === "20yr");
    const c20 = compare.results.find(r => r.horizon === "20yr");
    const insights: string[] = [];
    if (b5 && c5) {
      const delta5 = c5.projectedNetWorth - b5.projectedNetWorth;
      if (Math.abs(delta5) > 500) {
        insights.push(`${compare.name} is ${delta5 > 0 ? fmt(delta5) + " ahead" : fmt(-delta5) + " behind"} at 5yr vs ${base.name}`);
      }
    }
    if (b20 && c20) {
      const delta20 = c20.projectedNetWorth - b20.projectedNetWorth;
      if (Math.abs(delta20) > 1000) {
        insights.push(`20yr gap: ${delta20 > 0 ? "+" : ""}${fmt(delta20)}`);
      }
    }
    const savingsDiff = (compare.savingsRate - base.savingsRate) * 100;
    if (Math.abs(savingsDiff) > 1) {
      insights.push(`Savings rate ${savingsDiff > 0 ? "+" : ""}${savingsDiff.toFixed(0)}% vs ${base.name}`);
    }
    return insights;
  };

  if (savedTimelines.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        No saved scenarios yet. Run a simulation and save a snapshot above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-[10px] text-white/50 font-mono mb-2">
        Select up to 5 scenarios to compare side-by-side
      </div>
      <div className="space-y-2">
        {savedTimelines.map((tl) => {
          const isSelected = selectedIds.includes(tl.id);
          const colorIdx = selectedIds.indexOf(tl.id);
          const color = colorIdx >= 0 ? COLORS[colorIdx] : undefined;

          return (
            <div key={tl.id} className="rounded-xl p-3 transition-all"
              style={{
                background: isSelected ? `${color}08` : "rgba(255,255,255,0.02)",
                border: `1px solid ${isSelected ? color + "30" : "rgba(255,255,255,0.06)"}`,
              }}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleSelect(tl.id)}
                  className="w-4 h-4 rounded border mt-0.5 shrink-0 transition-all flex items-center justify-center"
                  style={{
                    borderColor: isSelected ? (color || "#00c8f8") : "rgba(255,255,255,0.2)",
                    background: isSelected ? (color || "#00c8f8") + "20" : "transparent",
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${isSelected ? "Deselect" : "Select"} scenario: ${tl.name}`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3" style={{ color }} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white/90">{tl.name}</span>
                    {tl.isBaseline && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">BASELINE</span>
                    )}
                    <span className="text-[10px] text-white/30 font-mono ml-auto">
                      {new Date(tl.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {tl.annotation && (
                    <div className="text-[11px] text-white/40 mt-1 italic">{tl.annotation}</div>
                  )}
                  <div className="text-[9px] text-white/30 font-mono mt-1">{generateAnnotation(tl)}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => onLoad(tl, "A")}
                    className="text-[10px] px-2 py-1 rounded border border-blue-400/30 text-blue-400 hover:bg-blue-400/10 font-bold transition-all"
                    aria-label={`Load ${tl.name} into Path A`}
                  >A</button>
                  <button
                    onClick={() => onLoad(tl, "B")}
                    className="text-[10px] px-2 py-1 rounded border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 font-bold transition-all"
                    aria-label={`Load ${tl.name} into Path B`}
                  >B</button>
                  <button
                    onClick={() => onDelete(tl.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1"
                    aria-label={`Delete scenario: ${tl.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTLs.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-4"
          style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="font-bold text-sm">Multi-Scenario Overlay</span>
            <span className="text-[10px] text-white/40 ml-auto font-mono">{selectedTLs.length} scenarios</span>
          </div>
          <div className="h-52" role="img" aria-label={`Multi-scenario comparison chart for ${selectedTLs.map(t => t.name).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compareChartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="horizon" tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip
                  contentStyle={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
                  formatter={(value: number, name: string) => [fmt(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
                {selectedTLs.map((tl, idx) => (
                  <Line
                    key={tl.id}
                    type="monotone"
                    dataKey={tl.name}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS[idx % COLORS.length] }}
                    connectNulls
                    animationDuration={800}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Scenario Summary</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono" aria-label="Scenario comparison summary table">
                <thead>
                  <tr className="text-white/30">
                    <th className="text-left pb-2 pr-4">Scenario</th>
                    <th className="text-right pb-2 px-2">Savings</th>
                    <th className="text-right pb-2 px-2">5yr NW</th>
                    <th className="text-right pb-2 px-2">10yr NW</th>
                    <th className="text-right pb-2 px-2">20yr NW</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTLs.map((tl, idx) => {
                    const r5 = tl.results.find(r => r.horizon === "5yr");
                    const r10 = tl.results.find(r => r.horizon === "10yr");
                    const r20 = tl.results.find(r => r.horizon === "20yr");
                    const base = selectedTLs[0];
                    const insights = idx > 0 ? generateDeltaInsights(base, tl) : [];
                    return (
                      <tr key={tl.id} className="border-t border-white/[0.04]">
                        <td className="py-1.5 pr-4">
                          <div style={{ color: COLORS[idx % COLORS.length] }}>{tl.name}</div>
                          {insights.map((ins, ii) => (
                            <div key={ii} className="text-[9px] text-white/30 mt-0.5">{ins}</div>
                          ))}
                        </td>
                        <td className="text-right px-2 text-white/60">{(tl.savingsRate * 100).toFixed(0)}%</td>
                        <td className="text-right px-2 text-white/70">{fmt(r5?.projectedNetWorth || 0)}</td>
                        <td className="text-right px-2 text-white/70">{fmt(r10?.projectedNetWorth || 0)}</td>
                        <td className="text-right px-2 text-white/70">{fmt(r20?.projectedNetWorth || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const DEFAULT_PARAMS_A: TimelineParams = {
  monthlyIncome: 5000,
  savingsRate: 0.05,
  monthlyDebt: 800,
  investmentRate: 0.05,
  currentNetWorth: 0,
  emergencyFundMonths: 1,
};

const DEFAULT_PARAMS_B: TimelineParams = {
  monthlyIncome: 5000,
  savingsRate: 0.20,
  monthlyDebt: 400,
  investmentRate: 0.08,
  currentNetWorth: 0,
  emergencyFundMonths: 3,
};

export default function AlternateTimeline() {
  const { getToken, isSignedIn } = useAuth();

  const [paramsA, setParamsA] = useState<TimelineParams>(DEFAULT_PARAMS_A);
  const [paramsB, setParamsB] = useState<TimelineParams>(DEFAULT_PARAMS_B);
  const [resultA, setResultA] = useState<SimResult | null>(null);
  const [resultB, setResultB] = useState<SimResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selectedHorizon, setSelectedHorizon] = useState("5yr");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("Aware");
  const [isExplorationMode, setIsExplorationMode] = useState(false);
  const [savedTimelines, setSavedTimelines] = useState<SavedTimeline[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveNameA, setSaveNameA] = useState("Current Path");
  const [saveNameB, setSaveNameB] = useState("Better Path");
  const [saveAnnotationA, setSaveAnnotationA] = useState("");
  const [saveAnnotationB, setSaveAnnotationB] = useState("");
  const [showSaveFormA, setShowSaveFormA] = useState(false);
  const [showSaveFormB, setShowSaveFormB] = useState(false);
  const [savingA, setSavingA] = useState(false);
  const [savingB, setSavingB] = useState(false);
  const [activeTab, setActiveTab] = useState<"A" | "B">("A");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStage = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/timeline/identity/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStage(data.stage as Stage);
      }
    } catch {}
  }, [isSignedIn, getToken]);

  const fetchSaved = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/timeline/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSavedTimelines(data);
      }
    } catch {}
  }, [isSignedIn, getToken]);

  useEffect(() => {
    fetchStage();
    fetchSaved();
  }, [fetchStage, fetchSaved]);

  const simulate = useCallback(async (a: TimelineParams, b: TimelineParams) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }

      const [resA, resB, resC] = await Promise.all([
        fetch(`${API_BASE}/timeline/simulate`, { method: "POST", headers, body: JSON.stringify(a) }),
        fetch(`${API_BASE}/timeline/simulate`, { method: "POST", headers, body: JSON.stringify(b) }),
        fetch(`${API_BASE}/timeline/compare`, { method: "POST", headers, body: JSON.stringify({ paramsA: a, paramsB: b }) }),
      ]);

      if (resA.ok) setResultA(await resA.json());
      if (resB.ok) setResultB(await resB.json());
      if (resC.ok) setCompareResult(await resC.json());

      if (isSignedIn) {
        fetchStage();
      }
    } catch (err) {
      console.error("Simulation error", err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken, fetchStage]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      simulate(paramsA, paramsB);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [paramsA, paramsB, simulate]);

  const handleParamA = useCallback((key: keyof TimelineParams, val: number) => {
    setParamsA(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleParamB = useCallback((key: keyof TimelineParams, val: number) => {
    setParamsB(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleReset = useCallback(() => {
    setParamsA(DEFAULT_PARAMS_A);
    setParamsB(DEFAULT_PARAMS_B);
  }, []);

  const saveTimeline = async (which: "A" | "B") => {
    if (!isSignedIn) return;
    const params = which === "A" ? paramsA : paramsB;
    const name = which === "A" ? saveNameA : saveNameB;
    const annotation = which === "A" ? saveAnnotationA : saveAnnotationB;
    if (which === "A") setSavingA(true); else setSavingB(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/timeline/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...params, name, annotation }),
      });
      if (res.ok) {
        await fetchSaved();
        await fetchStage();
        if (which === "A") { setShowSaveFormA(false); setSaveAnnotationA(""); }
        else { setShowSaveFormB(false); setSaveAnnotationB(""); }
      }
    } catch (err) {
      console.error("Save error", err);
    } finally {
      if (which === "A") setSavingA(false); else setSavingB(false);
    }
  };

  const deleteSaved = async (id: number) => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/timeline/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSaved();
    } catch {}
  };

  const loadSaved = (tl: SavedTimeline, which: "A" | "B") => {
    const p: TimelineParams = {
      monthlyIncome: tl.monthlyIncome,
      savingsRate: tl.savingsRate,
      monthlyDebt: tl.monthlyDebt,
      investmentRate: tl.investmentRate,
      currentNetWorth: tl.currentNetWorth,
      emergencyFundMonths: tl.emergencyFundMonths,
    };
    if (which === "A") setParamsA(p);
    else setParamsB(p);
    setShowSaved(false);
  };

  const summary = compareResult?.summary;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl pb-24">
        <div className="mb-6 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <GitBranch className="w-6 h-6 text-primary" aria-hidden="true" />
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                <span className="electric-text">Alternate</span> Timeline
              </h1>
            </div>
            <p className="text-xs text-white/40 font-mono">
              Compare two financial futures side-by-side. Projections are simulations — not financial advice.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsExplorationMode(v => !v)}
              className={`text-xs px-3 py-2 rounded-lg border font-bold transition-all ${
                isExplorationMode
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                  : "bg-white/[0.04] border-white/10 text-white/50 hover:text-white hover:border-white/20"
              }`}
              aria-pressed={isExplorationMode}
            >
              {isExplorationMode ? "Exit" : "Enter"} Exploration Mode
            </button>

            {isSignedIn && (
              <button
                onClick={() => { setShowSaved(v => !v); fetchSaved(); }}
                className="text-xs px-3 py-2 rounded-lg border bg-white/[0.04] border-white/10 text-white/50 hover:text-white hover:border-white/20 font-bold transition-all flex items-center gap-1.5"
                aria-expanded={showSaved}
              >
                <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Saved ({savedTimelines.length})
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white/40 hover:text-white text-xs border border-white/10 h-9"
              aria-label="Reset all parameters to defaults"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Reset & Explore
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isExplorationMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 rounded-xl px-4 py-3 bg-amber-400/[0.06] border border-amber-400/20 flex items-start gap-2"
              role="status"
              aria-label="Exploration mode active"
            >
              <Compass className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <div className="text-xs font-bold text-amber-400 mb-0.5">Regret-Free Exploration Mode</div>
                <div className="text-[11px] text-amber-400/70">
                  Try any scenario — high spending, delayed savings, or other choices. No judgment here. All simulations stay private, and you can always reset. Use this space to understand trade-offs, not to feel bad about them.
                </div>
              </div>
              <button
                onClick={() => setIsExplorationMode(false)}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-amber-400/20 text-amber-400/70 hover:text-amber-400 hover:border-amber-400/40 font-bold transition-all shrink-0"
                aria-label="Return to better path and exit exploration mode"
              >
                Back to Better Path
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isSignedIn && <div className="mb-4"><IdentityBadge stage={stage} /></div>}

        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Projection horizon selector">
          <span className="text-[10px] text-white/30 font-mono py-1">Projection horizon:</span>
          {DISPLAY_HORIZONS.map(h => (
            <button
              key={h}
              onClick={() => setSelectedHorizon(h)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-mono font-bold transition-all ${
                selectedHorizon === h
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white hover:border-white/20"
              }`}
              aria-pressed={selectedHorizon === h}
              aria-label={`View projection at ${h}`}
            >
              {h}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mb-4 flex items-center gap-2 text-primary/70 text-xs font-mono" role="status" aria-live="polite">
            <Zap className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
            <span>Running simulations…</span>
          </div>
        )}

        <div className="hidden md:flex flex-row gap-4 mb-6">
          <TimelinePane
            label="Current Path"
            borderColor="#00c8f8"
            params={paramsA}
            onParam={handleParamA}
            result={resultA}
            selectedHorizon={selectedHorizon}
          />
          <TimelinePane
            label="Better Path"
            borderColor="#00e676"
            params={paramsB}
            onParam={handleParamB}
            result={resultB}
            selectedHorizon={selectedHorizon}
            isExploration={isExplorationMode}
            isAmber={isExplorationMode}
          />
        </div>

        <div className="md:hidden mb-6">
          <div className="flex rounded-xl overflow-hidden border border-white/10 mb-3" role="tablist" aria-label="Switch between timeline panes">
            {(["A", "B"] as const).map(t => (
              <button
                key={t}
                role="tab"
                aria-selected={activeTab === t}
                aria-controls={`timeline-pane-${t}`}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                  activeTab === t
                    ? t === "A"
                      ? "bg-[#00c8f8]/20 text-[#00c8f8] border-b-2 border-[#00c8f8]"
                      : "bg-[#00e676]/20 text-[#00e676] border-b-2 border-[#00e676]"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {t === "A" ? "Current Path" : "Better Path"}
              </button>
            ))}
          </div>
          <div id="timeline-pane-A" role="tabpanel" aria-label="Current Path panel" hidden={activeTab !== "A"}>
            {activeTab === "A" && (
              <TimelinePane
                label="Current Path"
                borderColor="#00c8f8"
                params={paramsA}
                onParam={handleParamA}
                result={resultA}
                selectedHorizon={selectedHorizon}
              />
            )}
          </div>
          <div id="timeline-pane-B" role="tabpanel" aria-label="Better Path panel" hidden={activeTab !== "B"}>
            {activeTab === "B" && (
              <TimelinePane
                label="Better Path"
                borderColor="#00e676"
                params={paramsB}
                onParam={handleParamB}
                result={resultB}
                selectedHorizon={selectedHorizon}
                isExploration={isExplorationMode}
                isAmber={isExplorationMode}
              />
            )}
          </div>
        </div>

        {compareResult && (
          <div className="mb-4">
            <DecisionImpactLayer compareResult={compareResult} selectedHorizon={selectedHorizon} />
          </div>
        )}

        <div className="mb-4">
          <ChartSection
            resultA={resultA}
            resultB={resultB}
            compareResult={compareResult}
          />
        </div>

        {resultA && resultB && compareResult && (
          <div className="mb-4">
            <FeedbackCards resultA={resultA} resultB={resultB} compareResult={compareResult} />
          </div>
        )}

        {summary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3" role="list" aria-label="Summary comparison metrics">
            {[
              { label: "Delta @ 5yr", value: summary.deltaNetWorth5yr, icon: Target, isMoney: true },
              { label: "Delta @ 10yr", value: summary.deltaNetWorth10yr, icon: TrendingUp, isMoney: true },
              { label: "Delta @ 20yr", value: summary.deltaNetWorth20yr, icon: Star, isMoney: true },
              { label: "Stress Reduction", value: summary.deltaStress, icon: Shield, suffix: "pts" },
              { label: "Opportunity Gain", value: summary.deltaOpportunity, icon: Zap, suffix: "pts" },
            ].map(({ label, value, icon: Icon, isMoney, suffix }) => (
              <motion.div
                key={label}
                role="listitem"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}
                aria-label={`${label}: ${value >= 0 ? "+" : ""}${isMoney ? fmt(value) : `${value.toFixed(1)}${suffix || ""}`}`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1 text-white/20" aria-hidden="true" />
                <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">{label}</div>
                <div className={`text-sm font-black font-mono mt-0.5 ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {value >= 0 ? "+" : ""}
                  {isMoney ? (
                    <AnimatedNumber value={value} prefix="$" />
                  ) : `${value.toFixed(1)}${suffix || ""}`}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isSignedIn && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["A", "B"] as const).map(which => {
              const showForm = which === "A" ? showSaveFormA : showSaveFormB;
              const setShowForm = which === "A" ? setShowSaveFormA : setShowSaveFormB;
              const name = which === "A" ? saveNameA : saveNameB;
              const setName = which === "A" ? setSaveNameA : setSaveNameB;
              const annotation = which === "A" ? saveAnnotationA : saveAnnotationB;
              const setAnnotation = which === "A" ? setSaveAnnotationA : setSaveAnnotationB;
              const saving = which === "A" ? savingA : savingB;
              const label = which === "A" ? "Current Path" : "Better Path";
              const borderColor = which === "A" ? "#00c8f8" : "#00e676";

              return (
                <div key={which} className="rounded-xl p-4"
                  style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} aria-hidden="true" />
                      <span className="text-xs font-bold text-white/70">Save {label} Snapshot</span>
                    </div>
                    <button
                      onClick={() => setShowForm(v => !v)}
                      className="text-white/40 hover:text-white transition-colors"
                      aria-expanded={showForm}
                      aria-controls={`save-form-${which}`}
                      aria-label={`${showForm ? "Collapse" : "Expand"} save form for ${label}`}
                    >
                      {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showForm && (
                      <motion.div
                        id={`save-form-${which}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <input
                          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary/40"
                          placeholder="Scenario name…"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          maxLength={100}
                          aria-label="Scenario name"
                        />
                        <textarea
                          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary/40 resize-none h-16"
                          placeholder="Optional note about this scenario…"
                          value={annotation}
                          onChange={e => setAnnotation(e.target.value)}
                          maxLength={500}
                          aria-label="Optional scenario annotation"
                        />
                        <Button size="sm" disabled={saving}
                          className="w-full bg-primary text-black font-bold h-9 text-xs"
                          onClick={() => saveTimeline(which)}
                          aria-label={`Save ${label} snapshot`}
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                          {saving ? "Saving…" : "Save Snapshot"}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {isSignedIn && showSaved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 rounded-2xl p-4"
              style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BookmarkCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                <span className="font-bold text-sm">Saved Scenarios</span>
                <span className="text-[10px] text-white/40 ml-auto">{savedTimelines.length} saved</span>
              </div>
              <EnhancedSnapshotCompare
                savedTimelines={savedTimelines}
                onLoad={loadSaved}
                onDelete={deleteSaved}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!isSignedIn && (
          <div className="mt-6 rounded-xl p-4 flex items-center gap-3"
            style={{ background: "rgba(0,200,248,0.05)", border: "1px solid rgba(0,200,248,0.12)" }}>
            <AlertTriangle className="w-4 h-4 text-primary/60 shrink-0" aria-hidden="true" />
            <div className="text-xs text-white/50">
              <span className="text-primary font-bold">Sign in</span> to save scenarios, track your identity stage, and earn XP for exploring different financial paths.
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[10px] text-white/30 leading-relaxed">
              All projections are illustrative simulations using compound interest, simple debt amortization, and linear savings models. They do not account for taxes, inflation adjustments, market volatility, or individual circumstances. This tool is for educational exploration only — not financial advice. Assumptions: savings split 60% investments / 40% liquid. Debt is modeled as a fixed monthly payment over 36 months. Investment returns are annual rate applied monthly.
            </p>
          </div>
        </div>
      </div>
      <FinancialDisclaimerBanner pageKey="alternate-timeline" />
    </Layout>
  );
}
