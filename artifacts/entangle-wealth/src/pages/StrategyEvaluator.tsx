import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu, Target, Zap, Clock, Activity, CheckCircle2, XCircle,
  AlertTriangle, ChevronRight, BarChart2, TrendingUp, TrendingDown,
  Minus, Loader2, Send, RefreshCw, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const PRESET_ASSETS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
  "AMD", "PLTR", "SPY", "QQQ", "NFLX", "JPM", "V",
];

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1D" },
];

const MARKET_STATES = [
  { value: "trend_up", label: "Trend Up", color: "#00d4ff" },
  { value: "trend_down", label: "Trend Down", color: "#ff3366" },
  { value: "range", label: "Range", color: "#a78bfa" },
  { value: "breakout", label: "Breakout", color: "#f59e0b" },
];

interface AgentResult {
  id: number;
  name: string;
  domain: string;
  signal: "BULLISH" | "NEUTRAL" | "BEARISH";
  confidence: number;
  reasoning: string;
  keyMetric: string;
}

interface DeepResult {
  symbol: string;
  name: string;
  overallSignal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  confidenceScore: number;
  consensusReached: boolean;
  agents: AgentResult[];
  flashCouncilSummary: string;
  riskFactors: string[];
  catalysts: string[];
  priceTargets: { bear: number; base: number; bull: number };
  timeHorizon: string;
  disclaimer: string;
}

interface FastResult {
  signal: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  summary: string;
  keyLevel: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  disclaimer: string;
}

type ErrorKind = "rate_limit" | "auth" | "not_found" | "capacity" | "generic";

interface EvalError {
  kind: ErrorKind;
  message: string;
  retryAfter?: number;
}

interface StreamAgent {
  agent: AgentResult;
  index: number;
  total: number;
}

function signalColor(signal: string) {
  if (["STRONG_BUY", "BUY", "BULLISH"].includes(signal)) return "#00d4ff";
  if (["STRONG_SELL", "SELL", "BEARISH"].includes(signal)) return "#ff3366";
  return "rgba(255,255,255,0.4)";
}

function signalBg(signal: string) {
  if (["STRONG_BUY", "BUY", "BULLISH"].includes(signal))
    return "bg-[#00d4ff]/10 border-[#00d4ff]/20 text-[#00d4ff]";
  if (["STRONG_SELL", "SELL", "BEARISH"].includes(signal))
    return "bg-[#ff3366]/10 border-[#ff3366]/20 text-[#ff3366]";
  return "bg-white/5 border-white/10 text-white/40";
}

function SignalIcon({ signal }: { signal: string }) {
  if (["STRONG_BUY", "BUY", "BULLISH"].includes(signal)) return <TrendingUp className="w-3.5 h-3.5" />;
  if (["STRONG_SELL", "SELL", "BEARISH"].includes(signal)) return <TrendingDown className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

function riskColor(risk: string) {
  if (risk === "LOW") return "text-green-400";
  if (risk === "MEDIUM") return "text-yellow-400";
  return "text-red-400";
}

function ScoreGauge({ score, label = "SCORE" }: { score: number; label?: string }) {
  const clamped = Math.min(100, Math.max(0, score));
  const angle = (clamped / 100) * 180;
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = 80, cy = 80, r = 65;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);
  const color = clamped >= 70 ? "#00d4ff" : clamped >= 40 ? "#a78bfa" : "#ff3366";

  const arcPath = (startAngle: number, endAngle: number, radius: number, col: string) => {
    const sa = ((startAngle - 90) * Math.PI) / 180;
    const ea = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(sa);
    const y1 = cy + radius * Math.sin(sa);
    const x2 = cx + radius * Math.cos(ea);
    const y2 = cy + radius * Math.sin(ea);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return (
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`}
        fill="none" stroke={col} strokeWidth="10" strokeLinecap="round"
      />
    );
  };

  return (
    <svg width="160" height="90" viewBox="0 0 160 90">
      {arcPath(0, 180, r, "rgba(255,255,255,0.06)")}
      {clamped > 0 && arcPath(0, angle, r, color)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill={color} />
      <text x={cx} y={cy - 12} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="monospace">
        {clamped.toFixed(0)}
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
        {label}
      </text>
      <text x="12" y="86" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">0</text>
      <text x="138" y="86" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace" textAnchor="end">100</text>
    </svg>
  );
}

function AgentProgressBar({ agent, visible }: { agent: AgentResult; visible: boolean }) {
  const col = signalColor(agent.signal);
  return (
    <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
        <div className="mt-0.5 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4" style={{ color: col }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <span className="text-xs font-semibold text-white/80 font-mono">
                Agent {agent.id} — {agent.name}
              </span>
              <span className="ml-2 text-xs text-white/30">{agent.domain}</span>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border flex-shrink-0 ${signalBg(agent.signal)}`}>
              <SignalIcon signal={agent.signal} />
              {agent.signal}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${agent.confidence}%`, background: col }} />
            </div>
            <span className="text-xs font-mono" style={{ color: col }}>{agent.confidence}%</span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">{agent.reasoning}</p>
          <p className="text-xs text-white/25 font-mono mt-0.5">KEY: {agent.keyMetric}</p>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ error, onReset }: { error: EvalError; onReset: () => void }) {
  const isRateLimit = error.kind === "rate_limit";
  const isAuth = error.kind === "auth";
  const isCapacity = error.kind === "capacity";

  return (
    <div className={`border rounded-2xl p-8 flex flex-col items-center gap-4 ${
      isRateLimit ? "bg-yellow-500/[0.05] border-yellow-500/20" :
      isAuth ? "bg-purple-500/[0.05] border-purple-500/20" :
      "bg-red-500/[0.05] border-red-500/20"
    }`}>
      {isRateLimit ? (
        <ShieldAlert className="w-10 h-10 text-yellow-400/60" />
      ) : isAuth ? (
        <ShieldAlert className="w-10 h-10 text-purple-400/60" />
      ) : (
        <XCircle className="w-10 h-10 text-red-400/60" />
      )}
      <div className="text-center space-y-1">
        <p className={`text-sm font-mono font-semibold ${isRateLimit ? "text-yellow-400" : isAuth ? "text-purple-400" : "text-red-400"}`}>
          {isRateLimit ? "Rate Limit Reached" : isAuth ? "Sign In Required" : isCapacity ? "Service At Capacity" : "Evaluation Failed"}
        </p>
        <p className="text-white/40 text-xs max-w-xs">{error.message}</p>
        {isRateLimit && error.retryAfter && (
          <p className="text-yellow-400/50 text-xs font-mono">Retry in {error.retryAfter}s</p>
        )}
        {isAuth && (
          <a href="/sign-in" className="inline-block mt-2 text-xs text-purple-400 underline underline-offset-2">Sign in to evaluate</a>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onReset} className="border-white/10 text-white/60 hover:text-white">
        Try Again
      </Button>
    </div>
  );
}

function classifyError(status: number, body: Record<string, unknown>): EvalError {
  if (status === 429) {
    const limitType = body.limitType as string | undefined;
    const retryAfter = body.retryAfter as number | undefined;
    const msg = limitType === "daily_signals"
      ? `Daily signal limit reached. ${body.error ?? ""}`
      : `Too many requests. ${body.error ?? "Please wait before trying again."}`;
    return { kind: "rate_limit", message: String(msg), retryAfter };
  }
  if (status === 401 || status === 403) {
    return { kind: "auth", message: "You must be signed in to run evaluations." };
  }
  if (status === 404) {
    return { kind: "not_found", message: "Symbol not found. Check the ticker and try again." };
  }
  if (status === 503) {
    const retryAfter = body.retryAfter as number | undefined;
    return { kind: "capacity", message: "AI analysis service is at capacity. Please retry shortly.", retryAfter };
  }
  return { kind: "generic", message: String(body.error ?? "Evaluation failed. Please try again.") };
}

export default function StrategyEvaluator() {
  const { toast } = useToast();

  const [symbol, setSymbol] = useState("AAPL");
  const [customSymbol, setCustomSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("1h");
  const [marketState, setMarketState] = useState("trend_up");
  const [evalMode, setEvalMode] = useState<"fast" | "deep">("fast");

  const [phase, setPhase] = useState<"idle" | "connecting" | "streaming" | "done" | "error">("idle");
  const [streamAgents, setStreamAgents] = useState<AgentResult[]>([]);
  const [totalAgents, setTotalAgents] = useState(0);
  const [deepResult, setDeepResult] = useState<DeepResult | null>(null);
  const [fastResult, setFastResult] = useState<FastResult | null>(null);
  const [evalError, setEvalError] = useState<EvalError | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const esRef = useRef<EventSource | null>(null);

  const activeSymbol = customSymbol.trim().toUpperCase() || symbol;
  const marketStateObj = MARKET_STATES.find(m => m.value === marketState);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setPhase("idle");
    setStreamAgents([]);
    setTotalAgents(0);
    setDeepResult(null);
    setFastResult(null);
    setEvalError(null);
    setLatencyMs(null);
  }, []);

  const runFastEvaluation = useCallback(async (sym: string) => {
    setPhase("connecting");
    startTimeRef.current = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/stocks/${sym}/quick-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const body = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setEvalError(classifyError(res.status, body));
        setPhase("error");
        return;
      }
      setFastResult(body as unknown as FastResult);
      setLatencyMs(Date.now() - startTimeRef.current);
      setPhase("done");
    } catch {
      setEvalError({ kind: "generic", message: "Network error. Check your connection and try again." });
      setPhase("error");
    }
  }, []);

  const runDeepEvaluation = useCallback(async (sym: string) => {
    setPhase("connecting");
    startTimeRef.current = Date.now();

    const url = `${BASE_URL}/api/stocks/${sym}/analyze-stream?timeframe=${timeframe}&market_state=${marketState}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    let gotStart = false;
    const connectionTimer = setTimeout(() => {
      if (!gotStart) {
        setEvalError({ kind: "generic", message: "Connection timed out. Check your network, sign-in status, and try again." });
        setPhase("error");
        es.close();
        esRef.current = null;
      }
    }, 8000);

    es.addEventListener("start", (e) => {
      gotStart = true;
      clearTimeout(connectionTimer);
      const data = JSON.parse(e.data);
      setTotalAgents(data.totalAgents ?? 6);
      setPhase("streaming");
    });

    es.addEventListener("agent", (e) => {
      const data = JSON.parse(e.data) as StreamAgent;
      setStreamAgents(prev => [...prev, data.agent]);
    });

    es.addEventListener("complete", (e) => {
      clearTimeout(connectionTimer);
      const data = JSON.parse(e.data) as DeepResult;
      setDeepResult(data);
      setLatencyMs(Date.now() - startTimeRef.current);
      setPhase("done");
      es.close();
      esRef.current = null;
    });

    es.addEventListener("error", (e) => {
      clearTimeout(connectionTimer);
      try {
        const data = JSON.parse((e as MessageEvent).data) as { message?: string };
        const msg = data.message ?? "Evaluation failed";
        const isRateLimit = msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit");
        setEvalError({ kind: isRateLimit ? "rate_limit" : "generic", message: msg });
      } catch {
        setEvalError({ kind: "generic", message: "Evaluation failed. Please try again." });
      }
      setPhase("error");
      es.close();
      esRef.current = null;
    });
  }, [timeframe, marketState]);

  const runEvaluation = useCallback(async () => {
    if (!activeSymbol) {
      toast({ title: "No symbol selected", variant: "destructive" });
      return;
    }
    reset();
    if (evalMode === "fast") {
      await runFastEvaluation(activeSymbol);
    } else {
      await runDeepEvaluation(activeSymbol);
    }
  }, [activeSymbol, evalMode, reset, runFastEvaluation, runDeepEvaluation, toast]);

  const radarData = deepResult?.agents.map(a => ({
    agent: a.name.split(" ").slice(-1)[0],
    confidence: a.confidence,
  })) ?? [];

  const aggregateScore = deepResult
    ? Math.round(deepResult.agents.reduce((s, a) => s + a.confidence, 0) / deepResult.agents.length)
    : null;

  return (
    <PageErrorBoundary>
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white font-mono">Strategy Evaluator</h1>
                  <p className="text-sm text-white/40">Multi-model scoring · Agent-by-agent breakdown</p>
                </div>
              </div>
              {phase !== "idle" && (
                <Button variant="outline" size="sm" onClick={reset} className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reset
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

              {/* Left: Configuration */}
              <div className="space-y-5">
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-5">
                  <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest">Configuration</div>

                  {/* Asset */}
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-mono">Asset</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_ASSETS.map(s => (
                        <button
                          key={s}
                          onClick={() => { setSymbol(s); setCustomSymbol(""); }}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-all ${
                            symbol === s && !customSymbol
                              ? "bg-[#00d4ff]/15 border-[#00d4ff]/30 text-[#00d4ff]"
                              : "bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={customSymbol}
                      onChange={e => setCustomSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, ""))}
                      placeholder="Or type a symbol…"
                      maxLength={10}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 font-mono"
                    />
                  </div>

                  {/* Timeframe */}
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-mono">Timeframe</label>
                    <div className="flex gap-1.5">
                      {TIMEFRAMES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setTimeframe(t.value)}
                          className={`flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                            timeframe === t.value
                              ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                              : "bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Market State */}
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-mono">Market State</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MARKET_STATES.map(m => (
                        <button
                          key={m.value}
                          onClick={() => setMarketState(m.value)}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-all text-left ${
                            marketState !== m.value ? "bg-white/3 border-white/8 text-white/40 hover:text-white/60" : ""
                          }`}
                          style={
                            marketState === m.value
                              ? { background: `${m.color}18`, borderColor: `${m.color}40`, color: m.color }
                              : {}
                          }
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eval Mode */}
                  <div>
                    <label className="text-xs text-white/50 mb-2 block font-mono">Evaluation Mode</label>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEvalMode("fast")}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-all ${
                          evalMode === "fast"
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                            : "bg-white/3 border-white/8 text-white/40 hover:text-white/70"
                        }`}
                      >
                        <div className="font-semibold">Fast</div>
                        <div className="text-[10px] opacity-60">Quick scan</div>
                      </button>
                      <button
                        onClick={() => setEvalMode("deep")}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono border transition-all ${
                          evalMode === "deep"
                            ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                            : "bg-white/3 border-white/8 text-white/40 hover:text-white/70"
                        }`}
                      >
                        <div className="font-semibold">Deep</div>
                        <div className="text-[10px] opacity-60">Full agent swarm</div>
                      </button>
                    </div>
                    <p className="text-[10px] text-white/20 font-mono mt-1.5">
                      {evalMode === "fast"
                        ? "Fast: single AI pass via quick-analyze endpoint"
                        : "Deep: 7-agent SSE stream with live progress"}
                    </p>
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full bg-[#00d4ff] hover:bg-[#00b8d9] text-black font-mono font-bold h-10"
                    onClick={runEvaluation}
                    disabled={phase === "connecting" || phase === "streaming"}
                  >
                    {phase === "connecting" || phase === "streaming" ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Evaluating…</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Run Evaluation</>
                    )}
                  </Button>

                  {phase !== "idle" && (
                    <div className="text-xs font-mono text-white/30 pt-1 space-y-0.5">
                      <span className="text-white/20">ASSET</span>{" "}
                      <span className="text-[#00d4ff]/60">{activeSymbol}</span>
                      <span className="mx-2 text-white/15">·</span>
                      <span className="text-white/20">TF</span>{" "}
                      <span className="text-purple-400/60">{timeframe}</span>
                      <span className="mx-2 text-white/15">·</span>
                      <span style={{ color: `${marketStateObj?.color ?? "#fff"}60` }}>{marketStateObj?.label}</span>
                      <span className="mx-2 text-white/15">·</span>
                      <span className="text-amber-400/60 uppercase">{evalMode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Results */}
              <div className="space-y-5">

                {/* Idle */}
                {phase === "idle" && (
                  <div className="bg-white/[0.02] border border-white/8 rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <BarChart2 className="w-7 h-7 text-white/20" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/30 text-sm font-mono">Configure and run an evaluation</p>
                      <p className="text-white/20 text-xs mt-1">Scores will appear here</p>
                    </div>
                  </div>
                )}

                {/* Connecting */}
                {phase === "connecting" && (
                  <div className="bg-white/[0.02] border border-white/8 rounded-2xl flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-white/40 text-sm font-mono">
                      {evalMode === "fast" ? "Running quick analysis…" : "Initializing agent swarm…"}
                    </p>
                  </div>
                )}

                {/* Deep mode: streaming agents */}
                {(phase === "streaming" || (phase === "done" && evalMode === "deep")) && streamAgents.length > 0 && (
                  <>
                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {phase === "streaming" ? (
                            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          )}
                          <span className="text-xs font-mono font-semibold text-white/60 uppercase tracking-wider">
                            {phase === "streaming" ? "Agents Running" : "Evaluation Complete"}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-white/30">
                          {streamAgents.length} / {totalAgents || "?"} agents
                        </span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: totalAgents ? `${(streamAgents.length / totalAgents) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                      <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-4">
                        Agent Results
                      </div>
                      {streamAgents.map((agent, i) => (
                        <AgentProgressBar key={agent.id} agent={agent} visible={i < streamAgents.length} />
                      ))}
                      {phase === "streaming" && (
                        <div className="flex items-center gap-2 py-3 text-white/30">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs font-mono">Awaiting next agent…</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* FAST result dashboard */}
                {phase === "done" && fastResult && evalMode === "fast" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 flex flex-col items-center">
                        <ScoreGauge score={fastResult.confidence} label="CONFIDENCE" />
                        <div className="text-xs text-white/30 font-mono mt-1">Confidence Score</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
                        <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold font-mono border ${signalBg(fastResult.signal)}`}>
                          <SignalIcon signal={fastResult.signal} />
                          {fastResult.signal}
                        </div>
                        <div className="text-xs text-white/30 font-mono">Signal</div>
                        <div className={`text-xs font-mono font-semibold ${riskColor(fastResult.risk)}`}>
                          {fastResult.risk} RISK
                        </div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-2">
                        <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-3">Metrics</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-white/40">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-mono">Latency</span>
                          </div>
                          <span className="text-xs font-mono text-white/70">
                            {latencyMs != null ? `${(latencyMs / 1000).toFixed(1)}s` : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-white/40">
                            <Zap className="w-3 h-3" />
                            <span className="text-xs font-mono">Mode</span>
                          </div>
                          <span className="text-xs font-mono text-amber-400/70 uppercase">Fast</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-white/40">
                            <Target className="w-3 h-3" />
                            <span className="text-xs font-mono">Key Level</span>
                          </div>
                          <span className="text-xs font-mono text-white/60">${fastResult.keyLevel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#00d4ff]/[0.04] border border-[#00d4ff]/15 rounded-2xl p-5">
                      <div className="text-xs font-mono font-semibold text-[#00d4ff]/50 uppercase tracking-widest mb-2">Analysis Summary</div>
                      <p className="text-sm text-white/60 leading-relaxed">{fastResult.summary}</p>
                    </div>

                    <div className="text-xs text-white/20 font-mono text-center pb-4">{fastResult.disclaimer}</div>
                  </>
                )}

                {/* DEEP result dashboard */}
                {phase === "done" && deepResult && evalMode === "deep" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 flex flex-col items-center">
                        <ScoreGauge score={aggregateScore ?? 0} label="AGG SCORE" />
                        <div className="text-xs text-white/30 font-mono mt-1">Aggregate Agent Score</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 flex flex-col items-center">
                        <ScoreGauge score={deepResult.confidenceScore} label="CONFIDENCE" />
                        <div className="text-xs text-white/30 font-mono mt-1">Consensus Confidence</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-2">
                        <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-2">Result</div>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold font-mono border ${signalBg(deepResult.overallSignal)}`}>
                          <SignalIcon signal={deepResult.overallSignal} />
                          {deepResult.overallSignal.replace("_", " ")}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-mono ${deepResult.consensusReached ? "text-green-400/70" : "text-yellow-400/70"}`}>
                          {deepResult.consensusReached ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {deepResult.consensusReached ? "Consensus reached" : "No consensus"}
                        </div>
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-white/30">Latency</span>
                            <span className="text-xs font-mono text-white/60">{latencyMs != null ? `${(latencyMs / 1000).toFixed(1)}s` : "—"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-white/30">Horizon</span>
                            <span className="text-xs font-mono text-white/60">{deepResult.timeHorizon}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-white/30">Agents</span>
                            <span className="text-xs font-mono text-white/60">{deepResult.agents.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {radarData.length > 0 && (
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                        <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-4">Agent Confidence Radar</div>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="rgba(255,255,255,0.06)" />
                              <PolarAngleAxis dataKey="agent" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }} />
                              <Radar dataKey="confidence" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.12} strokeWidth={1.5} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                      <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-4">Model Score Breakdown</div>
                      <div className="space-y-3">
                        {deepResult.agents.map((agent, i) => {
                          const col = signalColor(agent.signal);
                          return (
                            <div key={agent.id} className="flex items-center gap-3">
                              <div className="w-5 text-right">
                                <span className="text-xs font-mono text-white/20">M{i + 1}</span>
                              </div>
                              <div className="w-36 flex-shrink-0">
                                <span className="text-xs font-mono text-white/50 truncate block" title={agent.name}>{agent.name}</span>
                              </div>
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${agent.confidence}%`, background: col }} />
                              </div>
                              <div className="w-10 text-right">
                                <span className="text-xs font-mono" style={{ color: col }}>{agent.confidence}</span>
                              </div>
                              <div className="w-16 flex-shrink-0">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${signalBg(agent.signal)}`}>
                                  <SignalIcon signal={agent.signal} />
                                  {agent.signal.slice(0, 4)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {deepResult.priceTargets && (
                      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                        <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-4">Price Targets</div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-xs text-white/30 font-mono mb-1">Bear</div>
                            <div className="text-lg font-bold font-mono text-red-400">${deepResult.priceTargets.bear}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-white/30 font-mono mb-1">Base</div>
                            <div className="text-lg font-bold font-mono text-white/70">${deepResult.priceTargets.base}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-white/30 font-mono mb-1">Bull</div>
                            <div className="text-lg font-bold font-mono text-[#00d4ff]">${deepResult.priceTargets.bull}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {deepResult.riskFactors?.length > 0 && (
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                          <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-3">Risk Factors</div>
                          <ul className="space-y-1.5">
                            {deepResult.riskFactors.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                                <XCircle className="w-3.5 h-3.5 text-red-400/60 mt-0.5 flex-shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {deepResult.catalysts?.length > 0 && (
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                          <div className="text-xs font-mono font-semibold text-white/40 uppercase tracking-widest mb-3">Catalysts</div>
                          <ul className="space-y-1.5">
                            {deepResult.catalysts.map((c, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                                <ChevronRight className="w-3.5 h-3.5 text-[#00d4ff]/60 mt-0.5 flex-shrink-0" />
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {deepResult.flashCouncilSummary && (
                      <div className="bg-[#00d4ff]/[0.04] border border-[#00d4ff]/15 rounded-2xl p-5">
                        <div className="text-xs font-mono font-semibold text-[#00d4ff]/50 uppercase tracking-widest mb-2">Flash Council Summary</div>
                        <p className="text-sm text-white/60 leading-relaxed">{deepResult.flashCouncilSummary}</p>
                      </div>
                    )}

                    <div className="text-xs text-white/20 font-mono text-center pb-4">{deepResult.disclaimer}</div>
                  </>
                )}

                {/* Error */}
                {phase === "error" && evalError && (
                  <ErrorPanel error={evalError} onReset={reset} />
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </PageErrorBoundary>
  );
}
