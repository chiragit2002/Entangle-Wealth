import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Copy, Check, Users, Award, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";

const BADGE_TIERS = [
  { tier: "Bronze", icon: "🥉", threshold: 3, color: "#cd7f32" },
  { tier: "Silver", icon: "🥈", threshold: 10, color: "#c0c0c0" },
  { tier: "Gold", icon: "🥇", threshold: 25, color: "#ffd700" },
  { tier: "Platinum", icon: "💎", threshold: 50, color: "#00d4ff" },
];

export function ReferralSection() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [stats, setStats] = useState({ totalConverted: 0 });
  const [badges, setBadges] = useState<{ tier: string; icon: string; threshold: number }[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const [codeRes, badgeRes] = await Promise.all([
        authFetch("/viral/referral/code", getToken),
        authFetch("/viral/referral/badges", getToken),
      ]);
      if (codeRes.ok) {
        const data = await codeRes.json();
        setCode(data.code);
        setStats({ totalConverted: data.totalConverted });
      }
      if (badgeRes.ok) {
        const data = await badgeRes.json();
        setBadges(data.badges);
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

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold">Refer & Earn</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Share your link and earn referral badges. At 5 referrals, get 1 month of Pro free.
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

      <div className="mb-4">
        <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
          <p className="text-xl font-bold font-mono text-[#00ff88]">{stats.totalConverted}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Successful Referrals</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Award className="w-3.5 h-3.5" /> Referral Badges
        </p>
        <div className="flex gap-2">
          {BADGE_TIERS.map((b) => {
            const earned = badges.some((eb) => eb.tier === b.tier);
            return (
              <div
                key={b.tier}
                className={`flex-1 rounded-lg p-2 text-center border transition-all ${
                  earned
                    ? "bg-white/[0.06] border-white/15"
                    : "bg-white/[0.02] border-white/5 opacity-40"
                }`}
              >
                <span className="text-lg">{b.icon}</span>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: earned ? b.color : undefined }}>
                  {b.tier}
                </p>
                <p className="text-[8px] text-muted-foreground">{b.threshold}+</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
