import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";

const PRIZES = [
  { amount: 1_000, label: "$1K", color: "#1a3a2a", textColor: "#00ff88" },
  { amount: 2_000, label: "$2K", color: "#1a2a3a", textColor: "#00D4FF" },
  { amount: 3_000, label: "$3K", color: "#2a1a3a", textColor: "#a855f7" },
  { amount: 4_000, label: "$4K", color: "#3a2a1a", textColor: "#f59e0b" },
  { amount: 5_000, label: "$5K", color: "#1a3a2a", textColor: "#00ff88" },
  { amount: 7_500, label: "$7.5K", color: "#1a2a3a", textColor: "#00D4FF" },
  { amount: 10_000, label: "$10K", color: "#3a1a1a", textColor: "#ff3366" },
  { amount: 25_000, label: "$25K", color: "#2a1a1a", textColor: "#ff6b35" },
  { amount: 50_000, label: "$50K", color: "#1a1a3a", textColor: "#a855f7" },
  { amount: 100_000, label: "$100K", color: "#2a1a00", textColor: "#FFD700" },
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
  createdAt: string;
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
  const [winPrize, setWinPrize] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/spin/status", getToken);
      if (res.ok) setStatus(await res.json());
    } catch {}
  }, [isSignedIn, getToken]);

  const countdown = useCountdown(status?.nextSpinAt ?? null, loadStatus);

  const loadHistory = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/spin/history", getToken);
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
      ctx.font = `bold 11px monospace`;
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
    setWinPrize(null);

    try {
      const res = await authFetch("/paper-trading/spin", getToken, { method: "POST" });
      const data = await res.json();

      if (!res.ok || data.alreadySpun) {
        toast({ title: "Already spun today", description: "Come back tomorrow for your next spin!", variant: "destructive" });
        setSpinning(false);
        loadStatus();
        return;
      }

      const prize = data.prize as number;
      const prizeIndex = PRIZES.findIndex(p => p.amount === prize);

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
          setWinPrize(prize);
          loadStatus();
          onBalanceChange?.();
          setHistoryLoaded(prev => { if (prev) loadHistory(); return prev; });
        },
      });
    } catch {
      toast({ title: "Spin failed", description: "Please try again", variant: "destructive" });
      setSpinning(false);
    }
  }, [isSignedIn, spinning, status, getToken, toast, rotationDeg, loadStatus, onBalanceChange, loadHistory]);

  return (
    <div className="bg-[#0a0a0f] border border-white/[0.06] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] border-l-2 border-l-[#FFD700]">
        <div className="flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-[#FFD700]" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#FFD700]">DAILY SPIN</span>
          <span className="text-[8px] font-mono text-white/30 ml-1">FREE CASH</span>
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
              <p className="text-[9px] font-mono text-white/30 mb-1.5">PRIZE TIERS</p>
              <div className="space-y-0.5">
                {PRIZES.slice().reverse().map(p => (
                  <div key={p.amount} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold" style={{ color: p.textColor }}>{p.label}</span>
                    <span className="text-[8px] font-mono text-white/20">
                      {p.amount === 100_000 ? "0.1%" :
                       p.amount === 50_000 ? "0.2%" :
                       p.amount === 25_000 ? "0.5%" :
                       p.amount === 10_000 ? "1%" :
                       p.amount === 7_500 ? "2%" :
                       p.amount === 5_000 ? "5%" :
                       p.amount === 4_000 ? "6.7%" :
                       p.amount === 3_000 ? "10%" :
                       p.amount === 2_000 ? "14.3%" : "~60%"}
                    </span>
                  </div>
                ))}
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
          {winPrize !== null && (
            <motion.div
              key={winPrize}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mt-3 p-3 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm text-center"
            >
              <Trophy className="w-5 h-5 text-[#FFD700] mx-auto mb-1" />
              <p className="text-[9px] font-mono text-white/50 mb-0.5">YOU WON</p>
              <p className="text-xl font-mono font-bold text-[#FFD700]">
                +${winPrize.toLocaleString()}
              </p>
              <p className="text-[8px] font-mono text-white/30 mt-0.5">Added to paper trading balance</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isSignedIn && (
          <p className="mt-2 text-[9px] font-mono text-[#FFD700]/60 text-center">Sign in to claim your free daily spin</p>
        )}

        <button
          onClick={() => { setShowHistory(v => !v); if (!historyLoaded) loadHistory(); }}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1 text-[8px] font-mono text-white/20 hover:text-white/40 transition-colors"
        >
          {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showHistory ? "HIDE HISTORY" : "SPIN HISTORY"}
        </button>

        {showHistory && (
          <div className="border-t border-white/[0.06] pt-2 mt-1 max-h-[140px] overflow-y-auto space-y-0.5">
            {history.length === 0 ? (
              <p className="text-[8px] font-mono text-white/20 text-center py-2">No spins yet</p>
            ) : (
              history.map(h => (
                <div key={h.id} className="flex items-center justify-between py-0.5">
                  <span className="text-[8px] font-mono text-white/30">{h.spinDate}</span>
                  <span className="text-[9px] font-mono font-bold text-[#FFD700]">+${h.prizeAmount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
