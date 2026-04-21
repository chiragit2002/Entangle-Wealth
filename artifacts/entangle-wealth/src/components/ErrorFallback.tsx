import { RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-card text-foreground flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-[9px] tracking-[0.3em] uppercase font-mono text-muted-foreground/50 mb-0.5">
              System Error
            </div>
            <h2 className="text-sm font-semibold font-mono text-foreground/80">
              Something went wrong
            </h2>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed">
          An unexpected error occurred. Your data is safe. Try refreshing to resume.
        </p>

        {import.meta.env.DEV && (
          <div
            className="p-3 font-mono"
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.12)",
            }}
          >
            <div className="text-[9px] text-red-400/50 mb-1 tracking-widest uppercase">Debug</div>
            <p className="text-[10px] text-red-400/70 break-all">{error.message}</p>
          </div>
        )}

        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
          style={{
            background: "#00B4D8",
            color: "#0A0E1A",
            borderRadius: 0,
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}
