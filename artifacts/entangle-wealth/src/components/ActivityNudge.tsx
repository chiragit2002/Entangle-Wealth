import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Flame, X, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface StreakData {
  currentStreak: number;
  lastActivityDate: string | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
}

const SETUP_ITEMS: ChecklistItem[] = [
  { id: "view_signal", label: "View a signal", href: "/dashboard" },
  { id: "run_tax_scan", label: "Run a tax scan", href: "/tax" },
  { id: "set_alert", label: "Set a price alert", href: "/alerts" },
  { id: "join_community", label: "Join a group", href: "/community" },
  { id: "enable_notifications", label: "Enable notifications", href: "/profile" },
];

type NudgeType = "streak" | "setup" | null;

export function ActivityNudge() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [nudgeType, setNudgeType] = useState<NudgeType>(null);
  const [streak, setStreak] = useState(0);
  const [incompleteItems, setIncompleteItems] = useState<ChecklistItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const today = new Date().toISOString().slice(0, 10);
    const dismissKey = `ew_activity_nudge_dismissed_${today}`;
    if (localStorage.getItem(dismissKey) === "true") {
      setDismissed(true);
      return;
    }

    const fetchData = async () => {
      try {
        const [gamRes, onboardRes] = await Promise.all([
          authFetch("/gamification/me", getToken),
          authFetch("/onboarding", getToken),
        ]);

        if (gamRes.ok) {
          const data: { streak?: StreakData } = await gamRes.json();
          if (data?.streak) {
            const { currentStreak, lastActivityDate } = data.streak;
            if (currentStreak >= 1 && lastActivityDate) {
              const hoursSinceLast = (Date.now() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60);
              if (hoursSinceLast > 20) {
                setStreak(currentStreak);
                setNudgeType("streak");
                return;
              }
            }
          }
        }

        if (onboardRes.ok) {
          const data: { checklist?: Record<string, boolean>; daysSinceSignup?: number } = await onboardRes.json();
          if (data?.checklist && data.daysSinceSignup !== undefined) {
            const { checklist, daysSinceSignup } = data;
            if (daysSinceSignup >= 2 && daysSinceSignup <= 14) {
              const incomplete = SETUP_ITEMS.filter(item => !checklist[item.id]);
              if (incomplete.length > 0) {
                setIncompleteItems(incomplete);
                setNudgeType("setup");
              }
            }
          }
        }
      } catch {}
    };

    fetchData();
  }, [isLoaded, isSignedIn, getToken]);

  const dismiss = () => {
    setDismissed(true);
    setNudgeType(null);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`ew_activity_nudge_dismissed_${today}`, "true");
  };

  const checkin = async () => {
    try {
      await authFetch("/gamification/streak/checkin", getToken, { method: "POST" });
    } catch {}
    dismiss();
  };

  if (!nudgeType || dismissed) return null;

  if (nudgeType === "streak") {
    return (
      <div className="col-span-12 mb-1.5">
        <div className="bg-gradient-to-r from-orange-950/40 via-orange-900/20 to-orange-950/40 border border-orange-500/25 rounded-lg px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="absolute -top-1 -right-1 text-[8px] font-black font-mono text-[#f5c842] bg-[#0a0a0f] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                {streak > 9 ? "!" : streak}
              </span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-orange-300">Keep your {streak}-day streak alive</p>
              <p className="text-[10px] text-white/30">Check in today to maintain your streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-[11px] font-semibold text-orange-300 hover:bg-orange-500/30 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Check in
            </button>
            <button
              onClick={dismiss}
              className="text-white/20 hover:text-white/50 transition-colors p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-12 mb-1.5">
      <div className="bg-gradient-to-r from-[#001a10] via-[#00ff8808] to-[#001a10] border border-[#00ff88]/15 rounded-lg px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white/70 mb-1.5">
            {incompleteItems.length} setup {incompleteItems.length === 1 ? "step" : "steps"} remaining
          </p>
          <div className="flex flex-wrap gap-1.5">
            {incompleteItems.slice(0, 3).map(item => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-lg text-[10px] font-medium text-[#00D4FF] hover:bg-[#00D4FF]/15 transition-colors"
              >
                {item.label}
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-white/20 hover:text-white/50 transition-colors p-0.5 flex-shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
