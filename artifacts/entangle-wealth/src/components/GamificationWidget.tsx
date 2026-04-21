import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { DailySpinWheel } from "@/components/DailySpinWheel";
import { XPBar } from "@/components/XPBar";
import { Zap, Flame, Trophy, Star, Gift, TrendingUp, ChevronRight, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_COLORS: Record<string, string> = {
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#FFB800",
  Platinum: "#e5e4e2",
  Diamond: "#00B4D8",
};

const TIER_ICONS: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "👑",
};

interface GamificationData {
  xp: {
    totalXp: number;
    level: number;
    tier: string;
    weeklyXp: number;
    monthlyXp: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    multiplier: number;
    lastActivityDate: string | null;
  };
  badges: { badge: { name: string; icon: string; slug: string }; earnedAt: string }[];
  levelProgress: number;
  xpToNextLevel: number;
}

export function GamificationWidget() {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<GamificationData | null>(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [levelUpAnim, setLevelUpAnim] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const [meRes, spinRes] = await Promise.all([
        authFetch("/gamification/me", getToken),
        authFetch("/gamification/spin/status", getToken),
      ]);
      if (meRes.ok) setData(await meRes.json());
      if (spinRes.ok) {
        const spinData = await spinRes.json();
        setCanSpin(spinData.canSpin);
      }
    } catch {
    }
  }, [isSignedIn, getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCheckin = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/gamification/streak/checkin", getToken, { method: "POST" });
      if (res.ok) {
        toast({ title: "Streak Updated!", description: "Daily check-in recorded" });
        loadData();
      }
    } catch {
      toast({ title: "Check-in failed", description: "Please try again later.", variant: "destructive" });
    }
  }, [isSignedIn, getToken, toast, loadData]);

  const handleSpinReward = useCallback((reward: string) => {
    toast({ title: "Reward Claimed!", description: reward });
    setCanSpin(false);
    loadData();
  }, [toast, loadData]);

  if (!isSignedIn || !data) {
    return (
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 border-b border-border border-l-2 border-l-[#FFB800]">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-[#FFB800]" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFB800]">PROGRESSION</span>
          </div>
        </div>
        <div className="p-3 flex flex-col items-center justify-center h-[140px]">
          <Trophy className="w-6 h-6 text-muted-foreground/20 mb-2" />
          <p className="text-[10px] font-mono text-muted-foreground/40">Sign in to track your progress</p>
        </div>
      </div>
    );
  }

  const tierColor = TIER_COLORS[data.xp.tier] || "#cd7f32";
  const tierIcon = TIER_ICONS[data.xp.tier] || "🥉";

  return (
    <>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 border-b border-border border-l-2 border-l-[#FFB800]">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-[#FFB800]" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFB800]">PROGRESSION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono" style={{ color: tierColor }}>{tierIcon} {data.xp.tier}</span>
          </div>
        </div>

        <div className="p-2 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-muted/50 rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-muted-foreground/50">STREAK</p>
              <div className="flex items-center justify-center gap-0.5">
                <Flame className="w-3 h-3 text-[#ff3366]" />
                <p className="text-[11px] font-mono font-bold text-[#ff3366]">{data.streak.currentStreak}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-muted-foreground/50">MULTIPLIER</p>
              <p className="text-[11px] font-mono font-bold text-[#00B4D8]">{data.streak.multiplier.toFixed(1)}x</p>
            </div>
          </div>

          <XPBar
            level={data.xp.level}
            levelProgress={data.levelProgress}
            xpToNextLevel={data.xpToNextLevel}
            tier={data.xp.tier}
            variant="compact"
          />

          <div className="flex gap-1">
            <button
              onClick={handleCheckin}
              className="flex-1 flex items-center justify-center gap-1 h-7 text-[9px] font-mono font-bold rounded-sm bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/20 hover:bg-[#00B4D8]/20 transition-colors"
            >
              <Flame className="w-3 h-3" />
              CHECK IN
            </button>
            <button
              onClick={() => setShowSpinWheel(true)}
              className={`flex-1 flex items-center justify-center gap-1 h-7 text-[9px] font-mono font-bold rounded-sm transition-colors ${
                canSpin
                  ? "bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30 hover:bg-[#FFB800]/25 animate-pulse"
                  : "bg-muted/50 text-muted-foreground/50 border border-border"
              }`}
            >
              <Gift className="w-3 h-3" />
              {canSpin ? "SPIN NOW!" : "DAILY SPIN"}
            </button>
          </div>

          {data.badges.length > 0 && (
            <div className="border-t border-border pt-1.5">
              <p className="text-[8px] font-mono text-muted-foreground/40 mb-1">BADGES ({data.badges.length})</p>
              <div className="flex flex-wrap gap-1">
                {data.badges.slice(0, 6).map((b, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted/50 rounded px-1.5 py-0.5" title={b.badge.name}>
                    <span className="text-[10px]">{b.badge.icon}</span>
                    <span className="text-[8px] font-mono text-muted-foreground/70">{b.badge.name}</span>
                  </div>
                ))}
                {data.badges.length > 6 && (
                  <span className="text-[8px] font-mono text-muted-foreground/70 self-center">+{data.badges.length - 6}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-0.5">
            <a href="/achievements" className="flex items-center gap-0.5 text-[8px] font-mono text-[#00B4D8]/50 hover:text-[#00B4D8] transition-colors">
              View All <ChevronRight className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      <DailySpinWheel isOpen={showSpinWheel} onClose={() => setShowSpinWheel(false)} onReward={handleSpinReward} />
    </>
  );
}
