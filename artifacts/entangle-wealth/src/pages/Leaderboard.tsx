import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Trophy, Medal, Crown, TrendingUp, Flame, Star, User } from "lucide-react";
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
  Diamond: "text-[#FF8C00]",
  Platinum: "text-white/70",
  Gold: "text-[#FFB800]",
  Silver: "text-white/50",
  Bronze: "text-orange-400",
};

const periods = ["weekly", "monthly", "all-time"] as const;
type Period = typeof periods[number];

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "demo-1", totalXp: 12450, level: 11, tier: "Gold", monthlyXp: 3200, weeklyXp: 820, firstName: "Alex", lastName: "M", photoUrl: null, gainPercent: 18.4 },
  { rank: 2, userId: "demo-2", totalXp: 9870, level: 10, tier: "Silver", monthlyXp: 2100, weeklyXp: 590, firstName: "Jordan", lastName: "K", photoUrl: null, gainPercent: 12.1 },
  { rank: 3, userId: "demo-3", totalXp: 7340, level: 8, tier: "Silver", monthlyXp: 1800, weeklyXp: 430, firstName: "Sam", lastName: "R", photoUrl: null, gainPercent: 9.7 },
  { rank: 4, userId: "demo-4", totalXp: 5200, level: 7, tier: "Bronze", monthlyXp: 1200, weeklyXp: 310, firstName: "Taylor", lastName: "B", photoUrl: null, gainPercent: 6.2 },
  { rank: 5, userId: "demo-5", totalXp: 3100, level: 5, tier: "Bronze", monthlyXp: 800, weeklyXp: 190, firstName: "Morgan", lastName: "L", photoUrl: null, gainPercent: 3.8 },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-[#FFB800]" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-white/60" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-orange-400" />;
  return <span className="text-xs font-mono font-bold text-white/30 w-4 text-center">{rank}</span>;
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
    } catch (err) {
      console.error("[Leaderboard] Failed to load leaderboard:", err);
    }
    setLoading(false);
  };

  const loadMyRank = async () => {
    try {
      const res = await fetchAuth("/gamification/leaderboard/rank");
      if (res.ok) setMyRank(await res.json());
    } catch (err) {
      console.error("[Leaderboard] Failed to load my rank:", err);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-7 h-7 text-[#FFB800]" />
            <h1 className="text-3xl font-bold tracking-tight text-white">Leaderboard</h1>
          </div>
          <p className="text-white/50 text-sm">Top 100 traders ranked by performance</p>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-1.5 mb-6 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06] w-fit">
          {periods.map(p => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant="ghost"
              className={`px-4 py-1.5 h-auto rounded-lg text-sm font-medium ${
                period === p
                  ? "bg-primary/15 text-primary"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {p === "all-time" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>

        {/* My Rank Card */}
        {myRank && myRank.rank && (
          <div className="bg-[#0A0E1A] border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm text-white/50">Your ranking</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono text-primary">#{myRank.rank}</span>
              <span className="text-xs text-white/30">of {myRank.totalUsers} traders</span>
            </div>
          </div>
        )}

        {/* Podium — top 3 */}
        {leaderboard.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {leaderboard.slice(0, 3).map((entry) => (
              <div
                key={entry.userId}
                className={`bg-[#0A0E1A] border rounded-xl p-4 text-center ${
                  entry.rank === 1 ? "border-[#FFB800]/25 bg-[#FFB800]/[0.03]" :
                  entry.rank === 2 ? "border-white/15" :
                  "border-orange-500/20"
                }`}
              >
                <div className="flex justify-center mb-3">
                  <RankBadge rank={entry.rank} />
                </div>
                {entry.photoUrl ? (
                  <img src={entry.photoUrl} alt="" className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-white/[0.04] border-2 border-white/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-white/40" />
                  </div>
                )}
                <p className="font-semibold text-sm text-white mb-0.5">{entry.firstName || "Trader"} {entry.lastName?.charAt(0) || ""}</p>
                <span className={`text-[10px] font-semibold ${TIER_COLORS[entry.tier]}`}>{entry.tier} · Lv {entry.level}</span>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <TrendingUp className={`w-3 h-3 ${entry.gainPercent >= 0 ? "text-primary" : "text-red-400"}`} />
                  <span className={`text-sm font-bold font-mono ${entry.gainPercent >= 0 ? "text-primary" : "text-red-400"}`}>
                    {entry.gainPercent >= 0 ? "+" : ""}{Math.abs(entry.gainPercent)}%
                  </span>
                </div>
                <p className="text-[10px] text-white/30 mt-1">{entry.totalXp.toLocaleString()} XP</p>
              </div>
            ))}
          </div>
        )}

        {/* Full table */}
        <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-xl overflow-hidden" role="table" aria-label="Leaderboard rankings sorted by XP">
          <div role="row" className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            <div role="columnheader" aria-sort="ascending" className="col-span-1">#</div>
            <div role="columnheader" className="col-span-5">Trader</div>
            <div role="columnheader" className="col-span-2 text-right">Level</div>
            <div role="columnheader" className="col-span-2 text-right">Gain</div>
            <div role="columnheader" aria-sort="descending" className="col-span-2 text-right">XP</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Flame className="w-6 h-6 text-primary animate-pulse" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div>
              {DEMO_LEADERBOARD.map((entry) => (
                <div key={entry.userId} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center opacity-40">
                  <div className="col-span-1">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="col-span-5 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-white/20" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80 truncate">{entry.firstName}</p>
                      <span className={`text-[10px] ${TIER_COLORS[entry.tier]}`}>{entry.tier}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono text-white/50">Lv {entry.level}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-mono font-semibold ${entry.gainPercent >= 0 ? "text-primary" : "text-red-400"}`}>
                      {entry.gainPercent >= 0 ? "+" : ""}{Math.abs(entry.gainPercent)}%
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono text-white/40">{entry.totalXp.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              <div className="text-center py-6 border-t border-white/[0.04]">
                <p className="text-sm text-white/30">Be the first to earn real XP and claim your spot!</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {leaderboard.map((entry) => (
                <div key={entry.userId} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors items-center">
                  <div className="col-span-1">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="col-span-5 flex items-center gap-2.5">
                    {entry.photoUrl ? (
                      <img src={entry.photoUrl} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white/40" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white/80 truncate">{entry.firstName || "Trader"} {entry.lastName?.charAt(0) || ""}</p>
                      <span className={`text-[10px] ${TIER_COLORS[entry.tier]}`}>{entry.tier}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono text-white/50">Lv {entry.level}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-mono font-semibold ${entry.gainPercent >= 0 ? "text-primary" : "text-red-400"}`}>
                      {entry.gainPercent >= 0 ? "+" : ""}{Math.abs(entry.gainPercent)}%
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-mono text-white/40">{(period === "monthly" ? entry.monthlyXp : period === "weekly" ? entry.weeklyXp : entry.totalXp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
