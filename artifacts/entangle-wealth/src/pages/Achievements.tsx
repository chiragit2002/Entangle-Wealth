import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Award, Lock, CheckCircle, Target, Flame, Zap, Star, Trophy, TrendingUp, Users, Calendar, Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailySpinWheel } from "@/components/DailySpinWheel";
import { XPBar } from "@/components/XPBar";
import { useToast } from "@/hooks/use-toast";
import { fireCelebration } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";

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
  trading: "text-[#00B4D8] bg-[#00B4D8]/10 border-[#00B4D8]/30",
  streak: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  community: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  milestone: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  gig: "text-green-400 bg-green-400/10 border-green-400/30",
  backtesting: "text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/30",
  referral: "text-pink-400 bg-pink-400/10 border-pink-400/30",
};

const TIER_COLORS: Record<string, string> = {
  Diamond: "from-amber-500 to-blue-500",
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

const categories = ["All", "trading", "backtesting", "streak", "community", "milestone", "gig"] as const;

export default function Achievements() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [badges, setBadges] = useState<BadgeData[]>(DEFAULT_BADGES);
  const [challenges, setChallenges] = useState<ChallengeData[]>(DEFAULT_CHALLENGES);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [activeTab, setActiveTab] = useState<"badges" | "challenges">("badges");
  const [badgeFilter, setBadgeFilter] = useState<string>("All");
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => {
    return authFetch(path, getToken, options);
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [badgesRes, challengesRes, gamRes] = await Promise.allSettled([
        fetchAuth("/gamification/badges/me"),
        fetchAuth("/gamification/challenges/me"),
        fetchAuth("/gamification/me"),
      ]);

      let anySuccess = false;

      if (badgesRes.status === "fulfilled" && badgesRes.value.ok) {
        anySuccess = true;
        const data: BadgeData[] = await badgesRes.value.json();
        if (data.length > 0) {
          const seenKey = "ew_celebrated_badges";
          let seenSlugs: string[] = [];
          try {
            seenSlugs = JSON.parse(localStorage.getItem(seenKey) ?? "[]");
          } catch {}
          const seenSet = new Set(seenSlugs);
          const newlyEarned = data.filter((b: BadgeData) => b.earned && !seenSet.has(b.slug));
          if (newlyEarned.length > 0) {
            const maxXp = Math.max(...newlyEarned.map((b: BadgeData) => b.xpReward));
            fireCelebration(maxXp, "xp");
            if (maxXp >= 500) setShowBigWin(true);
            newlyEarned.forEach((b: BadgeData) => seenSet.add(b.slug));
            try {
              localStorage.setItem(seenKey, JSON.stringify(Array.from(seenSet)));
            } catch {}
          }
          setBadges(data);
        }
      } else if (badgesRes.status === "rejected" || (badgesRes.status === "fulfilled" && !badgesRes.value.ok)) {
        setLoadError("Could not load your badges — showing defaults. Check your connection and try again.");
      }
      if (challengesRes.status === "fulfilled" && challengesRes.value.ok) {
        anySuccess = true;
        const data = await challengesRes.value.json();
        if (data.length > 0) setChallenges(data);
      }
      if (gamRes.status === "fulfilled" && gamRes.value.ok) {
        anySuccess = true;
        setGamification(await gamRes.value.json());
      }

      if (!anySuccess) {
        setLoadError("Failed to load your achievements. Showing demo data — your progress is safe.");
      }
    } catch {
      setLoadError("Network error — couldn't reach the server. Your progress is saved and will appear when reconnected.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBadges = badgeFilter === "All" ? badges : badges.filter(b => b.category === badgeFilter);
  const earnedCount = badges.filter(b => b.earned).length;
  const dailyChallenges = challenges.filter(c => c.type === "daily");
  const weeklyChallenges = challenges.filter(c => c.type === "weekly");

  return (
    <Layout>
      <BigWinOverlay show={showBigWin} label="ACHIEVEMENT!" onDone={() => setShowBigWin(false)} />
      <div className="container mx-auto px-4 py-6 max-w-5xl">

        {loadError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-yellow-300 font-medium">Couldn't load live data</p>
              <p className="text-xs text-yellow-400/70 mt-0.5">{loadError}</p>
            </div>
            <button
              onClick={() => loadData()}
              className="shrink-0 text-xs font-mono text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 rounded px-2 py-1 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

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
            className="bg-gradient-to-r from-[#FFB800] to-[#f59e0b] text-black font-bold hover:opacity-90 gap-2"
          >
            <Gift className="w-4 h-4" />
            Daily Spin
          </Button>
        </div>
        <DailySpinWheel isOpen={showSpinWheel} onClose={() => setShowSpinWheel(false)} onReward={(r) => toast({ title: "Reward!", description: r })} />

        {gamification && (
          <div className="space-y-4 mb-6">
            <div className="glass-panel p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</p>
                    <p className="text-3xl font-bold font-mono text-primary">{gamification.xp.level}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tier</p>
                    <p className={`text-xl font-bold ${TIER_COLORS[gamification.xp.tier] ? "bg-gradient-to-r bg-clip-text text-transparent " + TIER_COLORS[gamification.xp.tier] : "text-foreground"}`}>
                      {gamification.xp.tier}
                    </p>
                  </div>
                </div>
                <div className="md:ml-auto flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total XP</p>
                    <p className="text-2xl font-bold font-mono text-primary">{gamification.xp.totalXp.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Streak</p>
                    <p className="text-2xl font-bold font-mono text-orange-400 flex items-center gap-1">
                      <Flame className="w-5 h-5" /> {gamification.streak.currentStreak}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{gamification.streak.multiplier.toFixed(1)}x multiplier</p>
                  </div>
                </div>
              </div>
              <XPBar
                level={gamification.xp.level}
                levelProgress={gamification.levelProgress}
                xpToNextLevel={gamification.xpToNextLevel}
                tier={gamification.xp.tier}
                variant="full"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "badges" ? "default" : "outline"}
            className={activeTab === "badges" ? "bg-primary text-primary-foreground" : "border-border"}
            onClick={() => setActiveTab("badges")}
          >
            <Award className="w-4 h-4 mr-2" /> Badges ({earnedCount}/{badges.length})
          </Button>
          <Button
            variant={activeTab === "challenges" ? "default" : "outline"}
            className={activeTab === "challenges" ? "bg-primary text-primary-foreground" : "border-border"}
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
                  className={`text-xs ${badgeFilter === cat ? "bg-primary/20 text-primary border-primary/30" : "border-border"}`}
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
                      <CheckCircle className="w-4 h-4 text-[#00B4D8]" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center border ${
                    badge.earned
                      ? CATEGORY_COLORS[badge.category] || "text-foreground bg-muted border-border"
                      : "text-muted-foreground/70 bg-muted/50 border-border"
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
                    {badge.isSecret && !badge.earned ? "Secret badge | keep exploring!" : badge.description}
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

function getDeadline(type: string): Date {
  const now = new Date();
  if (type === "daily") {
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight;
  }
  const endOfWeek = new Date(now);
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  endOfWeek.setUTCDate(now.getUTCDate() + daysUntilSunday);
  endOfWeek.setUTCHours(0, 0, 0, 0);
  return endOfWeek;
}

function getXpMultiplier(msLeft: number): { multiplier: number; label: string; urgent: boolean } {
  const minutesLeft = msLeft / 60000;
  if (minutesLeft <= 15) return { multiplier: 2, label: "2x XP", urgent: true };
  if (minutesLeft <= 60) return { multiplier: 1.5, label: "1.5x XP", urgent: true };
  return { multiplier: 1, label: "", urgent: false };
}

function useCountdown(deadline: Date) {
  const [msLeft, setMsLeft] = useState(() => deadline.getTime() - Date.now());

  useEffect(() => {
    const update = () => setMsLeft(deadline.getTime() - Date.now());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [deadline.getTime()]);

  return Math.max(msLeft, 0);
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ChallengeCard({ challenge }: { challenge: ChallengeData }) {
  const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
  const deadline = getDeadline(challenge.type);
  const msLeft = useCountdown(deadline);
  const { multiplier, label: multiplierLabel, urgent } = getXpMultiplier(msLeft);
  const effectiveXp = Math.round(challenge.xpReward * multiplier);

  return (
    <div className={`glass-panel p-4 ${challenge.completed ? "border-[#00B4D8]/20 bg-[#00B4D8]/5" : urgent ? "border-orange-500/30" : ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-sm">{challenge.title}</h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              challenge.type === "daily" ? "text-orange-400 bg-orange-400/10 border-orange-400/30" : "text-primary bg-primary/10 border-primary/30"
            }`}>
              {challenge.type}
            </span>
            {challenge.completed && <CheckCircle className="w-4 h-4 text-[#00B4D8]" />}
          </div>
          <p className="text-xs text-muted-foreground">{challenge.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className={`text-xs font-mono font-bold ${multiplier > 1 ? "text-orange-400" : "text-yellow-400"}`}>
              {effectiveXp} XP
            </span>
          </div>
          {multiplier > 1 && !challenge.completed && (
            <span className="text-[9px] font-mono font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-1.5 py-0.5 rounded animate-pulse">
              {multiplierLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 bg-muted/50 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${challenge.completed ? "bg-[#00B4D8]" : urgent ? "bg-orange-400" : "bg-primary"}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground/70">{challenge.progress}/{challenge.target}</span>
      </div>
      {!challenge.completed && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
          <span className={`text-[10px] font-mono ${urgent ? "text-orange-400 font-bold" : "text-muted-foreground/50"}`}>
            {formatTimeLeft(msLeft)} remaining
          </span>
          {urgent && multiplier > 1 && (
            <span className="text-[9px] text-orange-400/70 font-mono">· bonus active!</span>
          )}
        </div>
      )}
    </div>
  );
}
