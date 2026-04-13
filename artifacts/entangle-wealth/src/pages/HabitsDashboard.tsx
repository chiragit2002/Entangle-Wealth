import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import {
  Target, Flame, Zap, CheckCircle2, Circle, Shield, DollarSign,
  TrendingUp, CreditCard, BarChart3, BookOpen, Activity, GitBranch,
  Briefcase, PieChart, RefreshCw, Trophy, Star, Calendar, AlertTriangle,
} from "lucide-react";
import { fireConfetti } from "@/lib/confetti";
import { Link } from "wouter";

const API_BASE = "/api";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Shield,
  DollarSign,
  TrendingUp,
  CreditCard,
  BarChart3,
  BookOpen,
  Activity,
  GitBranch,
  Briefcase,
  PieChart,
  Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  budgeting: "border-blue-500/40 bg-blue-500/5",
  saving: "border-emerald-500/40 bg-emerald-500/5",
  investing: "border-purple-500/40 bg-purple-500/5",
  retirement: "border-amber-500/40 bg-amber-500/5",
  debt: "border-red-500/40 bg-red-500/5",
  tracking: "border-cyan-500/40 bg-cyan-500/5",
  planning: "border-indigo-500/40 bg-indigo-500/5",
  education: "border-teal-500/40 bg-teal-500/5",
  simulation: "border-violet-500/40 bg-violet-500/5",
  income: "border-orange-500/40 bg-orange-500/5",
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  budgeting: "bg-blue-500/20 text-blue-300",
  saving: "bg-emerald-500/20 text-emerald-300",
  investing: "bg-purple-500/20 text-purple-300",
  retirement: "bg-amber-500/20 text-amber-300",
  debt: "bg-red-500/20 text-red-300",
  tracking: "bg-cyan-500/20 text-cyan-300",
  planning: "bg-indigo-500/20 text-indigo-300",
  education: "bg-teal-500/20 text-teal-300",
  simulation: "bg-violet-500/20 text-violet-300",
  income: "bg-orange-500/20 text-orange-300",
};

interface Habit {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  icon: string;
  difficulty: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletedAt: string | null;
  completedToday: boolean;
}

interface HabitSummary {
  completedToday: number;
  completedThisWeek: number;
  totalHabits: number;
  maxCurrentStreak: number;
  totalLifetimeCompletions: number;
}

function ProgressRing({ value, max, size = 56, strokeWidth = 5, color = "#00D4FF" }: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  const color = streak >= 30 ? "#FFD700" : streak >= 14 ? "#9c27b0" : streak >= 7 ? "#00D4FF" : "#ff6b35";
  return (
    <span
      className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}
    >
      <Flame className="w-3 h-3" />
      {streak}d
    </span>
  );
}

export default function HabitsDashboard() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [summary, setSummary] = useState<HabitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const token = isSignedIn ? await getToken() : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [habitsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/habits/me`, { headers }),
        fetch(`${API_BASE}/habits/summary`, { headers }),
      ]);

      if (!habitsRes.ok) {
        setFetchError(true);
        return;
      }
      setHabits(await habitsRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const completeHabit = async (habitId: number, habitTitle: string) => {
    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Sign in to track your habits and earn XP." });
      return;
    }

    setCompleting(habitId);
    try {
      const res = await authFetch(`/habits/${habitId}/complete`, getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.alreadyCompletedToday) {
        toast({ title: "Already done today!", description: "Come back tomorrow to keep your streak going." });
      } else if (data.success) {
        const streakMsg = data.streak > 1 ? ` ${data.streak}-day streak!` : "";
        const bonusMsg = data.streakBonus ? ` (${data.streakBonus}x streak bonus!)` : "";
        toast({
          title: `+${data.xpAwarded} XP Earned!`,
          description: `${habitTitle} completed.${streakMsg}${bonusMsg}`,
        });

        if (data.streak >= 7 || data.xpAwarded >= 50) {
          fireConfetti();
        }

        await fetchHabits();

        const doneCount = habits.filter(h => h.completedToday || h.id === habitId).length;
        if (doneCount >= 3 && doneCount % 3 === 0) {
          setTimeout(() => toast({
            title: "Great momentum!",
            description: "See how these habits affect your future in Life Outcomes →",
          }), 1200);
        }
        if (data.streak === 7) {
          setTimeout(() => toast({
            title: "7-Day Streak!",
            description: "Your AI Coach has personalized advice ready for you.",
          }), 1500);
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to complete habit. Please try again.", variant: "destructive" });
    } finally {
      setCompleting(null);
    }
  };

  const categories = ["all", ...Array.from(new Set(habits.map(h => h.category)))];
  const filteredHabits = activeCategory === "all" ? habits : habits.filter(h => h.category === activeCategory);
  const completedToday = habits.filter(h => h.completedToday).length;
  const totalToday = habits.length;

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a14] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Daily Habit Dashboard</h1>
              <p className="text-white/50 text-sm mt-1">Build financial habits. Earn XP. Change your life.</p>
            </div>
            <button
              onClick={fetchHabits}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex flex-col items-center">
                <div className="relative mb-2">
                  <ProgressRing value={completedToday} max={totalToday} size={64} color="#00D4FF" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {completedToday}/{totalToday}
                  </span>
                </div>
                <p className="text-xs text-white/50">Today's Actions</p>
              </div>

              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="text-2xl font-bold text-white">{summary.maxCurrentStreak}</span>
                </div>
                <p className="text-xs text-white/50">Best Streak</p>
              </div>

              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span className="text-2xl font-bold text-white">{summary.completedThisWeek}</span>
                </div>
                <p className="text-xs text-white/50">This Week</p>
              </div>

              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-2xl font-bold text-white">{summary.totalLifetimeCompletions}</span>
                </div>
                <p className="text-xs text-white/50">Total Actions</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  activeCategory === cat
                    ? "bg-[#00D4FF] text-black"
                    : "bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 bg-white/[0.04] rounded-xl animate-pulse border border-white/10" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-16 bg-white/[0.02] border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
              <p className="text-white/60 text-sm font-medium">Failed to load habits</p>
              <p className="text-white/30 text-xs mt-1 mb-4">There was a problem connecting to the server.</p>
              <button onClick={fetchHabits} className="text-xs text-[#00D4FF] hover:underline">Try again</button>
            </div>
          ) : filteredHabits.length === 0 ? (
            <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <Target className="w-10 h-10 text-white/10 mx-auto mb-3" />
              {activeCategory === "all" ? (
                <>
                  <p className="text-white/50 text-sm font-medium">No habits available</p>
                  <p className="text-white/50 text-xs mt-1">Check back later — habits are refreshed regularly.</p>
                </>
              ) : (
                <>
                  <p className="text-white/50 text-sm font-medium">No habits in "{activeCategory}"</p>
                  <button onClick={() => setActiveCategory("all")} className="mt-3 text-xs text-[#00D4FF] hover:underline">View all habits</button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHabits.map(habit => {
                const IconComp = ICON_MAP[habit.icon] || Target;
                const cardStyle = CATEGORY_COLORS[habit.category] || "border-white/10 bg-white/[0.04]";
                const badgeStyle = CATEGORY_BADGE_COLORS[habit.category] || "bg-white/10 text-white/60";
                const isCompleting = completing === habit.id;

                return (
                  <div
                    key={habit.id}
                    className={`border rounded-xl p-5 space-y-3 transition-all ${cardStyle} ${
                      habit.completedToday ? "opacity-70" : "hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badgeStyle}`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm leading-tight">{habit.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${badgeStyle}`}>
                            {habit.category}
                          </span>
                        </div>
                      </div>
                      <StreakBadge streak={habit.currentStreak} />
                    </div>

                    <p className="text-white/50 text-xs leading-relaxed">{habit.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#00D4FF]" />
                          +{habit.xpReward} XP
                        </span>
                        {habit.totalCompletions > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400" />
                            {habit.totalCompletions}x done
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => completeHabit(habit.id, habit.title)}
                        disabled={habit.completedToday || isCompleting}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                          habit.completedToday
                            ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                            : isCompleting
                            ? "bg-[#00D4FF]/20 text-[#00D4FF] cursor-wait"
                            : "bg-[#00D4FF] text-black hover:bg-[#00D4FF]/90 active:scale-95"
                        }`}
                      >
                        {habit.completedToday ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Done!
                          </>
                        ) : isCompleting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Logging...
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5" />
                            Complete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isSignedIn && (
            <div className="text-center py-8 bg-white/[0.04] border border-white/10 rounded-xl">
              <Zap className="w-8 h-8 text-[#00D4FF] mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Sign in to track your habits</h3>
              <p className="text-white/50 text-sm">Earn XP, build streaks, and connect your habits to your financial goals.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Link href="/life-outcomes">
              <a className="group flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:border-[#00D4FF]/40 hover:bg-[#00D4FF]/5 transition-all cursor-pointer">
                <TrendingUp className="w-8 h-8 text-[#00D4FF] flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-white font-medium text-sm">Life Outcomes</p>
                  <p className="text-white/50 text-xs">See your habit impact projected forward</p>
                </div>
              </a>
            </Link>
            <Link href="/ai-coach">
              <a className="group flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:border-purple-500/40 hover:bg-purple-500/5 transition-all cursor-pointer">
                <Activity className="w-8 h-8 text-purple-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-white font-medium text-sm">AI Coach</p>
                  <p className="text-white/50 text-xs">Get personalized behavioral guidance</p>
                </div>
              </a>
            </Link>
            <Link href="/alternate-timeline">
              <a className="group flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer">
                <GitBranch className="w-8 h-8 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-white font-medium text-sm">Alternate Timeline</p>
                  <p className="text-white/50 text-xs">Model what-if financial decisions</p>
                </div>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
