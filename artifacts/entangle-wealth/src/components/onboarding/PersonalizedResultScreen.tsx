import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Briefcase, Target, TrendingUp, Shield, Zap, Sparkles } from "lucide-react";

const FOCUS_LABELS: Record<string, string> = {
  saving: "Cutting waste, building buffer",
  investing: "Putting money to actual work",
  debt: "Killing high-interest debt",
  unsure: "Getting the full picture first",
  tax: "Stopping overpayment to the IRS",
  clarity: "Understanding where I actually stand",
};

const FOCUS_COLORS: Record<string, string> = {
  saving: "text-[#FF8C00]",
  investing: "text-[#FF8C00]",
  debt: "text-[#ff6b6b]",
  unsure: "text-[#b8b8cc]",
  tax: "text-[#FFB800]",
  clarity: "text-[#FF8C00]",
};

interface Recommendation {
  title: string;
  why: string;
  insights: string[];
}

function getRecommendation(focus: string, outcome: string): Recommendation {
  if (focus === "saving" || outcome === "stability") {
    return {
      title: "Three months of runway — build it before anything else",
      why: "An emergency fund isn't cautious. It's the highest-leverage financial move you can make. It removes the anxiety from every decision that comes after it.",
      insights: [
        "67% of people who describe themselves as financially stable have 3+ months saved",
        "An emergency fund turns an unexpected cost from a crisis into an inconvenience",
        "Once it's funded, every next move — investing, paying off debt — becomes obvious",
      ],
    };
  }
  if (focus === "debt") {
    return {
      title: "Hit your highest-interest debt first. Nothing else until it's gone.",
      why: "High-interest debt is a guaranteed loss you're paying every single month. Eliminating it is the only investment with a certain, immediate return.",
      insights: [
        "Credit card debt at 22% APR costs more than almost any investment will ever return",
        "The avalanche method — highest rate first — saves the most over time",
        "Every paid-off balance frees cash and momentum for the next target",
      ],
    };
  }
  if (focus === "investing" || outcome === "growth") {
    return {
      title: "Start simple. Index funds. Consistent contributions. No timing.",
      why: "Index funds beat 80% of professional fund managers over 10 years. The people waiting for the right moment are watching the people who started simple build wealth.",
      insights: [
        "Time in the market wins. Timing the market costs you both time and returns.",
        "Low-cost index funds (0.03–0.2% expense ratios) keep your gains instead of paying them out",
        "If your employer matches 401(k) contributions, that's a 50–100% instant return. Max it.",
      ],
    };
  }
  if (focus === "tax") {
    return {
      title: "You're almost certainly overpaying your taxes. Let's find where.",
      why: "The average person misses thousands in deductions every year — not through fraud, just through not knowing what they're entitled to claim.",
      insights: [
        "Most people miss 12+ legitimate deductions on every return",
        "Self-employed? Home office, mileage, equipment, and health insurance deductions are frequently skipped",
        "Proactive tax strategy legally cuts most people's bills by 15–30% annually",
      ],
    };
  }
  return {
    title: "Start with the truth of where you actually stand.",
    why: "You cannot improve a financial situation you don't fully see. Clarity is the foundation. Every good move comes after it.",
    insights: [
      "Most people are genuinely shocked by where their money actually goes each month",
      "One honest audit of your finances is worth more than a hundred articles about personal finance",
      "Clarity doesn't create problems — it reveals which ones are actually worth solving",
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90  p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-screen-title"
    >
      <div className="bg-[#0a0a14] border border-white/[0.08] rounded-sm w-full max-w-md my-4 shadow-2xl shadow-[#FF8C00]/5 animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="px-6 pt-7 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#FF8C00]/30 to-transparent" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF8C00]/[0.08] border border-[#FF8C00]/20">
              <Sparkles className="w-3 h-3 text-[#FF8C00]" aria-hidden="true" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#FF8C00]/80">
                Your personalized plan
              </span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#FF8C00]/30 to-transparent" />
          </div>
          <h2 id="result-screen-title" className="text-xl font-bold text-white leading-snug">
            {firstName ? (
              <>{firstName}, here's the <span className="text-[#FF8C00]">one move that matters most</span></>
            ) : (
              <>Here's the <span className="text-[#FF8C00]">one move that matters most</span></>
            )}
          </h2>
          {(focusLabel || occupationName) && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {occupationName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/50">
                  <Briefcase className="w-2.5 h-2.5 text-[#FF8C00]" aria-hidden="true" />
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
            <div className="w-10 h-10 rounded-xl bg-[#FF8C00]/10 border border-[#FF8C00]/20 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(255,140,0,0.1)]">
              <CheckCircle2 className="w-5 h-5 text-[#FF8C00]" aria-hidden="true" />
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
                    <Icon className="w-3 h-3 text-[#FF8C00]/50" aria-hidden="true" />
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
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(255,140,0,0.2)] min-h-[48px]"
          >
            Open my dashboard
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <p className="text-center text-[11px] text-white/20 mt-3 leading-relaxed">
            Your dashboard is configured and ready — tools matched to your goal, not a generic template
          </p>
        </div>
      </div>
    </div>
  );
}
