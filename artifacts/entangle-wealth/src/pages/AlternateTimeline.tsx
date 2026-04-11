import { useState, useCallback, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, Legend,
} from "recharts";
import {
  GitBranch, Save, Trash2, RefreshCw, BookmarkCheck,
  TrendingUp, AlertTriangle, Star, Zap, Shield, Target,
  ChevronDown, ChevronUp, Info, CheckCircle2, CircleDot,
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

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function GaugeBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/50 uppercase tracking-wider font-mono">{label}</span>
        <span className={`font-mono font-bold ${color}`}>{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.replace("text-", "bg-")}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function StressGauge({ value }: { value: number }) {
  const color = value > 70 ? "text-red-400" : value > 45 ? "text-amber-400" : "text-emerald-400";
  const label = value > 70 ? "High Stress" : value > 45 ? "Moderate" : "Low Stress";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-xl font-black font-mono ${color}`}>{value.toFixed(0)}</div>
      <div className={`text-[9px] uppercase tracking-wider font-bold ${color}`}>{label}</div>
    </div>
  );
}

interface PaneProps {
  label: string;
  color: string;
  borderColor: string;
  params: TimelineParams;
  onParam: (key: keyof TimelineParams, val: number) => void;
  result: SimResult | null;
  selectedHorizon: string;
  disabled?: boolean;
  isExploration?: boolean;
}

function TimelinePane({
  label, color, borderColor, params, onParam, result, selectedHorizon, isExploration,
}: PaneProps) {
  const horizonResult = result?.results.find(r => r.horizon === selectedHorizon);

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-4 flex-1 min-w-0"
      style={{
        background: "rgba(8,8,20,0.85)",
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 40px ${borderColor}20`,
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
        <div>
          <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
            <span>Monthly Income</span>
            <span className="text-white/80 font-bold">{fmt(params.monthlyIncome)}/mo</span>
          </div>
          <Slider
            min={1000} max={50000} step={250}
            value={[params.monthlyIncome]}
            onValueChange={([v]) => onParam("monthlyIncome", v)}
            className={`${color}`}
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
            <span>Savings Rate</span>
            <span className="text-white/80 font-bold">{(params.savingsRate * 100).toFixed(0)}%</span>
          </div>
          <Slider
            min={0} max={0.8} step={0.01}
            value={[params.savingsRate]}
            onValueChange={([v]) => onParam("savingsRate", v)}
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
            <span>Monthly Debt Payments</span>
            <span className="text-white/80 font-bold">{fmt(params.monthlyDebt)}/mo</span>
          </div>
          <Slider
            min={0} max={5000} step={50}
            value={[params.monthlyDebt]}
            onValueChange={([v]) => onParam("monthlyDebt", v)}
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
            <span>Investment Return Rate</span>
            <span className="text-white/80 font-bold">{(params.investmentRate * 100).toFixed(1)}%/yr</span>
          </div>
          <Slider
            min={0.02} max={0.25} step={0.005}
            value={[params.investmentRate]}
            onValueChange={([v]) => onParam("investmentRate", v)}
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
            <span>Current Net Worth</span>
            <span className="text-white/80 font-bold">{fmt(params.currentNetWorth)}</span>
          </div>
          <Slider
            min={-50000} max={500000} step={1000}
            value={[params.currentNetWorth]}
            onValueChange={([v]) => onParam("currentNetWorth", v)}
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-white/50 mb-1.5 font-mono">
            <span>Emergency Fund</span>
            <span className="text-white/80 font-bold">{params.emergencyFundMonths.toFixed(0)} months saved</span>
          </div>
          <Slider
            min={0} max={12} step={0.5}
            value={[params.emergencyFundMonths]}
            onValueChange={([v]) => onParam("emergencyFundMonths", v)}
          />
        </div>
      </div>

      {horizonResult && (
        <div className="space-y-3 pt-3 border-t border-white/[0.06]">
          <div className="text-center">
            <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-1">Net Worth @ {selectedHorizon}</div>
            <div className="text-2xl font-black font-mono" style={{ color: borderColor }}>
              {fmt(horizonResult.projectedNetWorth)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[9px] text-white/40 font-mono uppercase">Savings</div>
              <div className="text-xs font-bold text-emerald-400 font-mono">{fmt(horizonResult.savingsAccumulated)}</div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 font-mono uppercase">Investments</div>
              <div className="text-xs font-bold text-blue-400 font-mono">{fmt(horizonResult.investmentValue)}</div>
            </div>
            <div>
              <div className="text-[9px] text-white/40 font-mono uppercase">Debt Left</div>
              <div className="text-xs font-bold text-red-400 font-mono">{fmt(horizonResult.debtRemaining)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <GaugeBar value={horizonResult.stabilityScore} label="Stability" color="text-blue-400" />
            <GaugeBar value={100 - horizonResult.stressIndex} label="Calm Index" color="text-emerald-400" />
            <GaugeBar value={horizonResult.opportunityScore} label="Opportunity" color="text-amber-400" />
          </div>

          {horizonResult.milestones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {horizonResult.milestones.map(m => (
                <span key={m} className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChartSection({
  resultA, resultB, deltaData,
}: {
  resultA: SimResult | null;
  resultB: SimResult | null;
  deltaData: DeltaRow[] | null;
}) {
  if (!resultA && !resultB) return null;

  const chartData = DISPLAY_HORIZONS.map(h => {
    const a = resultA?.results.find(r => r.horizon === h);
    const b = resultB?.results.find(r => r.horizon === h);
    const delta = deltaData?.find(d => d.horizon === h);
    return {
      horizon: h,
      "Current Path": a?.projectedNetWorth || undefined,
      "Better Path": b?.projectedNetWorth || undefined,
      "Delta": delta?.deltaNetWorth || undefined,
    };
  });

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm">Net Worth Projection</span>
        <span className="text-[10px] text-white/40 ml-auto font-mono">Simulation — not financial advice</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00c8f8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00c8f8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e676" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00e676" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="horizon" tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#555", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
            <Tooltip
              contentStyle={{ background: "#0a0a14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
              formatter={(value: number, name: string) => [fmt(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
            {resultA && <Line type="monotone" dataKey="Current Path" stroke="#00c8f8" strokeWidth={2} dot={{ r: 3, fill: "#00c8f8" }} connectNulls />}
            {resultB && <Line type="monotone" dataKey="Better Path" stroke="#00e676" strokeWidth={2} dot={{ r: 3, fill: "#00e676" }} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {deltaData && (
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/50 uppercase tracking-wider font-mono mb-2">Decision Impact — Difference Between Paths</div>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
            {deltaData.map(d => (
              <div key={d.horizon} className="text-center">
                <div className="text-[9px] text-white/40 font-mono">{d.horizon}</div>
                <div className={`text-xs font-bold font-mono ${d.deltaNetWorth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {d.deltaNetWorth >= 0 ? "+" : ""}{fmt(d.deltaNetWorth)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IdentityBadge({ stage }: { stage: Stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex gap-1">
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
              <GitBranch className="w-6 h-6 text-primary" />
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
            >
              {isExplorationMode ? "Exit" : "Enter"} Exploration Mode
            </button>

            {isSignedIn && (
              <button
                onClick={() => { setShowSaved(v => !v); fetchSaved(); }}
                className="text-xs px-3 py-2 rounded-lg border bg-white/[0.04] border-white/10 text-white/50 hover:text-white hover:border-white/20 font-bold transition-all flex items-center gap-1.5"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                Saved ({savedTimelines.length})
              </button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white/40 hover:text-white text-xs border border-white/10 h-9"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset & Explore
            </Button>
          </div>
        </div>

        {isExplorationMode && (
          <div className="mb-4 rounded-xl px-4 py-3 bg-amber-400/[0.06] border border-amber-400/20 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-400 mb-0.5">Regret-Free Exploration Mode</div>
              <div className="text-[11px] text-amber-400/70">
                Try any scenario — high spending, delayed savings, or other choices. No judgment here. All simulations stay private, and you can always reset. Use this space to understand trade-offs, not to feel bad about them.
              </div>
            </div>
          </div>
        )}

        {isSignedIn && <div className="mb-4"><IdentityBadge stage={stage} /></div>}

        <div className="mb-4 flex flex-wrap gap-1.5">
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
            >
              {h}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mb-4 flex items-center gap-2 text-primary/70 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>Running simulations…</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <TimelinePane
            label="Current Path"
            color="[#00c8f8]"
            borderColor="#00c8f8"
            params={paramsA}
            onParam={handleParamA}
            result={resultA}
            selectedHorizon={selectedHorizon}
          />
          <TimelinePane
            label="Better Path"
            color="[#00e676]"
            borderColor="#00e676"
            params={paramsB}
            onParam={handleParamB}
            result={resultB}
            selectedHorizon={selectedHorizon}
            isExploration={isExplorationMode}
          />
        </div>

        <ChartSection
          resultA={resultA}
          resultB={resultB}
          deltaData={compareResult?.deltas || null}
        />

        {summary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Delta @ 5yr", value: summary.deltaNetWorth5yr, icon: Target, isMoney: true },
              { label: "Delta @ 10yr", value: summary.deltaNetWorth10yr, icon: TrendingUp, isMoney: true },
              { label: "Delta @ 20yr", value: summary.deltaNetWorth20yr, icon: Star, isMoney: true },
              { label: "Stress Reduction", value: summary.deltaStress, icon: Shield, suffix: "pts" },
              { label: "Opportunity Gain", value: summary.deltaOpportunity, icon: Zap, suffix: "pts" },
            ].map(({ label, value, icon: Icon, isMoney, suffix }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Icon className="w-4 h-4 mx-auto mb-1 text-white/20" />
                <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">{label}</div>
                <div className={`text-sm font-black font-mono mt-0.5 ${value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {value >= 0 ? "+" : ""}
                  {isMoney ? fmt(value) : `${value.toFixed(1)}${suffix || ""}`}
                </div>
              </div>
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
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }} />
                      <span className="text-xs font-bold text-white/70">Save {label} Snapshot</span>
                    </div>
                    <button onClick={() => setShowForm(v => !v)}
                      className="text-white/40 hover:text-white transition-colors">
                      {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  {showForm && (
                    <div className="space-y-2">
                      <input
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary/40"
                        placeholder="Scenario name…"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={100}
                      />
                      <textarea
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary/40 resize-none h-16"
                        placeholder="Optional note about this scenario…"
                        value={annotation}
                        onChange={e => setAnnotation(e.target.value)}
                        maxLength={500}
                      />
                      <Button size="sm" disabled={saving}
                        className="w-full bg-primary text-black font-bold h-9 text-xs"
                        onClick={() => saveTimeline(which)}>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {saving ? "Saving…" : "Save Snapshot"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isSignedIn && showSaved && (
          <div className="mt-4 rounded-2xl p-4"
            style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BookmarkCheck className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">Saved Scenarios</span>
              <span className="text-[10px] text-white/40 ml-auto">{savedTimelines.length} saved</span>
            </div>
            {savedTimelines.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm">
                No saved scenarios yet. Run a simulation and save a snapshot above.
              </div>
            ) : (
              <div className="space-y-3">
                {savedTimelines.map(tl => {
                  const yr5 = tl.results.find(r => r.horizon === "5yr");
                  const yr10 = tl.results.find(r => r.horizon === "10yr");
                  return (
                    <div key={tl.id} className="rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-start gap-3">
                        <CircleDot className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
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
                          <div className="flex gap-4 mt-2 text-[10px] font-mono">
                            <span>Income: <span className="text-white/70">{fmt(tl.monthlyIncome)}/mo</span></span>
                            <span>Save: <span className="text-emerald-400">{(tl.savingsRate * 100).toFixed(0)}%</span></span>
                            {yr5 && <span>5yr NW: <span className="text-primary">{fmt(yr5.projectedNetWorth)}</span></span>}
                            {yr10 && <span>10yr NW: <span className="text-amber-400">{fmt(yr10.projectedNetWorth)}</span></span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => loadSaved(tl, "A")}
                            className="text-[10px] px-2 py-1 rounded border border-blue-400/30 text-blue-400 hover:bg-blue-400/10 font-bold transition-all"
                          >A</button>
                          <button
                            onClick={() => loadSaved(tl, "B")}
                            className="text-[10px] px-2 py-1 rounded border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 font-bold transition-all"
                          >B</button>
                          <button
                            onClick={() => deleteSaved(tl.id)}
                            className="text-white/20 hover:text-red-400 transition-colors p-1"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isSignedIn && (
          <div className="mt-6 rounded-xl p-4 flex items-center gap-3"
            style={{ background: "rgba(0,200,248,0.05)", border: "1px solid rgba(0,200,248,0.12)" }}>
            <AlertTriangle className="w-4 h-4 text-primary/60 shrink-0" />
            <div className="text-xs text-white/50">
              <span className="text-primary font-bold">Sign in</span> to save scenarios, track your identity stage, and earn XP for exploring different financial paths.
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
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
