import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { X, Share2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fireCelebration } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";

interface Milestone {
  threshold: number;
  key: string;
  title: string;
  description: string;
  icon: string;
  reached: boolean;
  unlocked: boolean;
  seen: boolean;
}

export function MilestoneCelebrationModal() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState<Milestone[]>([]);
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);

  const fetchAuth = useCallback((path: string, opts: RequestInit = {}) => {
    return authFetch(path, getToken, opts);
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) return;
    const load = async () => {
      try {
        const [milestoneRes, codeRes] = await Promise.all([
          fetchAuth("/viral/referral/milestones"),
          fetchAuth("/viral/referral/code"),
        ]);
        if (milestoneRes.ok) {
          const data = await milestoneRes.json();
          if (data.newMilestones?.length > 0) {
            setQueue(data.newMilestones);
            const topMilestone: Milestone = data.newMilestones.reduce(
              (best: Milestone, m: Milestone) => (m.threshold > best.threshold ? m : best),
              data.newMilestones[0]
            );
            fireCelebration(topMilestone.threshold >= 10 ? 1000 : topMilestone.threshold >= 5 ? 500 : 100, "xp");
            if (topMilestone.threshold >= 5) {
              setShowBigWin(true);
            }
          }
        }
        if (codeRes.ok) {
          const data = await codeRes.json();
          if (data.code) {
            setReferralLink(`${window.location.origin}?ref=${data.code}`);
          }
        }
      } catch {
      }
    };
    load();
  }, [isSignedIn, fetchAuth]);

  const dismiss = useCallback(async () => {
    const current = queue[0];
    if (!current) return;
    try {
      await fetchAuth("/viral/referral/milestones/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [current.key] }),
      });
    } catch {
    }
    setQueue((prev) => prev.slice(1));
    setCopied(false);
  }, [queue, fetchAuth]);

  const handleShare = useCallback(async () => {
    const current = queue[0];
    if (!current || !referralLink) return;
    const text = `I just unlocked "${current.title}" on EntangleWealth by referring friends! Join me: ${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `I unlocked ${current.title}!`, text, url: referralLink });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ title: "Copied!", description: "Achievement share text copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [queue, referralLink, toast]);

  const handleCopyLink = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Link copied!", description: "Your referral link is in the clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [referralLink, toast]);

  const current = queue[0];
  if (!current) return null;

  return (
    <>
    <BigWinOverlay show={showBigWin} label="MILESTONE!" onDone={() => setShowBigWin(false)} />
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative bg-[#0d0d1a] border border-[rgba(0,180,216,0.3)] rounded-sm p-6 w-full max-w-sm text-center shadow-[0_0_60px_rgba(0,180,216,0.15)] animate-in zoom-in-95 duration-300">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-[#555] hover:text-white p-2"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-6xl mb-4 animate-bounce">{current.icon}</div>

        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[rgba(0,180,216,0.1)] text-primary border border-primary/30 mb-3">
          Milestone Unlocked!
        </div>

        <h2 className="text-xl font-black mb-2 bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent">
          {current.title}
        </h2>

        <p className="text-sm text-[#aaa] mb-6 leading-relaxed">{current.description}</p>

        {queue.length > 1 && (
          <p className="text-xs text-[#555] mb-4">+{queue.length - 1} more milestone{queue.length > 2 ? "s" : ""} to celebrate!</p>
        )}

        <div className="flex gap-2 mb-3">
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold min-h-[44px] gap-2"
            onClick={handleShare}
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            Share Your Achievement
          </Button>
          <Button
            variant="outline"
            className="border-white/10 min-h-[44px] px-3"
            onClick={handleCopyLink}
            title="Copy referral link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <Button
          variant="ghost"
          className="w-full text-[#555] hover:text-white text-sm min-h-[40px]"
          onClick={dismiss}
        >
          {queue.length > 1 ? "Next →" : "Awesome, got it!"}
        </Button>
      </div>
    </div>
    </>
  );
}
