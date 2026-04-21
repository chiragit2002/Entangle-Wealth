import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { X, Target, ChevronRight, CheckCircle2, Zap, TrendingUp, Shield, DollarSign, Plus } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

interface FinancialGoal {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const GOAL_OPTIONS: FinancialGoal[] = [
  { id: "save_emergency", label: "Build emergency fund", icon: <Shield className="w-4 h-4" />, description: "3–6 months of expenses" },
  { id: "pay_off_debt", label: "Pay off debt faster", icon: <DollarSign className="w-4 h-4" />, description: "Eliminate high-interest balances" },
  { id: "invest_more", label: "Start investing", icon: <TrendingUp className="w-4 h-4" />, description: "Put money to work for you" },
  { id: "reduce_taxes", label: "Reduce my tax bill", icon: <Zap className="w-4 h-4" />, description: "Find hidden deductions" },
];

const EXTRA_GOALS: FinancialGoal[] = [
  { id: "retirement_plan", label: "Retirement planning", icon: <Target className="w-4 h-4" />, description: "Max out 401k/IRA contributions" },
  { id: "side_income", label: "Grow side income", icon: <Plus className="w-4 h-4" />, description: "Build additional income streams" },
  { id: "credit_score", label: "Boost credit score", icon: <TrendingUp className="w-4 h-4" />, description: "Improve by 50+ points" },
  { id: "budget_master", label: "Master budgeting", icon: <DollarSign className="w-4 h-4" />, description: "Track every dollar in/out" },
  { id: "insurance_review", label: "Review insurance", icon: <Shield className="w-4 h-4" />, description: "Ensure proper coverage" },
];

const STORAGE_KEY = "ew_goal_flow";
const DISMISS_KEY = "ew_goal_flow_dismissed";

interface StoredGoalFlow {
  step: number;
  goals: string[];
  lastShown: string;
}

export function CommitmentEscalationFlow() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [extraGoals, setExtraGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const today = new Date().toISOString().slice(0, 10);

    try {
      const stored: StoredGoalFlow = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (stored.lastShown === today) return;
      if (stored.step >= 4) return;

      const currentStep = stored.step ?? 0;
      setStep(currentStep);
      setSelectedGoals(stored.goals ?? []);

      setTimeout(() => setVisible(true), 3000);
    } catch {
      setTimeout(() => setVisible(true), 3000);
    }
  }, [isLoaded, isSignedIn]);

  const saveProgress = useCallback((newStep: number, goals: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: newStep, goals, lastShown: today }));
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  const handleStep0Submit = async () => {
    if (selectedGoals.length === 0) return;
    setSaving(true);
    trackEvent("goal_flow_step1_completed", { goals: selectedGoals });

    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialGoals: selectedGoals }),
      });
    } catch {}

    saveProgress(1, selectedGoals);
    setSaving(false);
    setStep(1);
  };

  const handleStep1Submit = async () => {
    setSaving(true);
    trackEvent("goal_flow_step2_completed", { goals: selectedGoals });
    saveProgress(2, selectedGoals);
    setSaving(false);
    setStep(2);
  };

  const handleStep2Submit = async () => {
    const allGoals = [...selectedGoals, ...extraGoals];
    setSaving(true);
    trackEvent("goal_flow_step3_completed", { goals: allGoals, extraGoals });

    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialGoals: allGoals }),
      });
    } catch {}

    saveProgress(3, allGoals);
    setSaving(false);
    setStep(3);
  };

  const handleStep3Submit = () => {
    trackEvent("goal_flow_step4_completed", { goals: [...selectedGoals, ...extraGoals] });
    saveProgress(4, [...selectedGoals, ...extraGoals]);
    setCompleted(true);
    setTimeout(() => setVisible(false), 1500);
  };

  const toggleExtra = (id: string) => {
    setExtraGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  if (!isSignedIn || !visible) return null;

  if (completed) {
    return (
      <div className="fixed bottom-24 left-4 z-[200] w-72 animate-in fade-in duration-300">
        <div className="bg-card border border-[#00FF41]/25 rounded-xl p-4 flex items-center gap-3 shadow-2xl">
          <CheckCircle2 className="w-5 h-5 text-[#00FF41] flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground/80">Goals saved! Your experience is now personalized.</p>
        </div>
      </div>
    );
  }

  const STEP_COUNT = 4;
  const stepTitles = ["What's your #1 goal?", "Track your progress", "Add more goals", "Ready to go deeper?"];

  return (
    <div className="fixed bottom-24 left-4 z-[200] w-72 animate-in slide-in-from-left-4 fade-in duration-500">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-xs font-bold text-foreground/80">{stepTitles[step]}</span>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 py-3">
          {step === 0 && (
            <>
              <p className="text-[10px] text-muted-foreground/70 mb-3">
                Pick one financial goal to focus on this month. Just one — start small.
              </p>
              <div className="space-y-1.5 mb-3">
                {GOAL_OPTIONS.map(goal => {
                  const selected = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      onClick={() => setSelectedGoals([goal.id])}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                        selected
                          ? "border-[#00D4FF]/40 bg-[#00D4FF]/8"
                          : "border-border bg-muted/30 hover:border-white/15"
                      }`}
                    >
                      <span className={`flex-shrink-0 ${selected ? "text-[#00D4FF]" : "text-muted-foreground/50"}`}>{goal.icon}</span>
                      <div>
                        <p className={`text-xs font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{goal.label}</p>
                        <p className="text-[9px] text-muted-foreground/50">{goal.description}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4FF] ml-auto" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleStep0Submit}
                disabled={selectedGoals.length === 0 || saving}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold transition-all disabled:opacity-40 bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/25"
              >
                Set my goal <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-[10px] text-muted-foreground/70 mb-3">
                Great! Track today's progress toward your goal of <span className="text-foreground/70 font-semibold">{GOAL_OPTIONS.find(g => selectedGoals.includes(g.id))?.label}</span>.
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-3 mb-3">
                <p className="text-[9px] text-muted-foreground/50 mb-1">Today's action</p>
                <p className="text-xs text-foreground/70">Complete 1 habit related to your goal to earn 50 XP</p>
              </div>
              <button
                onClick={handleStep1Submit}
                disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold bg-[#00FF41]/10 border border-[#00FF41]/25 text-[#00FF41] hover:bg-[#00FF41]/20 transition-all"
              >
                I'm tracking it <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[10px] text-muted-foreground/70 mb-3">
                You're building momentum! Add up to 3 more goals to accelerate your financial growth.
              </p>
              <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                {EXTRA_GOALS.filter(g => !selectedGoals.includes(g.id)).map(goal => {
                  const selected = extraGoals.includes(goal.id);
                  const disabled = !selected && extraGoals.length >= 3;
                  return (
                    <button
                      key={goal.id}
                      onClick={() => !disabled && toggleExtra(goal.id)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                        selected
                          ? "border-[#FFB800]/40 bg-[#FFB800]/8"
                          : disabled
                            ? "border-border bg-muted/30 opacity-40"
                            : "border-border bg-muted/30 hover:border-white/15"
                      }`}
                    >
                      <span className={`flex-shrink-0 ${selected ? "text-[#FFB800]" : "text-muted-foreground/50"}`}>{goal.icon}</span>
                      <div>
                        <p className={`text-xs font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{goal.label}</p>
                        <p className="text-[9px] text-muted-foreground/50">{goal.description}</p>
                      </div>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-[#FFB800] ml-auto" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleStep2Submit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold bg-[#FFB800]/10 border border-[#FFB800]/25 text-[#FFB800] hover:bg-[#FFB800]/20 transition-all"
                >
                  {extraGoals.length > 0 ? `Add ${extraGoals.length} goal${extraGoals.length > 1 ? "s" : ""}` : "Skip for now"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-[10px] text-muted-foreground/70 mb-3">
                You're building momentum. Unlock advanced goal tracking with Pro — it connects your habits to real dollar outcomes.
              </p>
              <div className="space-y-1.5 mb-3">
                {["Multi-goal tracking", "Dollar projections", "AI-powered coaching"].map(feat => (
                  <div key={feat} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-[#FFB800] flex-shrink-0" />
                    {feat}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <a
                  href="/pricing"
                  onClick={() => { trackEvent("goal_flow_upgrade_clicked"); handleStep3Submit(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-bold bg-gradient-to-r from-[#FFB800] to-[#cc9900] text-black hover:opacity-90 transition-all"
                >
                  Go Pro <ChevronRight className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={handleStep3Submit}
                  className="px-3 h-9 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Later
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-4 pb-3 flex gap-1">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= step ? "#00D4FF" : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
