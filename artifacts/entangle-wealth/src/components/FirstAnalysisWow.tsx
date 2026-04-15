import { useEffect, useState, useRef } from "react";
import { playBootSonic } from "@/lib/sonicBrand";

interface FirstAnalysisWowProps {
  onComplete: () => void;
  symbol?: string;
}

const STAGES = [
  { text: "Initializing quantum scan...", delay: 0 },
  { text: "Loading 55+ technical indicators...", delay: 700 },
  { text: "Scanning price action patterns...", delay: 1400 },
  { text: "Running agent consensus protocol...", delay: 2100 },
  { text: "Entangling data streams...", delay: 2800 },
  { text: "Analysis complete.", delay: 3400, done: true },
];

const FIRST_ANALYSIS_KEY = "ew_first_analysis_done";

export function useFirstAnalysisWow() {
  const isDone = () => {
    try {
      return localStorage.getItem(FIRST_ANALYSIS_KEY) === "1";
    } catch {
      return true;
    }
  };

  const markDone = () => {
    try {
      localStorage.setItem(FIRST_ANALYSIS_KEY, "1");
    } catch {}
  };

  return { isFirstAnalysis: !isDone(), markDone };
}

export function FirstAnalysisWow({ onComplete, symbol }: FirstAnalysisWowProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    playBootSonic();

    const timers: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((stage, i) => {
      const t = setTimeout(() => {
        setStageIndex(i);
        if (stage.done) {
          setDone(true);
          setTimeout(() => {
            setExiting(true);
            setTimeout(onComplete, 600);
          }, 1200);
        }
      }, stage.delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  useEffect(() => {
    if (prefersReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes: { x: number; y: number; vx: number; vy: number; pulse: number }[] = Array.from(
      { length: 20 },
      () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        pulse: Math.random() * Math.PI * 2,
      })
    );

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach((n) => {
        n.pulse += 0.04;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        const alpha = 0.3 + 0.3 * Math.sin(n.pulse);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#00B4D8";
        ctx.shadowColor = "#00B4D8";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      nodes.forEach((n, i) => {
        nodes.slice(i + 1).forEach((n2) => {
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.globalAlpha = (1 - dist / 150) * 0.15;
            ctx.strokeStyle = "#00B4D8";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        });
      });

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [prefersReduced]);

  const progress = Math.min(((stageIndex + 1) / STAGES.length) * 100, 100);

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-4"
      style={{
        background: "rgba(1,1,12,0.97)",
        backdropFilter: "blur(20px)",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.6s ease-in",
      }}
    >
      {!prefersReduced && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <div
          className="text-[9px] tracking-[0.4em] uppercase font-semibold mb-6"
          style={{ color: "rgba(0,180,216,0.5)" }}
        >
          First Quantum Analysis
          {symbol && ` · ${symbol}`}
        </div>

        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-8 relative"
          style={{
            border: "2px solid rgba(0,180,216,0.3)",
            background: "rgba(0,180,216,0.05)",
          }}
        >
          {done ? (
            <div
              className="text-[#00FF88] text-3xl font-bold"
              style={{ animation: "firstWowCheck 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            >
              ✓
            </div>
          ) : (
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="rgba(0,180,216,0.15)"
                strokeWidth="2"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#00B4D8"
                strokeWidth="2"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
                style={{ transition: "stroke-dasharray 0.5s ease-out" }}
              />
            </svg>
          )}
        </div>

        <div className="space-y-2 w-full mb-8">
          {STAGES.slice(0, stageIndex + 1).map((stage, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs font-mono"
              style={{
                color: i === stageIndex && !stage.done ? "#00B4D8" : "rgba(255,255,255,0.35)",
                animation: i === stageIndex ? "firstWowLine 0.2s ease-out" : "none",
              }}
            >
              <span style={{ color: stage.done || i < stageIndex ? "#00FF88" : "#00B4D8" }}>
                {i < stageIndex || stage.done ? "✓" : ">"}
              </span>
              <span>{stage.text}</span>
            </div>
          ))}
        </div>

        {done && (
          <div
            className="space-y-2"
            style={{ animation: "firstWowReveal 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
          >
            <div
              className="text-2xl font-extrabold"
              style={{
                background: "linear-gradient(135deg, #00B4D8, #00FF88)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Your First Quantum Analysis
            </div>
            <div className="text-sm text-white/50">
              is complete. You're now operating on a new level.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes firstWowLine {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes firstWowCheck {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        @keyframes firstWowReveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
