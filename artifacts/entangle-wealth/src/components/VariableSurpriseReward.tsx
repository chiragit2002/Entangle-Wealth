import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Gift, X, Zap, Star, Lock } from "lucide-react";
import { fireCelebration } from "@/lib/confetti";

interface SurpriseReward {
  type: "xp" | "feature" | "badge";
  title: string;
  description: string;
  value?: number;
}

const POSSIBLE_REWARDS: SurpriseReward[] = [
  { type: "xp", title: "Bonus 50 XP!", description: "You've been on a roll. Here's a surprise boost.", value: 50 },
  { type: "xp", title: "Bonus 100 XP!", description: "Your engagement unlocked a mystery reward.", value: 100 },
  { type: "feature", title: "Free Pro Feature — 24 hours!", description: "TaxGPT is unlocked for you today. No upgrade needed.", },
  { type: "badge", title: "Mystery Badge Dropped!", description: "You earned an exclusive 'Early Explorer' badge.", },
  { type: "xp", title: "Surprise: +75 XP!", description: "We noticed your activity pattern. Nice work.", value: 75 },
];

const STORAGE_KEY = "ew_surprise_reward_shown";
const MIN_ACTIONS_BEFORE_REWARD = 3;
const BASE_REWARD_CHANCE = 0.3;

function getNearMilestoneBoost(): number {
  try {
    const raw = localStorage.getItem("ew_near_milestone");
    if (!raw) return 0;
    const { pct, ts } = JSON.parse(raw);
    const ageMs = Date.now() - (ts || 0);
    if (ageMs > 60 * 60 * 1000) return 0;
    if (pct >= 95) return 0.5;
    if (pct >= 85) return 0.3;
    if (pct >= 75) return 0.15;
    return 0;
  } catch {
    return 0;
  }
}

export function VariableSurpriseReward() {
  const { isSignedIn, getToken } = useAuth();
  const [reward, setReward] = useState<SurpriseReward | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const actionCountRef = useRef(0);
  const hasShownRef = useRef(false);

  const maybeShowReward = useCallback(async () => {
    if (hasShownRef.current || !isSignedIn) return;

    actionCountRef.current += 1;
    if (actionCountRef.current < MIN_ACTIONS_BEFORE_REWARD) return;

    const today = new Date().toISOString().slice(0, 10);
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (lastShown === today) return;

    const effectiveChance = Math.min(0.85, BASE_REWARD_CHANCE + getNearMilestoneBoost());
    if (Math.random() > effectiveChance) return;

    hasShownRef.current = true;
    const picked = POSSIBLE_REWARDS[Math.floor(Math.random() * POSSIBLE_REWARDS.length)];
    setReward(picked);

    if (picked.type === "xp" && picked.value) {
      try {
        const xpRes = await authFetch("/gamification/xp", getToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: picked.value, reason: "surprise_reward", category: "engagement" }),
        });
        if (xpRes.ok) {
          fireCelebration(picked.value, "xp");
        }
      } catch {}
    }

    if (picked.type === "feature") {
      const unlockExpiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem("ew_temp_pro_unlock", JSON.stringify({ feature: "taxgpt", expiresAt: unlockExpiry }));
    }

    if (picked.type === "badge") {
      try {
        await authFetch("/gamification/xp", getToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: 25, reason: "badge_early_explorer", category: "engagement" }),
        });
      } catch {}
      const earned: string[] = JSON.parse(localStorage.getItem("ew_earned_badges") || "[]");
      if (!earned.includes("early_explorer")) {
        earned.push("early_explorer");
        localStorage.setItem("ew_earned_badges", JSON.stringify(earned));
      }
    }

    localStorage.setItem(STORAGE_KEY, today);
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isSignedIn) return;

    const handleActivity = () => {
      maybeShowReward();
    };

    const events = ["click", "keydown", "scroll"];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const throttled = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          handleActivity();
          throttleTimer = null;
        }, 2000);
      }
    };

    events.forEach(evt => document.addEventListener(evt, throttled, { passive: true }));
    return () => {
      events.forEach(evt => document.removeEventListener(evt, throttled));
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [isSignedIn, maybeShowReward]);

  if (!reward || dismissed) return null;

  const iconMap = {
    xp: <Zap className="w-5 h-5 text-[#FFB800]" />,
    feature: <Lock className="w-5 h-5 text-[#00D4FF]" />,
    badge: <Star className="w-5 h-5 text-[#a855f7]" />,
  };

  const colorMap = {
    xp: "#FFB800",
    feature: "#00D4FF",
    badge: "#a855f7",
  };

  const color = colorMap[reward.type];

  return (
    <div
      className="fixed bottom-24 right-4 z-[300] w-72 animate-in slide-in-from-right-4 fade-in duration-500"
      role="alert"
      aria-live="polite"
    >
      <div
        className="relative bg-card border rounded-xl p-4 shadow-2xl shadow-black/60"
        style={{ borderColor: `${color}40` }}
      >
        <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${color}10 0%, transparent 70%)` }} />
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Dismiss reward"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-start gap-3 relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}
          >
            {iconMap[reward.type]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Gift className="w-3 h-3" style={{ color }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>Surprise Drop</span>
            </div>
            <p className="text-sm font-bold text-foreground mb-0.5">{reward.title}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{reward.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
