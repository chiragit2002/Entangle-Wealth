import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface AgentStatus {
  name: string;
  status: string;
  health: "green" | "yellow" | "red";
  errorCount: number;
  lastHeartbeat: string | null;
}

interface StatusResponse {
  overallHealth: "green" | "yellow" | "red";
  totalAgents: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  agents: AgentStatus[];
}

const HEALTH_COLORS: Record<string, string> = {
  green: "#00e676",
  yellow: "#f5c842",
  red: "#ef4444",
};

const HEALTH_LABELS: Record<string, string> = {
  green: "All systems operational",
  yellow: "Degraded performance",
  red: "System issues detected",
};

export function SystemStatus() {
  const isAdmin = useIsAdmin();
  const { getToken } = useAuth();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await authFetch("/agents/status", getToken);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
    }
  }, [isAdmin, getToken]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchStatus]);

  if (!isAdmin || !status) return null;

  const color = HEALTH_COLORS[status.overallHealth] ?? HEALTH_COLORS.green;
  const label = HEALTH_LABELS[status.overallHealth] ?? "Unknown";

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        className="flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer"
        style={{ background: "transparent", border: "none" }}
        aria-label={`System status: ${label}`}
      >
        <span
          className="block rounded-full"
          style={{
            width: 7,
            height: 7,
            background: color,
            boxShadow: `0 0 6px ${color}`,
            animation: status.overallHealth !== "green" ? "pulse 1.5s infinite" : undefined,
          }}
        />
        <span
          className="text-[9px] font-mono uppercase tracking-wider hidden xl:block"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          SYS
        </span>
      </button>

      {showTooltip && (
        <div
          className="absolute right-0 top-full mt-1 z-[200] min-w-[220px]"
          style={{
            background: "#0a0e1a",
            border: "1px solid rgba(255,140,0,0.2)",
            borderRadius: 6,
            padding: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="block rounded-full flex-shrink-0"
              style={{ width: 8, height: 8, background: color, boxShadow: `0 0 6px ${color}` }}
            />
            <span className="text-[11px] font-mono font-bold" style={{ color }}>
              {label}
            </span>
          </div>

          <div className="flex gap-3 mb-3 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span style={{ color: HEALTH_COLORS.green }}>{status.greenCount} ok</span>
            {status.yellowCount > 0 && (
              <span style={{ color: HEALTH_COLORS.yellow }}>{status.yellowCount} warn</span>
            )}
            {status.redCount > 0 && (
              <span style={{ color: HEALTH_COLORS.red }}>{status.redCount} err</span>
            )}
            <span>{status.totalAgents} agents</span>
          </div>

          <div className="space-y-1 max-h-[160px] overflow-y-auto">
            {status.agents.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.5)", maxWidth: 130 }}>
                  {agent.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {agent.errorCount > 0 && (
                    <span className="text-[9px] font-mono" style={{ color: "#ef4444" }}>
                      {agent.errorCount}e
                    </span>
                  )}
                  <span
                    className="block rounded-full flex-shrink-0"
                    style={{
                      width: 6,
                      height: 6,
                      background: HEALTH_COLORS[agent.health] ?? HEALTH_COLORS.green,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
