import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Star, CheckCircle2 } from "lucide-react";
import { type TimelineParams, type SimResult, type HorizonResult, fmt } from "./types";

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

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

export interface PaneProps {
  label: string;
  borderColor: string;
  params: TimelineParams;
  onParam: (key: keyof TimelineParams, val: number) => void;
  result: SimResult | null;
  selectedHorizon: string;
  isExploration?: boolean;
  isAmber?: boolean;
}

export function TimelinePane({
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
      className="rounded-sm p-4 flex flex-col gap-4 flex-1 min-w-0"
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
              <div className="text-[10px] text-white/50 uppercase tracking-wider font-mono mb-1">Net Worth @ {selectedHorizon}</div>
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
