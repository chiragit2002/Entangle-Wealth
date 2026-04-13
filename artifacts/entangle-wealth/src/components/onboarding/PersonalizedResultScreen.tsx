import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Briefcase, Target, TrendingUp, Shield, Zap, Sparkles } from "lucide-react";

const FOCUS_LABELS: Record<string, string> = {
  saving: "Building savings",
  investing: "Investing smarter",
  debt: "Managing debt",
  unsure: "Exploring my options",
  tax: "Reducing my tax bill",
  clarity: "Getting financial clarity",
};

const FOCUS_COLORS: Record<string, string> = {
  saving: "text-[#00e676]",
  investing: "text-[#00c8f8]",
  debt: "text-[#ff6b6b]",
  unsure: "text-[#b8b8cc]",
  tax: "text-[#f5c842]",
  clarity: "text-[#00c8f8]",
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
  if (focus === "tax") {
    return {
      title: "Uncover deductions you're leaving on the table",
      why: "Most people overpay on taxes by $1,500–$5,000 per year without knowing it. A single tax scan can reveal deductions that pay for themselves many times over.",
      insights: [
        "The average person misses 12+ deductions they're entitled to claim",
        "Self-employed individuals often miss home office, mileage, and equipment deductions",
        "Proactive tax planning can legally reduce your bill by 15–30% annually",
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
  const focusLabel = FOCUS_LABELS[focus];
  const focusColor = FOCUS_COLORS[focus] || "text-white/60";

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
      <div className="bg-[#0a0a14] border border-white/[0.08] rounded-2xl w-full max-w-md my-4 shadow-2xl shadow-[#00c8f8]/5 animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="px-6 pt-7 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00c8f8]/30 to-transparent" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00c8f8]/[0.08] border border-[#00c8f8]/20">
              <Sparkles className="w-3 h-3 text-[#00c8f8]" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#00c8f8]/80">
                Your personalized plan
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00c8f8]/30 to-transparent" />
          </div>
          <h2 id="result-screen-title" className="text-xl font-bold text-white leading-snug">
            {firstName ? (
              <>{firstName}, here's your <span className="text-[#00c8f8]">next financial move</span></>
            ) : (
              <>Here's your <span className="text-[#00c8f8]">next financial move</span></>
            )}
          </h2>
          {(focusLabel || occupationName) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {occupationName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/50">
                  <Briefcase className="w-2.5 h-2.5 text-[#00c8f8]" aria-hidden="true" />
                  {occupationName}
                </span>
              )}
              {focusLabel && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] ${focusColor}`}>
                  <Target className="w-2.5 h-2.5" aria-hidden="true" />
                  {focusLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Primary recommendation */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#00c8f8]/10 border border-[#00c8f8]/20 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,200,248,0.1)]">
              <CheckCircle2 className="w-5 h-5 text-[#00c8f8]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">
                Top recommendation
              </p>
              <h3 className="text-[15px] font-bold text-white leading-snug mb-2.5">{rec.title}</h3>
              <p className="text-[13px] text-white/50 leading-relaxed">{rec.why}</p>
            </div>
          </div>
        </div>

        {/* Supporting insights */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">
            Why this matters
          </p>
          <div className="space-y-3">
            {rec.insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[i];
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3 h-3 text-[#00c8f8]/50" aria-hidden="true" />
                  </div>
                  <p className="text-[12px] text-white/45 leading-relaxed">{insight}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pt-5 pb-6">
          <button
            onClick={handleCTA}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(0,200,248,0.2)] min-h-[48px]"
          >
            Build my full plan
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <p className="text-center text-[11px] text-white/20 mt-3 leading-relaxed">
            Your personalized dashboard is ready with tools matched to your goal
          </p>
        </div>
      </div>
    </div>
  );
}
