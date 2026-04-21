import { useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const GOAL_OPTIONS = [
  { id: "investing", label: "Build actual wealth — not just income" },
  { id: "saving", label: "Stop hemorrhaging money I can't account for" },
  { id: "tax", label: "Stop overpaying the IRS every year" },
  { id: "clarity", label: "Finally understand where I stand financially" },
];

interface WelcomeModalProps {
  firstName: string | null;
  onComplete: (resultData?: { financialFocus?: string; desiredOutcome?: string; occupationId?: string; occupationName?: string }) => void;
}

export function WelcomeModal({ firstName, onComplete }: WelcomeModalProps) {
  const { getToken } = useAuth();
  const [goal, setGoal] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const persistComplete = useCallback(async (selectedGoal: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: [selectedGoal].filter(Boolean),
          financialFocus: selectedGoal,
          desiredOutcome: selectedGoal,
        }),
        signal: controller.signal,
      });
    } catch {
    } finally {
      clearTimeout(timeoutId);
    }
  }, [getToken]);

  const handleComplete = async () => {
    setSaving(true);
    await persistComplete(goal);
    trackEvent("onboarding_momentum_completed", { goal });
    setSaving(false);
    onComplete({ financialFocus: goal || undefined, desiredOutcome: goal || undefined });
  };

  const handleSkip = async () => {
    await persistComplete("");
    trackEvent("onboarding_momentum_skipped", { step: 0 });
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85  p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="bg-card border border-border rounded-sm w-full max-w-sm overflow-hidden shadow-2xl shadow-[#00B4D8]/5 animate-in fade-in zoom-in-95 duration-300">

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#00B4D8]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-[#00B4D8]" />
            </div>
            <div>
              <h2 id="welcome-modal-title" className="text-lg font-bold text-foreground leading-tight">
                {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">One question. Thirty seconds. Then we get to work.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col">
          <p className="text-sm font-semibold text-foreground mb-4">What's the actual problem you're trying to solve?</p>

          <div className="space-y-2 mb-6">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGoal(opt.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
                  goal === opt.id
                    ? "border-[#00B4D8]/50 bg-[#00B4D8]/8 text-foreground"
                    : "border-white/8 bg-muted/30 text-foreground/70 hover:border-white/15 hover:bg-muted/50"
                }`}
                aria-pressed={goal === opt.id}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold">{opt.label}</p>
                </div>
                {goal === opt.id && <CheckCircle2 className="w-4 h-4 text-[#00B4D8] shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <button
            onClick={handleComplete}
            disabled={saving || !goal}
            className="flex items-center justify-center gap-1.5 w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00B4D8] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px]"
            aria-busy={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up your dashboard...</span>
              </>
            ) : (
              "Build my dashboard"
            )}
          </button>

          <button
            onClick={handleSkip}
            className="w-full mt-2 text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors py-1"
            aria-label="Skip onboarding"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
