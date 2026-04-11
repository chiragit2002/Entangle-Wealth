import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { DailySpinWheel } from "@/components/DailySpinWheel";
import { Zap, Flame, Trophy, Star, Gift, TrendingUp, ChevronRight, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_COLORS: Record<string, string> = {
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#FFD700",
  Platinum: "#e5e4e2",
  Diamond: "#00D4FF",
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
    } catch {}
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
    } catch {}
  }, [isSignedIn, getToken, toast, loadData]);

  const handleSpinReward = useCallback((reward: string) => {
    toast({ title: "Reward Claimed!", description: reward });
    setCanSpin(false);
    loadData();
  }, [toast, loadData]);

  if (!isSignedIn || !data) {
    return (
      <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06] border-l-2 border-l-[#FFD700]">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-[#FFD700]" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFD700]">PROGRESSION</span>
          </div>
        </div>
        <div className="p-3 flex flex-col items-center justify-center h-[140px]">
          <Trophy className="w-6 h-6 text-white/10 mb-2" />
          <p className="text-[10px] font-mono text-white/25">Sign in to track your progress</p>
        </div>
      </div>
    );
  }

  const tierColor = TIER_COLORS[data.xp.tier] || "#cd7f32";
  const tierIcon = TIER_ICONS[data.xp.tier] || "🥉";

  return (
    <>
      <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06] border-l-2 border-l-[#FFD700]">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-[#FFD700]" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFD700]">PROGRESSION</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono" style={{ color: tierColor }}>{tierIcon} {data.xp.tier}</span>
          </div>
        </div>

        <div className="p-2 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">LEVEL</p>
              <p className="text-[13px] font-mono font-bold text-[#00D4FF]">{data.xp.level}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">TOTAL XP</p>
              <p className="text-[10px] font-mono font-bold text-[#FFD700]">{data.xp.totalXp.toLocaleString()}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">STREAK</p>
              <div className="flex items-center justify-center gap-0.5">
                <Flame className="w-3 h-3 text-[#ff3366]" />
                <p className="text-[11px] font-mono font-bold text-[#ff3366]">{data.streak.currentStreak}</p>
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">MULTIPLIER</p>
              <p className="text-[11px] font-mono font-bold text-[#00ff88]">{data.streak.multiplier.toFixed(1)}x</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-mono text-white/25">Level {data.xp.level} → {data.xp.level + 1}</span>
              <span className="text-[8px] font-mono text-[#00D4FF]">{data.xpToNextLevel.toLocaleString()} XP to go</span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(data.levelProgress, 100)}%`,
                  background: `linear-gradient(90deg, ${tierColor}, #00D4FF)`,
                }}
              />
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleCheckin}
              className="flex-1 flex items-center justify-center gap-1 h-7 text-[9px] font-mono font-bold rounded-sm bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 hover:bg-[#00ff88]/20 transition-colors"
            >
              <Flame className="w-3 h-3" />
              CHECK IN
            </button>
            <button
              onClick={() => setShowSpinWheel(true)}
              className={`flex-1 flex items-center justify-center gap-1 h-7 text-[9px] font-mono font-bold rounded-sm transition-colors ${
                canSpin
                  ? "bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/25 animate-pulse"
                  : "bg-white/[0.03] text-white/30 border border-white/[0.06]"
              }`}
            >
              <Gift className="w-3 h-3" />
              {canSpin ? "SPIN NOW!" : "DAILY SPIN"}
            </button>
          </div>

          {data.badges.length > 0 && (
            <div className="border-t border-white/[0.06] pt-1.5">
              <p className="text-[8px] font-mono text-white/25 mb-1">BADGES ({data.badges.length})</p>
              <div className="flex flex-wrap gap-1">
                {data.badges.slice(0, 6).map((b, i) => (
                  <div key={i} className="flex items-center gap-1 bg-white/[0.03] rounded px-1.5 py-0.5" title={b.badge.name}>
                    <span className="text-[10px]">{b.badge.icon}</span>
                    <span className="text-[8px] font-mono text-white/40">{b.badge.name}</span>
                  </div>
                ))}
                {data.badges.length > 6 && (
                  <span className="text-[8px] font-mono text-white/20 self-center">+{data.badges.length - 6}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[8px] font-mono text-white/15">Weekly: +{data.xp.weeklyXp.toLocaleString()} XP</span>
            <a href="/achievements" className="flex items-center gap-0.5 text-[8px] font-mono text-[#00D4FF]/50 hover:text-[#00D4FF] transition-colors">
              View All <ChevronRight className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      <DailySpinWheel isOpen={showSpinWheel} onClose={() => setShowSpinWheel(false)} onReward={handleSpinReward} />
    </>
  );
}
