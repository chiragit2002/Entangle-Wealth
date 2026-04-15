import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Copy, Check, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";
import { Link } from "wouter";

const TIERS = [
  {
    key: "extra_signals",
    threshold: 3,
    name: "Entangled",
    benefit: "Never miss a trade again",
    detail: "5 bonus signals every day for 30 days",
    color: "#00d4ff",
    glow: "rgba(0,180,216,0.35)",
  },
  {
    key: "taxgpt_unlimited",
    threshold: 10,
    name: "Quantum",
    benefit: "Your taxes, handled by AI",
    detail: "Unlimited TaxGPT access for 30 days",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.35)",
  },
  {
    key: "ambassador",
    threshold: 25,
    name: "Singularity",
    benefit: "Shape the future of finance",
    detail: "Permanent Ambassador status + share of the $36K pool",
    color: "#FFB800",
    glow: "rgba(245,200,66,0.35)",
  },
];

function getActiveTier(referralCount: number): (typeof TIERS)[number] | null {
  return TIERS.find((t) => referralCount < t.threshold) ?? null;
}

function getProgressPct(referralCount: number, activeTier: (typeof TIERS)[number] | null): number {
  if (!activeTier) return 100;
  const tierIdx = TIERS.indexOf(activeTier);
  const prev = tierIdx > 0 ? TIERS[tierIdx - 1].threshold : 0;
  const next = activeTier.threshold;
  return Math.min(((referralCount - prev) / (next - prev)) * 100, 100);
}

function OrbitalRing({
  pct,
  color,
  glow,
  count,
  allDone,
  celebrating,
}: {
  pct: number;
  color: string;
  glow: string;
  count: number;
  allDone: boolean;
  celebrating: boolean;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 140, height: 140 }}
      aria-label={`Progress: ${Math.round(pct)}%`}
    >
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        style={{ position: "absolute", inset: 0 }}
      >
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ / 4}
          style={{
            transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease",
            filter: `drop-shadow(0 0 8px ${glow})`,
          }}
        />
        {allDone && (
          <circle
            cx="70"
            cy="70"
            r={r + 6}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.25"
            className="animate-ping"
            style={{ animationDuration: "2s" }}
          />
        )}
      </svg>
      <div className="flex flex-col items-center justify-center z-10" style={{ gap: 2 }}>
        <motion.span
          key={count}
          animate={celebrating ? { scale: [1, 1.25, 0.95, 1.1, 1] } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="font-mono font-bold leading-none"
          style={{ fontSize: 34, color, textShadow: `0 0 16px ${glow}` }}
        >
          {count}
        </motion.span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {count === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
}

function TierIcon({
  color,
  done,
  active,
}: {
  color: string;
  done: boolean;
  active: boolean;
}) {
  const opacity = done ? 1 : active ? 0.7 : 0.25;
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      style={{ opacity, flexShrink: 0 }}
    >
      <circle cx="14" cy="14" r="13" stroke={color} strokeWidth="1.5" />
      <circle
        cx="14"
        cy="14"
        r="6"
        fill={done || active ? color : "transparent"}
        style={{
          filter: done ? `drop-shadow(0 0 6px ${color})` : "none",
          transition: "fill 0.4s ease",
        }}
      />
      {done && (
        <path
          d="M10 14l2.5 2.5L18 11"
          stroke="#000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function UnlockFlash({ color, glow }: { color: string; glow: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.7, 1.08, 1.04, 0.9] }}
      transition={{ duration: 0.75, ease: "easeOut" }}
      style={{
        position: "absolute",
        inset: -4,
        borderRadius: 16,
        border: `1px solid ${color}80`,
        boxShadow: `0 0 24px ${glow}, inset 0 0 16px ${glow}`,
        pointerEvents: "none",
        zIndex: 20,
      }}
    />
  );
}

export function ReferralSection() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [celebratingTierKey, setCelebratingTierKey] = useState<string | null>(null);
  const seenKeysRef = useRef<Set<string>>(new Set());

  const triggerCelebration = useCallback((key: string) => {
    setCelebratingTierKey(key);
    setTimeout(() => setCelebratingTierKey(null), 1200);
  }, []);

  const markNewMilestonesSeen = useCallback(
    async (keys: string[]) => {
      try {
        await authFetch("/viral/referral/milestones/seen", getToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        });
      } catch (err) {
        console.error("[ReferralSection] Failed to mark milestones seen:", err);
      }
    },
    [getToken]
  );

  const fetchData = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const [codeRes, milestoneRes] = await Promise.all([
        authFetch("/viral/referral/code", getToken),
        authFetch("/viral/referral/milestones", getToken),
      ]);
      if (codeRes.ok) {
        const data = await codeRes.json();
        setCode(data.code);
      }
      if (milestoneRes.ok) {
        const data = await milestoneRes.json();
        const count: number = data.referralCount ?? 0;
        setReferralCount(count);

        const newMilestones: { key: string }[] = data.newMilestones ?? [];
        const unseenKeys = newMilestones
          .map((m) => m.key)
          .filter((k) => !seenKeysRef.current.has(k));

        if (unseenKeys.length > 0) {
          const celebratableKey = unseenKeys.find((k) =>
            TIERS.some((t) => t.key === k)
          );
          if (celebratableKey) {
            triggerCelebration(celebratableKey);
          }
          unseenKeys.forEach((k) => seenKeysRef.current.add(k));
          markNewMilestonesSeen(unseenKeys);
        }
      }
    } catch (err) {
      console.error("[ReferralSection] Failed to fetch referral data:", err);
    }
  }, [getToken, isSignedIn, triggerCelebration, markNewMilestonesSeen]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const referralLink = code ? `${window.location.origin}?ref=${code}` : "";

  const copyLink = useCallback(async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    trackEvent("referral_click", { action: "copy" });
    toast({ title: "Copied", description: "Share it with someone who deserves an edge." });
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink, toast]);

  const shareLink = useCallback(async () => {
    if (!referralLink) return;
    trackEvent("referral_click", { action: "share" });
    const shareMessage =
      "I've been using EntangleWealth for trading signals and AI tax tools. Genuinely different — join me.";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on EntangleWealth",
          text: shareMessage,
          url: referralLink,
        });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(`${shareMessage}\n${referralLink}`);
    toast({ title: "Link copied", description: "Share it with someone who deserves an edge." });
  }, [referralLink, toast]);

  if (!isSignedIn) return null;

  const activeTier = getActiveTier(referralCount);
  const progressPct = getProgressPct(referralCount, activeTier);
  const allDone = !activeTier;
  const ringColor = activeTier?.color ?? TIERS[TIERS.length - 1].color;
  const ringGlow = activeTier?.glow ?? TIERS[TIERS.length - 1].glow;
  const celebratingCount = celebratingTierKey !== null;

  return (
    <div className="referral-section glass-panel rounded-sm p-6 overflow-hidden relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 80% 20%, rgba(0,180,216,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">
            Referral Program
          </p>
          <h3 className="text-xl font-bold text-white leading-tight">
            Share the edge.
          </h3>
          <p className="text-sm text-white/45 mt-1.5 leading-relaxed">
            Every referral unlocks real upgrades — not points or badges.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          <div className="flex-shrink-0">
            <OrbitalRing
              pct={progressPct}
              color={ringColor}
              glow={ringGlow}
              count={referralCount}
              allDone={allDone}
              celebrating={celebratingCount}
            />
          </div>

          <div className="flex-1 w-full space-y-3">
            {TIERS.map((tier) => {
              const done = referralCount >= tier.threshold;
              const isNext = activeTier?.threshold === tier.threshold;
              const isCelebrating = celebratingTierKey === tier.key;
              const remainingForTier = done
                ? 0
                : tier.threshold - referralCount;

              return (
                <div key={tier.key} className="relative">
                  <AnimatePresence>
                    {isCelebrating && (
                      <UnlockFlash color={tier.color} glow={tier.glow} />
                    )}
                  </AnimatePresence>
                  <motion.div
                    className="flex items-center gap-3 rounded-xl p-3"
                    animate={
                      isCelebrating
                        ? {
                            boxShadow: [
                              `0 0 0px ${tier.glow}`,
                              `0 0 20px ${tier.glow}`,
                              `0 0 8px ${tier.glow}`,
                            ],
                          }
                        : {}
                    }
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={
                      done
                        ? {
                            background: `linear-gradient(135deg, ${tier.color}12, ${tier.color}06)`,
                            border: `1px solid ${tier.color}30`,
                          }
                        : isNext
                        ? {
                            background: "rgba(255,255,255,0.03)",
                            border: `1px solid ${tier.color}20`,
                          }
                        : {
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }
                    }
                  >
                    <TierIcon color={tier.color} done={done} active={isNext} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-bold tracking-wide"
                          style={{
                            color:
                              done || isNext
                                ? tier.color
                                : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {tier.name}
                        </span>
                        <span className="text-[10px] text-white/25 font-mono">
                          {tier.threshold} people
                        </span>
                      </div>
                      <p
                        className="text-xs leading-snug mt-0.5"
                        style={{
                          color: done
                            ? "rgba(255,255,255,0.7)"
                            : isNext
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {done ? tier.detail : tier.benefit}
                      </p>
                    </div>
                    {done && (
                      <div
                        className="shrink-0 referral-unlock-badge"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: `${tier.color}22`,
                          border: `1px solid ${tier.color}50`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path
                            d="M2 6l2.5 2.5L10 3"
                            stroke={tier.color}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      </div>
                    )}
                    {isNext && remainingForTier > 0 && (
                      <span
                        className="shrink-0 text-[10px] font-mono font-bold"
                        style={{ color: tier.color }}
                      >
                        {remainingForTier} left
                      </span>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {activeTier?.key === "ambassador" && (
          <div
            className="rounded-xl p-3 mb-5 flex items-center gap-3"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,200,66,0.07), rgba(245,200,66,0.02))",
              border: "1px solid rgba(245,200,66,0.18)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="#FFB800" strokeWidth="1.2" />
              <path d="M8 4v4l2.5 1.5" stroke="#FFB800" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-[#FFB800]/80 leading-tight">
              Reach Singularity and earn your share of the{" "}
              <Link href="/giveaway">
                <span className="text-[#FFB800] font-bold cursor-pointer hover:underline">
                  $36,000 referral bonus pool
                </span>
              </Link>{" "}
              + 5 entries per referral into the $50K giveaway.
            </p>
          </div>
        )}

        <button
          onClick={shareLink}
          disabled={!code}
          className="referral-share-btn w-full relative overflow-hidden rounded-xl py-4 font-bold text-sm text-black transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mb-3"
          style={{
            background: code
              ? "linear-gradient(135deg, #00d4ff 0%, #0099cc 50%, #00B4D8 100%)"
              : "rgba(255,255,255,0.1)",
            backgroundSize: "200% 100%",
          }}
        >
          <span className="referral-share-shimmer" aria-hidden="true" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Invite someone who deserves an edge
          </span>
        </button>

        {code && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-white/40 truncate select-all">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 hover:text-white/80 hover:border-white/20 transition-colors"
              title="Copy link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#00B4D8]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
