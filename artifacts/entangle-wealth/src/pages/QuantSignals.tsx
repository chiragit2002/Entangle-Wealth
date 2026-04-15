import { useState, useEffect, useMemo, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import {
  Brain, TrendingUp, TrendingDown, RefreshCw, Activity,
  ChevronUp, ChevronDown, ChevronsUpDown, Play, Clock, Zap,
  BarChart3, Shield, Target, ArrowRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

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

type SortField = "score" | "confidence" | "expectedReturn" | "riskScore" | "winRate" | "symbol" | "action";
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

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function QuantSignals() {
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
  const avgConfidence = signals.length ? (signals.reduce((a, b) => a + b.confidence, 0) / signals.length).toFixed(1) : "—";

  return (
    <PageErrorBoundary>
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Quant Signals</h1>
                    <p className="text-sm text-white/50">Automated strategy-discovery engine · Top 100 opportunities</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { fetchSignals(); fetchStatus(); }}
                  disabled={loading}
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                >
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={triggerRun}
                  disabled={triggering || status?.isRunning}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {triggering || status?.isRunning ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1.5" />
                  )}
                  {status?.isRunning ? "Running..." : "Run Now"}
                </Button>
              </div>
            </div>

            {/* Engine Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Status
                </div>
                <div className={`text-sm font-semibold ${status?.isRunning ? "text-yellow-400" : "text-green-400"}`}>
                  {status?.isRunning ? "Running" : "Idle"}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last Run
                </div>
                <div className="text-sm font-semibold text-white/80">
                  {formatRelative(status?.lastRunAt ?? null)}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Stocks Scanned
                </div>
                <div className="text-sm font-semibold text-white/80">
                  {status?.stocksScanned?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Strategies Run
                </div>
                <div className="text-sm font-semibold text-white/80">
                  {status?.strategiesEvaluated != null ? (status.strategiesEvaluated >= 1000 ? `${(status.strategiesEvaluated / 1000).toFixed(1)}k` : status.strategiesEvaluated.toLocaleString()) : "—"}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Signals Found
                </div>
                <div className="text-sm font-semibold text-white/80">
                  {status?.signalsGenerated?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-3">
                <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Run Time
                </div>
                <div className="text-sm font-semibold text-white/80">
                  {status?.totalRunTimeMs ? formatDuration(status.totalRunTimeMs) : "—"}
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {signals.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/15 rounded-xl p-4 flex items-center gap-3">
                  <TrendingUp className="w-7 h-7 text-[#00d4ff]" />
                  <div>
                    <div className="text-2xl font-bold text-[#00d4ff]">{buyCount}</div>
                    <div className="text-xs text-white/50">BUY Signals</div>
                  </div>
                </div>
                <div className="bg-[#ff3366]/5 border border-[#ff3366]/15 rounded-xl p-4 flex items-center gap-3">
                  <TrendingDown className="w-7 h-7 text-[#ff3366]" />
                  <div>
                    <div className="text-2xl font-bold text-[#ff3366]">{sellCount}</div>
                    <div className="text-xs text-white/50">SELL Signals</div>
                  </div>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 flex items-center gap-3">
                  <Shield className="w-7 h-7 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{avgConfidence}%</div>
                    <div className="text-xs text-white/50">Avg Confidence</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search symbol or strategy..."
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 w-52"
              />
              <div className="flex gap-1">
                {(["all", "BUY", "SELL"] as FilterAction[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterAction(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterAction === f
                      ? f === "BUY" ? "bg-[#00d4ff]/15 border-[#00d4ff]/30 text-[#00d4ff]"
                        : f === "SELL" ? "bg-[#ff3366]/15 border-[#ff3366]/30 text-[#ff3366]"
                          : "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-white/10 text-white/50 hover:text-white/80"}`}
                  >
                    {f === "all" ? "All Actions" : f}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {(["all", "LOW", "MEDIUM", "HIGH"] as FilterRisk[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterRisk(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filterRisk === f
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-white/10 text-white/50 hover:text-white/80"}`}
                  >
                    {f === "all" ? "All Risk" : f}
                  </button>
                ))}
              </div>
              <div className="text-xs text-white/30 ml-auto">
                {filteredSorted.length} of {signals.length} signals
                {meta?.generatedAt && (
                  <span> · {meta.cached ? "cached" : "live"} · {formatRelative(meta.generatedAt)}</span>
                )}
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
                  <Button size="sm" onClick={fetchSignals} variant="outline" className="border-white/10">
                    Retry
                  </Button>
                </div>
              ) : filteredSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Brain className="w-10 h-10 text-white/20" />
                  <p className="text-white/40 text-sm">
                    {signals.length === 0
                      ? "No signals yet. Click \"Run Now\" to trigger the engine."
                      : "No signals match your filters."}
                  </p>
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
                      {filteredSorted.map((signal, idx) => (
                        <tr
                          key={`${signal.symbol}-${signal.strategyId}`}
                          className="hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="px-3 py-2.5 text-white/25 text-xs">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-white">{signal.symbol}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${actionBg(signal.action)}`}>
                              {signal.action === "BUY" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {signal.action}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${signal.action === "BUY" ? "bg-[#00d4ff]" : "bg-[#ff3366]"}`}
                                  style={{ width: `${signal.confidence}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${actionColor(signal.action)}`}>
                                {signal.confidence.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs font-semibold ${signal.expectedReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {signal.expectedReturn >= 0 ? "+" : ""}{signal.expectedReturn.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-white/70">{signal.winRate.toFixed(1)}%</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-white/70">{signal.maxDrawdown.toFixed(1)}%</span>
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
                                  className="h-full bg-purple-400 rounded-full"
                                  style={{ width: `${Math.min(100, signal.score)}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-purple-400">
                                {signal.score.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <div className="truncate text-xs text-white/40" title={signal.strategyName}>
                              {signal.strategyName}
                            </div>
                            <div className="text-xs text-white/20 font-mono truncate">{signal.strategyId}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => navigate(`/technical?symbol=${signal.symbol}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/5 text-white/40 hover:text-white"
                              title={`Open ${signal.symbol} in Technical Analysis`}
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
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
        </div>
      </Layout>
    </PageErrorBoundary>
  );
}
