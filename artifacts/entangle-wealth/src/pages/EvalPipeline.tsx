import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Loader2, Play, ChevronLeft, Trophy, Shield, Wrench, FileText,
  BarChart3, Zap, AlertTriangle, CheckCircle2, XCircle, Target,
  TrendingUp, Activity, Gauge,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

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
  score_total: number;
  scores: EvalScores;
  confidence: number;
  stress: {
    worst_drawdown: number;
    failure_regimes: string[];
    recovery_time: string;
    results?: StressResult[];
  } | null;
  refinements: RefinementSuggestion[] | null;
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

const MODEL_LABELS: Record<string, string> = {
  M1: "Trend Alignment",
  M2: "Mean Reversion",
  M3: "Momentum",
  M4: "Volatility",
  M5: "Volume",
  M6: "Signal Logic",
};

function ScoreGauge({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const circ = Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#00FF41" : score >= 60 ? "#FFD700" : "#FF4444";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <path
          d={`M 6 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d={`M 6 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" fill={color} fontSize="24" fontWeight="bold" fontFamily="monospace">
          {score.toFixed(1)}
        </text>
      </svg>
      {label && <span className="text-xs text-white/40 mt-1">{label}</span>}
    </div>
  );
}

function ModelRadar({ scores }: { scores: EvalScores }) {
  const data = Object.entries(scores).map(([key, value]) => ({
    model: MODEL_LABELS[key] ?? key,
    score: value,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="model" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Score" dataKey="score" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.15} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function StressChart({ results }: { results: StressResult[] }) {
  const data = results.map(r => ({
    scenario: r.scenario.replace(/_/g, " "),
    score: r.score,
    drawdown: Math.abs(r.max_drawdown),
    failure: r.failure,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="scenario" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: "#0D1321", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "rgba(255,255,255,0.7)" }}
        />
        <Bar dataKey="score" fill="#00D4FF" radius={[4, 4, 0, 0]} />
        <Bar dataKey="drawdown" fill="#FF8C00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type ViewMode = "select" | "running" | "results" | "rankings";

export default function EvalPipeline() {
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("select");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [runStress, setRunStress] = useState(true);
  const [runRefinement, setRunRefinement] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<EvalJobResult | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          fetchSummary();
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-purple-500/20 border border-[#00D4FF]/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#00D4FF]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Multi-Model Evaluation</h1>
                  <p className="text-sm text-white/50">
                    {view === "select" ? "6-model scoring pipeline with stress testing & refinement" :
                     view === "running" ? "Evaluation in progress..." :
                     view === "rankings" ? "Strategy Rankings" :
                     "Evaluation Results"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRankings} disabled={rankingsLoading} className="border-white/10 text-white/60">
                <Trophy className="w-4 h-4 mr-1.5" />
                Rankings
              </Button>
            </div>

            {view === "select" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                    <Activity className="w-6 h-6 text-[#00D4FF]" />
                    <div>
                      <div className="text-xl font-bold text-white">{strategies.length}</div>
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
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF]" />
                    </div>
                  ) : strategies.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/40 text-sm">No strategies found. Create one in the Strategy Builder first.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {strategies.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedId(s.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === s.id ? "border-[#00D4FF]/50 bg-[#00D4FF]/5" : "border-white/8 bg-white/[0.01] hover:border-white/15"}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-white text-sm">{s.name}</span>
                              <span className="text-xs text-white/30 ml-2">{s.type.replace(/_/g, " ")}</span>
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
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Evaluation Options</div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={runStress} onChange={e => setRunStress(e.target.checked)} className="accent-[#00D4FF]" />
                        <span className="text-sm text-white/70">Run Stress Tests</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={runRefinement} onChange={e => setRunRefinement(e.target.checked)} className="accent-[#00D4FF]" />
                        <span className="text-sm text-white/70">Run Parameter Refinement</span>
                      </label>
                    </div>

                    <Button onClick={submitEval} disabled={submitting} className="bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-black font-semibold">
                      {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                      Run Full Evaluation
                    </Button>
                  </div>
                )}

                <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-3">
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Scoring Models (M1-M6)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(MODEL_LABELS).map(([key, label]) => (
                      <div key={key} className="bg-white/[0.02] border border-white/8 rounded-lg p-3">
                        <div className="text-[#00D4FF] font-mono text-xs font-bold">{key}</div>
                        <div className="text-white/60 text-xs mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === "running" && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
                  <Target className="w-8 h-8 text-[#00D4FF] absolute inset-0 m-auto" />
                </div>
                <p className="text-white/60 text-sm">Running 6-model evaluation pipeline...</p>
                <p className="text-white/30 text-xs font-mono">Job: {jobId}</p>
                <div className="flex gap-2 mt-2">
                  {["M1", "M2", "M3", "M4", "M5", "M6"].map((m, i) => (
                    <div key={m} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === "results" && evalResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 flex flex-col items-center">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Total Score</div>
                    <ScoreGauge score={evalResult.score_total} size={160} />
                    <div className="mt-3 text-center">
                      <div className="text-xs text-white/40">Confidence</div>
                      <div className="text-lg font-bold text-[#00D4FF] font-mono">{(evalResult.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white/[0.02] border border-white/8 rounded-xl p-5">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Model Scores</div>
                    <ModelRadar scores={evalResult.scores} />
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {Object.entries(evalResult.scores).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                          <span className="text-xs text-white/40">{MODEL_LABELS[key]}</span>
                          <span className={`text-sm font-bold font-mono ${val >= 80 ? "text-[#00FF41]" : val >= 60 ? "text-[#FFD700]" : "text-red-400"}`}>
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {evalResult.stress && (
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Stress Test Results</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3">
                        <div className="text-xs text-white/40">Worst Drawdown</div>
                        <div className="text-lg font-bold text-red-400 font-mono">{evalResult.stress.worst_drawdown}%</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3">
                        <div className="text-xs text-white/40">Recovery Time</div>
                        <div className="text-lg font-bold text-[#FFD700] font-mono">{evalResult.stress.recovery_time}</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/8 rounded-lg p-3">
                        <div className="text-xs text-white/40">Failure Regimes</div>
                        <div className="text-sm font-semibold text-white/70">
                          {evalResult.stress.failure_regimes.length > 0
                            ? evalResult.stress.failure_regimes.map(r => r.replace(/_/g, " ")).join(", ")
                            : "None"}
                        </div>
                      </div>
                    </div>
                    {evalResult.stress.results && evalResult.stress.results.length > 0 && (
                      <div>
                        <StressChart results={evalResult.stress.results} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                          {evalResult.stress.results.map(r => (
                            <div key={r.scenario} className={`flex items-center gap-2 p-2 rounded-lg border ${r.failure ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-green-500/5"}`}>
                              {r.failure ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-white/70 capitalize">{r.scenario.replace(/_/g, " ")}</div>
                                <div className="text-xs text-white/40">Score: {r.score} | DD: {r.max_drawdown.toFixed(1)}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {evalResult.refinements && evalResult.refinements.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Parameter Refinements</span>
                    </div>
                    <div className="space-y-2">
                      {evalResult.refinements.map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/8 rounded-lg px-4 py-3">
                          <div>
                            <span className="text-sm font-mono text-white/70">{r.param}</span>
                            <div className="flex items-center gap-2 text-xs mt-0.5">
                              <span className="text-white/30">{r.old}</span>
                              <span className="text-white/20">→</span>
                              <span className="text-[#00D4FF] font-semibold">{r.new}</span>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[#00FF41] bg-[#00FF41]/10 px-2 py-1 rounded">{r.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summaryData && (
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00D4FF]" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Strategy Summary</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{summaryData.summary}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-green-400 mb-1">Strengths</div>
                        <div className="flex flex-wrap gap-1">
                          {summaryData.strengths.map(s => (
                            <span key={s} className="px-2 py-0.5 rounded text-xs bg-green-500/10 border border-green-500/20 text-green-400 capitalize">{s}</span>
                          ))}
                          {summaryData.strengths.length === 0 && <span className="text-xs text-white/30">None identified</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-red-400 mb-1">Weaknesses</div>
                        <div className="flex flex-wrap gap-1">
                          {summaryData.weaknesses.map(w => (
                            <span key={w} className="px-2 py-0.5 rounded text-xs bg-red-500/10 border border-red-500/20 text-red-400 capitalize">{w}</span>
                          ))}
                          {summaryData.weaknesses.length === 0 && <span className="text-xs text-white/30">None identified</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#00D4FF] mb-1">Best Conditions</div>
                        <div className="flex flex-wrap gap-1">
                          {summaryData.best_conditions.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded text-xs bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] capitalize">{c}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#FF8C00] mb-1">Break Conditions</div>
                        <div className="flex flex-wrap gap-1">
                          {summaryData.break_conditions.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded text-xs bg-[#FF8C00]/10 border border-[#FF8C00]/20 text-[#FF8C00] capitalize">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Score Drivers</div>
                      <div className="space-y-1">
                        {Object.entries(summaryData.score_drivers).map(([key, desc]) => (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <span className="text-[#00D4FF] font-mono font-bold min-w-[24px]">{key}</span>
                            <span className="text-white/50">{desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={resetToSelect} className="border-white/10 text-white/60">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Evaluate Another
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchRankings} className="border-white/10 text-white/60">
                    <Trophy className="w-4 h-4 mr-1" /> View Rankings
                  </Button>
                </div>
              </div>
            )}

            {view === "rankings" && (
              <div className="space-y-4">
                <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5">
                  <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Strategy Rankings</div>
                  {rankings.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/40 text-sm">No evaluation results yet. Run evaluations to populate rankings.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rankings.map(r => (
                        <div key={r.rank} className="flex items-center gap-4 bg-white/[0.02] border border-white/8 rounded-lg p-3 hover:border-white/15 transition-all">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${r.rank === 1 ? "bg-[#FFD700]/20 text-[#FFD700]" : r.rank === 2 ? "bg-gray-400/20 text-gray-300" : r.rank === 3 ? "bg-orange-600/20 text-orange-400" : "bg-white/5 text-white/30"}`}>
                            {r.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white text-sm">{r.strategy_name}</div>
                            <div className="text-xs text-white/30">ID: {r.strategy_id}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold font-mono ${r.score >= 80 ? "text-[#00FF41]" : r.score >= 60 ? "text-[#FFD700]" : "text-red-400"}`}>
                              {r.score.toFixed(1)}
                            </div>
                            <div className="text-xs text-white/30">{(r.confidence * 100).toFixed(0)}% conf</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </Layout>
    </PageErrorBoundary>
  );
}
