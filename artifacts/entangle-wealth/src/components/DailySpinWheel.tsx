import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { X, Gift, Clock, Zap, Shield, Star } from "lucide-react";
import { fireCelebration, CelebrationTier } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";

interface BackendReward {
  reward: string;
  rewardType: string;
  rewardValue: number;
}

interface WheelSegment {
  label: string;
  color: string;
  icon: string;
  rewardType: string;
  rewardValue: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  xp: "#00B4D8",
  multiplier: "#FFB800",
  streak_protection: "#ff3366",
};

const SEGMENT_ICONS: Record<string, string> = {
  xp: "⚡",
  multiplier: "⚡⚡",
  streak_protection: "🛡️",
};

const DEFAULT_SEGMENTS: WheelSegment[] = [
  { label: "+50 XP", color: "#00B4D8", icon: "⚡", rewardType: "xp", rewardValue: 50 },
  { label: "+100 XP", color: "#9c27b0", icon: "✨", rewardType: "xp", rewardValue: 100 },
  { label: "+250 XP", color: "#FFB800", icon: "🔥", rewardType: "xp", rewardValue: 250 },
  { label: "2x XP", color: "#00B4D8", icon: "⚡⚡", rewardType: "multiplier", rewardValue: 2 },
  { label: "Streak Shield", color: "#ff3366", icon: "🛡️", rewardType: "streak_protection", rewardValue: 1 },
];

function rewardsToSegments(rewards: BackendReward[]): WheelSegment[] {
  const colors = ["#00B4D8", "#9c27b0", "#FFB800", "#6366f1", "#f59e0b", "#ff3366"];
  return rewards.map((r, i) => ({
    label: r.reward,
    color: SEGMENT_COLORS[r.rewardType] || colors[i % colors.length],
    icon: SEGMENT_ICONS[r.rewardType] || "✨",
    rewardType: r.rewardType,
    rewardValue: r.rewardValue,
  }));
}

interface DailySpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onReward?: (reward: string) => void;
  onBalanceChange?: () => void;
}

export function DailySpinWheel({ isOpen, onClose, onReward, onBalanceChange }: DailySpinWheelProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [result, setResult] = useState<{ reward: string; rewardType: string; rewardValue: number; baseXp?: number } | null>(null);
  const [countdown, setCountdown] = useState("");
  const [resultTier, setResultTier] = useState<CelebrationTier | null>(null);
  const [showBigWin, setShowBigWin] = useState(false);
  const [segments, setSegments] = useState<WheelSegment[]>(DEFAULT_SEGMENTS);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationDeg = useMotionValue(0);

  const drawWheel = useCallback((segs: WheelSegment[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 280;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;
    const segAngle = (2 * Math.PI) / segs.length;

    ctx.clearRect(0, 0, size, size);

    segs.forEach((seg, i) => {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, seg.color + "40");
      grad.addColorStop(0.7, seg.color + "60");
      grad.addColorStop(1, seg.color + "90");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const textAngle = startAngle + segAngle / 2;
      const textR = r * 0.65;
      const tx = cx + textR * Math.cos(textAngle);
      const ty = cy + textR * Math.sin(textAngle);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillText(seg.icon, 0, -6);
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillText(seg.label, 0, 8);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
    centerGrad.addColorStop(0, "#1a1a2e");
    centerGrad.addColorStop(1, "#0A0E1A");
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.strokeStyle = "#00B4D8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#00B4D8";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);

    ctx.beginPath();
    ctx.moveTo(cx - 10, 8);
    ctx.lineTo(cx + 10, 8);
    ctx.lineTo(cx, 22);
    ctx.closePath();
    ctx.fillStyle = "#FFB800";
    ctx.fill();
    ctx.strokeStyle = "#0A0E1A";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, []);

  useEffect(() => {
    drawWheel(segments);
  }, [segments, drawWheel]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await authFetch("/gamification/spin/status", getToken);
      if (res.ok) {
        const data = await res.json();
        setCanSpin(data.canSpin);
        setNextSpinAt(data.nextSpinAt);
        if (data.rewards && data.rewards.length > 0) {
          const newSegments = rewardsToSegments(data.rewards);
          setSegments(newSegments);
        }
      }
    } catch {
    }
  }, [getToken]);

  useEffect(() => {
    if (isOpen) checkStatus();
  }, [isOpen, checkStatus]);

  useEffect(() => {
    if (!nextSpinAt || canSpin) { setCountdown(""); return; }
    const update = () => {
      const diff = new Date(nextSpinAt).getTime() - Date.now();
      if (diff <= 0) { setCanSpin(true); setCountdown(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [nextSpinAt, canSpin]);

  const spin = useCallback(async () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);

    try {
      const res = await authFetch("/gamification/spin", getToken, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Cannot spin", description: data.error, variant: "destructive" });
        setSpinning(false);
        return;
      }

      const targetIdx = segments.findIndex(
        s => s.rewardType === data.rewardType && s.rewardValue === data.rewardValue
      );
      const resolvedIdx = targetIdx >= 0 ? targetIdx : 0;

      const segDeg = 360 / segments.length;
      const targetOffset = 360 - (resolvedIdx * segDeg + segDeg / 2);
      const currentDeg = rotationDeg.get();
      const normalizedCurrent = ((currentDeg % 360) + 360) % 360;
      let delta = targetOffset - normalizedCurrent;
      if (delta < 0) delta += 360;
      const totalRotation = currentDeg + 5 * 360 + delta;

      animate(rotationDeg, totalRotation, {
        duration: 4,
        ease: [0.2, 0.85, 0.4, 1],
        onComplete: () => {
          setResult(data);
          setCanSpin(false);
          setNextSpinAt(data.nextSpinAt);
          setSpinning(false);
          const tier = (data.rewardType === "multiplier" || data.rewardType === "streak_protection")
            ? fireCelebration(0, "special")
            : fireCelebration(data.rewardValue ?? 0, "xp");
          setResultTier(tier);
          if (tier === "jackpot") setShowBigWin(true);
          onReward?.(data.reward);
          onBalanceChange?.();
        },
      });
    } catch {
      toast({ title: "Spin failed", description: "Please try again", variant: "destructive" });
      setSpinning(false);
    }
  }, [spinning, canSpin, getToken, toast, rotationDeg, onReward, onBalanceChange, segments]);

  if (!isOpen) return null;

  return createPortal(
    <>
    <BigWinOverlay show={showBigWin} label="BIG WIN" onDone={() => setShowBigWin(false)} />
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 ">
      <div className="relative w-[min(360px,calc(100vw-24px))] bg-card border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00B4D8]/5 via-transparent to-[#FFB800]/5 pointer-events-none" />

        <div className="relative flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#FFB800]" />
            <span className="text-sm font-bold font-mono text-[#FFB800] tracking-wider">DAILY SPIN</span>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="relative flex flex-col items-center py-6 px-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00B4D8]/10 blur-xl" />
            <motion.div
              style={{ rotate: rotationDeg, width: 280, height: 280 }}
              className={`relative cursor-pointer rounded-full ${!spinning && !canSpin ? "opacity-60" : ""}`}
              onClick={spin}
              whileHover={canSpin && !spinning ? { scale: 1.02 } : {}}
              whileTap={canSpin && !spinning ? { scale: 0.98 } : {}}
            >
              <canvas
                ref={canvasRef}
                style={{ width: 280, height: 280, display: "block" }}
              />
            </motion.div>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                key={result.reward}
                initial={{ opacity: 0, scale: 0.75, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`mt-4 w-full p-3 rounded-lg text-center ${
                  resultTier === "jackpot"
                    ? "bg-[#FFB800]/15 border border-[#FFB800]/40"
                    : resultTier === "large"
                    ? "bg-[#00B4D8]/10 border border-[#00B4D8]/30"
                    : "bg-[#FFB800]/10 border border-[#FFB800]/20"
                }`}
              >
                <p className="text-[10px] font-mono text-[#FFB800]/60 uppercase tracking-widest">YOU WON</p>
                <p className="text-lg font-bold font-mono text-[#FFB800] mt-1">{result.reward}</p>
                {result.rewardType === "xp" && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                    {result.baseXp ? `+${result.baseXp} XP` : `+${result.rewardValue} XP`} added to your account
                  </p>
                )}
                {result.rewardType === "multiplier" && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">Your next session earns 2x XP</p>
                )}
                {result.rewardType === "streak_protection" && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">Your streak is protected for 1 missed day</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!result && (
            <div className="mt-4 text-center">
              {canSpin ? (
                <div>
                  <p className="text-sm font-mono text-[#00B4D8] font-bold">Ready to spin!</p>
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">Tap the wheel to claim your daily reward</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <p className="text-xs font-mono text-muted-foreground/70">Next spin in <span className="text-[#00B4D8] font-bold">{countdown}</span></p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <motion.button
            onClick={spin}
            disabled={spinning || !canSpin}
            whileHover={canSpin && !spinning ? { scale: 1.03 } : {}}
            whileTap={canSpin && !spinning ? { scale: 0.97 } : {}}
            className={`w-full py-2.5 mb-3 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-colors disabled:opacity-40 ${
              canSpin && !spinning
                ? "bg-gradient-to-r from-[#FFB800] to-[#f59e0b] text-black shadow-lg shadow-[#FFB800]/20"
                : "bg-muted/50 text-muted-foreground/50 border border-border"
            }`}
          >
            {spinning ? "SPINNING..." : canSpin ? "SPIN NOW" : `NEXT SPIN: ${countdown}`}
          </motion.button>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1.5">
              <Zap className="w-3 h-3 text-[#00B4D8]" />
              <span className="text-[8px] font-mono text-muted-foreground/70">XP Boosts</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1.5">
              <Shield className="w-3 h-3 text-[#ff3366]" />
              <span className="text-[8px] font-mono text-muted-foreground/70">Streak Shield</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1.5">
              <Star className="w-3 h-3 text-[#FFB800]" />
              <span className="text-[8px] font-mono text-muted-foreground/70">Multipliers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}
