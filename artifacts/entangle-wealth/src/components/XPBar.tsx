import { motion } from "framer-motion";
import { TIER_THRESHOLDS } from "@workspace/xp";

const TIER_NAMES = TIER_THRESHOLDS.map(t => t.tier);

const TIER_GRADIENTS: Record<string, { start: string; end: string; glow: string }> = {
  Bronze: { start: "#cd7f32", end: "#a0522d", glow: "rgba(205,127,50,0.5)" },
  Silver: { start: "#c0c0c0", end: "#a8a8a8", glow: "rgba(192,192,192,0.4)" },
  Gold: { start: "#FFB800", end: "#FFA500", glow: "rgba(255,215,0,0.55)" },
  Platinum: { start: "#e5e4e2", end: "#b8b6b0", glow: "rgba(229,228,226,0.4)" },
  Diamond: { start: "#00FF41", end: "#00CC33", glow: "rgba(0,255,65,0.6)" },
};

interface XPBarProps {
  level: number;
  levelProgress: number;
  xpToNextLevel: number;
  tier: string;
  variant?: "compact" | "full";
}

export function XPBar({ level, levelProgress, xpToNextLevel, tier, variant = "compact" }: XPBarProps) {
  const validTier = TIER_NAMES.includes(tier as typeof TIER_NAMES[number]) ? tier : "Bronze";
  const colors = TIER_GRADIENTS[validTier] ?? TIER_GRADIENTS.Bronze;
  const clampedProgress = Math.min(Math.max(levelProgress, 0), 100);
  const isCompact = variant === "compact";

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Level ${level} XP progress: ${clampedProgress.toFixed(0)}% to level ${level + 1}`}
    >
      {isCompact ? (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px] font-mono text-white/25">
              Level {level} → {level + 1}
            </span>
            <span className="text-[8px] font-mono" style={{ color: colors.start }}>
              {xpToNextLevel.toLocaleString()} XP to go
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              initial={{ width: "0%" }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                background: `linear-gradient(90deg, ${colors.start}, ${colors.end})`,
                boxShadow: `0 0 6px ${colors.glow}, 0 0 12px ${colors.glow}`,
              }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["−200% 0", "200% 0"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              />
            </motion.div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-white/50">
              Level {level} → {level + 1}
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: colors.start }}>
              {xpToNextLevel.toLocaleString()} XP remaining
            </span>
          </div>
          <div className="w-full h-3 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              initial={{ width: "0%" }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                background: `linear-gradient(90deg, ${colors.start}, ${colors.end})`,
                boxShadow: `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}`,
              }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["−200% 0", "200% 0"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              />
            </motion.div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] font-mono text-white/30">
              {clampedProgress.toFixed(0)}% complete
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
