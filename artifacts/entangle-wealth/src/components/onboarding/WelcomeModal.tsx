import { useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2, Briefcase, Target, Sparkles } from "lucide-react";
import { OccupationDropdown } from "@/components/OccupationDropdown";
import { getOccupationById } from "@workspace/occupations";
import { trackEvent } from "@/lib/trackEvent";

const FOCUS_OPTIONS = [
  { id: "saving", label: "Building savings", desc: "Emergency fund, short-term goals" },
  { id: "investing", label: "Investing smarter", desc: "Long-term wealth growth" },
  { id: "debt", label: "Managing debt", desc: "Pay off what I owe faster" },
  { id: "unsure", label: "Not sure yet", desc: "Help me figure it out" },
];

const OUTCOME_OPTIONS = [
  { id: "clarity", label: "Get financial clarity", desc: "Understand where I stand" },
  { id: "growth", label: "Grow my wealth", desc: "Build a better financial future" },
  { id: "stability", label: "Feel financially stable", desc: "Less stress, more control" },
];

const STEP_LABELS = [
  "Building your plan",
  "Understanding your focus",
  "Setting your goal",
];

const TOTAL_STEPS = 3;

interface WelcomeModalProps {
  firstName: string | null;
  onComplete: (resultData?: { financialFocus?: string; desiredOutcome?: string; occupationId?: string; occupationName?: string }) => void;
}

export function WelcomeModal({ firstName, onComplete }: WelcomeModalProps) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [occupationId, setOccupationId] = useState<string>("");
  const [focus, setFocus] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const persistComplete = useCallback(async () => {
    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: [focus, outcome].filter(Boolean), occupationId, financialFocus: focus, desiredOutcome: outcome }),
      });
    } catch {}
  }, [getToken, occupationId, focus, outcome]);

  const handleComplete = async () => {
    setSaving(true);
    await persistComplete();
    trackEvent("onboarding_momentum_completed", { occupationId, focus, outcome });
    setSaving(false);
    const occ = occupationId ? getOccupationById(occupationId) : undefined;
    onComplete({ financialFocus: focus || undefined, desiredOutcome: outcome || undefined, occupationId: occupationId || undefined, occupationName: occ?.name || undefined });
  };

  const handleSkip = async () => {
    await persistComplete();
    trackEvent("onboarding_momentum_skipped", { step });
    onComplete();
  };

  const canAdvance = [
    true,
    focus !== "",
    outcome !== "",
  ][step];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="bg-[#0a0a14] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-[#00c8f8]/5 animate-in fade-in zoom-in-95 duration-300">

        {/* Step context — replaces progress bar */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-[#00c8f8]/70 tracking-wide uppercase">
              Step {step + 1} of {TOTAL_STEPS} — {STEP_LABELS[step]}
            </p>
            <button
              onClick={handleSkip}
              className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
              aria-label="Skip onboarding"
            >
              Skip
            </button>
          </div>
          <div className="flex gap-1 mt-2" aria-hidden="true">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? "bg-[#00c8f8]" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 min-h-[280px] flex flex-col">

          {/* Step 0: Occupation */}
          {step === 0 && (
            <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#00c8f8]/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4.5 h-4.5 text-[#00c8f8]" />
                </div>
                <div>
                  <h2 id="welcome-modal-title" className="text-lg font-bold text-white leading-tight">
                    What do you do for work{firstName ? `, ${firstName}` : ""}?
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">Helps personalize your financial plan</p>
                </div>
              </div>
              <OccupationDropdown
                value={occupationId}
                onChange={(id) => {
                  setOccupationId(id);
                  trackEvent("onboarding_occupation_selected");
                }}
                placeholder="Select your occupation..."
              />
            </div>
          )}

          {/* Step 1: Financial focus */}
          {step === 1 && (
            <div className="flex-1 flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#00e676]/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4.5 h-4.5 text-[#00e676]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">What's your current financial focus?</h2>
                  <p className="text-xs text-white/40 mt-0.5">Choose the one that fits best</p>
                </div>
              </div>
              <div className="space-y-2">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setFocus(opt.id); trackEvent("onboarding_focus_selected", { focus: opt.id }); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
                      focus === opt.id
                        ? "border-[#00e676]/50 bg-[#00e676]/8 text-white"
                        : "border-white/8 bg-white/[0.02] text-white/70 hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                    aria-pressed={focus === opt.id}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-white/40">{opt.desc}</p>
                    </div>
                    {focus === opt.id && <CheckCircle2 className="w-4 h-4 text-[#00e676] shrink-0" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Desired outcome */}
          {step === 2 && (
            <div className="flex-1 flex flex-col gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl bg-[#f5c842]/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-[#f5c842]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">What outcome do you want?</h2>
                  <p className="text-xs text-white/40 mt-0.5">This shapes your first recommendation</p>
                </div>
              </div>
              <div className="space-y-2">
                {OUTCOME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setOutcome(opt.id); trackEvent("onboarding_outcome_selected", { outcome: opt.id }); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] ${
                      outcome === opt.id
                        ? "border-[#f5c842]/50 bg-[#f5c842]/8 text-white"
                        : "border-white/8 bg-white/[0.02] text-white/70 hover:border-white/15 hover:bg-white/[0.04]"
                    }`}
                    aria-pressed={outcome === opt.id}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-white/40">{opt.desc}</p>
                    </div>
                    {outcome === opt.id && <CheckCircle2 className="w-4 h-4 text-[#f5c842] shrink-0" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 transition-colors px-2 py-2 rounded-lg hover:bg-white/[0.04]"
                aria-label="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 ? false : !canAdvance}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                {step === 0 && !occupationId ? "Skip for now" : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving || !canAdvance}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px]"
                aria-busy={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Building...</span>
                  </>
                ) : (
                  <>
                    See my plan
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
