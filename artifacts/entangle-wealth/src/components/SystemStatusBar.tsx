import { useConnection, type ConnectionState } from "@/contexts/ConnectionContext";
import { formatDistanceToNow } from "date-fns";

function formatAgo(ts: number | null): string {
  if (!ts) return "";
  try {
    return formatDistanceToNow(ts, { addSuffix: true });
  } catch {
    return "";
  }
}

const STATE_CONFIG: Record<ConnectionState, {
  label: string;
  dotColor: string;
  textColor: string;
  bg: string;
  pulse: boolean;
}> = {
  connected: {
    label: "LIVE",
    dotColor: "#22c55e",
    textColor: "rgba(34,197,94,0.7)",
    bg: "transparent",
    pulse: false,
  },
  degraded: {
    label: "DELAYED",
    dotColor: "#f59e0b",
    textColor: "rgba(245,158,11,0.7)",
    bg: "rgba(245,158,11,0.04)",
    pulse: true,
  },
  disconnected: {
    label: "DISCONNECTED",
    dotColor: "#ef4444",
    textColor: "rgba(239,68,68,0.7)",
    bg: "rgba(239,68,68,0.04)",
    pulse: true,
  },
};

export function SystemStatusBar() {
  const { state, lastUpdated } = useConnection();
  const config = STATE_CONFIG[state];

  if (state === "connected") return null;

  const ago = formatAgo(lastUpdated);

  return (
    <div
      className="w-full flex items-center justify-center gap-2 px-4 font-mono"
      style={{
        height: "18px",
        background: config.bg,
        borderBottom: `1px solid ${config.dotColor}22`,
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: config.dotColor,
          boxShadow: config.pulse ? `0 0 4px ${config.dotColor}` : "none",
          animation: config.pulse ? "statusPulse 2s ease-in-out infinite" : "none",
        }}
      />
      <span className="text-[9px] tracking-[0.15em] uppercase" style={{ color: config.textColor }}>
        {config.label}
        {state === "degraded" && ago && ` · last update ${ago}`}
        {state === "disconnected" && " · reconnecting…"}
      </span>
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
