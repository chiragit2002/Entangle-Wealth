import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Gift, Clock, Trophy, ChevronDown, ChevronUp } from "lucide-react";

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
  const angleRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const spinStateRef = useRef<{
    active: boolean;
    startAngle: number;
    totalRotation: number;
    duration: number;
    startTime: number;
    prize: number;
    onDone: () => void;
  } | null>(null);

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

  const drawWheel = useCallback((angle: number) => {
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
      const start = angle + i * SEG_ANGLE - Math.PI / 2;
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

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const animateSpin = useCallback(() => {
    const s = spinStateRef.current;
    if (!s) return;

    const elapsed = Date.now() - s.startTime;
    const t = Math.min(elapsed / s.duration, 1);
    const easedT = easeOut(t);
    const currentAngle = s.startAngle + easedT * s.totalRotation;

    angleRef.current = currentAngle;
    drawWheel(currentAngle);

    if (t < 1) {
      animFrameRef.current = requestAnimationFrame(animateSpin);
    } else {
      spinStateRef.current = null;
      s.onDone();
    }
  }, [drawWheel]);

  useEffect(() => {
    drawWheel(0);
  }, [drawWheel]);

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

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

      const startAngle = angleRef.current;
      const normalizedStart = ((startAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      const targetOffset = (Math.PI * 2) - ((prizeIndex * SEG_ANGLE) + SEG_ANGLE / 2) + (Math.PI / 2);
      const normalizedTarget = ((targetOffset % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

      let delta = normalizedTarget - normalizedStart;
      if (delta < 0) delta += 2 * Math.PI;

      const fullRotations = 5 * 2 * Math.PI;
      const totalRotation = fullRotations + delta;

      spinStateRef.current = {
        active: true,
        startAngle,
        totalRotation,
        duration: 4500,
        startTime: Date.now(),
        prize,
        onDone: () => {
          setSpinning(false);
          setWinPrize(prize);
          loadStatus();
          onBalanceChange?.();
          setHistoryLoaded(prev => { if (prev) loadHistory(); return prev; });
        },
      };

      animFrameRef.current = requestAnimationFrame(animateSpin);
    } catch {
      toast({ title: "Spin failed", description: "Please try again", variant: "destructive" });
      setSpinning(false);
    }
  }, [isSignedIn, spinning, status, getToken, toast, animateSpin, loadStatus, onBalanceChange]);

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
            <canvas
              ref={canvasRef}
              width={180}
              height={180}
              className="rounded-full cursor-pointer"
              style={{ display: "block" }}
              onClick={handleSpin}
            />
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

            <button
              onClick={handleSpin}
              disabled={spinning || !status?.canSpin || !isSignedIn}
              className={`mt-2 w-full h-8 text-[10px] font-mono font-bold rounded-sm transition-all disabled:opacity-40 ${
                status?.canSpin && isSignedIn && !spinning
                  ? "bg-[#FFD700] text-black hover:bg-[#FFD700]/80 shadow-lg shadow-[#FFD700]/20"
                  : "bg-white/[0.05] text-white/30 border border-white/[0.08]"
              }`}
            >
              {!isSignedIn ? "SIGN IN TO SPIN" : spinning ? "SPINNING..." : status?.canSpin ? "SPIN NOW" : `NEXT: ${countdown}`}
            </button>
          </div>
        </div>

        {winPrize !== null && (
          <div className="mt-3 p-3 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-sm text-center animate-pulse">
            <Trophy className="w-5 h-5 text-[#FFD700] mx-auto mb-1" />
            <p className="text-[9px] font-mono text-white/50 mb-0.5">YOU WON</p>
            <p className="text-xl font-mono font-bold text-[#FFD700]">
              +${winPrize.toLocaleString()}
            </p>
            <p className="text-[8px] font-mono text-white/30 mt-0.5">Added to paper trading balance</p>
          </div>
        )}

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
