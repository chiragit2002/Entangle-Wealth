import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { fireConfetti } from "@/lib/confetti";
import { JourneyBridgeCard } from "@/components/journey/JourneyBridgeCard";
import { useJourney } from "@/hooks/useJourney";
import { showBacktestXpToast, showBadgeUnlockToast } from "@/components/BloombergToast";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  TrendingUp, Zap, Trophy, ChevronRight, ChevronLeft, Target, DollarSign,
  Percent, Calendar, BarChart3, Award, RefreshCw, Info, Sparkles, Lock,
  CheckCircle, AlertCircle, ArrowUpRight,
} from "lucide-react";

const MILESTONES = [
  { threshold: 10000, key: "net_worth_10k", label: "$10K", icon: "🌱", color: "#00B4D8" },
  { threshold: 50000, key: "net_worth_50k", label: "$50K", icon: "🌿", color: "#00B4D8" },
  { threshold: 100000, key: "net_worth_100k", label: "$100K", icon: "💰", color: "#00B4D8" },
  { threshold: 250000, key: "net_worth_250k", label: "$250K", icon: "🚀", color: "#9c27b0" },
  { threshold: 500000, key: "net_worth_500k", label: "$500K", icon: "💎", color: "#FFB800" },
  { threshold: 1000000, key: "net_worth_1m", label: "$1M", icon: "👑", color: "#FFB800" },
];

const RISK_PROFILES = {
  conservative: { label: "Conservative", returnRate: 5, color: "#00B4D8", desc: "Bonds & stable assets" },
  moderate: { label: "Moderate", returnRate: 7, color: "#00B4D8", desc: "Balanced portfolio" },
  aggressive: { label: "Aggressive", returnRate: 10, color: "#ff6b35", desc: "Growth-focused equities" },
};

interface ProjectionPoint {
  year: number;
  netWorth: number;
  contributions: number;
  investmentGrowth: number;
  realValue: number;
}

interface SimProfile {
  annualIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  currentSavings: number;
  monthlyInvestment: number;
  expectedReturnRate: number;
  inflationRate: number;
  timeHorizonYears: number;
  riskTolerance: string;
}

interface MilestoneStatus {
  threshold: number;
  key: string;
  label: string;
  achieved: boolean;
  projectedYear: number | null;
}

const DEFAULT_PROFILE: SimProfile = {
  annualIncome: 60000,
  monthlyExpenses: 3000,
  savingsRate: 10,
  currentSavings: 5000,
  monthlyInvestment: 500,
  expectedReturnRate: 7,
  inflationRate: 3,
  timeHorizonYears: 30,
  riskTolerance: "moderate",
};

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

function formatFullCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function Slider({ label, value, min, max, step = 1, unit = "", onChange, color = "#00B4D8", tip }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void; color?: string; tip?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest flex items-center gap-1">
          {label}
          {tip && (
            <span className="group relative cursor-help">
              <Info className="w-2.5 h-2.5 text-white/25" />
              <span className="absolute left-0 bottom-full mb-1 w-48 text-[9px] bg-[#1a1a2e] border border-white/10 text-white/70 px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                {tip}
              </span>
            </span>
          )}
        </span>
        <span className="text-[11px] font-mono font-bold" style={{ color }}>
          {unit === "$" ? formatFullCurrency(value) : `${value}${unit}`}
        </span>
      </div>
      <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 10 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#0a0a14] shadow-lg"
          style={{ left: `calc(${pct}% - 6px)`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[8px] font-mono text-white/40">
        <span>{unit === "$" ? formatCurrency(min) : `${min}${unit}`}</span>
        <span>{unit === "$" ? formatCurrency(max) : `${max}${unit}`}</span>
      </div>
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0d0d1a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    fontSize: "10px",
    fontFamily: "monospace",
    color: "#fff",
    padding: "8px 12px",
  },
  labelStyle: { color: "rgba(255,255,255,0.5)", fontSize: "9px" },
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d0d1a] border border-white/[0.08] rounded-sm px-3 py-2 text-[10px] font-mono min-w-[160px]">
      <p className="text-white/50 mb-1.5">Year {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-white font-bold">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function WizardStep({ step, title, subtitle, children, onNext, onBack, isLast = false, canProceed = true }: {
  step: number; title: string; subtitle: string; children: React.ReactNode;
  onNext: () => void; onBack?: () => void; isLast?: boolean; canProceed?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Step {step} of 4</span>
        </div>
        <h2 className="text-lg font-black text-white font-mono">{title}</h2>
        <p className="text-[11px] text-white/50 mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-5">{children}</div>
      <div className="flex items-center gap-3 pt-2">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 px-4 py-2.5 text-[11px] font-mono font-bold text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00B4D8] text-black font-bold text-[11px] font-mono uppercase tracking-widest rounded-sm hover:bg-[#00B4D8]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLast ? (
            <><Sparkles className="w-3.5 h-3.5" /> Run Simulation</>
          ) : (
            <>Continue <ChevronRight className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
}

function HealthScoreBar({ profile }: { profile: SimProfile }) {
  const savingsScore = Math.min(profile.savingsRate / 20 * 40, 40);
  const investmentScore = Math.min((profile.monthlyInvestment / (profile.annualIncome / 12)) * 100 * 0.3, 30);
  const expenseScore = Math.min(30 - Math.max(0, ((profile.monthlyExpenses / (profile.annualIncome / 12)) - 0.5) * 60), 30);
  const total = Math.round(savingsScore + investmentScore + expenseScore);
  const clampedScore = Math.min(Math.max(total, 0), 100);

  const color = clampedScore >= 70 ? "#00B4D8" : clampedScore >= 40 ? "#FFB800" : "#ff3366";
  const label = clampedScore >= 70 ? "Excellent" : clampedScore >= 40 ? "Good" : "Needs Work";

  return (
    <div className="bg-[#0a0a14] border border-white/[0.06] rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[#00B4D8]" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00B4D8]">Financial Health Score</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono" style={{ color }}>{clampedScore}</span>
          <span className="text-[9px] font-mono text-white/30">/100</span>
          <span className="text-[9px] font-mono font-bold ml-1" style={{ color }}>{label}</span>
        </div>
      </div>
      <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${clampedScore}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-white/40">
        <div>Savings Rate: <span className="text-white/70">{profile.savingsRate}%</span></div>
        <div>Investment Ratio: <span className="text-white/70">{((profile.monthlyInvestment / (profile.annualIncome / 12)) * 100).toFixed(1)}%</span></div>
        <div>Expense Ratio: <span className="text-white/70">{((profile.monthlyExpenses / (profile.annualIncome / 12)) * 100).toFixed(1)}%</span></div>
      </div>
    </div>
  );
}

export default function WealthSim() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { toast } = useToast();
  const { onEvent } = useJourney();

  const [wizardStep, setWizardStep] = useState(0);
  const [tryWithoutAccount, setTryWithoutAccount] = useState(false);
  const [profile, setProfile] = useState<SimProfile>(DEFAULT_PROFILE);
  const [projections, setProjections] = useState<ProjectionPoint[]>([]);
  const [comparing, setComparing] = useState<ProjectionPoint[]>([]);
  const [compareProfile, setCompareProfile] = useState<SimProfile | null>(null);
  const [milestones, setMilestones] = useState<MilestoneStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [newMilestones, setNewMilestones] = useState<{ key: string; label: string }[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [activeScenario, setActiveScenario] = useState<"base" | "optimistic" | "pessimistic">("base");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simCountRef = useRef<number>(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    authFetch("/simulation/profile", getToken).then(async r => {
      if (r.ok) {
        const data = await r.json();
        setProfile({
          annualIncome: data.annualIncome ?? DEFAULT_PROFILE.annualIncome,
          monthlyExpenses: data.monthlyExpenses ?? DEFAULT_PROFILE.monthlyExpenses,
          savingsRate: data.savingsRate ?? DEFAULT_PROFILE.savingsRate,
          currentSavings: data.currentSavings ?? DEFAULT_PROFILE.currentSavings,
          monthlyInvestment: data.monthlyInvestment ?? DEFAULT_PROFILE.monthlyInvestment,
          expectedReturnRate: data.expectedReturnRate ?? DEFAULT_PROFILE.expectedReturnRate,
          inflationRate: data.inflationRate ?? DEFAULT_PROFILE.inflationRate,
          timeHorizonYears: data.timeHorizonYears ?? DEFAULT_PROFILE.timeHorizonYears,
          riskTolerance: data.riskTolerance ?? DEFAULT_PROFILE.riskTolerance,
        });
      }
    }).catch((err) => { console.error("[WealthSim] Failed to load simulation profile:", err); });
    authFetch("/simulation/milestones", getToken).then(async r => {
      if (r.ok) setMilestones(await r.json());
    }).catch((err) => { console.error("[WealthSim] Failed to load milestones:", err); });
  }, [isLoaded, isSignedIn, getToken]);

  const calcLocalProjections = (p: SimProfile): ProjectionPoint[] => {
    const monthlyRate = p.expectedReturnRate / 100 / 12;
    const annualInflationRate = p.inflationRate / 100;
    const results: ProjectionPoint[] = [];
    let currentValue = p.currentSavings;
    let totalContributions = p.currentSavings;
    for (let year = 1; year <= p.timeHorizonYears; year++) {
      for (let m = 0; m < 12; m++) {
        currentValue = currentValue * (1 + monthlyRate) + p.monthlyInvestment;
        totalContributions += p.monthlyInvestment;
      }
      const investmentGrowth = currentValue - totalContributions;
      const inflationFactor = Math.pow(1 + annualInflationRate, year);
      results.push({
        year,
        netWorth: Math.round(currentValue),
        contributions: Math.round(totalContributions),
        investmentGrowth: Math.round(Math.max(investmentGrowth, 0)),
        realValue: Math.round(currentValue / inflationFactor),
      });
    }
    return results;
  };

  const awardSimXp = useCallback(async (finalNetWorth: number, simCount: number) => {
    if (!isSignedIn) return;
    try {
      const reason = finalNetWorth >= 1_000_000 ? "milestone_projection" : "backtest_run";
      const res = await authFetch("/gamification/xp", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "backtesting",
          reason,
          metrics: { projectedNetWorth: finalNetWorth, simulationCount: simCount },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.xpEarned > 0) {
          showBacktestXpToast(data.xpEarned);
        }
        if (data.newBadges?.length > 0) {
          for (const badge of data.newBadges) {
            setTimeout(() => showBadgeUnlockToast(badge), 600);
          }
        }
      }
    } catch {
      // silent — XP award failure should not block UI
    }
  }, [isSignedIn, getToken]);

  const runProjection = useCallback(async (p: SimProfile, save = false) => {
    setLoading(true);
    try {
      if (!isSignedIn) {
        const localProjections = calcLocalProjections(p);
        setProjections(localProjections);
        setSimulated(true);
        setLoading(false);
        return;
      }

      const body = {
        currentSavings: p.currentSavings,
        monthlyInvestment: p.monthlyInvestment,
        savingsRate: p.savingsRate,
        annualIncome: p.annualIncome,
        expectedReturnRate: p.expectedReturnRate,
        inflationRate: p.inflationRate,
        timeHorizonYears: p.timeHorizonYears,
        saveSnapshot: save,
        snapshotLabel: `Sim ${new Date().toLocaleDateString()}`,
      };
      const r = await authFetch("/simulation/project", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        setProjections(data.projections);
        setSimulated(true);
        if (data.xpAwarded > 0) {
          setXpEarned(data.xpAwarded);
          toast({ title: `+${data.xpAwarded} XP Earned!`, description: data.isFirstRun ? "First simulation completed!" : "Milestone unlocked!" });
        }
        if (data.newMilestones?.length > 0) {
          setNewMilestones(data.newMilestones);
          fireConfetti();
        }
        const msRes = await authFetch("/simulation/milestones", getToken);
        if (msRes.ok) setMilestones(await msRes.json());

        simCountRef.current += 1;
        const finalNetWorth = data.projections?.[data.projections.length - 1]?.netWorth ?? 0;
        awardSimXp(finalNetWorth, simCountRef.current);
        onEvent("wealthsim_run");
      } else {
        const localProjections = calcLocalProjections(p);
        setProjections(localProjections);
        setSimulated(true);
        setIsOfflineMode(true);
      }
    } catch {
      const localProjections = calcLocalProjections(p);
      setProjections(localProjections);
      setSimulated(true);
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  }, [getToken, toast, isSignedIn, awardSimXp]);

  const saveProfile = useCallback(async () => {
    if (!isSignedIn) return;
    setSaving(true);
    try {
      await authFetch("/simulation/profile", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      toast({ title: "Profile saved", description: "Your simulation settings have been saved." });
    } catch {
      toast({ title: "Save failed", description: "Could not save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [isSignedIn, getToken, profile, toast]);

  const handleProfileChange = useCallback((key: keyof SimProfile, value: number | string) => {
    setProfile(prev => {
      const updated = { ...prev, [key]: value };
      if (simulated) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runProjection(updated), 600);
      }
      return updated;
    });
  }, [simulated, runProjection]);

  const addCompareScenario = () => {
    const optimistic = { ...profile, expectedReturnRate: Math.min(profile.expectedReturnRate + 3, 20), savingsRate: Math.min(profile.savingsRate + 5, 100) };
    setCompareProfile(optimistic);
    setShowComparePanel(true);
    const body = {
      currentSavings: optimistic.currentSavings,
      monthlyInvestment: optimistic.monthlyInvestment,
      savingsRate: optimistic.savingsRate,
      annualIncome: optimistic.annualIncome,
      expectedReturnRate: optimistic.expectedReturnRate,
      inflationRate: optimistic.inflationRate,
      timeHorizonYears: optimistic.timeHorizonYears,
    };
    authFetch("/simulation/project", getToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async r => { if (r.ok) { const d = await r.json(); setComparing(d.projections); } }).catch((err) => { console.error("[WealthSim] Failed to load comparison projections:", err); });
  };

  const chartData = projections.map(p => ({
    year: `Y${p.year}`,
    "Net Worth": p.netWorth,
    "Contributions": p.contributions,
    "Investment Growth": p.investmentGrowth,
    "Real Value (Inflation-adj.)": p.realValue,
    ...(comparing.length > 0 ? { "Optimized Path": comparing[p.year - 1]?.netWorth ?? 0 } : {}),
  }));

  const finalNetWorth = projections[projections.length - 1]?.netWorth ?? 0;
  const finalContributions = projections[projections.length - 1]?.contributions ?? 0;
  const finalGrowth = projections[projections.length - 1]?.investmentGrowth ?? 0;
  const finalReal = projections[projections.length - 1]?.realValue ?? 0;

  const milestoneYear = (threshold: number) => {
    const found = projections.find(p => p.netWorth >= threshold);
    return found ? `Year ${found.year}` : null;
  };

  const monthlyIncomeNeeded = finalNetWorth * 0.04 / 12;

  if (!isLoaded) {
    return <Layout><div className="min-h-screen bg-[#040408] flex items-center justify-center"><RefreshCw className="w-6 h-6 text-white/40 animate-spin" /></div></Layout>;
  }

  if (!isSignedIn && !tryWithoutAccount && wizardStep < 4) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#040408] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <TrendingUp className="w-14 h-14 text-[#00B4D8] mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white font-mono mb-2">Wealth Simulation Engine</h1>
            <p className="text-white/50 text-sm mb-6">See how your decisions compound. Sign in to save progress and earn XP.</p>
            <div className="flex gap-3 justify-center">
              <a href="/sign-in" className="px-5 py-2.5 bg-[#00B4D8] text-black font-bold font-mono text-[11px] uppercase tracking-widest rounded-sm hover:bg-[#00B4D8]/90 transition-colors">Sign In</a>
              <button onClick={() => { setTryWithoutAccount(true); setWizardStep(1); }} className="px-5 py-2.5 border border-white/10 text-white/60 font-mono text-[11px] uppercase tracking-widest rounded-sm hover:border-white/20 hover:text-white/80 transition-colors">Try Without Account</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#040408]">
        <div className="bg-[#040408] border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-[#00B4D8]" />
            <span className="text-[11px] font-mono font-bold text-[#00B4D8] tracking-wider">WEALTH SIMULATION ENGINE</span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[9px] font-mono text-white/25">All projections are simulations only | not financial advice</span>
          </div>
          {xpEarned > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#FFB800]">
              <Zap className="w-3.5 h-3.5" />
              +{xpEarned} XP Earned
            </div>
          )}
        </div>

        {isOfflineMode && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/5 border-b border-yellow-500/15 text-[11px] font-mono text-yellow-400/80">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Running in offline mode — projections are calculated locally. Your XP and milestones will sync when the connection is restored.</span>
          </div>
        )}

        {wizardStep === 0 && (
          <div className="max-w-5xl mx-auto p-4 space-y-4">
            <div className="bg-gradient-to-r from-[#0a0a14] via-[#0d0d1f] to-[#0a0a14] border border-white/[0.08] rounded-sm p-6 text-center">
              <div className="text-5xl mb-3">📈</div>
              <h1 className="text-2xl font-black text-white font-mono mb-2">Wealth Simulation Engine</h1>
              <p className="text-white/50 text-sm max-w-lg mx-auto mb-6">See how your money grows over time. Adjust your savings rate, investment allocation, and time horizon | watch your future net worth update in real time.</p>
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
                {[
                  { icon: <DollarSign className="w-4 h-4" />, label: "Compound Growth", desc: "See contributions vs. returns" },
                  { icon: <Target className="w-4 h-4" />, label: "Milestone System", desc: "Unlock rewards along the way" },
                  { icon: <BarChart3 className="w-4 h-4" />, label: "Scenario Compare", desc: "What-if analysis side by side" },
                ].map(f => (
                  <div key={f.label} className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3 text-left">
                    <span className="text-[#00B4D8]">{f.icon}</span>
                    <p className="text-[10px] font-mono font-bold text-white/80 mt-2">{f.label}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setWizardStep(1)} className="px-8 py-3 bg-[#00B4D8] text-black font-black font-mono text-sm uppercase tracking-widest rounded-sm hover:bg-[#00B4D8]/90 transition-colors flex items-center gap-2 mx-auto">
                <Sparkles className="w-4 h-4" /> Start Simulation
              </button>
            </div>

            {simulated && projections.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-sm p-3 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#00B4D8] shrink-0" />
                <span className="text-[11px] text-white/50">You have a saved simulation. <button onClick={() => setWizardStep(4)} className="text-[#00B4D8] hover:underline">Jump to results →</button></span>
              </div>
            )}
          </div>
        )}

        {wizardStep >= 1 && wizardStep <= 4 && (
          <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">

            <div className="lg:col-span-2 bg-[#0A0E1A] border border-white/[0.06] rounded-sm p-5">
              {wizardStep === 1 && (
                <WizardStep
                  step={1} title="Income & Expenses"
                  subtitle="Tell us about your current financial snapshot"
                  onNext={() => setWizardStep(2)}
                  onBack={() => setWizardStep(0)}
                >
                  <Slider label="Annual Income" value={profile.annualIncome} min={20000} max={500000} step={1000} unit="$" onChange={v => handleProfileChange("annualIncome", v)} color="#00B4D8" tip="Your gross annual income before taxes" />
                  <Slider label="Monthly Expenses" value={profile.monthlyExpenses} min={500} max={20000} step={100} unit="$" onChange={v => handleProfileChange("monthlyExpenses", v)} color="#ff6b35" tip="Total monthly spending excluding savings/investments" />
                  <Slider label="Current Savings" value={profile.currentSavings} min={0} max={500000} step={1000} unit="$" onChange={v => handleProfileChange("currentSavings", v)} color="#00B4D8" tip="Your current savings/investment account balance" />

                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3 text-[10px] font-mono space-y-1">
                    <div className="flex justify-between"><span className="text-white/50">Monthly Income</span><span className="text-white/70">{formatFullCurrency(profile.annualIncome / 12)}</span></div>
                    <div className="flex justify-between"><span className="text-white/50">After Expenses</span><span className={profile.annualIncome / 12 - profile.monthlyExpenses > 0 ? "text-[#00B4D8]" : "text-[#ff3366]"}>{formatFullCurrency(profile.annualIncome / 12 - profile.monthlyExpenses)}</span></div>
                  </div>
                </WizardStep>
              )}

              {wizardStep === 2 && (
                <WizardStep
                  step={2} title="Savings Strategy"
                  subtitle="How much will you save and invest each month?"
                  onNext={() => setWizardStep(3)}
                  onBack={() => setWizardStep(1)}
                >
                  <Slider label="Savings Rate" value={profile.savingsRate} min={1} max={80} unit="%" onChange={v => handleProfileChange("savingsRate", v)} color="#00B4D8" tip="% of income automatically saved each month" />
                  <Slider label="Monthly Investment" value={profile.monthlyInvestment} min={0} max={10000} step={50} unit="$" onChange={v => handleProfileChange("monthlyInvestment", v)} color="#00B4D8" tip="Fixed amount invested in markets each month" />

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Investment Allocation</span>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(RISK_PROFILES).map(([key, rp]) => (
                        <button
                          key={key}
                          onClick={() => { handleProfileChange("riskTolerance", key); handleProfileChange("expectedReturnRate", rp.returnRate); }}
                          className={`p-2.5 rounded-sm border text-left transition-all ${profile.riskTolerance === key ? "border-[#00B4D8]/40 bg-[#00B4D8]/[0.06]" : "border-white/[0.06] hover:border-white/10"}`}
                        >
                          <div className="text-[9px] font-mono font-bold mb-0.5" style={{ color: profile.riskTolerance === key ? rp.color : "rgba(255,255,255,0.5)" }}>{rp.label}</div>
                          <div className="text-[8px] font-mono text-white/25">{rp.returnRate}% avg. return</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3 text-[10px] font-mono space-y-1">
                    <div className="flex justify-between"><span className="text-white/50">Auto-Saved Monthly</span><span className="text-[#00B4D8]">{formatFullCurrency(profile.annualIncome / 12 * profile.savingsRate / 100)}</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Total Invested Monthly</span><span className="text-[#00B4D8]">{formatFullCurrency(profile.monthlyInvestment)}</span></div>
                  </div>

                  {profile.savingsRate < 15 && (
                    <div className="flex items-start gap-2 text-[9px] font-mono text-[#FFB800]/80 bg-[#FFB800]/5 border border-[#FFB800]/10 rounded-sm p-2.5">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>Financial experts recommend saving at least 15% of income. Increasing by just 5% could add <span className="font-bold">{formatCurrency(profile.annualIncome / 12 * 0.05 * 12 * profile.timeHorizonYears * 1.5)}</span> to your projected net worth.</span>
                    </div>
                  )}
                </WizardStep>
              )}

              {wizardStep === 3 && (
                <WizardStep
                  step={3} title="Growth Assumptions"
                  subtitle="Set your time horizon and expected market returns"
                  onNext={() => { setWizardStep(4); runProjection(profile, false); }}
                  onBack={() => setWizardStep(2)}
                  isLast
                >
                  <Slider label="Time Horizon" value={profile.timeHorizonYears} min={1} max={50} unit=" yrs" onChange={v => handleProfileChange("timeHorizonYears", v)} color="#9c27b0" tip="How many years to project your wealth growth" />
                  <Slider label="Expected Annual Return" value={profile.expectedReturnRate} min={1} max={20} step={0.5} unit="%" onChange={v => handleProfileChange("expectedReturnRate", v)} color="#FFB800" tip="Historical S&P 500 avg is ~10% nominal, ~7% real" />
                  <Slider label="Inflation Rate" value={profile.inflationRate} min={0} max={10} step={0.5} unit="%" onChange={v => handleProfileChange("inflationRate", v)} color="#ff6b35" tip="Long-run US average is ~3%. Adjusts real purchasing power." />

                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3 text-[10px] font-mono space-y-1">
                    <div className="flex justify-between"><span className="text-white/50">Real Return (after inflation)</span><span className="text-white/70">{(profile.expectedReturnRate - profile.inflationRate).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Projection Period</span><span className="text-white/70">{profile.timeHorizonYears} years</span></div>
                  </div>

                  <div className="bg-[#040408] border border-amber-500/10 rounded-sm p-3 flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-500/60 leading-relaxed">All projections are simulations using standard financial models. Actual results vary significantly. This is not financial advice.</p>
                  </div>
                </WizardStep>
              )}

              {wizardStep === 4 && simulated && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00B4D8]">Adjust Parameters</span>
                      <button onClick={() => setWizardStep(1)} className="text-[9px] font-mono text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
                        <RefreshCw className="w-2.5 h-2.5" /> Restart
                      </button>
                    </div>
                    <div className="space-y-4">
                      <Slider label="Savings Rate" value={profile.savingsRate} min={1} max={80} unit="%" onChange={v => handleProfileChange("savingsRate", v)} color="#00B4D8" />
                      <Slider label="Monthly Investment" value={profile.monthlyInvestment} min={0} max={10000} step={50} unit="$" onChange={v => handleProfileChange("monthlyInvestment", v)} color="#00B4D8" />
                      <Slider label="Annual Return" value={profile.expectedReturnRate} min={1} max={20} step={0.5} unit="%" onChange={v => handleProfileChange("expectedReturnRate", v)} color="#FFB800" />
                      <Slider label="Time Horizon" value={profile.timeHorizonYears} min={1} max={50} unit=" yrs" onChange={v => handleProfileChange("timeHorizonYears", v)} color="#9c27b0" />
                    </div>
                  </div>

                  <HealthScoreBar profile={profile} />

                  <div className="flex gap-2">
                    <button
                      onClick={() => runProjection(profile, true)}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-[#00B4D8] text-black font-bold text-[10px] font-mono uppercase tracking-widest rounded-sm hover:bg-[#00B4D8]/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      {loading ? "Running..." : "Update"}
                    </button>
                    {isSignedIn && (
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="px-3 py-2.5 border border-white/10 text-white/40 text-[10px] font-mono uppercase tracking-widest rounded-sm hover:border-white/20 hover:text-white/60 transition-colors disabled:opacity-40"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 4 && !simulated && (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-white/40 mx-auto mb-3 animate-spin" />
                    <p className="text-[11px] text-white/50 font-mono">Running simulation...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-4">
              {wizardStep === 4 && (
                <>
                  {newMilestones.length > 0 && (
                    <div className="bg-gradient-to-r from-[#FFB800]/10 to-[#00B4D8]/10 border border-[#FFB800]/20 rounded-sm p-4 flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-[#FFB800] shrink-0" />
                      <div>
                        <p className="text-[11px] font-mono font-bold text-[#FFB800]">New Milestones Unlocked!</p>
                        <p className="text-[10px] text-white/50">{newMilestones.map(m => m.label).join(", ")}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Projected Net Worth", value: formatCurrency(finalNetWorth), color: "#00B4D8", icon: <TrendingUp className="w-3.5 h-3.5" />, sub: `in ${profile.timeHorizonYears} years` },
                      { label: "Total Contributions", value: formatCurrency(finalContributions), color: "#00B4D8", icon: <DollarSign className="w-3.5 h-3.5" />, sub: "money you put in" },
                      { label: "Investment Growth", value: formatCurrency(finalGrowth), color: "#FFB800", icon: <ArrowUpRight className="w-3.5 h-3.5" />, sub: "compound returns" },
                      { label: "Real Value (2024 $)", value: formatCurrency(finalReal), color: "#9c27b0", icon: <Percent className="w-3.5 h-3.5" />, sub: "inflation-adjusted" },
                    ].map(card => (
                      <div key={card.label} className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span style={{ color: card.color }}>{card.icon}</span>
                          <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{card.label}</span>
                        </div>
                        <div className="text-xl font-black font-mono" style={{ color: card.color }}>{card.value}</div>
                        <div className="text-[9px] text-white/25 font-mono">{card.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-[#00B4D8]" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00B4D8]">Net Worth Projection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={addCompareScenario}
                          className="text-[9px] font-mono text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors border border-white/[0.06] px-2 py-1 rounded-sm hover:border-white/10"
                        >
                          <Target className="w-2.5 h-2.5" /> Compare Optimized
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#00B4D8" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="compareGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FFB800" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#FFB800" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="year" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} width={60} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="Contributions" stroke="#00B4D8" fill="url(#contribGrad)" strokeWidth={1.5} dot={false} />
                          <Area type="monotone" dataKey="Net Worth" stroke="#00B4D8" fill="url(#netWorthGrad)" strokeWidth={2} dot={false} />
                          {comparing.length > 0 && (
                            <Area type="monotone" dataKey="Optimized Path" stroke="#FFB800" fill="url(#compareGrad)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                          )}
                          {MILESTONES.filter(m => m.threshold <= finalNetWorth * 1.1).map(m => {
                            const yYear = milestoneYear(m.threshold);
                            return yYear ? (
                              <ReferenceLine key={m.key} y={m.threshold} stroke={m.color} strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.5} label={{ value: m.label, position: "insideTopRight", fill: m.color, fontSize: 8, fontFamily: "monospace" }} />
                            ) : null;
                          })}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
                      <BarChart3 className="w-3.5 h-3.5 text-[#FFB800]" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFB800]">Compounding Breakdown</span>
                    </div>
                    <div className="p-3">
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FFB800" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#FFB800" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="year" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.2)", fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} width={60} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="Contributions" stroke="#00B4D8" fill="#00B4D8" fillOpacity={0.15} strokeWidth={1.5} dot={false} stackId="1" />
                          <Area type="monotone" dataKey="Investment Growth" stroke="#FFB800" fill="url(#growthGrad)" strokeWidth={1.5} dot={false} stackId="1" />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="flex items-center gap-4 mt-2 justify-center">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#00B4D8]/40" /> Contributions</div>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#FFB800]/40" /> Investment Growth</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
                      <Trophy className="w-3.5 h-3.5 text-[#FFB800]" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFB800]">Milestone Timeline</span>
                    </div>
                    <div className="p-3">
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.06]" />
                        <div className="space-y-3">
                          {MILESTONES.map((m) => {
                            const year = milestoneYear(m.threshold);
                            const achieved = milestones.find(ms => ms.key === m.key)?.achieved ?? false;
                            const projected = !!year;
                            const icon = MILESTONES.find(x => x.key === m.key)?.icon ?? "🎯";
                            const color = MILESTONES.find(x => x.key === m.key)?.color ?? "#00B4D8";
                            return (
                              <div key={m.key} className={`flex items-center gap-3 ml-2 ${!projected ? "opacity-40" : ""}`}>
                                <div
                                  className="relative z-10 w-6 h-6 rounded-sm flex items-center justify-center text-sm border"
                                  style={achieved ? { borderColor: color, background: `${color}20` } : projected ? { borderColor: `${color}40`, background: "rgba(0,0,0,0.5)" } : { borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}
                                >
                                  {achieved ? <CheckCircle className="w-3.5 h-3.5" style={{ color }} /> : projected ? icon : <Lock className="w-3 h-3 text-white/40" />}
                                </div>
                                <div className="flex-1 flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] font-mono font-bold" style={{ color: projected ? color : "rgba(255,255,255,0.3)" }}>{m.label}</span>
                                    {achieved && <span className="ml-2 text-[8px] font-mono text-[#00B4D8]">ACHIEVED</span>}
                                  </div>
                                  <span className="text-[9px] font-mono text-white/30">{year ?? "Out of range"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-[#00B4D8]" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#00B4D8]">Future Self Snapshot</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                        <p className="text-white/30 mb-1">Today's Net Worth</p>
                        <p className="text-lg font-black text-white/70">{formatCurrency(profile.currentSavings)}</p>
                        <p className="text-white/50 text-[8px] mt-0.5">Starting point</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                        <p className="text-white/30 mb-1">Future Self</p>
                        <p className="text-lg font-black" style={{ color: "#00B4D8" }}>{formatCurrency(finalNetWorth)}</p>
                        <p className="text-white/50 text-[8px] mt-0.5">In {profile.timeHorizonYears} years</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                        <p className="text-white/30 mb-1">Monthly 4% Rule Income</p>
                        <p className="text-lg font-black text-[#00B4D8]">{formatCurrency(monthlyIncomeNeeded)}</p>
                        <p className="text-white/50 text-[8px] mt-0.5">Safe withdrawal rate</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                        <p className="text-white/30 mb-1">Growth Multiplier</p>
                        <p className="text-lg font-black text-[#FFB800]">{profile.currentSavings > 0 ? `${(finalNetWorth / profile.currentSavings).toFixed(1)}x` : "∞"}</p>
                        <p className="text-white/50 text-[8px] mt-0.5">Compounding power</p>
                      </div>
                    </div>

                    {profile.savingsRate < 20 && (
                      <div className="mt-3 p-3 bg-[#00B4D8]/5 border border-[#00B4D8]/10 rounded-sm">
                        <p className="text-[10px] font-mono text-[#00B4D8]/80">
                          <span className="font-bold">💡 Insight:</span> Increasing your savings rate by 5% (to {Math.min(profile.savingsRate + 5, 80)}%) could add approximately{" "}
                          <span className="font-bold text-[#00B4D8]">
                            {formatCurrency(profile.annualIncome / 12 * 0.05 * profile.timeHorizonYears * 12 * (1 + profile.expectedReturnRate / 100))}
                          </span>{" "}
                          to your projected net worth.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {wizardStep === 4 && simulated && (
                <JourneyBridgeCard
                  title="Now see how taxes affect this projection"
                  desc="TaxFlow can show you how much of your projected growth you'll actually keep after taxes — and where to save more."
                  href="/tax"
                  phaseColor="#FFB800"
                  cta="Open TaxFlow →"
                />
              )}

              {wizardStep < 4 && (
                <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm p-5 text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-[11px] font-mono text-white/30 mb-2">Your projection will appear here after the simulation runs</p>
                  <p className="text-[9px] font-mono text-white/40">Complete the wizard to see your wealth curve</p>
                </div>
              )}
            </div>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="text-center py-4">
            <p className="text-[8px] font-mono text-white/40">
              ⚠️ All projections are simulations using compound interest formulas. Not financial advice. Actual returns vary.
              Assumptions: {profile.expectedReturnRate}% annual return, {profile.inflationRate}% inflation, {profile.timeHorizonYears}-year horizon.
            </p>
          </div>
        )}

      </div>
    </Layout>
  );
}
