import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { X, Gift, Clock, Zap, Shield, Star } from "lucide-react";
import { fireCelebration, CelebrationTier } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";

const WHEEL_SEGMENTS = [
  { label: "+500 XP", color: "#00D4FF", icon: "⚡" },
  { label: "+250 XP", color: "#9c27b0", icon: "✨" },
  { label: "+1,000 XP", color: "#FFB800", icon: "🔥" },
  { label: "2x XP", color: "#00FF41", icon: "⚡⚡" },
  { label: "Streak Shield", color: "#ff3366", icon: "🛡️" },
  { label: "+100 XP", color: "#6366f1", icon: "💫" },
  { label: "+750 XP", color: "#f59e0b", icon: "⭐" },
];

interface DailySpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onReward?: (reward: string) => void;
}

export function DailySpinWheel({ isOpen, onClose, onReward }: DailySpinWheelProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [result, setResult] = useState<{ reward: string; rewardType: string; rewardValue: number } | null>(null);
  const [countdown, setCountdown] = useState("");
  const [resultTier, setResultTier] = useState<CelebrationTier | null>(null);
  const [showBigWin, setShowBigWin] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationDeg = useMotionValue(0);

  const checkStatus = useCallback(async () => {
    try {
      const res = await authFetch("/gamification/spin/status", getToken);
      if (res.ok) {
        const data = await res.json();
        setCanSpin(data.canSpin);
        setNextSpinAt(data.nextSpinAt);
      }
    } catch (err) {
      console.error("[DailySpinWheel] Failed to check spin status:", err);
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

  useEffect(() => {
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
    const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    WHEEL_SEGMENTS.forEach((seg, i) => {
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
    ctx.strokeStyle = "#00D4FF";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#00D4FF";
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

      const rewardIndex = WHEEL_SEGMENTS.findIndex(s =>
        s.label.includes(data.reward.replace("+", "").replace(",", ""))
        || (data.rewardType === "multiplier" && s.label.includes("2x"))
        || (data.rewardType === "streak_protection" && s.label.includes("Shield"))
      );
      const targetIdx = rewardIndex >= 0 ? rewardIndex : 0;

      const segDeg = 360 / WHEEL_SEGMENTS.length;
      const targetOffset = 360 - (targetIdx * segDeg + segDeg / 2);
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
        },
      });
    } catch {
      toast({ title: "Spin failed", description: "Please try again", variant: "destructive" });
      setSpinning(false);
    }
  }, [spinning, canSpin, getToken, toast, rotationDeg, onReward]);

  if (!isOpen) return null;

  return (
    <>
    <BigWinOverlay show={showBigWin} label="BIG WIN" onDone={() => setShowBigWin(false)} />
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 ">
      <div className="relative w-[360px] bg-[#0A0E1A] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00D4FF]/5 via-transparent to-[#FFB800]/5 pointer-events-none" />

        <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#FFB800]" />
            <span className="text-sm font-bold font-mono text-[#FFB800] tracking-wider">DAILY SPIN</span>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="relative flex flex-col items-center py-6 px-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00D4FF]/10 blur-xl" />
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
                    ? "bg-[#00D4FF]/10 border border-[#00D4FF]/30"
                    : "bg-[#FFB800]/10 border border-[#FFB800]/20"
                }`}
              >
                <p className="text-[10px] font-mono text-[#FFB800]/60 uppercase tracking-widest">YOU WON</p>
                <p className="text-lg font-bold font-mono text-[#FFB800] mt-1">{result.reward}</p>
                {result.rewardType === "xp" && (
                  <p className="text-[10px] font-mono text-white/30 mt-1">+{result.rewardValue} XP added to your account</p>
                )}
                {result.rewardType === "multiplier" && (
                  <p className="text-[10px] font-mono text-white/30 mt-1">Your next session earns 2x XP</p>
                )}
                {result.rewardType === "streak_protection" && (
                  <p className="text-[10px] font-mono text-white/30 mt-1">Your streak is protected for 1 missed day</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!result && (
            <div className="mt-4 text-center">
              {canSpin ? (
                <div>
                  <p className="text-sm font-mono text-[#00FF41] font-bold">Ready to spin!</p>
                  <p className="text-[10px] font-mono text-white/30 mt-1">Tap the wheel to claim your daily reward</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Clock className="w-3.5 h-3.5 text-white/30" />
                  <p className="text-xs font-mono text-white/40">Next spin in <span className="text-[#00D4FF] font-bold">{countdown}</span></p>
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
                : "bg-white/[0.05] text-white/30 border border-white/[0.08]"
            }`}
          >
            {spinning ? "SPINNING..." : canSpin ? "SPIN NOW" : `NEXT SPIN: ${countdown}`}
          </motion.button>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="flex items-center gap-1.5 bg-white/[0.02] rounded px-2 py-1.5">
              <Zap className="w-3 h-3 text-[#00D4FF]" />
              <span className="text-[8px] font-mono text-white/40">XP Boosts</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] rounded px-2 py-1.5">
              <Shield className="w-3 h-3 text-[#ff3366]" />
              <span className="text-[8px] font-mono text-white/40">Streak Shield</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/[0.02] rounded px-2 py-1.5">
              <Star className="w-3 h-3 text-[#FFB800]" />
              <span className="text-[8px] font-mono text-white/40">Multipliers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
