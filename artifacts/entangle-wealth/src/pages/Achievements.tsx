import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Award, Lock, CheckCircle, Target, Flame, Zap, Star, Trophy, TrendingUp, Users, Calendar, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailySpinWheel } from "@/components/DailySpinWheel";
import { useToast } from "@/hooks/use-toast";

interface BadgeData {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  requirement: string;
  threshold: number;
  isSecret: boolean;
  earned: boolean;
  earnedAt: string | null;
}

interface ChallengeData {
  id: number;
  title: string;
  description: string;
  type: string;
  category: string;
  xpReward: number;
  target: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}

interface GamificationData {
  xp: { totalXp: number; level: number; tier: string; monthlyXp: number; weeklyXp: number };
  streak: { currentStreak: number; longestStreak: number; multiplier: number };
  levelProgress: number;
  xpToNextLevel: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  trophy: <Trophy className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
  trending: <TrendingUp className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  calendar: <Calendar className="w-6 h-6" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  trading: "text-[#00D4FF] bg-[#00D4FF]/10 border-[#00D4FF]/30",
  streak: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  community: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  milestone: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  gig: "text-green-400 bg-green-400/10 border-green-400/30",
};

const TIER_COLORS: Record<string, string> = {
  Diamond: "from-cyan-400 to-blue-500",
  Platinum: "from-purple-400 to-pink-500",
  Gold: "from-yellow-400 to-orange-500",
  Silver: "from-gray-300 to-gray-500",
  Bronze: "from-orange-400 to-red-500",
};

const DEFAULT_BADGES: BadgeData[] = [
  { id: 1, slug: "first-signal", name: "Signal Seeker", description: "Use your first trading signal", icon: "zap", category: "trading", xpReward: 50, requirement: "Use 1 trading signal", threshold: 1, isSecret: false, earned: false, earnedAt: null },
  { id: 2, slug: "streak-7", name: "Week Warrior", description: "Maintain a 7-day activity streak", icon: "flame", category: "streak", xpReward: 100, requirement: "7-day streak", threshold: 7, isSecret: false, earned: false, earnedAt: null },
  { id: 3, slug: "streak-30", name: "Monthly Machine", description: "Maintain a 30-day activity streak", icon: "flame", category: "streak", xpReward: 500, requirement: "30-day streak", threshold: 30, isSecret: false, earned: false, earnedAt: null },
  { id: 4, slug: "top-10", name: "Elite Trader", description: "Finish in the top 10 on the leaderboard", icon: "trophy", category: "milestone", xpReward: 300, requirement: "Top 10 finish", threshold: 1, isSecret: false, earned: false, earnedAt: null },
  { id: 5, slug: "first-gig", name: "Gig Starter", description: "Complete your first gig", icon: "target", category: "gig", xpReward: 75, requirement: "Complete 1 gig", threshold: 1, isSecret: false, earned: false, earnedAt: null },
  { id: 6, slug: "community-post", name: "Voice of the Community", description: "Make your first community contribution", icon: "users", category: "community", xpReward: 50, requirement: "1 community post", threshold: 1, isSecret: false, earned: false, earnedAt: null },
  { id: 7, slug: "signals-10", name: "Signal Master", description: "Use 10 trading signals", icon: "zap", category: "trading", xpReward: 200, requirement: "Use 10 signals", threshold: 10, isSecret: false, earned: false, earnedAt: null },
  { id: 8, slug: "xp-1000", name: "XP Hunter", description: "Earn 1,000 total XP", icon: "star", category: "milestone", xpReward: 150, requirement: "Earn 1,000 XP", threshold: 1000, isSecret: false, earned: false, earnedAt: null },
  { id: 9, slug: "xp-10000", name: "XP Legend", description: "Earn 10,000 total XP", icon: "award", category: "milestone", xpReward: 500, requirement: "Earn 10,000 XP", threshold: 10000, isSecret: false, earned: false, earnedAt: null },
  { id: 10, slug: "streak-100", name: "Century Streak", description: "Maintain a 100-day activity streak", icon: "calendar", category: "streak", xpReward: 1000, requirement: "100-day streak", threshold: 100, isSecret: true, earned: false, earnedAt: null },
  { id: 11, slug: "gig-10", name: "Gig Pro", description: "Complete 10 gigs", icon: "target", category: "gig", xpReward: 300, requirement: "Complete 10 gigs", threshold: 10, isSecret: false, earned: false, earnedAt: null },
  { id: 12, slug: "top-1", name: "Champion", description: "Reach #1 on the leaderboard", icon: "trophy", category: "milestone", xpReward: 1000, requirement: "#1 on leaderboard", threshold: 1, isSecret: true, earned: false, earnedAt: null },
];

const DEFAULT_CHALLENGES: ChallengeData[] = [
  { id: 1, title: "Daily Check-In", description: "Log in and check your dashboard", type: "daily", category: "engagement", xpReward: 25, target: 1, progress: 0, completed: false, completedAt: null },
  { id: 2, title: "Signal Scout", description: "Review 3 trading signals today", type: "daily", category: "trading", xpReward: 50, target: 3, progress: 0, completed: false, completedAt: null },
  { id: 3, title: "Market Maven", description: "Analyze 5 different stocks this week", type: "weekly", category: "trading", xpReward: 150, target: 5, progress: 0, completed: false, completedAt: null },
  { id: 4, title: "Community Builder", description: "Make 3 community contributions this week", type: "weekly", category: "community", xpReward: 100, target: 3, progress: 0, completed: false, completedAt: null },
  { id: 5, title: "Gig Hustler", description: "Complete 2 gigs this week", type: "weekly", category: "gig", xpReward: 200, target: 2, progress: 0, completed: false, completedAt: null },
  { id: 6, title: "Streak Master", description: "Maintain your streak for 5 consecutive days", type: "weekly", category: "streak", xpReward: 100, target: 5, progress: 0, completed: false, completedAt: null },
];

const categories = ["All", "trading", "streak", "community", "milestone", "gig"] as const;

export default function Achievements() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeData[]>(DEFAULT_BADGES);
  const [challenges, setChallenges] = useState<ChallengeData[]>(DEFAULT_CHALLENGES);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [activeTab, setActiveTab] = useState<"badges" | "challenges">("badges");
  const [badgeFilter, setBadgeFilter] = useState<string>("All");
  const [showSpinWheel, setShowSpinWheel] = useState(false);

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => {
    return authFetch(path, getToken, options);
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [badgesRes, challengesRes, gamRes] = await Promise.allSettled([
        fetchAuth("/gamification/badges/me"),
        fetchAuth("/gamification/challenges/me"),
        fetchAuth("/gamification/me"),
      ]);

      if (badgesRes.status === "fulfilled" && badgesRes.value.ok) {
        const data = await badgesRes.value.json();
        if (data.length > 0) setBadges(data);
      }
      if (challengesRes.status === "fulfilled" && challengesRes.value.ok) {
        const data = await challengesRes.value.json();
        if (data.length > 0) setChallenges(data);
      }
      if (gamRes.status === "fulfilled" && gamRes.value.ok) {
        setGamification(await gamRes.value.json());
      }
    } catch {}
  };

  const filteredBadges = badgeFilter === "All" ? badges : badges.filter(b => b.category === badgeFilter);
  const earnedCount = badges.filter(b => b.earned).length;
  const dailyChallenges = challenges.filter(c => c.type === "daily");
  const weeklyChallenges = challenges.filter(c => c.type === "weekly");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Award className="w-8 h-8 text-yellow-400" />
              Achievements
            </h1>
            <p className="text-muted-foreground mt-1">Earn badges and complete challenges for XP rewards</p>
          </div>
          <Button
            onClick={() => setShowSpinWheel(true)}
            className="bg-gradient-to-r from-[#FFD700] to-[#f59e0b] text-black font-bold hover:opacity-90 gap-2"
          >
            <Gift className="w-4 h-4" />
            Daily Spin
          </Button>
        </div>
        <DailySpinWheel isOpen={showSpinWheel} onClose={() => setShowSpinWheel(false)} onReward={(r) => toast({ title: "Reward!", description: r })} />

        {gamification && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="glass-panel p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</p>
              <p className="text-2xl font-bold font-mono">{gamification.xp.level}</p>
              <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full bg-gradient-to-r ${TIER_COLORS[gamification.xp.tier] || TIER_COLORS.Bronze}`}
                  style={{ width: `${gamification.levelProgress}%` }}
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{gamification.xpToNextLevel} XP to next</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tier</p>
              <p className={`text-2xl font-bold ${TIER_COLORS[gamification.xp.tier] ? "bg-gradient-to-r bg-clip-text text-transparent " + TIER_COLORS[gamification.xp.tier] : "text-white"}`}>
                {gamification.xp.tier}
              </p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak</p>
              <p className="text-2xl font-bold font-mono text-orange-400 flex items-center justify-center gap-1">
                <Flame className="w-5 h-5" /> {gamification.streak.currentStreak}
              </p>
              <p className="text-[9px] text-muted-foreground">{gamification.streak.multiplier.toFixed(1)}x multiplier</p>
            </div>
            <div className="glass-panel p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total XP</p>
              <p className="text-2xl font-bold font-mono text-primary">{gamification.xp.totalXp.toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "badges" ? "default" : "outline"}
            className={activeTab === "badges" ? "bg-primary text-primary-foreground" : "border-white/10"}
            onClick={() => setActiveTab("badges")}
          >
            <Award className="w-4 h-4 mr-2" /> Badges ({earnedCount}/{badges.length})
          </Button>
          <Button
            variant={activeTab === "challenges" ? "default" : "outline"}
            className={activeTab === "challenges" ? "bg-primary text-primary-foreground" : "border-white/10"}
            onClick={() => setActiveTab("challenges")}
          >
            <Target className="w-4 h-4 mr-2" /> Challenges
          </Button>
        </div>

        {activeTab === "badges" && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={badgeFilter === cat ? "default" : "outline"}
                  className={`text-xs ${badgeFilter === cat ? "bg-primary/20 text-primary border-primary/30" : "border-white/10"}`}
                  onClick={() => setBadgeFilter(cat)}
                >
                  {cat === "All" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`glass-panel p-4 text-center transition-all relative ${
                    badge.earned
                      ? "border-primary/30 bg-primary/5"
                      : badge.isSecret && !badge.earned
                      ? "opacity-50"
                      : "opacity-70"
                  }`}
                >
                  {badge.earned && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center border ${
                    badge.earned
                      ? CATEGORY_COLORS[badge.category] || "text-white bg-white/10 border-white/20"
                      : "text-white/20 bg-white/5 border-white/10"
                  }`}>
                    {badge.isSecret && !badge.earned ? (
                      <Lock className="w-6 h-6" />
                    ) : (
                      ICON_MAP[badge.icon] || <Award className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm mb-1">
                    {badge.isSecret && !badge.earned ? "???" : badge.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {badge.isSecret && !badge.earned ? "Secret badge — keep exploring!" : badge.description}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs font-mono text-yellow-400">{badge.xpReward} XP</span>
                  </div>
                  {badge.earned && badge.earnedAt && (
                    <p className="text-[9px] text-muted-foreground mt-1">
                      Earned {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "challenges" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" /> Daily Challenges
              </h2>
              <div className="space-y-3">
                {dailyChallenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Weekly Challenges
              </h2>
              <div className="space-y-3">
                {weeklyChallenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function ChallengeCard({ challenge }: { challenge: ChallengeData }) {
  const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);

  return (
    <div className={`glass-panel p-4 ${challenge.completed ? "border-[#00ff88]/20 bg-[#00ff88]/5" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm">{challenge.title}</h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              challenge.type === "daily" ? "text-orange-400 bg-orange-400/10 border-orange-400/30" : "text-primary bg-primary/10 border-primary/30"
            }`}>
              {challenge.type}
            </span>
            {challenge.completed && <CheckCircle className="w-4 h-4 text-[#00ff88]" />}
          </div>
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
        </div>
        <div className="flex items-center gap-1 ml-3">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span className="text-xs font-mono font-bold text-yellow-400">{challenge.xpReward} XP</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white/5 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${challenge.completed ? "bg-[#00ff88]" : "bg-primary"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-white/40">{challenge.progress}/{challenge.target}</span>
      </div>
    </div>
  );
}
