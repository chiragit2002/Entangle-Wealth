import { useState } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { X, ChevronRight, ChevronLeft, Sparkles, BarChart3, Shield, Zap, CheckCircle2 } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const INTERESTS = [
  { id: "stocks", label: "Stocks", icon: "📈" },
  { id: "options", label: "Options", icon: "📊" },
  { id: "tax", label: "Tax Strategy", icon: "🧾" },
  { id: "crypto", label: "Crypto", icon: "🪙" },
  { id: "gigs", label: "Gig Income", icon: "💼" },
];

const TOUR_ITEMS = [
  { icon: BarChart3, color: "#00D4FF", title: "AI Signals", desc: "Get buy/sell signals with confidence scores from 6 cross-verifying models." },
  { icon: Shield, color: "#00ff88", title: "Tax Tools", desc: "Scan for deductions, track receipts, and optimize your tax strategy." },
  { icon: Zap, color: "#FFD700", title: "Real-Time Alerts", desc: "Set price alerts and get notified instantly when conditions are met." },
  { icon: Sparkles, color: "#9c27b0", title: "Terminal", desc: "Bloomberg-style multi-panel terminal with live data and 55+ indicators." },
];

interface WelcomeModalProps {
  firstName: string | null;
  onComplete: () => void;
}

export function WelcomeModal({ firstName, onComplete }: WelcomeModalProps) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await authFetch("/onboarding/complete-welcome", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: selectedInterests }),
      });
      trackEvent("onboarding_welcome_completed", { interests: selectedInterests });
    } catch {
    }
    setSaving(false);
    onComplete();
  };

  const progressPct = ((step + 1) / 4) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0a0a14] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl shadow-[#00D4FF]/5">
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#00D4FF] to-[#00ff88] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
            Step {step + 1} of 4
          </span>
          <button
            onClick={onComplete}
            className="text-white/20 hover:text-white/40 transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 min-h-[320px] flex flex-col">
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#00ff88]/20 flex items-center justify-center border border-[#00D4FF]/20">
                <Sparkles className="w-8 h-8 text-[#00D4FF]" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Welcome{firstName ? `, ${firstName}` : ""}!
              </h2>
              <p className="text-sm text-white/50 max-w-sm leading-relaxed">
                EntangleWealth gives you institutional-grade financial intelligence. Let's set up your experience in 30 seconds.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
              <h2 className="text-lg font-bold text-white">What are you interested in?</h2>
              <p className="text-xs text-white/40">Select all that apply. We'll personalize your dashboard.</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {INTERESTS.map((item) => {
                  const selected = selectedInterests.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left ${
                        selected
                          ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-white"
                          : "border-white/8 bg-white/[0.02] text-white/50 hover:border-white/15"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                      {selected && <CheckCircle2 className="w-4 h-4 text-[#00D4FF] ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300">
              <h2 className="text-lg font-bold text-white">Quick Tour</h2>
              <p className="text-xs text-white/40">Here's what you can do with EntangleWealth.</p>
              <div className="space-y-3 mt-2">
                {TOUR_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-[11px] text-white/40 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00ff88]/20 to-[#FFD700]/20 flex items-center justify-center border border-[#00ff88]/20">
                <CheckCircle2 className="w-8 h-8 text-[#00ff88]" />
              </div>
              <h2 className="text-2xl font-bold text-white">You're All Set!</h2>
              <p className="text-sm text-white/50 max-w-sm leading-relaxed">
                Your dashboard is ready. Start exploring signals, set up alerts, and discover opportunities.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-1 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00cc66] text-black text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : "Go to Dashboard"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
