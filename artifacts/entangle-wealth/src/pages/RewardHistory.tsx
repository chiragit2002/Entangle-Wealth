import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, Medal, Crown, ChevronDown, ChevronUp, Loader2, Calendar, Users } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

interface RewardEntry {
  rank: number;
  tokens: number;
  gain: number;
  name: string;
  date: string;
}

interface MyReward {
  id: number;
  month: string;
  rank: number;
  tokensAwarded: number;
  portfolioGain: number;
  txHash: string | null;
  createdAt: string;
}

const REWARD_TIERS = [
  { label: "#1", tokens: "5,000 ENTGL", color: "#FFD700", icon: Crown },
  { label: "#2-3", tokens: "3,000 ENTGL", color: "#C0C0C0", icon: Medal },
  { label: "#4-10", tokens: "1,500 ENTGL", color: "#CD7F32", icon: Medal },
  { label: "#11-25", tokens: "750 ENTGL", color: "#00D4FF", icon: Trophy },
  { label: "#26-50", tokens: "400 ENTGL", color: "#9c27b0", icon: Trophy },
  { label: "#51-100", tokens: "200 ENTGL", color: "#666", icon: Trophy },
];

export default function RewardHistory() {
  const { getToken } = useAuth();
  const [history, setHistory] = useState<Record<string, RewardEntry[]>>({});
  const [myRewards, setMyRewards] = useState<MyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => authFetch(path, getToken, options), [getToken]);

  useEffect(() => {
    const load = async () => {
      try {
        const [histRes, myRes] = await Promise.allSettled([
          fetchAuth("/token/rewards/history"),
          fetchAuth("/token/rewards"),
        ]);
        if (histRes.status === "fulfilled" && histRes.value.ok) setHistory(await histRes.value.json());
        if (myRes.status === "fulfilled" && myRes.value.ok) {
          const rewardsData = await myRes.value.json();
          setMyRewards(Array.isArray(rewardsData) ? rewardsData : rewardsData.items || []);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [fetchAuth]);

  const months = Object.keys(history).sort().reverse();
  const totalEarned = myRewards.reduce((sum, r) => sum + r.tokensAwarded, 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Reward Distributions
          </h1>
          <p className="text-muted-foreground mt-1">
            Monthly EntangleCoin rewards for top 100 performers by portfolio gains
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-panel p-5 text-center">
            <Coins className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase mb-1">My Total Earned</p>
            <p className="text-2xl font-bold font-mono text-yellow-400">{totalEarned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ENTGL</p>
          </div>
          <div className="glass-panel p-5 text-center">
            <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase mb-1">Distributions</p>
            <p className="text-2xl font-bold font-mono text-primary">{months.length}</p>
            <p className="text-xs text-muted-foreground">months</p>
          </div>
          <div className="glass-panel p-5 text-center">
            <Medal className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase mb-1">Best Rank</p>
            <p className="text-2xl font-bold font-mono text-emerald-400">
              {myRewards.length > 0 ? `#${Math.min(...myRewards.map(r => r.rank))}` : "--"}
            </p>
            <p className="text-xs text-muted-foreground">all-time</p>
          </div>
        </div>

        <div className="glass-panel p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Reward Tiers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {REWARD_TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div key={tier.label} className="bg-white/[0.02] rounded-lg p-3 text-center border border-white/5">
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: tier.color }} />
                  <p className="text-sm font-bold" style={{ color: tier.color }}>{tier.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.tokens}</p>
                </div>
              );
            })}
          </div>
        </div>

        {myRewards.length > 0 && (
          <div className="glass-panel p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" /> My Rewards
            </h2>
            <div className="space-y-2">
              {myRewards.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-yellow-400">#{r.rank}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{r.month}</p>
                      <p className="text-xs text-muted-foreground">
                        Monthly XP: <span className="text-primary">
                          {Math.round(r.portfolioGain).toLocaleString()} XP
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-yellow-400">+{r.tokensAwarded.toLocaleString()} ENTGL</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Distribution History
          </h2>
          {months.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No distributions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Rewards are distributed monthly to the top 100 users by portfolio performance
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {months.map((month) => {
                const entries = history[month];
                const isExpanded = expandedMonth === month;
                const totalTokens = entries.reduce((s, e) => s + e.tokens, 0);

                return (
                  <div key={month} className="border border-white/5 rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left"
                      onClick={() => setExpandedMonth(isExpanded ? null : month)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-bold text-white">{month}</p>
                          <p className="text-xs text-muted-foreground">{entries.length} recipients</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-yellow-400">{totalTokens.toLocaleString()} ENTGL</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 bg-white/[0.01]">
                        <div className="space-y-1.5">
                          {entries.map((entry, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/[0.02]">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono w-6 text-right ${entry.rank <= 3 ? "text-yellow-400 font-bold" : "text-muted-foreground"}`}>
                                  #{entry.rank}
                                </span>
                                <span className="text-sm text-white">{entry.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-primary">
                                  {Math.round(entry.gain).toLocaleString()} XP
                                </span>
                                <span className="font-mono text-sm text-yellow-400">{entry.tokens.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
