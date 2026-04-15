import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, TrendingUp, TrendingDown, RefreshCw, Activity,
  ChevronUp, ChevronDown, ChevronsUpDown, Play, Clock, Zap,
  BarChart3, Shield, Target, ArrowRight, Loader2, Layers,
  ShieldCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
} from "recharts";

// ─── Shared ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ─── Task #154 – Strategy Signals (real-time engine) ─────────────────────────

interface SignalOpportunity {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  expectedReturn: number;
  riskScore: number;
  winRate: number;
  maxDrawdown: number;
  score: number;
  strategyId: string;
  strategyName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

interface SignalMeta {
  count: number;
  generatedAt: string | null;
  cached: boolean;
}

interface EngineStatus {
  lastRunAt: string | null;
  nextRunAt: string | null;
  isRunning: boolean;
  stocksScanned: number;
  strategiesEvaluated: number;
  signalsGenerated: number;
  totalRunTimeMs: number;
  runCount: number;
  errors: number;
}

type SortField = "score" | "confidence" | "expectedReturn" | "riskScore" | "winRate" | "symbol" | "action" | "maxDrawdown";
type SortDir = "asc" | "desc";
type FilterAction = "all" | "BUY" | "SELL";
type FilterRisk = "all" | "LOW" | "MEDIUM" | "HIGH";

function riskBadge(level: string) {
  if (level === "LOW") return "bg-green-500/15 text-green-400 border-green-500/20";
  if (level === "MEDIUM") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
  return "bg-red-500/15 text-red-400 border-red-500/20";
}

function actionColor(action: string) {
  if (action === "BUY") return "text-[#00d4ff]";
  if (action === "SELL") return "text-[#ff3366]";
  return "text-white/40";
}

function actionBg(action: string) {
  if (action === "BUY") return "bg-[#00d4ff]/10 border-[#00d4ff]/20 text-[#00d4ff]";
  if (action === "SELL") return "bg-[#ff3366]/10 border-[#ff3366]/20 text-[#ff3366]";
  return "bg-white/5 border-white/10 text-white/40";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function SignalsTab() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [signals, setSignals] = useState<SignalOpportunity[]>([]);
  const [meta, setMeta] = useState<SignalMeta | null>(null);
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterAction, setFilterAction] = useState<FilterAction>("all");
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("all");
  const [search, setSearch] = useState("");

  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BASE_URL}/api/quant/signals`);
      if (!res.ok) throw new Error(`Failed to fetch signals: ${res.status}`);
      const data = await res.json() as { signals: SignalOpportunity[]; meta: SignalMeta };
      setSignals(data.signals ?? []);
      setMeta(data.meta ?? null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load signals");
      toast({ title: "Failed to load signals", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/quant/status`);
      if (!res.ok) return;
      const data = await res.json() as EngineStatus;
      setStatus(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchSignals, fetchStatus]);

  const triggerRun = useCallback(async () => {
    try {
      setTriggering(true);
      const res = await fetch(`${BASE_URL}/api/quant/run`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to trigger run");
      }
      toast({ title: "Engine run triggered", description: "Results will update in ~1–3 minutes." });
      setTimeout(() => { fetchSignals(); fetchStatus(); }, 5_000);
    } catch (err: any) {
      toast({ title: "Trigger failed", description: err.message, variant: "destructive" });
    } finally {
      setTriggering(false);
    }
  }, [toast, fetchSignals, fetchStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredSorted = useMemo(() => {
    let result = [...signals];
    if (filterAction !== "all") result = result.filter(s => s.action === filterAction);
    if (filterRisk !== "all") result = result.filter(s => s.riskLevel === filterRisk);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        s.strategyName.toLowerCase().includes(q) ||
        s.strategyId.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      let av: number | string = a[sortField] as number | string;
      let bv: number | string = b[sortField] as number | string;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [signals, sortField, sortDir, filterAction, filterRisk, search]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const SortTh = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-white/50 cursor-pointer hover:text-white/80 select-none"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  );

  const buyCount = signals.filter(s => s.action === "BUY").length;
  const sellCount = signals.filter(s => s.action === "SELL").length;
  const avgConfidence = signals.length
    ? (signals.reduce((a, b) => a + b.confidence, 0) / signals.length).toFixed(1)
    : "—";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => { fetchSignals(); fetchStatus(); }} disabled={loading} className="border-white/10 text-white/70 hover:text-white hover:bg-white/5">
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button size="sm" onClick={triggerRun} disabled={triggering || status?.isRunning} className="bg-purple-600 hover:bg-purple-700 text-white">
          {triggering || status?.isRunning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
          {status?.isRunning ? "Running..." : "Run Now"}
        </Button>
      </div>

      {/* Engine Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          {
            icon: Activity,
            label: "Status",
            value: status?.isRunning ? "Running" : status ? "Idle" : "—",
            cls: status?.isRunning ? "text-yellow-400" : "text-green-400",
            pulse: status?.isRunning,
          },
          { icon: Clock, label: "Last Run", value: formatRelative(status?.lastRunAt ?? null), cls: "text-white/70", pulse: false },
          { icon: BarChart3, label: "Stocks Scanned", value: status?.stocksScanned?.toLocaleString() ?? "—", cls: "text-[#00d4ff]/80", pulse: false },
          {
            icon: Zap,
            label: "Strategies Run",
            value: status?.strategiesEvaluated != null ? (status.strategiesEvaluated >= 1000 ? `${(status.strategiesEvaluated / 1000).toFixed(1)}k` : status.strategiesEvaluated.toLocaleString()) : "—",
            cls: "text-purple-400/80",
            pulse: false,
          },
          { icon: Target, label: "Signals Found", value: status?.signalsGenerated?.toLocaleString() ?? "—", cls: "text-white/70", pulse: false },
          { icon: Zap, label: "Run Time", value: status?.totalRunTimeMs ? formatDuration(status.totalRunTimeMs) : "—", cls: "text-white/60", pulse: false },
        ].map(({ icon: Icon, label, value, cls, pulse }) => (
          <div
            key={label}
            className="bg-white/[0.03] border border-white/8 rounded-xl p-3 transition-all"
            style={pulse ? { borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)", boxShadow: "0 0 12px rgba(251,191,36,0.05)" } : {}}
          >
            <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
              <Icon className="w-3 h-3" /> {label}
              {pulse && (
                <span className="ml-auto relative flex">
                  <span className="animate-ping absolute h-1.5 w-1.5 rounded-full bg-yellow-400 opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-yellow-400" />
                </span>
              )}
            </div>
            <div className={`text-sm font-semibold font-mono ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      {signals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/15 rounded-xl p-4 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-[#00d4ff]" />
            <div><div className="text-2xl font-bold text-[#00d4ff]">{buyCount}</div><div className="text-xs text-white/50">BUY Signals</div></div>
          </div>
          <div className="bg-[#ff3366]/5 border border-[#ff3366]/15 rounded-xl p-4 flex items-center gap-3">
            <TrendingDown className="w-7 h-7 text-[#ff3366]" />
            <div><div className="text-2xl font-bold text-[#ff3366]">{sellCount}</div><div className="text-xs text-white/50">SELL Signals</div></div>
          </div>
          <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-400" />
            <div><div className="text-2xl font-bold text-purple-400">{avgConfidence}%</div><div className="text-xs text-white/50">Avg Confidence</div></div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search symbol or strategy..."
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 w-52"
        />
        <div className="flex gap-1">
          {(["all", "BUY", "SELL"] as FilterAction[]).map(f => (
            <button key={f} onClick={() => setFilterAction(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterAction === f ? f === "BUY" ? "bg-[#00d4ff]/15 border-[#00d4ff]/30 text-[#00d4ff]" : f === "SELL" ? "bg-[#ff3366]/15 border-[#ff3366]/30 text-[#ff3366]" : "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/10 text-white/50 hover:text-white/80"}`}>
              {f === "all" ? "All Actions" : f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "LOW", "MEDIUM", "HIGH"] as FilterRisk[]).map(f => (
            <button key={f} onClick={() => setFilterRisk(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterRisk === f ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/10 text-white/50 hover:text-white/80"}`}>
              {f === "all" ? "All Risk" : f}
            </button>
          ))}
        </div>
        <div className="text-xs text-white/30 ml-auto">
          {filteredSorted.length} of {signals.length} signals
          {meta?.generatedAt && <span> · {meta.cached ? "cached" : "live"} · {formatRelative(meta.generatedAt)}</span>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-white/50 text-sm">Loading quant signals…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-red-400 text-sm">{error}</div>
            <Button size="sm" onClick={fetchSignals} variant="outline" className="border-white/10">Retry</Button>
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Brain className="w-10 h-10 text-white/20" />
            <p className="text-white/40 text-sm">{signals.length === 0 ? "No signals yet. Click \"Run Now\" to trigger the engine." : "No signals match your filters."}</p>
            {signals.length === 0 && (
              <Button size="sm" onClick={triggerRun} disabled={triggering} className="bg-purple-600 hover:bg-purple-700">
                <Play className="w-4 h-4 mr-1.5" /> Run Engine
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.02]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-white/50 w-8">#</th>
                  <SortTh field="symbol">Symbol</SortTh>
                  <SortTh field="action">Action</SortTh>
                  <SortTh field="confidence">Confidence</SortTh>
                  <SortTh field="expectedReturn">Exp. Return</SortTh>
                  <SortTh field="winRate">Win Rate</SortTh>
                  <SortTh field="maxDrawdown">Max DD</SortTh>
                  <SortTh field="riskScore">Risk Level</SortTh>
                  <SortTh field="score">Score</SortTh>
                  <th className="px-3 py-2 text-left text-xs font-medium text-white/50">Strategy</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filteredSorted.map((signal, idx) => {
                  const actionCol = signal.action === "BUY" ? "#00d4ff" : signal.action === "SELL" ? "#ff3366" : "rgba(255,255,255,0.4)";
                  const scoreCol = signal.score >= 70 ? "#00d4ff" : signal.score >= 50 ? "#a78bfa" : "#ff3366";
                  return (
                    <tr
                      key={`${signal.symbol}-${signal.strategyId}`}
                      className="transition-all group"
                      style={{}}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                    >
                      <td className="px-3 py-2.5 text-white/20 text-xs font-mono">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-white font-mono">{signal.symbol}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${actionBg(signal.action)}`}
                          style={{ boxShadow: `0 0 8px ${actionCol}15` }}
                        >
                          {signal.action === "BUY" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {signal.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${signal.confidence}%`,
                                background: `linear-gradient(90deg, ${actionCol}60, ${actionCol})`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium" style={{ color: actionCol }}>{signal.confidence.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-semibold font-mono ${signal.expectedReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {signal.expectedReturn >= 0 ? "+" : ""}{signal.expectedReturn.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-mono ${signal.winRate >= 50 ? "text-green-400/80" : "text-white/50"}`}>
                          {signal.winRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-mono ${Math.abs(signal.maxDrawdown) > 20 ? "text-red-400/80" : "text-white/50"}`}>
                          {signal.maxDrawdown.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${riskBadge(signal.riskLevel)}`}>
                          {signal.riskLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, signal.score)}%`,
                                background: scoreCol,
                                boxShadow: `0 0 6px ${scoreCol}40`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold font-mono" style={{ color: scoreCol }}>{signal.score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <div className="truncate text-xs text-white/40" title={signal.strategyName}>{signal.strategyName}</div>
                        <div className="text-[10px] text-white/20 font-mono truncate">{signal.strategyId}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => navigate(`/technical?symbol=${signal.symbol}`)}
                          className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-white/8 text-white/30 hover:text-[#00d4ff]"
                          title={`Open ${signal.symbol} in Technical Analysis`}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-white/25 text-center pb-4">
        Quant signals are generated from deterministic indicator logic on real Alpaca market data. This is not financial advice.
        All strategy outputs represent historical backtest performance and do not guarantee future results.
      </p>
    </div>
  );
}

// ─── Task #155 – Multi-Model Evaluation Pipeline ──────────────────────────────

interface ModelScoreEntry {
  modelId: string;
  modelName: string;
  score: number;
  confidence: number;
  details: Record<string, unknown>;
}

interface StressScenario {
  scenarioId: string;
  scenarioName: string;
  description: string;
  impactScore: number;
  survived: boolean;
  penalty: number;
}

interface StressResult {
  strategy_id: string;
  scenarios: StressScenario[];
  resilienceScore: number;
  totalPenalty: number;
  failedScenarios: number;
}

interface RefinementIteration {
  iteration: number;
  adjustments: { description?: string };
  compositeBefore: number;
  compositeAfter: number;
  improved: boolean;
}

interface RefinementResult {
  strategy_id: string;
  iterations: RefinementIteration[];
  finalScore: number;
  totalIterations: number;
  improved: boolean;
}

interface EvaluatedStrategy {
  strategy_id: string;
  symbol: string;
  action: "buy" | "sell" | "hold";
  price: number;
  sector: string;
  score_total: number;
  scores: { M1: number; M2: number; M3: number; M4: number; M5: number; M6: number };
  confidence: number;
  modelDetails: ModelScoreEntry[];
  stressResult: StressResult | null;
  refinementResult: RefinementResult | null;
  rank?: number;
  evaluatedAt: string;
}

interface PipelineResult {
  total_evaluated: number;
  top_100: EvaluatedStrategy[];
  pipeline_version: string;
  ran_at: string;
}

const MODEL_COLORS: Record<string, string> = {
  M1: "#00B4D8", M2: "#FFB800", M3: "#9c27b0",
  M4: "#00C49F", M5: "#FF6B6B", M6: "#4CAF50",
};

const ACTION_COLORS: Record<string, string> = {
  buy: "#00C49F", sell: "#ff3366", hold: "#FFB800",
};

function ScoreGauge({ score, color = "#00B4D8" }: { score: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const circumference = 2 * Math.PI * 28;
  const dash = (pct / 100) * circumference;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <circle cx="36" cy="36" r="28" fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round"
        transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray 0.5s ease" }} />
      <text x="36" y="40" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="monospace">
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function ModelRadar({ modelDetails }: { modelDetails: ModelScoreEntry[] }) {
  const data = modelDetails.map(m => ({ subject: m.modelId, score: m.score, fullMark: 100 }));
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace" }} />
        <Radar name="Score" dataKey="score" stroke="#00B4D8" fill="#00B4D8" fillOpacity={0.25} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function ModelBars({ modelDetails }: { modelDetails: ModelScoreEntry[] }) {
  const data = modelDetails.map(m => ({ name: m.modelId, score: Math.round(m.score), confidence: Math.round(m.confidence) }));
  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontFamily: "monospace" }} labelStyle={{ color: "#fff" }} formatter={(val: number, name: string) => [`${val}`, name === "score" ? "Score" : "Confidence"]} />
        <Bar dataKey="score" radius={[2, 2, 0, 0]}>
          {data.map(entry => <Cell key={entry.name} fill={MODEL_COLORS[entry.name] ?? "#00B4D8"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StressBadges({ stressResult }: { stressResult: StressResult }) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {stressResult.scenarios.map(sc => (
        <div key={sc.scenarioId}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${sc.survived ? "border-[#00C49F]/40 text-[#00C49F] bg-[#00C49F]/10" : "border-[#ff3366]/40 text-[#ff3366] bg-[#ff3366]/10"}`}
          title={sc.description}>
          {sc.survived ? <ShieldCheck className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
          {sc.scenarioName}
        </div>
      ))}
      <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-white/40">
        Resilience: {stressResult.resilienceScore.toFixed(0)}
      </div>
    </div>
  );
}

function RefinementBadge({ refinementResult }: { refinementResult: RefinementResult }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${refinementResult.improved ? "border-[#FFB800]/40 text-[#FFB800] bg-[#FFB800]/10" : "border-white/10 text-white/30 bg-white/5"}`}>
      <Zap className="w-2.5 h-2.5" />
      {refinementResult.improved ? `Refined +${(refinementResult.finalScore - (refinementResult.iterations[0]?.compositeBefore ?? 0)).toFixed(1)}` : "No improvement"}
      ({refinementResult.totalIterations} iter)
    </div>
  );
}

function StrategyCard({ strategy, expanded, onToggle }: { strategy: EvaluatedStrategy; expanded: boolean; onToggle: () => void }) {
  const actionColor2 = ACTION_COLORS[strategy.action] ?? "#fff";
  const scoreColor = strategy.score_total >= 70 ? "#00C49F" : strategy.score_total >= 50 ? "#FFB800" : "#ff3366";
  return (
    <div className="bg-[#0A0E1A] border border-white/[0.06] rounded mb-2 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={onToggle}>
        <span className="text-white/30 font-mono text-[10px] w-6 text-right">#{strategy.rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white text-sm">{strategy.symbol}</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase" style={{ color: actionColor2, background: `${actionColor2}15`, border: `1px solid ${actionColor2}30` }}>{strategy.action}</span>
            <span className="text-white/30 font-mono text-[9px]">${strategy.price.toFixed(2)}</span>
            <span className="text-white/20 font-mono text-[9px] hidden sm:inline">{strategy.sector}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {Object.entries(strategy.scores).map(([k, v]) => (
              <span key={k} className="text-[9px] font-mono" style={{ color: MODEL_COLORS[k] ?? "#666" }}>{k}:{Math.round(v)}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ScoreGauge score={strategy.score_total} color={scoreColor} />
          <div className="text-right">
            <div className="font-mono text-[10px] text-white/40">CONF</div>
            <div className="font-mono text-[11px] text-white">{strategy.confidence.toFixed(0)}%</div>
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-white/[0.06] px-3 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1.5">Model Radar</div>
              <ModelRadar modelDetails={strategy.modelDetails} />
            </div>
            <div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1.5">Model Scores</div>
              <ModelBars modelDetails={strategy.modelDetails} />
              <div className="space-y-1 mt-2">
                {strategy.modelDetails.map(m => (
                  <div key={m.modelId} className="flex items-center justify-between">
                    <span className="font-mono text-[9px]" style={{ color: MODEL_COLORS[m.modelId] ?? "#666" }}>{m.modelId}: {m.modelName}</span>
                    <span className="font-mono text-[9px] text-white/60">{Math.round(m.score)} / {Math.round(m.confidence)}% conf</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {strategy.stressResult && (
            <div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1">Stress Test Results</div>
              <StressBadges stressResult={strategy.stressResult} />
              <div className="mt-1 text-[9px] font-mono text-white/30">
                Failed: {strategy.stressResult.failedScenarios}/5 scenarios · Total penalty: -{strategy.stressResult.totalPenalty}pts
              </div>
            </div>
          )}
          {strategy.refinementResult && (
            <div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-1">Refinement History</div>
              <RefinementBadge refinementResult={strategy.refinementResult} />
              <div className="mt-1.5 space-y-1">
                {strategy.refinementResult.iterations.map(iter => (
                  <div key={iter.iteration} className="flex items-center gap-2 text-[9px] font-mono text-white/40">
                    <span className="text-white/20">Iter {iter.iteration}:</span>
                    <span>{iter.adjustments?.description ?? "Parameter adjustment"}</span>
                    <span className={iter.improved ? "text-[#00C49F]" : "text-[#ff3366]"}>
                      {iter.compositeBefore.toFixed(1)} → {iter.compositeAfter.toFixed(1)}
                      {iter.improved ? " ↑" : " ↓"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-[9px] font-mono text-white/20 pt-1 border-t border-white/[0.04]">
            ID: {strategy.strategy_id} · Evaluated: {new Date(strategy.evaluatedAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineTab() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "hold">("all");

  const runDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await authFetch("/api/quant/demo", { method: "GET" }, token ?? "");
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json() as PipelineResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const filtered = result?.top_100.filter(s => filter === "all" || s.action === filter) ?? [];

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/40 mt-0.5">6-model scoring · Stress testing · Iterative refinement · Top 100 ranked</p>
        </div>
        <button onClick={runDemo} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#00B4D8]/10 border border-[#00B4D8]/30 rounded text-[#00B4D8] text-[11px] font-bold uppercase tracking-wider hover:bg-[#00B4D8]/20 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Running Pipeline..." : "Run Demo Pipeline"}
        </button>
      </div>

      {/* Model legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "M1 Trend Align.", icon: TrendingUp, color: "#00B4D8" },
          { label: "M2 Mean Reversion", icon: Activity, color: "#FFB800" },
          { label: "M3 Momentum", icon: Zap, color: "#9c27b0" },
          { label: "M4 Risk-Adj. Return", icon: Target, color: "#00C49F" },
          { label: "M5 Volume/Liquidity", icon: BarChart3, color: "#FF6B6B" },
          { label: "M6 Cross-Timeframe", icon: Layers, color: "#4CAF50" },
          { label: "Stress Engine", icon: ShieldCheck, color: "#FFB800" },
          { label: "Refinement Loop", icon: RefreshCw, color: "#00B4D8" },
        ].map(({ label, icon: Icon, color }) => (
          <div key={label} className="bg-[#0A0E1A] border border-white/[0.06] rounded p-2.5 flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            <span className="text-[9px] font-mono text-white/50 leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-[#ff3366]/10 border border-[#ff3366]/30 rounded p-3 text-[11px] text-[#ff3366]">{error}</div>
      )}

      {!result && !loading && (
        <div className="bg-[#0A0E1A] border border-white/[0.06] rounded p-8 text-center">
          <Layers className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/30 text-[11px]">Click "Run Demo Pipeline" to evaluate 10 sample strategies through all 6 models, stress testing, and refinement.</p>
          <p className="text-white/20 text-[10px] mt-2">Production use: POST to /api/quant/evaluate/batch with your strategy data.</p>
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/40">
                {result.total_evaluated} evaluated · Top {result.top_100.length} ranked · v{result.pipeline_version}
              </span>
              <span className="text-[9px] text-white/20">{new Date(result.ran_at).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-1">
              {(["all", "buy", "sell", "hold"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-colors ${filter === f ? "bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30" : "text-white/30 hover:text-white/60"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            {filtered.map(strategy => (
              <StrategyCard key={strategy.strategy_id} strategy={strategy} expanded={expandedId === strategy.strategy_id} onToggle={() => setExpandedId(expandedId === strategy.strategy_id ? null : strategy.strategy_id)} />
            ))}
            {filtered.length === 0 && <div className="text-center text-white/30 text-[11px] py-8">No {filter} signals found</div>}
          </div>
          <div className="mt-4 p-3 bg-[#0A0E1A] border border-white/[0.04] rounded">
            <p className="text-[9px] text-white/20 text-center">
              AI-generated signals for educational purposes only. Not financial advice. Always do your own research before making investment decisions.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Unified Page ─────────────────────────────────────────────────────────────

type Tab = "signals" | "pipeline";

export default function QuantSignals() {
  const [tab, setTab] = useState<Tab>("signals");

  return (
    <PageErrorBoundary>
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Quant Signals</h1>
                <p className="text-sm text-white/50">Automated strategy-discovery engine · Multi-model evaluation pipeline</p>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-white/8 pb-0">
              {([
                { id: "signals" as Tab, label: "Strategy Signals", icon: Activity },
                { id: "pipeline" as Tab, label: "Evaluation Pipeline", icon: Layers },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === id ? "border-purple-400 text-white" : "border-transparent text-white/50 hover:text-white/80"}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === "signals" ? <SignalsTab /> : <PipelineTab />}

          </div>
        </div>
      </Layout>
    </PageErrorBoundary>
  );
}
