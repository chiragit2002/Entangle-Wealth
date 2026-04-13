import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Trophy, Flame, Zap, Target, TrendingUp, X, ChevronUp } from "lucide-react";

interface WeeklySummary {
  weeklyXp: number;
  totalXp: number;
  level: number;
  tier: string;
  currentStreak: number;
  longestStreak: number;
  signalsViewed: number;
  challengesCompleted: number;
  rank: number;
  totalUsers: number;
  percentile: number;
}

export function WeeklyProgressCard() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const key = `ew_weekly_progress_dismissed_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
      return;
    }
    authFetch("/gamification/weekly-summary", getToken)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSummary(data); })
      .catch((err) => { console.error("[WeeklyProgressCard] Failed to load weekly summary:", err); });
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || !isSignedIn || !summary || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    const key = `ew_weekly_progress_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, "true");
  };

  const tierColor = summary.tier === "Diamond" ? "#00FF41"
    : summary.tier === "Platinum" ? "#b8c0cc"
    : summary.tier === "Gold" ? "#FFB800"
    : summary.tier === "Silver" ? "#c0c0c0"
    : "#cd7f32";

  return (
    <div className="col-span-12 mb-1.5">
      <div className="bg-gradient-to-r from-[#0d0d1f] via-[#0a0a18] to-[#0d0d1f] border border-[#FFB800]/15 rounded-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/[0.01] transition-colors"
          onClick={() => setCollapsed(c => !c)}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-[#FFB800]" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFB800]">YOUR WEEK IN REVIEW</span>
            <span className="text-[9px] font-mono text-white/40">·</span>
            <span className="text-[9px] font-mono text-white/30">
              You're in the top {Math.max(1, 100 - summary.percentile)}% of all users
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(); }}
              className="text-white/50 hover:text-white/40 transition-colors p-0.5"
              aria-label="Dismiss weekly summary"
            >
              <X className="w-3 h-3" />
            </button>
            <ChevronUp
              className={`w-3.5 h-3.5 text-white/40 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {!collapsed && (
          <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-5 gap-2 animate-in slide-in-from-top-2 duration-200">
            <StatTile
              icon={<Zap className="w-3 h-3 text-[#FFB800]" />}
              label="XP EARNED"
              value={`+${summary.weeklyXp.toLocaleString()}`}
              sub={`${summary.totalXp.toLocaleString()} total`}
              color="#FFB800"
            />
            <StatTile
              icon={<Flame className="w-3 h-3 text-orange-400" />}
              label="STREAK"
              value={`${summary.currentStreak}d`}
              sub={`Best: ${summary.longestStreak}d`}
              color="rgb(251,146,60)"
            />
            <StatTile
              icon={<TrendingUp className="w-3 h-3 text-[#00D4FF]" />}
              label="SIGNALS"
              value={`${summary.signalsViewed}`}
              sub="viewed this week"
              color="#00D4FF"
            />
            <StatTile
              icon={<Target className="w-3 h-3 text-[#00FF41]" />}
              label="CHALLENGES"
              value={`${summary.challengesCompleted}`}
              sub="completed"
              color="#00FF41"
            />
            <StatTile
              icon={<Trophy className="w-3 h-3" style={{ color: tierColor }} />}
              label="RANK"
              value={`#${summary.rank}`}
              sub={`${summary.percentile}th percentile`}
              color={tierColor}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm px-2.5 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[8px] font-mono text-white/25 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[15px] font-black font-mono" style={{ color }}>{value}</p>
      <p className="text-[9px] font-mono text-white/25 mt-0.5">{sub}</p>
    </div>
  );
}
