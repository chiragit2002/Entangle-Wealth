import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { X, Briefcase, Target, CheckCircle2, ChevronRight } from "lucide-react";
import { OccupationDropdown } from "@/components/OccupationDropdown";
import { getOccupationById } from "@workspace/occupations";
import { trackEvent } from "@/lib/trackEvent";

const FOCUS_OPTIONS = [
  { id: "saving", label: "Building savings" },
  { id: "investing", label: "Investing smarter" },
  { id: "debt", label: "Managing debt" },
  { id: "tax", label: "Reducing taxes" },
];

const DISMISS_KEY = "ew_profile_card_dismissed";

interface ProgressiveProfileCardProps {
  className?: string;
}

export function ProgressiveProfileCard({ className = "" }: ProgressiveProfileCardProps) {
  const { getToken, isSignedIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<"occupation" | "focus" | "done">("occupation");
  const [occupationId, setOccupationId] = useState("");
  const [focus, setFocus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === "true") return;
      const isFirst = localStorage.getItem("ew_visited_before");
      if (!isFirst) return;
    } catch {}

    authFetch("/onboarding", getToken)
      .then(r => r.ok ? r.json() : null)
      .then((data: { occupationId?: string; financialFocus?: string } | null) => {
        if (!data) return;
        const needsOccupation = !data.occupationId;
        const needsFocus = !data.financialFocus;
        if (needsOccupation || needsFocus) {
          setStep(needsOccupation ? "occupation" : "focus");
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [isSignedIn, getToken]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, "true"); } catch {}
    trackEvent("progressive_profile_dismissed", { step });
    setVisible(false);
  }, [step]);

  const saveOccupation = useCallback(async () => {
    if (!occupationId) {
      setStep("focus");
      return;
    }
    setSaving(true);
    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occupationId }),
      });
      trackEvent("progressive_profile_occupation_saved", { occupationId });
    } catch {
    }
    setSaving(false);
    setStep("focus");
  }, [occupationId, getToken]);

  const saveFocus = useCallback(async () => {
    if (!focus) {
      dismiss();
      return;
    }
    setSaving(true);
    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialFocus: focus }),
      });
      const occ = occupationId ? getOccupationById(occupationId) : undefined;
      trackEvent("progressive_profile_focus_saved", { focus, occupationName: occ?.name });
    } catch {
    }
    setSaving(false);
    setStep("done");
    setTimeout(() => setVisible(false), 1500);
  }, [focus, occupationId, getToken, dismiss]);

  if (!visible || !isSignedIn) return null;

  if (step === "done") {
    return (
      <div className={`bg-[#001a0f] border border-[#00B4D8]/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200 ${className}`}>
        <CheckCircle2 className="w-5 h-5 text-[#00B4D8] shrink-0" />
        <p className="text-sm text-white/70">Profile updated — your experience is now more personalized.</p>
      </div>
    );
  }

  return (
    <div className={`bg-[#0a0a14] border border-white/10 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {step === "occupation" ? (
            <Briefcase className="w-4 h-4 text-[#00B4D8]" />
          ) : (
            <Target className="w-4 h-4 text-[#00B4D8]" />
          )}
          <p className="text-xs font-bold text-white/70">
            {step === "occupation"
              ? "What do you do for work?"
              : "What's your main financial focus?"}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-white/50 hover:text-white/50 transition-colors p-0.5 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {step === "occupation" && (
        <div className="space-y-3">
          <OccupationDropdown
            value={occupationId}
            onChange={setOccupationId}
            placeholder="Select your occupation..."
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setStep("focus"); trackEvent("progressive_profile_occupation_skipped"); }}
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors px-3 py-1.5"
            >
              Skip
            </button>
            <button
              onClick={saveOccupation}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#00B4D8] text-[11px] font-bold hover:bg-[#00B4D8]/20 transition-colors disabled:opacity-50"
            >
              {occupationId ? "Save" : "Skip"} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {step === "focus" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {FOCUS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setFocus(opt.id)}
                aria-pressed={focus === opt.id}
                className={`px-3 py-2 rounded-lg border text-[11px] font-semibold text-left transition-all ${
                  focus === opt.id
                    ? "border-[#00B4D8]/50 bg-[#00B4D8]/8 text-white"
                    : "border-white/8 bg-white/[0.02] text-white/60 hover:border-white/15"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={dismiss}
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors px-3 py-1.5"
            >
              Skip
            </button>
            <button
              onClick={saveFocus}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[#00B4D8] text-[11px] font-bold hover:bg-[#00B4D8]/20 transition-colors disabled:opacity-50"
            >
              {focus ? "Save" : "Skip"} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
