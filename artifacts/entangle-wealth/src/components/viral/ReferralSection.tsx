import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Copy, Check, Users, Award, Share2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

const BADGE_TIERS = [
  { tier: "Bronze", icon: "🥉", threshold: 3, color: "#cd7f32" },
  { tier: "Silver", icon: "🥈", threshold: 10, color: "#c0c0c0" },
  { tier: "Gold", icon: "🥇", threshold: 25, color: "#ffd700" },
  { tier: "Platinum", icon: "💎", threshold: 50, color: "#00d4ff" },
];

const MILESTONES = [
  { key: "extra_signals", threshold: 3, label: "5 Extra Daily Signals", icon: "⚡" },
  { key: "pro_trial", threshold: 5, label: "1 Month Pro Trial", icon: "🚀" },
  { key: "taxgpt_unlimited", threshold: 10, label: "Unlimited TaxGPT", icon: "🧾" },
  { key: "ambassador", threshold: 25, label: "Ambassador Badge", icon: "🏆" },
];

export function ReferralSection() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [stats, setStats] = useState({ totalReferred: 0, totalConverted: 0 });
  const [badges, setBadges] = useState<{ tier: string; icon: string; threshold: number; earned: boolean }[]>([]);
  const [copied, setCopied] = useState(false);
  const [nextMilestone, setNextMilestone] = useState<{ threshold: number; label: string; icon: string; remaining: number } | null>(null);
  const [referralCount, setReferralCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const [codeRes, badgeRes, milestoneRes] = await Promise.all([
        authFetch("/viral/referral/code", getToken),
        authFetch("/viral/referral/badges", getToken),
        authFetch("/viral/referral/milestones", getToken),
      ]);
      if (codeRes.ok) {
        const data = await codeRes.json();
        setCode(data.code);
        setStats({ totalReferred: data.totalReferred, totalConverted: data.totalConverted });
      }
      if (badgeRes.ok) {
        const data = await badgeRes.json();
        setBadges(data.badges);
        setReferralCount(data.referralCount || 0);
      }
      if (milestoneRes.ok) {
        const data = await milestoneRes.json();
        if (data.nextMilestone) {
          const ms = MILESTONES.find((m) => m.threshold === data.nextMilestone.threshold);
          setNextMilestone(ms ? { ...ms, remaining: data.nextMilestone.remaining } : null);
        } else {
          setNextMilestone(null);
        }
        if (data.referralCount !== undefined) setReferralCount(data.referralCount);
      }
    } catch {}
  }, [getToken, isSignedIn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const referralLink = code ? `${window.location.origin}?ref=${code}` : "";

  const copyLink = useCallback(async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    trackEvent("referral_click", { action: "copy" });
    toast({ title: "Copied", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink, toast]);

  const shareLink = useCallback(async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({
        title: "Join EntangleWealth",
        text: "Get institutional-grade financial analysis with AI-powered signals.",
        url: referralLink,
      });
    } else {
      copyLink();
    }
  }, [referralLink, copyLink]);

  if (!isSignedIn) return null;

  const progressMilestone = nextMilestone || MILESTONES[MILESTONES.length - 1];
  const prevThreshold = (() => {
    const idx = MILESTONES.findIndex((m) => m.threshold === progressMilestone.threshold);
    return idx > 0 ? MILESTONES[idx - 1].threshold : 0;
  })();
  const progressPct = nextMilestone
    ? Math.min(((referralCount - prevThreshold) / (progressMilestone.threshold - prevThreshold)) * 100, 100)
    : 100;

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold">Refer & Earn</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Share your link and unlock real features: extra signals, Pro trial, TaxGPT, and more.
      </p>

      {code && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-mono text-white/80 truncate">
            {referralLink}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30 text-primary gap-1 shrink-0"
            onClick={copyLink}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#00ff88]/30 text-[#00ff88] gap-1 shrink-0"
            onClick={shareLink}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
          <p className="text-xl font-bold font-mono text-primary">{stats.totalReferred}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Referred</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
          <p className="text-xl font-bold font-mono text-[#00ff88]">{stats.totalConverted}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Converted</p>
        </div>
      </div>

      <div className="mb-4 bg-white/[0.02] rounded-lg border border-white/5 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-white/70 flex items-center gap-1">
            {progressMilestone.icon} {nextMilestone ? "Next unlock" : "All milestones reached!"}
          </p>
          {nextMilestone && (
            <p className="text-xs text-muted-foreground flex items-center gap-0.5">
              <span className="font-mono font-bold text-primary">{nextMilestone.remaining}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{progressMilestone.label}</span>
            </p>
          )}
        </div>
        <div className="w-full bg-white/5 rounded-full h-2 mb-1.5">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-primary to-[#00ff88] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {nextMilestone && (
          <p className="text-[10px] text-muted-foreground">
            {referralCount} / {progressMilestone.threshold} referrals — {nextMilestone.remaining} more to unlock {progressMilestone.label}
          </p>
        )}

        <div className="mt-3 space-y-1.5">
          {MILESTONES.map((m) => {
            const done = referralCount >= m.threshold;
            return (
              <div key={m.key || m.threshold} className="flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${done ? "bg-[#00ff88] text-black" : "bg-white/10 text-white/30"}`}>
                  {done ? "✓" : m.threshold}
                </span>
                <span className={done ? "text-white/70" : "text-white/30"}>{m.icon} {m.label}</span>
                <span className="ml-auto text-[9px] text-muted-foreground/50">{m.threshold} refs</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Award className="w-3.5 h-3.5" /> Referral Badges
        </p>
        <div className="flex gap-2">
          {(badges.length > 0 ? badges : BADGE_TIERS.map((b) => ({ ...b, earned: false }))).map((b) => (
            <div
              key={b.tier}
              className={`flex-1 rounded-lg p-2 text-center border transition-all ${
                b.earned
                  ? "bg-white/[0.06] border-white/15"
                  : "bg-white/[0.02] border-white/5 opacity-40"
              }`}
            >
              <span className="text-lg">{BADGE_TIERS.find((t) => t.tier === b.tier)?.icon || ""}</span>
              <p className="text-[9px] font-bold mt-0.5" style={{ color: b.earned ? BADGE_TIERS.find((t) => t.tier === b.tier)?.color : undefined }}>
                {b.tier}
              </p>
              <p className="text-[8px] text-muted-foreground">{b.threshold}+</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
