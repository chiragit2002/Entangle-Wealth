import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Flame, X, Zap } from "lucide-react";

interface StreakData {
  currentStreak: number;
  lastActivityDate: string | null;
}

export function StreakNudge() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [show, setShow] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const dismissKey = `ew_streak_nudge_dismissed_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(dismissKey) === "true") {
      setDismissed(true);
      return;
    }

    authFetch("/gamification/me", getToken)
      .then(r => r.ok ? r.json() : null)
      .then((data: { streak?: StreakData } | null) => {
        if (!data?.streak) return;
        const { currentStreak, lastActivityDate } = data.streak;
        if (currentStreak < 1 || !lastActivityDate) return;

        const lastDate = new Date(lastActivityDate);
        const nowMs = Date.now();
        const hoursSinceLast = (nowMs - lastDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLast > 20) {
          setStreak(currentStreak);
          setShow(true);
        }
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn, getToken]);

  const dismiss = () => {
    setDismissed(true);
    setShow(false);
    const dismissKey = `ew_streak_nudge_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(dismissKey, "true");
  };

  const checkin = async () => {
    try {
      await authFetch("/gamification/streak/checkin", getToken, { method: "POST" });
    } catch { /* ignore */ }
    dismiss();
  };

  if (!show || dismissed) return null;

  return (
    <div className="col-span-12 mb-1.5">
      <div className="bg-gradient-to-r from-orange-950/40 via-orange-900/20 to-orange-950/40 border border-orange-500/25 rounded-sm px-3 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="absolute -top-1 -right-1 text-[8px] font-black font-mono text-[#f5c842] bg-[#0a0a0f] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
              {streak > 9 ? "!" : streak}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-orange-300">Keep your {streak}-day streak alive!</p>
            <p className="text-[9px] font-mono text-white/30">You haven't checked in today | your streak is at risk</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-sm text-[10px] font-bold text-orange-300 hover:bg-orange-500/30 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Check in now
          </button>
          <button
            onClick={dismiss}
            className="text-white/50 hover:text-white/40 transition-colors p-0.5"
            aria-label="Dismiss streak nudge"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
