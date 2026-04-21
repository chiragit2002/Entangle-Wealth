import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  Home, Shield, Sunrise, TrendingUp, Zap, RefreshCw,
  ChevronDown, ChevronUp, Target, Sparkles, Brain, GitBranch,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";

const API_BASE = "/api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Home,
  Sunrise,
};

const LIFESTYLE_TIERS: Record<string, { color: string; desc: string }> = {
  Affluent: { color: "#FFB800", desc: "Luxury lifestyle with full financial freedom" },
  Comfortable: { color: "#00B4D8", desc: "Great quality of life with financial security" },
  Stable: { color: "#00B4D8", desc: "Financial stability with modest luxuries" },
  Modest: { color: "#9c27b0", desc: "Covering needs with limited discretionary spending" },
  Basic: { color: "#ff6b35", desc: "Meeting essential needs only" },
};

interface LifeMilestone {
  id: string;
  label: string;
  description: string;
  achievable: boolean;
  currentPathAge: number | null;
  optimizedPathAge: number | null;
  icon: string;
}

interface PathSummary {
  finalNetWorth: number;
  annualPassiveIncome: number;
  lifestyleTier: string;
  retirementAge: number | null;
  emergencyFundAge: number | null;
  homePurchaseAge: number | null;
}

interface ChartPoint {
  age: number;
  currentPath: number;
  optimizedPath: number;
}

interface Improvement {
  netWorthGain: number;
  passiveIncomeGain: number;
  retirementYearsEarlier: number | null;
}

interface ProjectionResult {
  milestones: LifeMilestone[];
  chartData: ChartPoint[];
  currentPath: PathSummary;
  optimizedPath: PathSummary;
  improvement: Improvement;
  params: Record<string, number>;
}

function fmt(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v).toLocaleString()}`;
}

function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  return (
    <div className="bg-[#0f1117] border border-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2">Age {label as number}</p>
      {(payload as Array<{ dataKey: string; value: number; color: string }>).map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-bold">
          {p.dataKey === "currentPath" ? "Current Path" : "Optimized Path"}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

type ParamKey = "currentAge" | "annualIncome" | "monthlyInvestment" | "currentSavings" | "expectedReturnRate" | "inflationRate" | "monthlyExpenses";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  field: ParamKey;
  onChange: (field: ParamKey, v: number) => void;
}

function SliderRow({ label, value, min, max, step = 1, format, field, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(field, v)}
        className="w-full"
      />
    </div>
  );
}

const DEFAULT_PARAMS = {
  currentAge: 30,
  annualIncome: 60000,
  monthlyInvestment: 500,
  currentSavings: 5000,
  expectedReturnRate: 7,
  inflationRate: 3,
  monthlyExpenses: 3000,
};

export default function LifeOutcomes() {
  const { isSignedIn, getToken } = useAuth();
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const [result, setResult] = useState<ProjectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectionError, setProjectionError] = useState(false);
  const [showParams, setShowParams] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;
    authFetch("/life-outcomes/from-profile", getToken)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.hasProfile && data.profile) {
          setParams(prev => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(data.profile).filter(([k, v]) => k in prev && typeof v === "number")
            ),
          }));
        }
      })
      .catch(() => {});
  }, [isSignedIn, getToken]);

  const handleParamChange = useCallback((field: ParamKey, v: number) => {
    setParams(p => ({ ...p, [field]: v }));
  }, []);

  const runProjection = useCallback(async () => {
    setLoading(true);
    setProjectionError(false);
    try {
      const res = await fetch(`${API_BASE}/life-outcomes/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
      setShowParams(false);
    } catch {
      setProjectionError(true);
    } finally {
      setLoading(false);
    }
  }, [params]);

  return (
    <Layout>
      <PageErrorBoundary fallbackTitle="Life Outcomes encountered an error">
      <div className="min-h-screen bg-card text-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Life Outcome Visualizer</h1>
              <p className="text-muted-foreground text-sm mt-1">See how your financial decisions map to real life milestones.</p>
            </div>
          </div>

          <FinancialDisclaimerBanner pageKey="life-outcomes" />

          <div className="bg-muted/50 border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowParams(!showParams)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Target className="w-5 h-5 text-[#00B4D8]" />
                Financial Parameters
              </div>
              {showParams ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showParams && (
              <div className="px-6 pb-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <SliderRow label="Current Age" value={params.currentAge} min={18} max={65} field="currentAge" format={v => `${v} yrs`} onChange={handleParamChange} />
                  <SliderRow label="Annual Income" value={params.annualIncome} min={20000} max={500000} step={1000} field="annualIncome" format={v => fmt(v)} onChange={handleParamChange} />
                  <SliderRow label="Monthly Investment" value={params.monthlyInvestment} min={0} max={10000} step={50} field="monthlyInvestment" format={v => `$${v.toLocaleString()}/mo`} onChange={handleParamChange} />
                  <SliderRow label="Current Savings" value={params.currentSavings} min={0} max={500000} step={500} field="currentSavings" format={v => fmt(v)} onChange={handleParamChange} />
                  <SliderRow label="Expected Return Rate" value={params.expectedReturnRate} min={1} max={15} step={0.5} field="expectedReturnRate" format={v => `${v}%/yr`} onChange={handleParamChange} />
                  <SliderRow label="Monthly Expenses" value={params.monthlyExpenses} min={500} max={20000} step={100} field="monthlyExpenses" format={v => `$${v.toLocaleString()}/mo`} onChange={handleParamChange} />
                </div>

                {projectionError && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    Failed to run projection. Please check your inputs and try again.
                  </p>
                )}

                <button
                  onClick={runProjection}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#00B4D8] text-black font-bold text-sm hover:bg-[#00B4D8]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Projecting...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />Run Life Projection</>
                  )}
                </button>
              </div>
            )}
          </div>

          {result && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {["currentPath", "optimizedPath"].map(pathKey => {
                  const path = result[pathKey as keyof typeof result] as PathSummary;
                  const isOptimized = pathKey === "optimizedPath";
                  const tier = LIFESTYLE_TIERS[path.lifestyleTier];

                  return (
                    <div
                      key={pathKey}
                      className={`border rounded-xl p-6 space-y-4 ${
                        isOptimized ? "border-[#00B4D8]/30 bg-[#00B4D8]/5" : "border-border bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">
                          {isOptimized ? "Optimized Path" : "Current Path"}
                        </h3>
                        {isOptimized && <Zap className="w-5 h-5 text-[#00B4D8]" />}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Projected Net Worth</span>
                          <span className="text-foreground font-bold">{fmt(path.finalNetWorth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Annual Passive Income</span>
                          <span className="text-foreground font-bold">{fmt(path.annualPassiveIncome)}/yr</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm">Lifestyle Tier</span>
                          <span className="font-bold text-sm px-2 py-0.5 rounded-full" style={{ color: tier.color, background: `${tier.color}22` }}>
                            {path.lifestyleTier}
                          </span>
                        </div>
                        {path.retirementAge && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Financial Independence</span>
                            <span className="text-foreground font-bold">Age {path.retirementAge}</span>
                          </div>
                        )}
                        {path.homePurchaseAge && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Home Purchase Ready</span>
                            <span className="text-foreground font-bold">Age {path.homePurchaseAge}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground italic">{tier.desc}</p>
                    </div>
                  );
                })}
              </div>

              {(result.improvement.netWorthGain > 0 || result.improvement.retirementYearsEarlier) && (
                <div className="border border-[#00B4D8]/30 bg-[#00B4D8]/5 rounded-xl p-6">
                  <h3 className="font-bold text-[#00B4D8] mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Optimization Impact
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00B4D8]">{fmt(result.improvement.netWorthGain)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Additional Net Worth</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#00B4D8]">{fmt(result.improvement.passiveIncomeGain)}/yr</p>
                      <p className="text-xs text-muted-foreground mt-1">Additional Passive Income</p>
                    </div>
                    {result.improvement.retirementYearsEarlier !== null && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-[#00B4D8]">{result.improvement.retirementYearsEarlier} years</p>
                        <p className="text-xs text-muted-foreground mt-1">Earlier Financial Independence</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 border border-border rounded-xl p-6">
                <h3 className="font-bold text-foreground mb-4">Net Worth Trajectory</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={result.chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="age" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11 }} label={{ value: "Age", position: "insideBottom", offset: -2, fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />
                    <Area
                      type="monotone"
                      dataKey="currentPath"
                      name="Current Path"
                      stroke="#9c27b0"
                      strokeWidth={2}
                      fill="url(#currentGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="optimizedPath"
                      name="Optimized Path"
                      stroke="#00B4D8"
                      strokeWidth={2}
                      fill="url(#optimizedGrad)"
                    />
                    {result.currentPath.retirementAge && (
                      <ReferenceLine
                        x={result.currentPath.retirementAge}
                        stroke="#9c27b0"
                        strokeDasharray="4 4"
                        label={{ value: `FI Age ${result.currentPath.retirementAge}`, fill: "#9c27b0", fontSize: 10 }}
                      />
                    )}
                    {result.optimizedPath.retirementAge && result.optimizedPath.retirementAge !== result.currentPath.retirementAge && (
                      <ReferenceLine
                        x={result.optimizedPath.retirementAge}
                        stroke="#00B4D8"
                        strokeDasharray="4 4"
                        label={{ value: `FI Age ${result.optimizedPath.retirementAge}`, fill: "#00B4D8", fontSize: 10 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {result.milestones.map(milestone => {
                  const IconComp = ICON_MAP[milestone.icon] || Target;
                  return (
                    <div key={milestone.id} className="bg-muted/50 border border-border rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/10 flex items-center justify-center">
                          <IconComp className="w-5 h-5 text-[#00B4D8]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{milestone.label}</h4>
                          <p className="text-xs text-muted-foreground">{milestone.description}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Current Path</span>
                          <span className={milestone.currentPathAge ? "text-foreground" : "text-red-400"}>
                            {milestone.currentPathAge ? `Age ${milestone.currentPathAge}` : "Not achieved"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Optimized Path</span>
                          <span className={milestone.optimizedPathAge ? "text-[#00B4D8]" : "text-red-400"}>
                            {milestone.optimizedPathAge ? `Age ${milestone.optimizedPathAge}` : "Not achieved"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <Link href="/habits">
                  <a className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer">
                    <Zap className="w-8 h-8 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-foreground font-medium text-sm">Build the Habits</p>
                      <p className="text-muted-foreground text-xs">Take daily actions to reach this path</p>
                    </div>
                  </a>
                </Link>
                <Link href="/ai-coach">
                  <a className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/50 hover:border-[#00B4D8]/40 hover:bg-[#00B4D8]/5 transition-all cursor-pointer">
                    <Brain className="w-8 h-8 text-[#00B4D8] flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-foreground font-medium text-sm">Ask Your Coach</p>
                      <p className="text-muted-foreground text-xs">Get guidance on reaching this outcome</p>
                    </div>
                  </a>
                </Link>
                <Link href="/alternate-timeline">
                  <a className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/50 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all cursor-pointer">
                    <GitBranch className="w-8 h-8 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="text-foreground font-medium text-sm">Alternate Timeline</p>
                      <p className="text-muted-foreground text-xs">Compare decision paths side by side</p>
                    </div>
                  </a>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      </PageErrorBoundary>
    </Layout>
  );
}
