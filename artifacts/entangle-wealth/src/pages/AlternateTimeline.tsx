import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  GitBranch, Save, Trash2, RefreshCw, BookmarkCheck,
  TrendingUp, AlertTriangle, Star, Zap, Shield, Target,
  ChevronDown, ChevronUp, Info, CheckCircle2, Sparkles,
  Flame, Compass, Clock, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import {
  type HorizonResult, type SimResult, type TimelineParams, type SavedTimeline,
  type DeltaRow, type CompareResult, type WhatIfDecision, type WhatIfModelResult,
  type Stage, STAGES, STAGE_COLORS, STAGE_DESCS, DISPLAY_HORIZONS, fmt,
} from "./alternate-timeline/types";
import { TimelinePane } from "./alternate-timeline/TimelinePane";
import { DecisionImpactLayer } from "./alternate-timeline/DecisionImpactLayer";
import { DivergenceBands } from "./alternate-timeline/DivergenceBands";

const API_BASE = "/api";

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
  const { toast } = useToast();

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
  const [whatIfDecisions, setWhatIfDecisions] = useState<WhatIfDecision[]>([]);
  const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([]);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfModelResult | null>(null);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [modelingWhatIf, setModelingWhatIf] = useState(false);
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

  const fetchWhatIfDecisions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/timeline/what-if/decisions`);
      if (res.ok) setWhatIfDecisions(await res.json());
    } catch {}
  }, []);

  const runWhatIfModel = useCallback(async () => {
    if (selectedDecisionIds.length === 0) return;
    setModelingWhatIf(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/timeline/what-if/model`, {
        method: "POST",
        headers,
        body: JSON.stringify({ baseParams: paramsA, decisionIds: selectedDecisionIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setWhatIfResult(data);
        const bParams = data.modifiedParams;
        if (bParams) {
          setParamsB(bParams);
        }
      } else {
        toast({ title: "Modeling failed", description: "Could not run the what-if model. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Modeling failed", description: "Could not run the what-if model. Please try again.", variant: "destructive" });
    } finally {
      setModelingWhatIf(false);
    }
  }, [selectedDecisionIds, paramsA, isSignedIn, getToken, toast]);

  useEffect(() => {
    fetchStage();
    fetchSaved();
    fetchWhatIfDecisions();
  }, [fetchStage, fetchSaved, fetchWhatIfDecisions]);

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

      if (!resA.ok && !resB.ok) {
        toast({ title: "Simulation failed", description: "Could not run the timeline simulation. Please try again.", variant: "destructive" });
      }

      if (isSignedIn) {
        fetchStage();
      }
    } catch {
      toast({ title: "Simulation failed", description: "Could not run the timeline simulation. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken, fetchStage, toast]);

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
        toast({ title: "Timeline saved", description: `"${name}" has been saved to your library.` });
        if (which === "A") { setShowSaveFormA(false); setSaveAnnotationA(""); }
        else { setShowSaveFormB(false); setSaveAnnotationB(""); }
      } else {
        toast({ title: "Save failed", description: "Could not save this timeline. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Save failed", description: "Could not save this timeline. Please try again.", variant: "destructive" });
    } finally {
      if (which === "A") setSavingA(false); else setSavingB(false);
    }
  };

  const deleteSaved = async (id: number) => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/timeline/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchSaved();
      } else {
        toast({ title: "Delete failed", description: "Could not delete this timeline. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete failed", description: "Could not delete this timeline. Please try again.", variant: "destructive" });
    }
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
      <PageErrorBoundary fallbackTitle="Alternate Timeline encountered an error">
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

        {whatIfDecisions.length > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(156,39,176,0.25)" }}>
            <button
              onClick={() => setShowWhatIf(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm text-purple-300">What-If Decision Modeler</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400 font-bold">NEW</span>
              </div>
              {showWhatIf ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>

            {showWhatIf && (
              <div className="px-4 pb-4 space-y-4">
                <p className="text-xs text-white/40">
                  Toggle key life decisions to see the ripple effect across your entire financial timeline. Selected decisions auto-populate the "Better Path" pane.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {whatIfDecisions.map(decision => {
                    const isSelected = selectedDecisionIds.includes(decision.id);
                    return (
                      <button
                        key={decision.id}
                        onClick={() => setSelectedDecisionIds(prev =>
                          isSelected ? prev.filter(id => id !== decision.id) : [...prev, decision.id]
                        )}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "border-purple-400/40 bg-purple-400/10 text-purple-200"
                            : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center ${
                            isSelected ? "border-purple-400 bg-purple-400" : "border-white/20"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-black" />}
                          </div>
                          <div>
                            <div className="font-semibold text-xs">{decision.label}</div>
                            <div className="text-[11px] opacity-70 mt-0.5">{decision.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={runWhatIfModel}
                  disabled={selectedDecisionIds.length === 0 || modelingWhatIf}
                  className="w-full py-2.5 rounded-xl bg-purple-500 text-white font-bold text-sm hover:bg-purple-500/90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {modelingWhatIf ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Modeling...</>
                  ) : (
                    <><Zap className="w-4 h-4" />Model Selected Decisions ({selectedDecisionIds.length})</>
                  )}
                </button>

                {whatIfResult && (
                  <div className="mt-2 pt-3 border-t border-white/[0.06] space-y-3">
                    <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Decision Impact at 20 Years</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[10px] text-white/40 font-mono uppercase">Net Worth Gain</div>
                        <div className={`text-lg font-black font-mono mt-1 ${whatIfResult.summary.netWorthGain20yr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {whatIfResult.summary.netWorthGain20yr >= 0 ? "+" : ""}{fmt(whatIfResult.summary.netWorthGain20yr)}
                        </div>
                      </div>
                      <div className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[10px] text-white/40 font-mono uppercase">Stress Reduction</div>
                        <div className={`text-lg font-black font-mono mt-1 ${whatIfResult.summary.stressReduction >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {whatIfResult.summary.stressReduction >= 0 ? "+" : ""}{whatIfResult.summary.stressReduction.toFixed(1)}pts
                        </div>
                      </div>
                      <div className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[10px] text-white/40 font-mono uppercase">Opportunity Gain</div>
                        <div className={`text-lg font-black font-mono mt-1 ${whatIfResult.summary.opportunityGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {whatIfResult.summary.opportunityGain >= 0 ? "+" : ""}{whatIfResult.summary.opportunityGain.toFixed(1)}pts
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
      </PageErrorBoundary>
    </Layout>
  );
}
