import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Trophy, Lock, CheckCircle, Award, Flame, Zap, Target, Users, Star, TrendingUp, Calendar, Shield } from "lucide-react";
import { Link } from "wouter";

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
  shield: <Shield className="w-6 h-6" />,
};

const TROPHY_CATEGORIES: {
  key: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  matchCategories: string[];
}[] = [
  {
    key: "trading",
    label: "Trading",
    description: "Earned through market analysis, signals, and backtesting",
    color: "text-[#00D4FF]",
    bg: "bg-[#00D4FF]/10",
    border: "border-[#00D4FF]/25",
    icon: <TrendingUp className="w-5 h-5" />,
    matchCategories: ["trading", "backtesting"],
  },
  {
    key: "streaks",
    label: "Streaks",
    description: "Consistency rewards for daily activity and habit building",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/25",
    icon: <Flame className="w-5 h-5" />,
    matchCategories: ["streak"],
  },
  {
    key: "community",
    label: "Community",
    description: "Awarded for engagement, posts, and social contributions",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/25",
    icon: <Users className="w-5 h-5" />,
    matchCategories: ["community", "referral"],
  },
  {
    key: "special",
    label: "Special",
    description: "Milestone achievements and exclusive accomplishments",
    color: "text-[#FFB800]",
    bg: "bg-[#FFB800]/10",
    border: "border-[#FFB800]/25",
    icon: <Trophy className="w-5 h-5" />,
    matchCategories: ["milestone", "gig"],
  },
];

const BADGE_ICON_COLORS: Record<string, { earned: string; locked: string }> = {
  trading: { earned: "text-[#00D4FF] bg-[#00D4FF]/10 border-[#00D4FF]/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
  backtesting: { earned: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
  streak: { earned: "text-orange-400 bg-orange-400/10 border-orange-400/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
  community: { earned: "text-purple-400 bg-purple-400/10 border-purple-400/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
  referral: { earned: "text-pink-400 bg-pink-400/10 border-pink-400/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
  milestone: { earned: "text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
  gig: { earned: "text-green-400 bg-green-400/10 border-green-400/30", locked: "text-muted-foreground/40 bg-muted/50 border-border" },
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

function BadgeCard({ badge }: { badge: BadgeData }) {
  const isSecret = badge.isSecret && !badge.earned;
  const colorConfig = BADGE_ICON_COLORS[badge.category] ?? BADGE_ICON_COLORS.milestone;

  return (
    <div
      className={`relative p-4 border rounded-lg transition-all ${
        badge.earned
          ? "bg-muted/50 border-border hover:bg-muted/50"
          : "bg-muted/30 border-border opacity-50"
      }`}
    >
      {badge.earned && (
        <div className="absolute top-2.5 right-2.5">
          <CheckCircle className="w-3.5 h-3.5 text-[#00FF41]" />
        </div>
      )}

      <div className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center border ${
        badge.earned ? colorConfig.earned : colorConfig.locked
      }`}>
        {isSecret ? (
          <Lock className="w-5 h-5" />
        ) : (
          ICON_MAP[badge.icon] ?? <Award className="w-6 h-6" />
        )}
      </div>

      <h3 className={`font-bold text-sm mb-0.5 ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
        {isSecret ? "???" : badge.name}
      </h3>

      <p className="text-[11px] text-muted-foreground/70 mb-2 leading-relaxed">
        {isSecret ? "Secret badge — keep exploring!" : badge.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-yellow-400" />
          <span className="text-[11px] font-mono text-yellow-400 font-bold">{badge.xpReward} XP</span>
        </div>
        {!badge.earned && !isSecret && (
          <span className="text-[9px] text-muted-foreground/40 font-mono">{badge.requirement}</span>
        )}
      </div>

      {badge.earned && badge.earnedAt && (
        <p className="text-[9px] text-muted-foreground/40 mt-1.5 font-mono">
          Unlocked {new Date(badge.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

export default function TrophyCase() {
  const { getToken } = useAuth();
  const [badges, setBadges] = useState<BadgeData[]>(DEFAULT_BADGES);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => {
    return authFetch(path, getToken, options);
  }, [getToken]);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const res = await fetchAuth("/gamification/badges/me");
      if (res.ok) {
        const data: BadgeData[] = await res.json();
        if (data.length > 0) setBadges(data);
      }
    } catch {
    }
    setLoading(false);
  };

  const earnedCount = badges.filter(b => b.earned).length;
  const totalVisible = badges.filter(b => !b.isSecret || b.earned).length;

  const getBadgesForCategory = (catKey: string) => {
    if (catKey === "all") return badges;
    const cat = TROPHY_CATEGORIES.find(c => c.key === catKey);
    if (!cat) return [];
    return badges.filter(b => cat.matchCategories.includes(b.category));
  };

  const displayedBadges = getBadgesForCategory(activeCategory);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-7 h-7 text-[#FFB800]" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Trophy Case</h1>
          </div>
          <p className="text-muted-foreground text-sm">Your earned badges and locked achievements</p>

          {/* Progress summary */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-4 py-2">
              <CheckCircle className="w-4 h-4 text-[#00FF41]" />
              <span className="text-sm font-mono font-bold text-foreground">{earnedCount}</span>
              <span className="text-sm text-muted-foreground/70">of {totalVisible} unlocked</span>
            </div>
            <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden max-w-xs">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFB800] to-[#00FF41] transition-all"
                style={{ width: `${totalVisible > 0 ? (earnedCount / totalVisible) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground/50 font-mono">
              {totalVisible > 0 ? Math.round((earnedCount / totalVisible) * 100) : 0}% complete
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
              activeCategory === "all"
                ? "bg-muted border-border text-foreground"
                : "bg-muted/30 border-border text-muted-foreground/70 hover:text-muted-foreground"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            All
            <span className="text-[10px] text-muted-foreground/50">({earnedCount}/{totalVisible})</span>
          </button>
          {TROPHY_CATEGORIES.map(cat => {
            const catBadges = getBadgesForCategory(cat.key);
            const earnedInCat = catBadges.filter(b => b.earned).length;
            const totalInCat = catBadges.filter(b => !b.isSecret || b.earned).length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                  activeCategory === cat.key
                    ? `${cat.bg} ${cat.border} ${cat.color}`
                    : "bg-muted/30 border-border text-muted-foreground/70 hover:text-muted-foreground"
                }`}
              >
                <span className={activeCategory === cat.key ? cat.color : "text-muted-foreground/50"}>{cat.icon}</span>
                {cat.label}
                <span className="text-[10px] opacity-60">({earnedInCat}/{totalInCat})</span>
              </button>
            );
          })}
        </div>

        {/* Active category description */}
        {activeCategory !== "all" && (
          <div className="mb-6">
            {TROPHY_CATEGORIES.filter(c => c.key === activeCategory).map(cat => (
              <div key={cat.key} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${cat.bg} ${cat.border}`}>
                <span className={cat.color}>{cat.icon}</span>
                <p className="text-sm text-muted-foreground">{cat.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Badge Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-36 bg-muted/30 border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : displayedBadges.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground/50 text-sm">No badges in this category yet</p>
          </div>
        ) : (
          <>
            {/* Earned first, then locked */}
            {displayedBadges.filter(b => b.earned).length > 0 && (
              <div className="mb-6">
                <h2 className="text-[11px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#00FF41]" />
                  Earned ({displayedBadges.filter(b => b.earned).length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {displayedBadges.filter(b => b.earned).map(badge => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            )}

            {displayedBadges.filter(b => !b.earned).length > 0 && (
              <div>
                <h2 className="text-[11px] font-mono font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                  Locked ({displayedBadges.filter(b => !b.earned).length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {displayedBadges.filter(b => !b.earned).map(badge => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-10 pt-6 border-t border-border flex justify-center">
          <Link href="/achievements" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono">
            ← Back to Achievements
          </Link>
        </div>
      </div>
    </Layout>
  );
}
