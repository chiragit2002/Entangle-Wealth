import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Zap, Trophy, Star, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface MilestoneProximity {
  label: string;
  pct: number;
  remaining: string;
  href: string;
  color: string;
  type: "xp" | "badge" | "tier" | "streak";
}

const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
const TIER_XP: Record<string, number> = {
  Bronze: 0,
  Silver: 500,
  Gold: 1500,
  Platinum: 3500,
  Diamond: 7000,
};

function getNextTier(currentTier: string): { name: string; xpRequired: number } | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  const next = TIER_ORDER[idx + 1];
  return { name: next, xpRequired: TIER_XP[next] };
}

export function GoalGradientAccelerator() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [proximity, setProximity] = useState<MilestoneProximity | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const load = async () => {
      try {
        const res = await authFetch("/gamification/me", getToken);
        if (!res.ok) return;
        const data = await res.json();

        const xp: number = data?.xp?.totalXp ?? 0;
        const levelProgress: number = data?.levelProgress ?? 0;
        const xpToNextLevel: number = data?.xpToNextLevel ?? 1000;
        const currentTier: string = data?.xp?.tier ?? "Bronze";
        const currentStreak: number = data?.streak?.currentStreak ?? 0;

        const milestones: MilestoneProximity[] = [];

        if (levelProgress >= 75) {
          const remaining = xpToNextLevel - Math.round((levelProgress / 100) * xpToNextLevel);
          milestones.push({
            label: `Level ${(data?.xp?.level ?? 1) + 1}`,
            pct: levelProgress,
            remaining: `${remaining} XP away`,
            href: "/gamification",
            color: "#00D4FF",
            type: "xp",
          });
        }

        const nextTier = getNextTier(currentTier);
        if (nextTier) {
          const tierPct = Math.round((xp / nextTier.xpRequired) * 100);
          if (tierPct >= 75 && tierPct < 100) {
            milestones.push({
              label: `${nextTier.name} Tier`,
              pct: tierPct,
              remaining: `${nextTier.xpRequired - xp} XP away`,
              href: "/gamification",
              color: "#FFB800",
              type: "tier",
            });
          }
        }

        const STREAK_MILESTONES = [7, 14, 30, 60, 100];
        for (const milestone of STREAK_MILESTONES) {
          const streakPct = Math.round((currentStreak / milestone) * 100);
          if (streakPct >= 80 && streakPct < 100) {
            milestones.push({
              label: `${milestone}-Day Streak`,
              pct: streakPct,
              remaining: `${milestone - currentStreak} more days`,
              href: "/gamification",
              color: "#ff6b35",
              type: "streak",
            });
            break;
          }
        }

        if (milestones.length > 0) {
          milestones.sort((a, b) => b.pct - a.pct);
          const top = milestones[0];
          setProximity(top);
          localStorage.setItem("ew_near_milestone", JSON.stringify({
            pct: top.pct,
            type: top.type,
            label: top.label,
            ts: Date.now(),
          }));
        } else {
          localStorage.removeItem("ew_near_milestone");
        }
      } catch {
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken]);

  if (!proximity) return null;

  const iconMap = {
    xp: <Zap className="w-3.5 h-3.5" />,
    tier: <Trophy className="w-3.5 h-3.5" />,
    badge: <Star className="w-3.5 h-3.5" />,
    streak: <span className="text-sm">🔥</span>,
  };

  const { pct, color, label, remaining, href } = proximity;

  return (
    <Link href={href} className="block group">
      <div
        className="relative overflow-hidden border rounded-lg px-3.5 py-2.5 animate-in slide-in-from-bottom-2 duration-500"
        style={{ borderColor: `${color}35`, background: `${color}08` }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2" style={{ color }}>
            {iconMap[proximity.type]}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              You're {pct}% to {label}!
            </span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" style={{ color }} />
        </div>

        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}aa, ${color})`,
              boxShadow: `0 0 12px ${color}70`,
              animation: "pulse 1s ease-in-out infinite",
            }}
          />
        </div>

        <p className="text-[9px] font-mono" style={{ color: `${color}99` }}>
          {remaining} · One more action gets you there
        </p>

        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: `radial-gradient(ellipse at right, ${color}15 0%, transparent 65%)` }}
        />
      </div>
    </Link>
  );
}
