import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Trophy, ChevronDown, ChevronUp, Zap, Shield, Star } from "lucide-react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";

type RewardType = "cash" | "xp" | "multiplier" | "streak_protection";

interface Prize {
  rewardType: RewardType;
  label: string;
  color: string;
  textColor: string;
}

const PRIZES: Prize[] = [
  { rewardType: "cash", label: "$1K", color: "#1a3a2a", textColor: "#00ff88" },
  { rewardType: "xp", label: "+50 XP", color: "#1a1a3a", textColor: "#00D4FF" },
  { rewardType: "cash", label: "$2K", color: "#1a2a3a", textColor: "#00D4FF" },
  { rewardType: "xp", label: "+100 XP", color: "#2a1a3a", textColor: "#a855f7" },
  { rewardType: "cash", label: "$3K", color: "#2a1a3a", textColor: "#a855f7" },
  { rewardType: "cash", label: "$4K", color: "#3a2a1a", textColor: "#f59e0b" },
  { rewardType: "xp", label: "+250 XP", color: "#1a1a2a", textColor: "#6366f1" },
  { rewardType: "cash", label: "$5K", color: "#1a3a2a", textColor: "#00ff88" },
  { rewardType: "cash", label: "$7.5K", color: "#1a2a3a", textColor: "#00D4FF" },
  { rewardType: "cash", label: "$10K", color: "#3a1a1a", textColor: "#ff3366" },
  { rewardType: "multiplier", label: "2x Boost", color: "#2a1a00", textColor: "#FFD700" },
  { rewardType: "cash", label: "$25K", color: "#2a1a1a", textColor: "#ff6b35" },
  { rewardType: "cash", label: "$50K", color: "#1a1a3a", textColor: "#a855f7" },
  { rewardType: "streak_protection", label: "Streak+", color: "#2a0a1a", textColor: "#ff3366" },
  { rewardType: "cash", label: "$100K", color: "#2a1a00", textColor: "#FFD700" },
];

const SEG_ANGLE = (2 * Math.PI) / PRIZES.length;

interface SpinStatus {
  canSpin: boolean;
  nextSpinAt: string | null;
  todaySpin: { prizeAmount: number; spinDate: string } | null;
}

interface SpinHistory {
  id: number;
  prizeAmount: number;
  spinDate: string;
  rewardType: string;
  rewardLabel: string;
  createdAt: string;
}

interface SpinResult {
  rewardType: RewardType;
  label: string;
  prize: number;
  xpAmount: number;
}

function useCountdown(targetIso: string | null, onExpire?: () => void) {
  const [remaining, setRemaining] = useState("");
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!targetIso) { setRemaining(""); return; }
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("");
        onExpireRef.current?.();
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetIso]);

  return remaining;
}

export function SpinWheel({ onBalanceChange }: { onBalanceChange?: () => void }) {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationDeg = useMotionValue(0);

  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winResult, setWinResult] = useState<SpinResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/gamification/spin/status", getToken);
      if (res.ok) setStatus(await res.json());
    } catch {}
  }, [isSignedIn, getToken]);

  const countdown = useCountdown(status?.nextSpinAt ?? null, loadStatus);

  const loadHistory = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/gamification/spin/history", getToken);
      if (res.ok) setHistory(await res.json());
      setHistoryLoaded(true);
    } catch {}
  }, [isSignedIn, getToken]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (showHistory && !historyLoaded) loadHistory();
  }, [showHistory, historyLoaded, loadHistory]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,215,0,0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    PRIZES.forEach((prize, i) => {
      const start = i * SEG_ANGLE - Math.PI / 2;
      const end = start + SEG_ANGLE;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + SEG_ANGLE / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = prize.textColor;
      ctx.font = `bold 10px monospace`;
      ctx.shadowColor = prize.textColor;
      ctx.shadowBlur = 4;
      ctx.fillText(prize.label, r - 8, 4);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
    grad.addColorStop(0, "#1a1a2e");
    grad.addColorStop(1, "#0a0a0f");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,215,0,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", cx, cy);
  }, []);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const handleSpin = useCallback(async () => {
    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Please sign in to spin the wheel", variant: "destructive" });
      return;
    }
    if (spinning || !status?.canSpin) return;

    setSpinning(true);
    setWinResult(null);

    try {
      const res = await authFetch("/gamification/spin", getToken, { method: "POST" });
      const data = await res.json();

      if (!res.ok || data.alreadySpun) {
        toast({ title: "Already spun today", description: "Come back tomorrow for your next spin!", variant: "destructive" });
        setSpinning(false);
        loadStatus();
        return;
      }

      const { rewardType, label, prize, xpAmount } = data as { rewardType: RewardType; label: string; prize: number; xpAmount: number };

      let prizeIndex = -1;
      if (rewardType === "cash") {
        prizeIndex = PRIZES.findIndex(p => p.rewardType === "cash" && p.label === label);
        if (prizeIndex < 0) prizeIndex = PRIZES.findIndex(p => p.rewardType === "cash");
      } else if (rewardType === "xp") {
        prizeIndex = PRIZES.findIndex(p => p.rewardType === "xp" && p.label === label);
        if (prizeIndex < 0) prizeIndex = PRIZES.findIndex(p => p.rewardType === "xp");
      } else if (rewardType === "multiplier") {
        prizeIndex = PRIZES.findIndex(p => p.rewardType === "multiplier");
      } else if (rewardType === "streak_protection") {
        prizeIndex = PRIZES.findIndex(p => p.rewardType === "streak_protection");
      }
      const targetIndex = prizeIndex >= 0 ? prizeIndex : 0;

      const currentDeg = rotationDeg.get();
      const segDeg = 360 / PRIZES.length;
      const targetOffset = 360 - (prizeIndex * segDeg + segDeg / 2);
      const normalizedCurrent = ((currentDeg % 360) + 360) % 360;
      let delta = targetOffset - normalizedCurrent;
      if (delta < 0) delta += 360;

      const totalRotation = currentDeg + 5 * 360 + delta;

      animate(rotationDeg, totalRotation, {
        duration: 4.5,
        ease: [0.2, 0.85, 0.4, 1],
        onComplete: () => {
          setSpinning(false);
          setWinResult({ rewardType, label, prize, xpAmount });
          loadStatus();
          if (rewardType === "cash") onBalanceChange?.();
          setHistoryLoaded(prev => { if (prev) loadHistory(); return prev; });
        },
      });
    } catch {
      toast({ title: "Spin failed", description: "Please try again", variant: "destructive" });
      setSpinning(false);
    }
  }, [isSignedIn, spinning, status, getToken, toast, rotationDeg, loadStatus, onBalanceChange, loadHistory]);

  const cashPrizes = PRIZES.filter(p => p.rewardType === "cash");
  const xpPrizes = PRIZES.filter(p => p.rewardType === "xp");
  const specialPrizes = PRIZES.filter(p => p.rewardType === "multiplier" || p.rewardType === "streak_protection");

  return (
    <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] border-l-2 border-l-[#FFD700]">
        <div className="flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFD700]">DAILY SPIN</span>
          <span className="text-[8px] font-mono text-white/30 ml-1">CASH · XP · BOOSTS</span>
        </div>
        <div className="flex items-center gap-2">
          {status?.canSpin === false && countdown && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/30" />
              <span className="text-[9px] font-mono text-white/40">{countdown}</span>
            </div>
          )}
          {status?.canSpin && (
            <span className="text-[9px] font-mono text-[#00ff88] animate-pulse">READY</span>
          )}
        </div>
      </div>

      <div className="p-3">
        <div className="flex gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="absolute top-0 left-1/2 z-10"
              style={{
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "16px solid #FFD700",
                marginTop: "-1px",
                filter: "drop-shadow(0 0 4px #FFD700)",
              }}
            />
            <motion.div
              style={{ rotate: rotationDeg, width: 180, height: 180 }}
              className="rounded-full cursor-pointer"
              onClick={handleSpin}
            >
              <canvas
                ref={canvasRef}
                width={180}
                height={180}
                style={{ display: "block" }}
              />
            </motion.div>
          </div>

          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <p className="text-[9px] font-mono text-white/30 mb-1">CASH PRIZES</p>
              <div className="space-y-0.5 mb-2">
                {cashPrizes.slice().reverse().map(p => (
                  <div key={p.label} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold" style={{ color: p.textColor }}>{p.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.04] pt-1.5">
                <p className="text-[9px] font-mono text-white/30 mb-1">XP & BOOSTS</p>
                <div className="space-y-0.5">
                  {xpPrizes.map(p => (
                    <div key={p.label} className="flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" style={{ color: p.textColor }} />
                      <span className="text-[8px] font-mono" style={{ color: p.textColor }}>{p.label}</span>
                    </div>
                  ))}
                  {specialPrizes.map(p => (
                    <div key={p.label} className="flex items-center gap-1">
                      {p.rewardType === "multiplier" ? (
                        <Star className="w-2.5 h-2.5" style={{ color: p.textColor }} />
                      ) : (
                        <Shield className="w-2.5 h-2.5" style={{ color: p.textColor }} />
                      )}
                      <span className="text-[8px] font-mono" style={{ color: p.textColor }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <motion.button
              onClick={handleSpin}
              disabled={spinning || !status?.canSpin || !isSignedIn}
              whileHover={!spinning && status?.canSpin && isSignedIn ? { scale: 1.04 } : {}}
              whileTap={!spinning && status?.canSpin && isSignedIn ? { scale: 0.96 } : {}}
              className={`mt-2 w-full h-8 text-[10px] font-mono font-bold rounded-sm transition-colors disabled:opacity-40 ${
                status?.canSpin && isSignedIn && !spinning
                  ? "bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20"
                  : "bg-white/[0.05] text-white/30 border border-white/[0.08]"
              }`}
            >
              {!isSignedIn ? "SIGN IN TO SPIN" : spinning ? "SPINNING..." : status?.canSpin ? "SPIN NOW" : `NEXT: ${countdown}`}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {winResult !== null && (
            <motion.div
              key={winResult.label}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-3 p-3 border rounded-sm text-center"
              style={{
                backgroundColor: winResult.rewardType === "cash" ? "rgba(255,215,0,0.1)" :
                  winResult.rewardType === "xp" ? "rgba(0,212,255,0.1)" :
                  winResult.rewardType === "multiplier" ? "rgba(255,215,0,0.1)" :
                  "rgba(255,51,102,0.1)",
                borderColor: winResult.rewardType === "cash" ? "rgba(255,215,0,0.3)" :
                  winResult.rewardType === "xp" ? "rgba(0,212,255,0.3)" :
                  winResult.rewardType === "multiplier" ? "rgba(255,215,0,0.3)" :
                  "rgba(255,51,102,0.3)",
              }}
            >
              <Trophy className="w-5 h-5 mx-auto mb-1" style={{
                color: winResult.rewardType === "cash" ? "#FFD700" :
                  winResult.rewardType === "xp" ? "#00D4FF" :
                  winResult.rewardType === "multiplier" ? "#FFD700" : "#ff3366"
              }} />
              <p className="text-[9px] font-mono text-white/50 mb-0.5">YOU WON</p>
              {winResult.rewardType === "cash" && (
                <>
                  <p className="text-xl font-mono font-bold text-[#FFD700]">+${winResult.prize.toLocaleString()}</p>
                  <p className="text-[8px] font-mono text-white/30 mt-0.5">Added to paper trading balance</p>
                </>
              )}
              {winResult.rewardType === "xp" && (
                <>
                  <p className="text-xl font-mono font-bold text-[#00D4FF]">+{winResult.xpAmount} XP</p>
                  <p className="text-[8px] font-mono text-white/30 mt-0.5">Added to your gamification profile</p>
                </>
              )}
              {winResult.rewardType === "multiplier" && (
                <>
                  <p className="text-xl font-mono font-bold text-[#FFD700]">2x XP Boost</p>
                  <p className="text-[8px] font-mono text-white/30 mt-0.5">XP multiplier activated on your streak</p>
                </>
              )}
              {winResult.rewardType === "streak_protection" && (
                <>
                  <p className="text-xl font-mono font-bold text-[#ff3366]">Streak Shield</p>
                  <p className="text-[8px] font-mono text-white/30 mt-0.5">Your streak is protected for 1 missed day</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isSignedIn && (
          <p className="mt-2 text-[9px] font-mono text-[#FFD700]/60 text-center">Sign in to claim your free daily spin</p>
        )}

        <button
          onClick={() => { setShowHistory(v => !v); if (!historyLoaded) loadHistory(); }}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1 text-[8px] font-mono text-white/40 hover:text-white/40 transition-colors"
        >
          {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showHistory ? "HIDE HISTORY" : "SPIN HISTORY"}
        </button>

        {showHistory && (
          <div className="border-t border-white/[0.06] pt-2 mt-1 max-h-[140px] overflow-y-auto space-y-0.5">
            {history.length === 0 ? (
              <p className="text-[8px] font-mono text-white/40 text-center py-2">No spins yet</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="flex items-center justify-between py-0.5">
                  <span className="text-[8px] font-mono text-white/30">{h.spinDate}</span>
                  <span className="text-[9px] font-mono font-bold"
                    style={{
                      color: h.rewardType === "xp" ? "#00D4FF" :
                        h.rewardType === "multiplier" ? "#FFD700" :
                        h.rewardType === "streak_protection" ? "#ff3366" : "#FFD700"
                    }}>
                    {h.rewardType === "cash" ? `+$${h.prizeAmount.toLocaleString()}` : h.rewardLabel || "Reward"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
