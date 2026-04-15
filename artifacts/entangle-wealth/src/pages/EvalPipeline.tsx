import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Loader2, Play, ChevronLeft, Trophy, Shield, Wrench, FileText,
  BarChart3, Zap, AlertTriangle, CheckCircle2, XCircle, Target,
  TrendingUp, Activity, Gauge, GitBranch, GitCommit, ArrowLeftRight,
  Clock, Hash, Plus, Sparkles,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedGauge, ScoreRing } from "@/components/strategy/AnimatedGauge";
import { HeatmapGrid } from "@/components/strategy/HeatmapGrid";
import { BeforeAfterCard } from "@/components/strategy/BeforeAfterCard";
import { FadeIn } from "@/components/strategy/PageTransition";
import { EvalPipelineSkeleton } from "@/components/strategy/StrategySkeletons";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Strategy {
  id: number;
  name: string;
  type: string;
  assets: string[];
  timeframes: string[];
  parameters: Record<string, number>;
  isActive: boolean;
}

interface EvalScores {
  M1: number;
  M2: number;
  M3: number;
  M4: number;
  M5: number;
  M6: number;
}

interface StressResult {
  scenario: string;
  score: number;
  max_drawdown: number;
  failure: boolean;
}

interface RefinementSuggestion {
  param: string;
  old: number;
  new: number;
  impact: string;
}

interface EvalJobResult {
  strategy_id: number | null;
  version: string | null;
  version_hash: string | null;
  score: {
    total: number;
    breakdown: EvalScores;
    confidence: number;
  };
  decision: {
    status: "ACTIVE" | "LIMITED" | "BLOCKED";
    reason: string;
  } | null;
  stress: {
    worst_drawdown: number;
    failure_regimes: string[];
    recovery_time: string;
    results?: StressResult[];
  } | null;
  failure_surface: {
    conditions: { regime: string; confidence: number }[];
  } | null;
  refinement: {
    before_score: number;
    after_score: number;
    change: number;
    reason: string;
    status: "ACCEPTED" | "REJECTED";
    suggestions: RefinementSuggestion[];
  } | null;
  strategy_profile: {
    type: string;
    speed: string;
    risk: string;
    dependency: string;
  } | null;
  metadata: {
    mode: "fast" | "deep";
    timestamp: string;
    engine_version: string;
  } | null;
  summary: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    best_conditions: string[];
    break_conditions: string[];
    score_drivers: Record<string, string>;
  } | null;
}

interface SummaryData {
  strategy_id: number;
  score_total: number;
  confidence: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  best_conditions: string[];
  break_conditions: string[];
  score_drivers: Record<string, string>;
}

interface RankingEntry {
  rank: number;
  strategy_id: number;
  strategy_name: string;
  score: number;
  confidence: number;
}

interface StrategyVersionEntry {
  id: number;
  version: string;
  version_hash: string;
  origin: "manual" | "refinement_engine";
  parent_version: string | null;
  parameters: Record<string, unknown>;
  score_snapshot: { score_total: number | null; confidence: number | null };
  scores: Record<string, number> | null;
  changes: { field: string; old: unknown; new: unknown }[] | null;
  stress_delta: { drawdown_change?: string; recovery_speed?: string } | null;
  notes: string | null;
  created_at: string;
}

interface VersionComparison {
  version_a: { version: string; version_hash: string; origin: string; score_total: number | null; confidence: number | null; created_at: string };
  version_b: { version: string; version_hash: string; origin: string; score_total: number | null; confidence: number | null; created_at: string };
  diff: {
    score_total: string | null;
    confidence: string | null;
    model_scores: Record<string, string | null>;
    parameter_changes: { field: string; old: unknown; new: unknown }[];
    stress_delta_a: Record<string, string>;
    stress_delta_b: Record<string, string>;
  };
}

const MODEL_LABELS: Record<string, string> = {
  M1: "Trend Alignment",
  M2: "Mean Reversion",
  M3: "Momentum",
  M4: "Volatility",
  M5: "Volume",
  M6: "Signal Logic",
};

const MODEL_COLORS: Record<string, string> = {
  M1: "#00d4ff",
  M2: "#a78bfa",
  M3: "#f59e0b",
  M4: "#10b981",
  M5: "#f97316",
  M6: "#ec4899",
};

function ModelRadar({ scores }: { scores: EvalScores }) {
  const data = Object.entries(scores).map(([key, value]) => ({
    model: MODEL_LABELS[key] ?? key,
    score: value,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" gridType="polygon" />
        <PolarAngleAxis dataKey="model" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#00D4FF"
          fill="#00D4FF"
          fillOpacity={0.12}
          strokeWidth={2}
          dot={{ fill: "#00D4FF", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#00D4FF" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function RunningView({ jobId }: { jobId: string | null }) {
  const [activeModel, setActiveModel] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModel(prev => (prev < 5 ? prev + 1 : 5));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const models = Object.entries(MODEL_LABELS);

  return (
    <FadeIn>
      <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-8 space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-t-[#00D4FF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-b-purple-400 border-l-transparent border-r-transparent border-t-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            <Target className="w-7 h-7 text-[#00D4FF] absolute inset-0 m-auto" />
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm font-semibold">Running 6-model evaluation pipeline</p>
            {jobId && <p className="text-white/25 text-xs font-mono mt-1">Job: {jobId}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest">Pipeline Progress</div>
          <div className="relative">
            <div className="absolute left-[19px] top-5 bottom-5 w-px bg-white/8" />
            <div className="space-y-2">
              {models.map(([key, label], i) => {
                const done = i < activeModel;
                const running = i === activeModel;
                const color = MODEL_COLORS[key] ?? "#00d4ff";

                return (
                  <motion.div
                    key={key}
                    className="flex items-center gap-4"
                    animate={done ? { opacity: 1 } : running ? { opacity: 1 } : { opacity: 0.4 }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all duration-500"
                      style={
                        done
                          ? { borderColor: `${color}60`, background: `${color}15`, boxShadow: `0 0 12px ${color}20` }
                          : running
                          ? { borderColor: color, background: `${color}20`, boxShadow: `0 0 16px ${color}40` }
                          : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }
                      }
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color }} />
                      ) : running ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-white/20">{key}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono font-semibold" style={{ color: done || running ? (done ? "rgba(255,255,255,0.7)" : color) : "rgba(255,255,255,0.3)" }}>
                            {key} — {label}
                          </span>
                        </div>
                        {done && (
                          <span className="text-[10px] font-mono text-white/25">done</span>
                        )}
                        {running && (
                          <span className="text-[10px] font-mono animate-pulse" style={{ color }}>analyzing…</span>
                        )}
                      </div>
                      <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: color }}
                          initial={{ width: "0%" }}
                          animate={{ width: done ? "100%" : running ? "65%" : "0%" }}
                          transition={{ duration: done ? 0.5 : 1.5, ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

type ViewMode = "select" | "running" | "results" | "rankings" | "versions";

export default function EvalPipeline() {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("select");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [evalMode, setEvalMode] = useState<"fast" | "deep">("deep");
  const [runStress, setRunStress] = useState(true);
  const [runRefinement, setRunRefinement] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<EvalJobResult | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [versions, setVersions] = useState<StrategyVersionEntry[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/strategies`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { strategies: Strategy[] };
      setStrategies(data.strategies);
    } catch {
      toast({ title: "Failed to load strategies", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function submitEval() {
    if (!selectedId) return;
    setSubmitting(true);
    setEvalResult(null);
    setSummaryData(null);
    try {
      const res = await fetch(`${BASE_URL}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_id: selectedId,
          mode: evalMode,
          dataset: { range: "1y", resolution: "1m" },
          options: { run_stress: runStress, run_refinement: runRefinement },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch((e: unknown) => { console.warn("Failed to parse error body:", e); return {}; }) as { error?: string };
        throw new Error(d.error ?? "Submit failed");
      }
      const data = await res.json() as { job_id: string; status: string };
      setJobId(data.job_id);
      setView("running");
      startPolling(data.job_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submit failed";
      toast({ title: "Evaluation failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function startPolling(jid: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/evaluate/${jid}`);
        if (!res.ok) return;
        const data = await res.json() as { status: string; result?: EvalJobResult; error?: string };
        if (data.status === "completed" && data.result) {
          if (pollRef.current) clearInterval(pollRef.current);
          setEvalResult(data.result);
          setView("results");
          if (!data.result.summary) fetchSummary();
        } else if (data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          toast({ title: "Evaluation failed", description: data.error ?? "Unknown error", variant: "destructive" });
          setView("select");
        }
      } catch { /* retry on next interval */ }
    }, 2000);
  }

  async function fetchSummary() {
    if (!selectedId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/evaluate/${selectedId}/summary`);
      if (!res.ok) return;
      const data = await res.json() as SummaryData;
      setSummaryData(data);
    } catch { /* non-critical */ }
  }

  async function fetchRankings() {
    setRankingsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/evaluate/rankings?limit=20`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { rankings: RankingEntry[] };
      setRankings(data.rankings);
      setView("rankings");
    } catch {
      toast({ title: "Failed to load rankings", variant: "destructive" });
    } finally {
      setRankingsLoading(false);
    }
  }

  async function fetchVersions(strategyId: number) {
    setVersionsLoading(true);
    setComparison(null);
    setCompareA(null);
    setCompareB(null);
    try {
      const res = await fetch(`${BASE_URL}/api/evaluate/${strategyId}/versions`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { versions: StrategyVersionEntry[] };
      setVersions(data.versions);
      setView("versions");
    } catch {
      toast({ title: "Failed to load version history", variant: "destructive" });
    } finally {
      setVersionsLoading(false);
    }
  }

  async function compareVersions() {
    if (!selectedId || !compareA || !compareB) return;
    setComparingLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/evaluate/${selectedId}/versions/compare?a=${encodeURIComponent(compareA)}&b=${encodeURIComponent(compareB)}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as VersionComparison;
      setComparison(data);
    } catch {
      toast({ title: "Failed to compare versions", variant: "destructive" });
    } finally {
      setComparingLoading(false);
    }
  }

  function resetToSelect() {
    if (pollRef.current) clearInterval(pollRef.current);
    setView("select");
    setJobId(null);
    setEvalResult(null);
    setSummaryData(null);
  }

  const selectedStrategy = strategies.find(s => s.id === selectedId);

  return (
    <PageErrorBoundary>
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {view !== "select" && (
                  <button onClick={resetToSelect} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-purple-500/20 border border-[#00D4FF]/30 flex items-center justify-center"
                  style={{ boxShadow: "0 0 20px rgba(0,212,255,0.1)" }}>
                  <Target className="w-5 h-5 text-[#00D4FF]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Multi-Model Evaluation</h1>
                  <p className="text-sm text-white/50">
                    {view === "select" ? "6-model scoring pipeline with stress testing & refinement" :
                     view === "running" ? "Evaluation pipeline running…" :
                     view === "rankings" ? "Strategy Rankings" :
                     view === "versions" ? `Version History${selectedStrategy ? ` — ${selectedStrategy.name}` : ""}` :
                     "Evaluation Results"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedId && (
                  <Button variant="outline" size="sm" onClick={() => fetchVersions(selectedId)} disabled={versionsLoading} className="border-white/10 text-white/60">
                    <GitBranch className="w-4 h-4 mr-1.5" />
                    Versions
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchRankings} disabled={rankingsLoading} className="border-white/10 text-white/60">
                  <Trophy className="w-4 h-4 mr-1.5" />
                  Rankings
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">

              {view === "select" && (
                <motion.div key="select" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                      <Activity className="w-6 h-6 text-[#00D4FF]" />
                      <div>
                        {loading ? <div className="h-6 w-8 bg-white/5 rounded animate-pulse" /> : <div className="text-xl font-bold text-white">{strategies.length}</div>}
                        <div className="text-xs text-white/40">Strategies</div>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                      <Gauge className="w-6 h-6 text-purple-400" />
                      <div>
                        <div className="text-xl font-bold text-white">6</div>
                        <div className="text-xs text-white/40">Scoring Models</div>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-orange-400" />
                      <div>
                        <div className="text-xl font-bold text-white">3</div>
                        <div className="text-xs text-white/40">Stress Scenarios</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Select Strategy to Evaluate</div>
                    {loading ? (
                      <EvalPipelineSkeleton />
                    ) : strategies.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <Target className="w-7 h-7 text-white/20" />
                        </div>
                        <p className="text-white/40 text-sm">No strategies found.</p>
                        <p className="text-white/25 text-xs mt-1">Create one in the Strategy Builder first.</p>
                        <a href="/strategy-builder" className="inline-block mt-3 text-xs text-[#00D4FF] hover:underline">Go to Strategy Builder →</a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {strategies.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedId(s.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                              selectedId === s.id
                                ? "border-[#00D4FF]/50 bg-[#00D4FF]/5"
                                : "border-white/8 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.02]"
                            }`}
                            style={selectedId === s.id ? { boxShadow: "0 0 20px rgba(0,212,255,0.06)" } : {}}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {selectedId === s.id && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" style={{ boxShadow: "0 0 6px #00D4FF" }} />
                                )}
                                <span className="font-semibold text-white text-sm">{s.name}</span>
                                <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded font-mono">{s.type.replace(/_/g, " ")}</span>
                                {s.isActive && (
                                  <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">Active</span>
                                )}
                              </div>
                              <div className="flex gap-2 text-xs text-white/30">
                                <span>{s.assets.slice(0, 3).join(", ")}{s.assets.length > 3 ? ` +${s.assets.length - 3}` : ""}</span>
                                <span>{s.timeframes[0]}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedId && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4"
                    >
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Evaluation Mode</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setEvalMode("fast")}
                          className={`p-3 rounded-xl border text-left transition-all ${evalMode === "fast" ? "border-[#00D4FF]/50 bg-[#00D4FF]/5" : "border-white/8 hover:border-white/15"}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-semibold text-white">Fast</span>
                            {evalMode === "fast" && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />}
                          </div>
                          <p className="text-xs text-white/40">Scores only — no stress or refinement</p>
                        </button>
                        <button
                          onClick={() => setEvalMode("deep")}
                          className={`p-3 rounded-xl border text-left transition-all ${evalMode === "deep" ? "border-purple-500/50 bg-purple-500/5" : "border-white/8 hover:border-white/15"}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-semibold text-white">Deep</span>
                            {evalMode === "deep" && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
                          </div>
                          <p className="text-xs text-white/40">Full pipeline with stress & refinement</p>
                        </button>
                      </div>

                      {evalMode === "deep" && (
                        <div className="flex gap-2 text-xs text-white/35 bg-purple-500/5 border border-purple-500/15 rounded-lg px-3 py-2">
                          <BarChart3 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span>Deep mode runs the full pipeline: M1–M6 scoring, stress testing (3 scenarios), and parameter refinement</span>
                        </div>
                      )}

                      <Button
                        onClick={submitEval}
                        disabled={submitting}
                        style={{ background: evalMode === "fast" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #00D4FF, #0099cc)", color: "#000", boxShadow: evalMode === "fast" ? "0 0 20px rgba(245,158,11,0.2)" : "0 0 20px rgba(0,212,255,0.2)" }}
                        className="font-semibold"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                        {evalMode === "fast" ? "Run Fast Evaluation" : "Run Deep Evaluation"}
                      </Button>
                    </motion.div>
                  )}

                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-3">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Scoring Models (M1–M6)</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(MODEL_LABELS).map(([key, label]) => (
                        <div key={key} className="bg-white/[0.02] border border-white/8 rounded-lg p-3 flex items-center gap-2 hover:border-white/15 transition-all">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: MODEL_COLORS[key], boxShadow: `0 0 6px ${MODEL_COLORS[key]}` }}
                          />
                          <div>
                            <div className="font-mono text-xs font-bold" style={{ color: MODEL_COLORS[key] }}>{key}</div>
                            <div className="text-white/50 text-xs">{label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {view === "running" && (
                <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RunningView jobId={jobId} />
                </motion.div>
              )}

              {view === "results" && evalResult && (
                <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                  <div className="flex items-center gap-3 flex-wrap">
                    {evalResult.decision && (() => {
                      const { status, reason } = evalResult.decision;
                      const badgeConfig = {
                        ACTIVE: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", glow: "rgba(34,197,94,0.15)", icon: <CheckCircle2 className="w-4 h-4" /> },
                        LIMITED: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", glow: "rgba(234,179,8,0.15)", icon: <AlertTriangle className="w-4 h-4" /> },
                        BLOCKED: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", glow: "rgba(239,68,68,0.15)", icon: <XCircle className="w-4 h-4" /> },
                      }[status];
                      return (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${badgeConfig.bg} ${badgeConfig.border}`}
                          style={{ boxShadow: `0 0 20px ${badgeConfig.glow}` }}>
                          <span className={badgeConfig.text}>{badgeConfig.icon}</span>
                          <span className={`font-bold font-mono text-sm ${badgeConfig.text}`}>{status}</span>
                          <span className="text-white/40 text-xs ml-1 hidden sm:inline">— {reason}</span>
                        </div>
                      );
                    })()}
                    {evalResult.metadata && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 bg-white/[0.02]">
                        {evalResult.metadata.mode === "fast"
                          ? <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          : <BarChart3 className="w-3.5 h-3.5 text-purple-400" />}
                        <span className="text-xs font-mono text-white/50 capitalize">{evalResult.metadata.mode} mode</span>
                        <span className="text-white/20 text-xs">· v{evalResult.metadata.engine_version}</span>
                      </div>
                    )}
                    {evalResult.version && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 bg-white/[0.02]">
                        <Hash className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-xs font-mono text-white/40">v{evalResult.version}</span>
                        {evalResult.version_hash && <span className="text-white/20 text-xs">{evalResult.version_hash}</span>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 flex flex-col items-center">
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Total Score</div>
                      <AnimatedGauge score={evalResult.score.total} label="TOTAL" size={180} />
                      <div className="mt-4 text-center">
                        <div className="text-xs text-white/40 mb-1">Confidence</div>
                        <div className="text-2xl font-bold text-[#00D4FF] font-mono" style={{ textShadow: "0 0 12px rgba(0,212,255,0.4)" }}>
                          {(evalResult.score.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-white/[0.02] border border-white/8 rounded-xl p-5">
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Model Score Radar</div>
                      <ModelRadar scores={evalResult.score.breakdown} />
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {Object.entries(evalResult.score.breakdown).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between bg-white/[0.03] border border-white/6 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: MODEL_COLORS[key] }} />
                              <span className="text-xs text-white/40">{MODEL_LABELS[key]?.split(" ")[0]}</span>
                            </div>
                            <span className="text-sm font-bold font-mono" style={{ color: MODEL_COLORS[key] }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Per-Model Rings</div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                      {Object.entries(evalResult.score.breakdown).map(([key, val]) => (
                        <ScoreRing key={key} score={val} size={80} label={`${key}\n${MODEL_LABELS[key]?.split(" ")[0]}`} color={MODEL_COLORS[key]} />
                      ))}
                    </div>
                  </div>

                  {evalResult.strategy_profile && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#00D4FF]" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Strategy Profile</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Type", value: evalResult.strategy_profile.type.replace(/_/g, " "), color: "#00d4ff" },
                          { label: "Speed", value: evalResult.strategy_profile.speed, color: "#f59e0b" },
                          { label: "Risk", value: evalResult.strategy_profile.risk.replace(/_/g, " "), color: evalResult.strategy_profile.risk === "low" ? "#10b981" : evalResult.strategy_profile.risk === "high" ? "#ef4444" : "#f59e0b" },
                          { label: "Dependency", value: evalResult.strategy_profile.dependency.replace(/_/g, " "), color: "#a78bfa" },
                        ].map(item => (
                          <div key={item.label} className="bg-white/[0.03] border border-white/6 rounded-lg p-3">
                            <div className="text-[10px] text-white/35 font-mono uppercase tracking-wider mb-1">{item.label}</div>
                            <div className="text-sm font-semibold capitalize" style={{ color: item.color }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {evalResult.stress && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Stress Test Results</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
                          <div className="text-xs text-white/40">Worst Drawdown</div>
                          <div className="text-xl font-bold text-red-400 font-mono mt-1">{evalResult.stress.worst_drawdown}%</div>
                        </div>
                        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3">
                          <div className="text-xs text-white/40">Recovery Time</div>
                          <div className="text-xl font-bold text-yellow-400 font-mono mt-1">{evalResult.stress.recovery_time}</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/8 rounded-lg p-3">
                          <div className="text-xs text-white/40">Failure Regimes</div>
                          <div className="text-sm font-semibold text-white/60 mt-1">
                            {evalResult.stress.failure_regimes.length > 0
                              ? evalResult.stress.failure_regimes.map(r => r.replace(/_/g, " ")).join(", ")
                              : <span className="text-green-400">None</span>}
                          </div>
                        </div>
                      </div>
                      {evalResult.stress.results && evalResult.stress.results.length > 0 && (
                        <div>
                          <div className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">Scenario Heatmap</div>
                          <HeatmapGrid results={evalResult.stress.results} />
                        </div>
                      )}
                    </div>
                  )}

                  {evalResult.failure_surface && evalResult.failure_surface.conditions.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Failure Surface</span>
                        <span className="text-[10px] font-mono text-red-400/60 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded ml-1">
                          {evalResult.failure_surface.conditions.length} condition{evalResult.failure_surface.conditions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {evalResult.failure_surface.conditions.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-2.5">
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className="text-sm text-white/70 capitalize flex-1">{c.regime.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-red-400" style={{ width: `${(c.confidence * 100).toFixed(0)}%` }} />
                              </div>
                              <span className="text-xs font-mono text-red-400">{(c.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {evalResult.refinement && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Parameter Refinement</span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ml-1 ${
                          evalResult.refinement.status === "ACCEPTED"
                            ? "bg-green-500/10 border-green-500/25 text-green-400"
                            : "bg-red-500/10 border-red-500/25 text-red-400"
                        }`}>
                          {evalResult.refinement.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/[0.02] border border-white/8 rounded-lg p-3 text-center">
                          <div className="text-xs text-white/40 mb-1">Before</div>
                          <div className="text-xl font-bold font-mono text-white/60">{evalResult.refinement.before_score.toFixed(1)}</div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/8 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                          <div className="text-xs text-white/40 mb-1">Change</div>
                          <div className={`text-lg font-bold font-mono ${evalResult.refinement.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {evalResult.refinement.change >= 0 ? "+" : ""}{evalResult.refinement.change.toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/8 rounded-lg p-3 text-center">
                          <div className="text-xs text-white/40 mb-1">After</div>
                          <div className="text-xl font-bold font-mono text-[#00D4FF]">{evalResult.refinement.after_score.toFixed(1)}</div>
                        </div>
                      </div>
                      <p className="text-xs text-white/40 italic">{evalResult.refinement.reason}</p>
                      {evalResult.refinement.suggestions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {evalResult.refinement.suggestions.map((r, i) => (
                            <BeforeAfterCard key={i} param={r.param} oldValue={r.old} newValue={r.new} impact={r.impact} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(evalResult.summary ?? summaryData) && (() => {
                    const sd = evalResult.summary ?? summaryData!;
                    return (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#00D4FF]" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Strategy Summary</span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{sd.summary}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-green-400 mb-1">Strengths</div>
                          <div className="flex flex-wrap gap-1">
                            {sd.strengths.map(s => (
                              <span key={s} className="px-2 py-0.5 rounded text-xs bg-green-500/10 border border-green-500/20 text-green-400 capitalize">{s}</span>
                            ))}
                            {sd.strengths.length === 0 && <span className="text-xs text-white/30">None identified</span>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-red-400 mb-1">Weaknesses</div>
                          <div className="flex flex-wrap gap-1">
                            {sd.weaknesses.map(w => (
                              <span key={w} className="px-2 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/20 text-red-400 capitalize">{w}</span>
                            ))}
                            {sd.weaknesses.length === 0 && <span className="text-xs text-white/30">None identified</span>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#00D4FF] mb-1">Best Conditions</div>
                          <div className="flex flex-wrap gap-1">
                            {sd.best_conditions.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded text-xs bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] capitalize">{c}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-orange-400 mb-1">Break Conditions</div>
                          <div className="flex flex-wrap gap-1">
                            {sd.break_conditions.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 capitalize">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}

                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={resetToSelect} className="border-white/10 text-white/60">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Evaluate Another
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchRankings} className="border-white/10 text-white/60">
                      <Trophy className="w-4 h-4 mr-1" /> View Rankings
                    </Button>
                  </div>
                </motion.div>
              )}

              {view === "rankings" && (
                <motion.div key="rankings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Strategy Rankings</div>
                    {rankings.length === 0 ? (
                      <div className="text-center py-10">
                        <Trophy className="w-10 h-10 text-white/15 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No evaluation results yet.</p>
                        <p className="text-white/25 text-xs mt-1">Run evaluations to populate rankings.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rankings.map(r => (
                          <motion.div
                            key={r.rank}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: r.rank * 0.05 }}
                            className="flex items-center gap-4 bg-white/[0.02] border border-white/8 rounded-lg p-3 hover:border-white/15 transition-all"
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                              r.rank === 1 ? "bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30" :
                              r.rank === 2 ? "bg-gray-400/15 text-gray-300 border border-gray-400/30" :
                              r.rank === 3 ? "bg-orange-600/15 text-orange-400 border border-orange-600/30" :
                              "bg-white/5 text-white/30 border border-white/10"
                            }`}
                              style={r.rank <= 3 ? { boxShadow: `0 0 12px ${r.rank === 1 ? "rgba(255,215,0,0.1)" : r.rank === 2 ? "rgba(160,160,160,0.1)" : "rgba(255,140,0,0.1)"}` } : {}}
                            >
                              {r.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-white text-sm">{r.strategy_name}</div>
                              <div className="text-xs text-white/25 font-mono">ID: {r.strategy_id}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-bold font-mono ${
                                r.score >= 80 ? "text-[#00D4FF]" : r.score >= 60 ? "text-yellow-400" : "text-red-400"
                              }`} style={{ textShadow: r.score >= 80 ? "0 0 10px rgba(0,212,255,0.3)" : "none" }}>
                                {r.score.toFixed(1)}
                              </div>
                              <div className="text-xs text-white/25">{(r.confidence * 100).toFixed(0)}% conf</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {view === "versions" && (
                <motion.div key="versions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Version Timeline</span>
                      </div>
                      <span className="text-xs text-white/30">{versions.length} version{versions.length !== 1 ? "s" : ""}</span>
                    </div>

                    {versionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF]" />
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="text-center py-8">
                        <GitBranch className="w-10 h-10 text-white/15 mx-auto mb-3" />
                        <p className="text-white/40 text-sm">No versions recorded yet.</p>
                        <p className="text-white/25 text-xs mt-1">Run a refinement to auto-create versions.</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-white/10" />
                        <div className="space-y-3">
                          {versions.map((v, idx) => (
                            <div key={v.id} className="relative flex gap-4">
                              <div className="flex-shrink-0 z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                  idx === versions.length - 1
                                    ? "border-[#00D4FF] bg-[#00D4FF]/10"
                                    : v.origin === "refinement_engine"
                                      ? "border-purple-400 bg-purple-400/10"
                                      : "border-white/20 bg-white/5"
                                }`}
                                  style={idx === versions.length - 1 ? { boxShadow: "0 0 12px rgba(0,212,255,0.2)" } : {}}>
                                  {v.origin === "refinement_engine" ? (
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                  ) : (
                                    <GitCommit className="w-4 h-4 text-white/40" />
                                  )}
                                </div>
                              </div>
                              <div className={`flex-1 bg-white/[0.02] border rounded-xl p-4 transition-all ${
                                (compareA === v.version || compareB === v.version)
                                  ? "border-[#00D4FF]/50 bg-[#00D4FF]/5"
                                  : "border-white/8 hover:border-white/15"
                              }`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-white text-sm">v{v.version}</span>
                                      <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <Hash className="w-3 h-3" />{v.version_hash}
                                      </span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                        v.origin === "refinement_engine"
                                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                          : "bg-white/5 text-white/30 border-white/10"
                                      }`}>
                                        {v.origin === "refinement_engine" ? "refinement" : "manual"}
                                      </span>
                                    </div>
                                    {v.notes && <p className="text-xs text-white/40 mt-1">{v.notes}</p>}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(v.created_at).toLocaleDateString()} {new Date(v.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      {v.score_snapshot.score_total != null && (
                                        <span className={`font-mono font-bold ${(v.score_snapshot.score_total ?? 0) >= 80 ? "text-[#00D4FF]" : (v.score_snapshot.score_total ?? 0) >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                                          {v.score_snapshot.score_total?.toFixed(1)}
                                        </span>
                                      )}
                                    </div>
                                    {v.changes && v.changes.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {v.changes.map((c, ci) => (
                                          <span key={ci} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">
                                            {c.field.replace("parameters.", "")}: {String(c.old)} → {String(c.new)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (!compareA || (compareA && compareB)) {
                                        setCompareA(v.version);
                                        setCompareB(null);
                                        setComparison(null);
                                      } else if (compareA !== v.version) {
                                        setCompareB(v.version);
                                      }
                                    }}
                                    className={`flex-shrink-0 p-1.5 rounded-lg border transition-all text-xs ${
                                      compareA === v.version ? "border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF]" :
                                      compareB === v.version ? "border-purple-400/50 bg-purple-400/10 text-purple-400" :
                                      "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50"
                                    }`}
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {compareA && compareB && (
                    <div className="flex justify-center">
                      <Button
                        onClick={compareVersions}
                        disabled={comparingLoading}
                        style={{ background: "linear-gradient(135deg, #00D4FF, #0099cc)", color: "#000" }}
                        className="font-semibold"
                      >
                        {comparingLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-1.5" />}
                        Compare v{compareA} vs v{compareB}
                      </Button>
                    </div>
                  )}

                  {comparison && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-5">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-[#00D4FF]" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          Comparison: v{comparison.version_a.version} vs v{comparison.version_b.version}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {[comparison.version_a, comparison.version_b].map((v, i) => (
                          <div key={i} className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-semibold" style={{ color: i === 0 ? "#00D4FF" : "#a78bfa" }}>v{v.version}</span>
                              <span className="text-[10px] font-mono text-white/20">{v.version_hash}</span>
                            </div>
                            <div className="space-y-1.5">
                              {v.score_total != null && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/40">Score</span>
                                  <span className={`text-sm font-bold font-mono ${v.score_total >= 80 ? "text-[#00D4FF]" : v.score_total >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                                    {v.score_total.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {v.confidence != null && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/40">Confidence</span>
                                  <span className="text-sm font-mono text-white/70">{(v.confidence * 100).toFixed(0)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {comparison.diff.parameter_changes.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Parameter Changes</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {comparison.diff.parameter_changes.map((c, i) => (
                              <BeforeAfterCard
                                key={i}
                                param={c.field.replace("parameters.", "")}
                                oldValue={Number(c.old)}
                                newValue={Number(c.new)}
                                impact="version change"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>

          </div>
        </div>
      </Layout>
    </PageErrorBoundary>
  );
}
