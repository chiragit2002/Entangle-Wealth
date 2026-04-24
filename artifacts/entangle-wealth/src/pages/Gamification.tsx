import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth, useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Zap, Flame, Trophy, Star, Gift, Sparkles, RefreshCw,
  ChevronRight, Crown, Lock, CheckCircle, Clock, TrendingUp, User,
} from "lucide-react";
import { fireConfetti, getCelebrationTier, getXpCelebrationTier } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { calculateTier, TIER_THRESHOLDS } from "@workspace/xp";

interface ActivityItem {
  id: string | number;
  type: "xp_gain" | "spin_reward";
  amount: number;
  reason: string;
  category: string;
  label: string | null;
  rewardType: string;
  createdAt: string;
}

interface GamificationStatus {
  xp: {
    totalXp: number;
    level: number;
    tier: string;
    monthlyXp: number;
    weeklyXp: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    multiplier: number;
  };
  levelProgress: number;
  xpToNextLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  canSpin: boolean;
  nextSpinAt: string | null;
  lastSpin: { reward: string; rewardType: string; rewardValue: number; spunAt: string } | null;
  recentRewards: ActivityItem[];
  recentSpins: { id: number; reward: string; rewardType: string; rewardValue: number; spunAt: string }[];
  isFounder: boolean;
  founderMultiplier: number;
  alreadyClaimedDaily: boolean;
}

const WHEEL_SEGMENTS = [
  { label: "+50 XP", color: "#00B4D8", textColor: "#000" },
  { label: "+100 XP", color: "#FFB800", textColor: "#000" },
  { label: "+50 XP", color: "#00B4D8", textColor: "#000" },
  { label: "+250 XP", color: "#00B4D8", textColor: "#000" },
  { label: "+100 XP", color: "#FFB800", textColor: "#000" },
  { label: "2x Boost", color: "#9c27b0", textColor: "#fff" },
  { label: "+50 XP", color: "#00B4D8", textColor: "#000" },
  { label: "Streak+", color: "#ff6b35", textColor: "#fff" },
];

const TIER_COLOR_MAP: Record<string, string> = {
  Diamond: "#00B4D8",
  Platinum: "#b8c0cc",
  Gold: "#FFB800",
  Silver: "#c0c0c0",
  Bronze: "#cd7f32",
};

const TIER_COLORS = Object.fromEntries(
  TIER_THRESHOLDS.map(t => [t.tier, TIER_COLOR_MAP[t.tier] ?? "#cd7f32"])
);

function SpinWheel({ canSpin, spinning, rotation }: { canSpin: boolean; spinning: boolean; rotation: number }) {
  const cx = 120;
  const cy = 120;
  const r = 105;
  const n = WHEEL_SEGMENTS.length;
  const anglePerSegment = (2 * Math.PI) / n;

  const segments = WHEEL_SEGMENTS.map((seg, i) => {
    const startAngle = i * anglePerSegment - Math.PI / 2;
    const endAngle = startAngle + anglePerSegment;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const labelAngle = startAngle + anglePerSegment / 2;
    const labelR = r * 0.65;
    const lx = cx + labelR * Math.cos(labelAngle);
    const ly = cy + labelR * Math.sin(labelAngle);
    const largeArcFlag = anglePerSegment > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    return { ...seg, d, lx, ly, labelAngle };
  });

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="transition-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: spinning ? "4s" : "0s",
          transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.12, 0.99)",
          willChange: "transform",
        }}
      >
        <svg width="240" height="240" viewBox="0 0 240 240">
          <defs>
            <filter id="wheel-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
          {segments.map((seg, i) => (
            <g key={i}>
              <path d={seg.d} fill={seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
              <text
                x={seg.lx}
                y={seg.ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                fill={seg.textColor}
                transform={`rotate(${(seg.labelAngle * 180) / Math.PI + 90}, ${seg.lx}, ${seg.ly})`}
              >
                {seg.label}
              </text>
            </g>
          ))}
          <circle cx={cx} cy={cy} r="14" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="8" fill="#00B4D8" />
        </svg>
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
        <div className="w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "20px solid #FFB800" }} />
      </div>
      {!canSpin && (
        <div className="absolute inset-0 rounded-full bg-muted/50 flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground/70" />
        </div>
      )}
    </div>
  );
}

function CountdownTimer({ nextSpinAt }: { nextSpinAt: string | null }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!nextSpinAt) return;
    const update = () => {
      const diff = new Date(nextSpinAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ready!"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [nextSpinAt]);

  return <span className="font-mono tabular-nums text-orange-400">{timeLeft}</span>;
}

function ReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    daily_spin: "Daily Spin",
    daily_checkin: "Daily Check-in",
    signal_used: "Signal Used",
    analysis_run: "Analysis Run",
    screener_search: "Screener Search",
    gig_completed: "Gig Completed",
    gig_posted: "Gig Posted",
    post_created: "Post Created",
    comment_added: "Comment",
    profile_updated: "Profile Updated",
  };
  return labels[reason] || reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default function Gamification() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<{ reward: string; rewardType: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinLabel, setBigWinLabel] = useState("BIG WIN");
  const spinRotationRef = useRef(0);
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["gamification-status"],
    queryFn: async () => {
      const res = await authFetch("/gamification/status", getToken);
      if (!res.ok) throw new Error("Failed to load gamification status");
      return res.json() as Promise<GamificationStatus>;
    },
    enabled: !!isSignedIn && isLoaded,
    staleTime: 30_000,
  });

  const status = statusQuery.data ?? null;
  const loading = statusQuery.isLoading;
  const fetchStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["gamification-status"] });
  }, [queryClient]);

  const handleSpin = async () => {
    if (!status?.canSpin || spinning) return;
    setSpinning(true);
    setShowResult(false);
    setSpinResult(null);

    const extraSpins = Math.floor(Math.random() * 3) + 5;
    const finalAngle = Math.random() * 360;
    const totalRotation = spinRotationRef.current + extraSpins * 360 + finalAngle;
    spinRotationRef.current = totalRotation;
    setSpinRotation(totalRotation);

    try {
      const res = await authFetch("/gamification/spin", getToken, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Cannot Spin", description: err.error || "Already spun today", variant: "destructive" });
        setSpinning(false);
        setSpinRotation(spinRotationRef.current - extraSpins * 360 - finalAngle);
        return;
      }
      const data = await res.json();

      setTimeout(() => {
        setSpinResult({ reward: data.reward, rewardType: data.rewardType });
        setShowResult(true);
        setSpinning(false);
        fetchStatus();
        const tier = getCelebrationTier(data.rewardType, data.rewardValue ?? 0);
        fireConfetti(tier);
        if (tier === "jackpot") {
          setBigWinLabel("BIG WIN");
          setShowBigWin(true);
        }
        trackEvent("gamification_spin_wheel", { rewardType: data.rewardType, reward: data.reward });
        toast({ title: "You spun the wheel!", description: `You won: ${data.reward}` });
      }, 4200);
    } catch {
      toast({ title: "Error", description: "Failed to spin. Try again.", variant: "destructive" });
      setSpinning(false);
    }
  };

  const handleClaimDaily = async () => {
    if (!status || status.alreadyClaimedDaily || claimingDaily) return;
    setClaimingDaily(true);
    try {
      const res = await authFetch("/gamification/claim-daily", getToken, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const totalXp = (data.xpEarned ?? 0) + (data.streakBonus ?? 0);
        const tier = getXpCelebrationTier(totalXp);
        fireConfetti(tier);
        if (tier === "jackpot") {
          setBigWinLabel("JACKPOT!");
          setShowBigWin(true);
        }
        trackEvent("gamification_daily_claim", { xpEarned: data.xpEarned, streakBonus: data.streakBonus });
        toast({ title: "Daily Reward Claimed!", description: `+${data.xpEarned} XP earned${data.streakBonus > 0 ? ` (+${data.streakBonus} streak bonus)` : ""}` });
        fetchStatus();
      } else {
        toast({ title: "Already Claimed", description: "Come back tomorrow!", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to claim daily reward", variant: "destructive" });
    } finally {
      setClaimingDaily(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-12 h-12 text-[#FFB800] mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Sign in to access your rewards dashboard</p>
            <Link href="/sign-in" className="px-4 py-2 bg-[#00B4D8] text-black font-bold rounded-sm text-sm">Sign In</Link>
          </div>
        </div>
      </Layout>
    );
  }

  const derivedTier = status ? calculateTier(status.xp.level, status.xp.totalXp) : "Bronze";
  const tierColor = TIER_COLORS[derivedTier] || "#cd7f32";

  return (
    <Layout>
      <BigWinOverlay show={showBigWin} label={bigWinLabel} onDone={() => setShowBigWin(false)} />
      <div className="min-h-screen bg-background">
        <div className="bg-background border-b border-border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="avatar" className="w-9 h-9 rounded-sm object-cover border border-border shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-sm bg-muted border border-border flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground/50" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-foreground/90 truncate">
                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.username || "Trader"}
                </span>
                {status && (
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm shrink-0"
                    style={{ color: tierColor, background: `${tierColor}20`, border: `1px solid ${tierColor}30` }}
                  >
                    {derivedTier}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-mono text-muted-foreground/50">Level {status?.xp.level ?? "..."}</span>
                {status && (
                  <div className="w-24 relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${status.levelProgress}%`, background: tierColor }}
                    />
                  </div>
                )}
                <span className="text-[9px] font-mono text-muted-foreground/70">{status ? `${status.xp.totalXp.toLocaleString()} XP` : "..."}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors">
              <Trophy className="w-3 h-3" /> Leaderboard <ChevronRight className="w-3 h-3" />
            </Link>
            <Link href="/achievements" className="text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 transition-colors">
              <Star className="w-3 h-3" /> Achievements <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 text-muted-foreground/70 animate-spin" />
          </div>
        ) : (
          <div className="p-4 max-w-6xl mx-auto space-y-4">

            {status && (
              <div className="bg-card border border-border rounded-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-14 h-14 rounded-sm flex items-center justify-center text-2xl font-black font-mono border-2"
                    style={{ borderColor: tierColor, color: tierColor, background: `${tierColor}15` }}
                  >
                    {status.xp.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-foreground/80">
                        Level {status.xp.level}
                      </span>
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm"
                        style={{ color: tierColor, background: `${tierColor}20`, border: `1px solid ${tierColor}30` }}
                      >
                        {derivedTier}
                      </span>
                      {status.isFounder && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> FOUNDER
                        </span>
                      )}
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-1">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{ width: `${status.levelProgress}%`, background: `linear-gradient(90deg, ${tierColor}80, ${tierColor})` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-muted-foreground/50">{status.xp.totalXp.toLocaleString()} XP total</span>
                      <span className="text-[9px] font-mono text-muted-foreground/50">{status.xpToNextLevel.toLocaleString()} XP to next level</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">Weekly</p>
                    <p className="text-[15px] font-black font-mono text-[#00B4D8]">+{status.xp.weeklyXp.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">Monthly</p>
                    <p className="text-[15px] font-black font-mono text-[#00B4D8]">+{status.xp.monthlyXp.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              <div className="lg:col-span-1 bg-card border border-border rounded-sm overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border border-l-2 border-l-[#FFB800]">
                  <Gift className="w-3.5 h-3.5 text-[#FFB800]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFB800]">Daily Spin</span>
                  {status?.canSpin && (
                    <span className="ml-auto text-[8px] font-mono text-[#00B4D8] bg-[#00B4D8]/10 border border-[#00B4D8]/20 px-1.5 py-0.5 rounded-sm">READY</span>
                  )}
                </div>
                <div className="p-4 flex flex-col items-center gap-4">
                  <SpinWheel
                    canSpin={status?.canSpin ?? false}
                    spinning={spinning}
                    rotation={spinRotation}
                  />

                  {showResult && spinResult && (
                    <div className="w-full text-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="bg-gradient-to-r from-[#FFB800]/10 to-[#00B4D8]/10 border border-[#FFB800]/20 rounded-sm px-4 py-3">
                        <p className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-widest mb-1">You Won!</p>
                        <p className="text-xl font-black font-mono text-[#FFB800]">{spinResult.reward}</p>
                      </div>
                    </div>
                  )}

                  {status?.canSpin ? (
                    <button
                      onClick={handleSpin}
                      disabled={spinning}
                      className="w-full py-2.5 bg-[#FFB800] text-black font-bold text-[11px] font-mono uppercase tracking-widest rounded-sm hover:bg-[#FFB800]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {spinning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Spinning...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Spin Now
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full text-center">
                      <p className="text-[9px] font-mono text-muted-foreground/50 mb-1">Next spin available in</p>
                      <div className="text-lg font-black font-mono">
                        {status?.nextSpinAt ? <CountdownTimer nextSpinAt={status.nextSpinAt} /> : "—"}
                      </div>
                      {status?.lastSpin && (
                        <p className="text-[9px] font-mono text-muted-foreground/70 mt-1">Last: {status.lastSpin.reward}</p>
                      )}
                    </div>
                  )}

                  <div className="w-full border-t border-border pt-3">
                    <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">Possible Rewards</p>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label: "+50 XP", chance: "50%", color: "#00B4D8" },
                        { label: "+100 XP", chance: "30%", color: "#FFB800" },
                        { label: "+250 XP", chance: "15%", color: "#00B4D8" },
                        { label: "2x XP Boost", chance: "4%", color: "#9c27b0" },
                        { label: "Streak Boost", chance: "1%", color: "#ff6b35" },
                      ].map(r => (
                        <div key={r.label} className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded-sm">
                          <span className="text-[9px] font-mono font-bold" style={{ color: r.color }}>{r.label}</span>
                          <span className="text-[8px] font-mono text-muted-foreground/40">{r.chance}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border border-l-2 border-l-[#00B4D8]">
                    <Zap className="w-3.5 h-3.5 text-[#00B4D8]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#00B4D8]">XP Progress</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-black font-mono" style={{ color: tierColor }}>
                          {status?.xp.totalXp.toLocaleString() ?? "—"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/50">total XP</span>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                          style={{ width: `${status?.levelProgress ?? 0}%`, background: `linear-gradient(90deg, ${tierColor}60, ${tierColor})` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] font-mono text-muted-foreground/40">Level {status?.xp.level ?? 1}</span>
                        <span className="text-[8px] font-mono text-muted-foreground/40">Level {(status?.xp.level ?? 1) + 1}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Level", value: status?.xp.level ?? 1, color: tierColor },
                        { label: "Tier", value: derivedTier, color: tierColor },
                        { label: "To Next Lvl", value: `${status?.xpToNextLevel.toLocaleString() ?? 0} XP`, color: "#00B4D8" },
                        { label: "Multiplier", value: `${status?.streak.multiplier.toFixed(1) ?? "1.0"}x`, color: "#00B4D8" },
                      ].map(stat => (
                        <div key={stat.label} className="bg-muted/30 border border-border rounded-sm px-2.5 py-2">
                          <p className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">{stat.label}</p>
                          <p className="text-[14px] font-black font-mono mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border border-l-2 border-l-orange-400">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-orange-400">Streak</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Flame className="w-10 h-10 text-orange-400" />
                        <span className="absolute -top-1 -right-1 text-[9px] font-black font-mono text-[#FFB800] bg-card rounded-full w-5 h-5 flex items-center justify-center border border-[#FFB800]/30">
                          {(status?.streak.currentStreak ?? 0) > 9 ? "9+" : status?.streak.currentStreak ?? 0}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black font-mono text-orange-400">{status?.streak.currentStreak ?? 0}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/50">day streak</span>
                        </div>
                        <p className="text-[9px] font-mono text-muted-foreground/50">Best: {status?.streak.longestStreak ?? 0} days</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { days: 3, bonus: "+50 XP/day", active: (status?.streak.currentStreak ?? 0) >= 3 },
                        { days: 7, bonus: "+200 XP/day", active: (status?.streak.currentStreak ?? 0) >= 7 },
                      ].map(milestone => (
                        <div
                          key={milestone.days}
                          className={`flex items-center justify-between px-3 py-2 rounded-sm border transition-colors ${
                            milestone.active ? "bg-orange-500/[0.08] border-orange-500/25" : "bg-muted/30 border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {milestone.active ? (
                              <CheckCircle className="w-3.5 h-3.5 text-[#00B4D8]" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">{milestone.days}-day streak</span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold ${milestone.active ? "text-[#ff6b35]" : "text-muted-foreground/30"}`}>
                            {milestone.bonus}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleClaimDaily}
                      disabled={status?.alreadyClaimedDaily || claimingDaily}
                      className={`w-full py-2 rounded-sm text-[10px] font-bold font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border ${
                        status?.alreadyClaimedDaily
                          ? "bg-muted/30 border-border text-muted-foreground/30 cursor-not-allowed"
                          : "bg-orange-500/20 border-orange-500/30 text-[#ff6b35] cursor-pointer"
                      }`}
                    >
                      {status?.alreadyClaimedDaily ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Claimed Today
                        </>
                      ) : claimingDaily ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" /> Claiming...
                        </>
                      ) : (
                        <>
                          <Flame className="w-3 h-3" /> Claim Daily Reward (+25 XP)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-sm overflow-hidden sm:col-span-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border border-l-2 border-l-[#00B4D8]">
                    <TrendingUp className="w-3.5 h-3.5 text-[#00B4D8]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#00B4D8]">Recent Rewards</span>
                    <Link href="/achievements" className="ml-auto text-[9px] font-mono text-muted-foreground/70 hover:text-muted-foreground/70 flex items-center gap-0.5 transition-colors">
                      View all <ChevronRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                  <div className="divide-y divide-border">
                    {status?.recentRewards && status.recentRewards.length > 0 ? (
                      status.recentRewards.slice(0, 6).map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2">
                            {r.type === "spin_reward" ? (
                              r.rewardType === "multiplier" ? (
                                <Sparkles className="w-3 h-3 text-[#9c27b0]" />
                              ) : (
                                <Flame className="w-3 h-3 text-orange-400" />
                              )
                            ) : (
                              <Zap className="w-3 h-3 text-[#FFB800]" />
                            )}
                            <div>
                              <span className="text-[10px] font-mono text-foreground/70">
                                {r.label || ReasonLabel(r.reason)}
                              </span>
                              <span className="text-[8px] font-mono text-muted-foreground/40 ml-2">{r.category}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {r.type === "xp_gain" ? (
                              <span className="text-[11px] font-mono font-bold text-[#00B4D8]">+{r.amount} XP</span>
                            ) : r.rewardType === "multiplier" ? (
                              <span className="text-[11px] font-mono font-bold text-[#9c27b0]">2x Boost</span>
                            ) : (
                              <span className="text-[11px] font-mono font-bold text-orange-400">Streak+</span>
                            )}
                            <p className="text-[8px] font-mono text-muted-foreground/70">
                              {new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-center">
                        <p className="text-[10px] font-mono text-muted-foreground/70">No rewards yet | start earning XP!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {status?.isFounder && (
              <div className="bg-gradient-to-r from-[#FFB800]/5 via-[#FFB800]/10 to-[#FFB800]/5 border border-[#FFB800]/20 rounded-sm overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#FFB800]/[0.04] border-b border-[#FFB800]/10">
                  <Crown className="w-3.5 h-3.5 text-[#FFB800]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFB800]">Founders Badge</span>
                  <span className="ml-auto text-[8px] font-mono text-[#FFB800]/60 bg-[#FFB800]/10 px-1.5 py-0.5 rounded-sm border border-[#FFB800]/15">EXCLUSIVE</span>
                </div>
                <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-16 h-16 rounded-sm bg-[#FFB800]/10 border border-[#FFB800]/20 flex items-center justify-center shrink-0">
                    <Crown className="w-8 h-8 text-[#FFB800]" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-[13px] font-bold font-mono text-[#FFB800] mb-1">Early Adopter | Founders Badge</h3>
                    <p className="text-[10px] font-mono text-muted-foreground/70">
                      You joined EntangleWealth as one of our earliest members. This badge grants you a permanent XP multiplier
                      and exclusive recognition across the platform.
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">XP Multiplier</p>
                    <p className="text-3xl font-black font-mono text-[#FFB800]">{status.founderMultiplier.toFixed(1)}x</p>
                    <p className="text-[9px] font-mono text-[#FFB800]/40">All XP earnings boosted</p>
                  </div>
                </div>
              </div>
            )}

            {!status?.isFounder && (
              <div className="bg-card border border-border rounded-sm overflow-hidden opacity-60">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-muted-foreground/50">Founders Badge</span>
                  <span className="ml-auto text-[8px] font-mono text-muted-foreground/70">Early adopter exclusive</span>
                </div>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-sm bg-muted/50 border border-border flex items-center justify-center shrink-0">
                    <Crown className="w-6 h-6 text-muted-foreground/70" />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-bold text-muted-foreground/50">Founders Badge | Locked</p>
                    <p className="text-[9px] font-mono text-muted-foreground/70">Reserved for early EntangleWealth members. Stay active to unlock exclusive perks.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </Layout>
  );
}
