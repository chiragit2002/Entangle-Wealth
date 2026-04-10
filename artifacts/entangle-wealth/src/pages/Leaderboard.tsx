import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Trophy, Medal, Crown, TrendingUp, Flame, Star, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  totalXp: number;
  level: number;
  tier: string;
  monthlyXp: number;
  weeklyXp: number;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  gainPercent: number;
}

const TIER_COLORS: Record<string, string> = {
  Diamond: "text-cyan-300",
  Platinum: "text-purple-300",
  Gold: "text-yellow-400",
  Silver: "text-gray-300",
  Bronze: "text-orange-400",
};

const TIER_BG: Record<string, string> = {
  Diamond: "bg-cyan-500/10 border-cyan-500/30",
  Platinum: "bg-purple-500/10 border-purple-500/30",
  Gold: "bg-yellow-500/10 border-yellow-500/30",
  Silver: "bg-gray-400/10 border-gray-400/30",
  Bronze: "bg-orange-500/10 border-orange-500/30",
};

const periods = ["weekly", "monthly", "all-time"] as const;
type Period = typeof periods[number];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />;
  return <span className="text-xs font-mono font-bold text-white/40 w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { getToken } = useAuth();
  const [period, setPeriod] = useState<Period>("monthly");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<{ rank: number | null; totalUsers: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => {
    return authFetch(path, getToken, options);
  }, [getToken]);

  useEffect(() => {
    loadLeaderboard();
    loadMyRank();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gamification/leaderboard?period=${period}&limit=100`);
      if (res.ok) setLeaderboard(await res.json());
    } catch {}
    setLoading(false);
  };

  const loadMyRank = async () => {
    try {
      const res = await fetchAuth("/gamification/leaderboard/rank");
      if (res.ok) setMyRank(await res.json());
    } catch {}
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">Top 100 traders ranked by performance</p>
          </div>
          <div className="flex gap-2">
            {periods.map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                className={period === p ? "bg-primary text-primary-foreground" : "border-white/10"}
                onClick={() => setPeriod(p)}
              >
                {p === "all-time" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {myRank && myRank.rank && (
          <div className="glass-panel p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Your Rank</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold font-mono text-primary">#{myRank.rank}</span>
              <span className="text-xs text-muted-foreground">of {myRank.totalUsers} users</span>
            </div>
          </div>
        )}

        {leaderboard.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {leaderboard.slice(0, 3).map((entry) => (
              <div
                key={entry.userId}
                className={`glass-panel p-5 text-center relative overflow-hidden ${
                  entry.rank === 1 ? "border-yellow-500/30 bg-yellow-500/5" :
                  entry.rank === 2 ? "border-gray-400/30 bg-gray-400/5" :
                  "border-orange-500/30 bg-orange-500/5"
                }`}
              >
                <div className="mb-3">
                  <RankBadge rank={entry.rank} />
                </div>
                {entry.photoUrl ? (
                  <img src={entry.photoUrl} alt="" className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-white/10" />
                ) : (
                  <div className="w-14 h-14 rounded-full mx-auto mb-2 bg-white/5 border-2 border-white/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-white/30" />
                  </div>
                )}
                <p className="font-bold text-sm">{entry.firstName || "Trader"} {entry.lastName?.charAt(0) || ""}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${TIER_BG[entry.tier]} ${TIER_COLORS[entry.tier]}`}>
                  {entry.tier} · Lv {entry.level}
                </span>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <TrendingUp className={`w-3 h-3 ${entry.gainPercent >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`} />
                  <span className={`text-sm font-mono font-bold ${entry.gainPercent >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                    {entry.gainPercent >= 0 ? "+" : ""}{entry.gainPercent}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{entry.totalXp.toLocaleString()} XP</p>
              </div>
            ))}
          </div>
        )}

        <div className="glass-panel overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Trader</div>
            <div className="col-span-2 text-right">Level</div>
            <div className="col-span-2 text-right">Gain</div>
            <div className="col-span-3 text-right">XP</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Flame className="w-6 h-6 text-primary animate-pulse" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-white/10" />
              <p>No rankings yet. Start earning XP to appear here!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center"
                >
                  <div className="col-span-1">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="col-span-4 flex items-center gap-2">
                    {entry.photoUrl ? (
                      <img src={entry.photoUrl} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                        <User className="w-4 h-4 text-white/20" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium truncate">{entry.firstName || "Trader"} {entry.lastName?.charAt(0) || ""}</p>
                      <span className={`text-[9px] ${TIER_COLORS[entry.tier]}`}>{entry.tier}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono text-white/70">Lv {entry.level}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-mono font-bold ${entry.gainPercent >= 0 ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
                      {entry.gainPercent >= 0 ? "+" : ""}{entry.gainPercent}%
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-sm font-mono text-white/60">{entry.totalXp.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01] mt-6">
          <p className="text-xs text-muted-foreground/60 text-center">
            Rankings are based on XP earned within the selected period. Gain percentages are from simulated positions tracked within the platform. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </Layout>
  );
}
