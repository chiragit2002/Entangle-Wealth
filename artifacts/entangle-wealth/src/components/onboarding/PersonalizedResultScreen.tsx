import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Briefcase, Target, Sparkles, TrendingUp, Shield, Zap } from "lucide-react";

const FOCUS_LABELS: Record<string, string> = {
  saving: "Building savings",
  investing: "Investing smarter",
  debt: "Managing debt",
  unsure: "Exploring my options",
};

const OUTCOME_LABELS: Record<string, string> = {
  clarity: "Financial clarity",
  growth: "Wealth growth",
  stability: "Financial stability",
};

interface Recommendation {
  title: string;
  why: string;
  insights: string[];
}

function getRecommendation(focus: string, outcome: string): Recommendation {
  if (focus === "saving" || outcome === "stability") {
    return {
      title: "Build a 3-month emergency fund first",
      why: "Before any other financial move, having a safety net removes the stress from every other decision. It's the single highest-leverage thing you can do right now.",
      insights: [
        "67% of people who feel financially stable have 3+ months saved",
        "An emergency fund turns unexpected costs from crises into inconveniences",
        "Once saved, your next move becomes dramatically clearer",
      ],
    };
  }
  if (focus === "debt") {
    return {
      title: "Attack your highest-interest debt first",
      why: "High-interest debt is the fastest way to lose money you never see leave. Eliminating it is the highest guaranteed return available to you right now.",
      insights: [
        "Credit card debt averaging 22% APR costs more than most investments return",
        "The debt avalanche method saves the most money over time",
        "Clearing one debt creates momentum and frees cash for the next goal",
      ],
    };
  }
  if (focus === "investing" || outcome === "growth") {
    return {
      title: "Start with a low-cost index fund strategy",
      why: "Index funds outperform 80% of professional fund managers over a 10-year period. Starting simple beats waiting for the perfect moment.",
      insights: [
        "Time in the market beats timing the market — consistent contributions win",
        "Low-cost index funds (0.03–0.2% fees) keep more of your returns",
        "Maxing your employer 401(k) match is a 50–100% instant return",
      ],
    };
  }
  return {
    title: "Get a clear picture of where you stand",
    why: "Financial clarity is the foundation of every good decision. Knowing exactly where your money goes unlocks your ability to direct it with intention.",
    insights: [
      "Most people are surprised where their money actually goes each month",
      "Clarity on your situation makes every next step obvious",
      "A single honest look at your finances is worth more than 10 articles",
    ],
  };
}

interface PersonalizedResultScreenProps {
  firstName: string | null;
  occupationName?: string;
  focus: string;
  outcome: string;
  onContinue: () => void;
}

const INSIGHT_ICONS = [TrendingUp, Shield, Zap];

export function PersonalizedResultScreen({
  firstName,
  occupationName,
  focus,
  outcome,
  onContinue,
}: PersonalizedResultScreenProps) {
  const [, navigate] = useLocation();
  const rec = getRecommendation(focus, outcome);

  const handleCTA = () => {
    onContinue();
    navigate("/dashboard");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-screen-title"
    >
      <div className="bg-[#0a0a14] border border-white/10 rounded-2xl w-full max-w-md my-4 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-400">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00c8f8]/60 mb-1">
            Based on your inputs
          </p>
          <h2 id="result-screen-title" className="text-xl font-bold text-white leading-tight">
            {firstName ? `${firstName}, here` : "Here"}'s your next financial move
          </h2>
        </div>

        {/* Context summary */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex flex-wrap gap-2">
            {occupationName && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/60">
                <Briefcase className="w-3 h-3 text-[#00c8f8]" />
                {occupationName}
              </span>
            )}
            {focus && FOCUS_LABELS[focus] && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/60">
                <Target className="w-3 h-3 text-[#00e676]" />
                {FOCUS_LABELS[focus]}
              </span>
            )}
            {outcome && OUTCOME_LABELS[outcome] && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/60">
                <Sparkles className="w-3 h-3 text-[#f5c842]" />
                {OUTCOME_LABELS[outcome]}
              </span>
            )}
          </div>
        </div>

        {/* Primary recommendation */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00c8f8]/10 border border-[#00c8f8]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-[#00c8f8]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-2">{rec.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{rec.why}</p>
            </div>
          </div>
        </div>

        {/* Supporting insights */}
        <div className="px-6 py-4 space-y-3 border-b border-white/[0.06]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Why this matters</p>
          {rec.insights.map((insight, i) => {
            const Icon = INSIGHT_ICONS[i];
            return (
              <div key={i} className="flex items-start gap-2.5">
                <Icon className="w-3.5 h-3.5 text-[#00c8f8]/60 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/50 leading-relaxed">{insight}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="px-6 py-5">
          <button
            onClick={handleCTA}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,200,248,0.2)]"
          >
            Build my full plan
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-white/20 mt-3">
            Your personalized dashboard is ready with tools matched to your goal
          </p>
        </div>
      </div>
    </div>
  );
}
