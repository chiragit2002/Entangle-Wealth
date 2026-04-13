import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { AlertTriangle, X, ArrowRight, TrendingDown, Signal } from "lucide-react";
import { Link } from "wouter";

interface LossAversionData {
  unclaimed: number;
  missedSignals: number;
  streakDaysLeft: number | null;
  streakHoursLeft: number | null;
  hasTaxProfile: boolean;
}

function useCountdown(hoursLeft: number | null) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (hoursLeft === null) { setDisplay(""); return; }
    const targetTime = Date.now() + hoursLeft * 3600 * 1000;
    const tick = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) { setDisplay("0h 0m"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setDisplay(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hoursLeft]);

  return display;
}

export function LossAversionNudge() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [data, setData] = useState<LossAversionData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [activeNudge, setActiveNudge] = useState<"savings" | "streak" | "signals" | null>(null);

  const countdown = useCountdown(data?.streakHoursLeft ?? null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const today = new Date().toISOString().slice(0, 10);
    const dismissKey = `ew_loss_aversion_dismissed_${today}`;
    if (localStorage.getItem(dismissKey) === "true") {
      setDismissed(true);
      return;
    }

    const load = async () => {
      try {
        const [gamRes, onboardRes] = await Promise.all([
          authFetch("/gamification/me", getToken),
          authFetch("/onboarding", getToken),
        ]);

        const lossData: LossAversionData = {
          unclaimed: 0,
          missedSignals: 0,
          streakDaysLeft: null,
          streakHoursLeft: null,
          hasTaxProfile: false,
        };

        if (gamRes.ok) {
          const gamData = await gamRes.json();

          if (gamData?.streak?.currentStreak >= 1 && gamData?.streak?.lastActivityDate) {
            const hoursSinceLast = (Date.now() - new Date(gamData.streak.lastActivityDate).getTime()) / (1000 * 60 * 60);
            if (hoursSinceLast > 16) {
              const hoursLeft = Math.max(0, 24 - hoursSinceLast);
              lossData.streakDaysLeft = gamData.streak.currentStreak;
              lossData.streakHoursLeft = Math.ceil(hoursLeft);
            }
          }

          const lastLogin = gamData?.streak?.lastActivityDate;
          if (lastLogin) {
            const hoursSinceActivity = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
            if (hoursSinceActivity > 24) {
              const daysMissed = Math.floor(hoursSinceActivity / 24);
              lossData.missedSignals = Math.min(daysMissed * 3, 15);
            }
          }
        }

        if (onboardRes.ok) {
          const onboardData = await onboardRes.json();
          const checklist: Record<string, boolean> = onboardData?.checklist ?? {};
          const taxSteps = Object.values(checklist);
          lossData.hasTaxProfile = taxSteps.some(Boolean);

          if (taxSteps.length > 0 && !taxSteps.every(Boolean)) {
            const incompleteSteps = taxSteps.filter(v => !v).length;
            lossData.unclaimed = incompleteSteps * 640;
          }
        }

        setData(lossData);

        if (lossData.streakHoursLeft !== null && lossData.streakDaysLeft !== null && lossData.streakDaysLeft >= 3) {
          setActiveNudge("streak");
        } else if (lossData.missedSignals >= 3) {
          setActiveNudge("signals");
        } else if (lossData.unclaimed > 0) {
          setActiveNudge("savings");
        } else if (lossData.missedSignals > 0) {
          setActiveNudge("signals");
        }
      } catch (err) {
        console.error("[LossAversionNudge] Failed to load data:", err);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken]);

  const dismiss = () => {
    setDismissed(true);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`ew_loss_aversion_dismissed_${today}`, "true");
  };

  if (!isSignedIn || !data || dismissed || !activeNudge) return null;

  if (activeNudge === "streak" && data.streakDaysLeft !== null) {
    return (
      <div className="col-span-12 mb-1.5">
        <div className="bg-gradient-to-r from-red-950/40 via-red-900/15 to-red-950/40 border border-red-500/25 rounded-lg px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-red-300">
                Your {data.streakDaysLeft}-day streak will reset in {countdown || "soon"}
              </p>
              <p className="text-[10px] text-white/30">Don't lose your progress — check in to protect it</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/gamification"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/25 rounded-lg text-[11px] font-semibold text-red-300 hover:bg-red-500/25 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              Protect streak
            </Link>
            <button onClick={dismiss} className="text-white/30 hover:text-white/50 transition-colors p-0.5" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeNudge === "signals") {
    return (
      <div className="col-span-12 mb-1.5">
        <div className="bg-gradient-to-r from-[#0a0a14] via-[#00D4FF08] to-[#0a0a14] border border-[#00D4FF]/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
              <Signal className="w-4 h-4 text-[#00D4FF]" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#00D4FF]">
                {data.missedSignals} signals fired while you were away
              </p>
              <p className="text-[10px] text-white/30">Upgrade to Pro to never miss a real-time signal again</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-lg text-[11px] font-semibold text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              Go Pro
            </Link>
            <button onClick={dismiss} className="text-white/30 hover:text-white/50 transition-colors p-0.5" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeNudge === "savings") {
    return (
      <div className="col-span-12 mb-1.5">
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/10 to-amber-950/40 border border-amber-500/25 rounded-lg px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-amber-300">
                You have ~${data.unclaimed.toLocaleString()} in unclaimed deductions
              </p>
              <p className="text-[10px] text-white/30">Run a tax scan to find what you're missing before the deadline</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/taxgpt"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 border border-amber-500/25 rounded-lg text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              Claim now
            </Link>
            <button onClick={dismiss} className="text-white/30 hover:text-white/50 transition-colors p-0.5" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
