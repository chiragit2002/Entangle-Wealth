import { useEffect, useState, useRef } from "react";
import { playBootSonic } from "@/lib/sonicBrand";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";

const BOOT_SEEN_KEY = "ew_boot_seen";

const BOOT_LINES = [
  "Initializing Quantum Core...",
  "Loading 55+ market indicators...",
  "Entangling data streams...",
  "Calibrating signal intelligence...",
  "Synchronizing quantum agents...",
  "System ready.",
];

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [phase, setPhase] = useState<"boot" | "reveal" | "done">("boot");
  const [lineIndex, setLineIndex] = useState(0);
  const [scanPos, setScanPos] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem(BOOT_SEEN_KEY);
    if (seen) {
      onComplete();
      return;
    }

    playBootSonic();

    const lineTimer = setInterval(() => {
      setLineIndex((i) => {
        if (i >= BOOT_LINES.length - 1) {
          clearInterval(lineTimer);
          setTimeout(() => setPhase("reveal"), 300);
          return i;
        }
        return i + 1;
      });
    }, 280);

    const scanAnim = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      setScanPos((elapsed % 2000) / 2000);
      rafRef.current = requestAnimationFrame(scanAnim);
    };
    rafRef.current = requestAnimationFrame(scanAnim);

    return () => {
      clearInterval(lineTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete]);

  useEffect(() => {
    if (phase === "reveal") {
      const t = setTimeout(() => {
        setPhase("done");
        sessionStorage.setItem(BOOT_SEEN_KEY, "1");
        setTimeout(onComplete, 500);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const handleSkip = () => {
    if (skipped) return;
    setSkipped(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    setPhase("done");
    setTimeout(onComplete, 300);
  };

  if (phase === "done") {
    return (
      <div
        className="fixed inset-0 z-[200] bg-black pointer-events-none"
        style={{
          animation: "bootFadeOut 0.5s ease-in forwards",
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-[#010108] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px)",
        }}
      />
      <div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{
          top: `${scanPos * 100}%`,
          background:
            "linear-gradient(90deg, transparent, rgba(0,212,255,0.5), rgba(0,212,255,0.8), rgba(0,212,255,0.5), transparent)",
          boxShadow: "0 0 20px rgba(0,212,255,0.6)",
          transition: "none",
        }}
      />

      {phase === "boot" && (
        <div className="flex flex-col items-center gap-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
            style={{
              border: "1px solid rgba(0,212,255,0.4)",
              boxShadow: "0 0 30px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.05)",
              animation: "bootLogoPulse 1.5s ease-in-out infinite",
            }}
          >
            <img src={logoImg} alt="EntangleWealth" className="w-12 h-12 rounded-lg" />
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), transparent 60%)",
              }}
            />
          </div>

          <div className="text-center">
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#00D4FF]/60 mb-1">
              ENTANGLE WEALTH
            </div>
            <div className="text-[8px] tracking-[0.2em] uppercase text-white/20">
              Quantum Financial Intelligence
            </div>
          </div>

          <div
            className="w-80 max-w-full space-y-1 text-left bg-black/40 rounded-lg p-4"
            style={{ border: "1px solid rgba(0,212,255,0.1)" }}
          >
            {BOOT_LINES.slice(0, lineIndex + 1).map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px]"
                style={{
                  color: i === lineIndex ? "#00D4FF" : "rgba(255,255,255,0.35)",
                  animation: i === lineIndex ? "bootLineIn 0.15s ease-out" : "none",
                }}
              >
                <span
                  style={{
                    color: i === lineIndex ? "#00FF88" : "rgba(0,212,255,0.3)",
                  }}
                >
                  {i === lineIndex ? ">" : "✓"}
                </span>
                <span>{line}</span>
                {i === lineIndex && (
                  <span
                    style={{
                      animation: "bootBlink 0.8s step-end infinite",
                      color: "#00D4FF",
                    }}
                  >
                    _
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="w-80 max-w-full">
            <div
              className="h-[2px] rounded-full overflow-hidden"
              style={{ background: "rgba(0,212,255,0.1)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${((lineIndex + 1) / BOOT_LINES.length) * 100}%`,
                  background: "linear-gradient(90deg, #00D4FF, #00FF88)",
                  transition: "width 0.25s ease-out",
                  boxShadow: "0 0 8px rgba(0,212,255,0.6)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {phase === "reveal" && (
        <div
          className="flex flex-col items-center gap-4"
          style={{ animation: "bootReveal 0.6s ease-out forwards" }}
        >
          <div
            className="text-4xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #00D4FF, #00FF88)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            EntangleWealth
          </div>
          <div className="text-[10px] tracking-[0.35em] uppercase text-[#00D4FF]/50">
            System Online
          </div>
        </div>
      )}

      <button
        onClick={handleSkip}
        className="absolute bottom-6 right-6 text-[10px] text-white/20 hover:text-white/50 transition-colors tracking-wider"
      >
        SKIP →
      </button>

      <style>{`
        @keyframes bootLogoPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.05); }
          50% { box-shadow: 0 0 50px rgba(0,212,255,0.4), inset 0 0 30px rgba(0,212,255,0.1); }
        }
        @keyframes bootLineIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bootBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes bootReveal {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bootFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
