import { RefreshCw, Home, Radio } from "lucide-react";
import { Link } from "wouter";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-[#010108] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.25)",
              boxShadow: "0 0 40px rgba(255,71,87,0.08)",
            }}
          >
            <Radio className="w-9 h-9 text-red-400" style={{ animation: "signalPulse 2s ease-in-out infinite" }} />
          </div>

          <div
            className="absolute -inset-4 rounded-3xl pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, rgba(255,71,87,0.04), transparent 70%)",
            }}
          />
        </div>

        <div>
          <div className="text-[9px] tracking-[0.35em] uppercase font-semibold text-red-400/60 mb-3 font-mono">
            Signal Interrupted
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">
            Quantum connection lost.
          </h2>
          <p className="text-white/45 text-sm leading-relaxed max-w-sm mx-auto">
            An unexpected interference disrupted the data stream. Our agents are aware. Reconnecting usually resolves the issue instantly.
          </p>
        </div>

        {import.meta.env.DEV && (
          <div
            className="p-4 rounded-xl text-left font-mono"
            style={{
              background: "rgba(255,71,87,0.05)",
              border: "1px solid rgba(255,71,87,0.15)",
            }}
          >
            <div className="text-[10px] text-red-400/60 mb-1 tracking-widest uppercase">Debug Output</div>
            <p className="text-xs text-red-400/80 break-all">{error.message}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #00D4FF, #0099CC)",
              color: "#000",
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect Signal
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
          >
            <Home className="w-4 h-4" />
            Return to Base
          </Link>
        </div>

        <div className="text-[10px] font-mono text-white/15 tracking-wider">
          ENTANGLEWEALTH · QUANTUM OS · SIGNAL RECOVERY MODE
        </div>
      </div>

      <style>{`
        @keyframes signalPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.92); }
        }
      `}</style>
    </div>
  );
}
