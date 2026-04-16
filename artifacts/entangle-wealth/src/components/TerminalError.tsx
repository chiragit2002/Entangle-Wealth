import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TerminalErrorProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function TerminalError({ message = "CONNECTION REFUSED", onRetry, compact = false }: TerminalErrorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 font-mono text-xs rounded" style={{ background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.2)" }}>
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ff3366" }} />
        <span style={{ color: "#ff3366" }}>&gt; ERROR: {message}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto hover:opacity-80 transition-opacity" style={{ color: "#00D4FF" }}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded flex items-center justify-center mb-4" style={{ background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.25)" }}>
        <AlertTriangle className="w-6 h-6" style={{ color: "#ff3366" }} />
      </div>
      <p className="font-mono text-sm font-bold mb-1" style={{ color: "#ff3366" }}>&gt; ERROR: {message}</p>
      <p className="font-mono text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Check connection and try again</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="font-mono text-xs gap-2"
          style={{ borderColor: "rgba(0,212,255,0.3)", color: "#00D4FF" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RETRY
        </Button>
      )}
    </div>
  );
}
