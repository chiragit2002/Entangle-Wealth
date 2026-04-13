import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Layout } from "@/components/layout/Layout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { authFetch } from "@/lib/authFetch";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Activity, Zap } from "lucide-react";

interface AuditLog {
  id: number;
  pageUrl: string;
  issueType: string;
  severity: string;
  componentName: string | null;
  errorMessage: string | null;
  sessionId: string | null;
  timestamp: string;
}

interface UxSignal {
  id: number;
  pageUrl: string;
  signalType: string;
  elementSelector: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

interface ApiHealth {
  endpoint: string;
  avgMs: number;
  lastStatus: number;
  lastChecked: string;
  isHealthy: boolean;
  label?: string;
}

interface AuditStats {
  errorRate: { hour: string; count: number }[];
  signalCounts: { signalType: string; count: number }[];
  apiHealth: ApiHealth[];
  severityCounts: { severity: string; count: number }[];
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "#ff3366",
  HIGH: "#ff8c42",
  MEDIUM: "#FFD700",
  LOW: "#00D4FF",
};

const SYSTEM_SERVICES = [
  { label: "Trading", endpoint: "/api/alpaca/positions" },
  { label: "TaxFlow", endpoint: "/api/taxgpt" },
  { label: "Auth", endpoint: "/api/healthz" },
  { label: "News Feed", endpoint: "/api/news" },
  { label: "Leaderboard", endpoint: "/api/gamification/leaderboard" },
];

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLOR[severity] || "#a0a0b0";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      {severity}
    </span>
  );
}

function StatusDot({ status }: { status: number | null }) {
  if (!status || status === 0) {
    return <span className="inline-block w-2 h-2 rounded-full bg-gray-500" title="Unknown" />;
  }
  if (status >= 200 && status < 300) {
    return <span className="inline-block w-2 h-2 rounded-full bg-[#00FF88]" title="OK" />;
  }
  if (status >= 400 && status < 500) {
    return <span className="inline-block w-2 h-2 rounded-full bg-[#FFD700]" title="Client Error" />;
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-[#ff3366]" title="Error" />;
}

function HealthColor(ms: number): string {
  if (ms < 300) return "#00FF88";
  if (ms < 1000) return "#FFD700";
  return "#ff3366";
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border border-[#1a2a4a] rounded bg-[#060c1a] overflow-hidden ${className ?? ""}`}
    >
      <div className="px-4 py-2 border-b border-[#1a2a4a] bg-[#0a1525]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#4a8ab5]">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SystemStatusPanel({ apiHealth }: { apiHealth: ApiHealth[] }) {
  return (
    <Panel title="SYSTEM STATUS">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {SYSTEM_SERVICES.map((svc) => {
          const match = apiHealth.find((h) => h.endpoint === svc.endpoint);
          const isOk = match?.isHealthy;
          const hasData = match !== undefined;
          const color = !hasData ? "#4a6a85" : isOk ? "#00FF88" : "#ff3366";

          return (
            <div
              key={svc.label}
              className="flex flex-col items-center gap-1.5 p-3 border border-[#1a2a4a] rounded bg-[#0a1525]"
            >
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span className="text-[10px] font-mono text-[#8aabc8] uppercase tracking-wider text-center">
                {svc.label}
              </span>
              <span
                className="text-[10px] font-bold font-mono"
                style={{ color }}
              >
                {!hasData ? "PENDING" : isOk ? "ONLINE" : "ERROR"}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function RecentIssuesPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const { data, isLoading } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await authFetch("/audit/logs?limit=20", getToken);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <Panel title="RECENT ISSUES" className="h-[340px]">
      <div className="overflow-y-auto h-full space-y-1.5 pr-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-4 h-4 text-[#4a8ab5] animate-spin" />
          </div>
        )}
        {data?.logs.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-6 h-6 text-[#00FF88]/40 mx-auto mb-2" />
            <p className="text-[#4a8ab5] text-xs font-mono">NO ISSUES LOGGED</p>
          </div>
        )}
        {data?.logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 px-3 py-2 bg-[#0a1525] border border-[#1a2a4a] rounded text-xs font-mono"
          >
            <SeverityBadge severity={log.severity} />
            <div className="flex-1 min-w-0">
              <p className="text-[#8aabc8] truncate">{log.issueType}</p>
              {log.errorMessage && (
                <p className="text-[#4a6a85] text-[10px] truncate mt-0.5">{log.errorMessage}</p>
              )}
            </div>
            <p className="text-[#2a4a65] text-[10px] flex-shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function UxSignalsPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const { data } = useQuery<AuditStats>({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      const res = await authFetch("/audit/stats", getToken);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const signalMap = Object.fromEntries(
    (data?.signalCounts ?? []).map((s) => [s.signalType, s.count])
  );

  const signals = [
    { label: "RAGE CLICKS", key: "rage_click", color: "#ff3366", icon: "💢" },
    { label: "DEAD CLICKS", key: "dead_click", color: "#FFD700", icon: "🖱️" },
    { label: "FORM ABANDONS", key: "form_abandonment", color: "#ff8c42", icon: "📋" },
    { label: "SCROLL DEPTH EVENTS", key: "scroll_depth", color: "#00D4FF", icon: "📜" },
  ];

  return (
    <Panel title="UX SIGNALS (24H)">
      <div className="grid grid-cols-2 gap-3">
        {signals.map((s) => (
          <div
            key={s.key}
            className="p-3 border border-[#1a2a4a] rounded bg-[#0a1525]"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{s.icon}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: s.color }}>
                {s.label}
              </span>
            </div>
            <p className="text-2xl font-mono font-bold" style={{ color: s.color }}>
              {(signalMap[s.key] ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ApiHealthPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const { data } = useQuery<AuditStats>({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      const res = await authFetch("/audit/stats", getToken);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const checks = data?.apiHealth ?? [];

  return (
    <Panel title="API HEALTH">
      <div className="space-y-2">
        {checks.length === 0 && (
          <p className="text-[#4a6a85] text-xs font-mono text-center py-4">
            NO HEALTH DATA YET — MONITOR STARTING...
          </p>
        )}
        {checks.map((c) => (
          <div
            key={c.endpoint}
            className="flex items-center gap-3 px-3 py-2 bg-[#0a1525] border border-[#1a2a4a] rounded"
          >
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: c.isHealthy ? "#00FF88" : "#ff3366" }}
              title={c.isHealthy ? "Healthy" : "Unhealthy"}
            />
            <p className="flex-1 text-[11px] font-mono text-[#8aabc8] truncate">
              {c.label || c.endpoint}
            </p>
            <p
              className="text-[11px] font-mono font-bold"
              style={{ color: HealthColor(c.avgMs) }}
            >
              {c.avgMs}ms
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ErrorRateChart({ getToken }: { getToken: () => Promise<string | null> }) {
  const { data } = useQuery<AuditStats>({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      const res = await authFetch("/audit/stats", getToken);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const chartData = (data?.errorRate ?? []).map((d) => ({
    hour: new Date(d.hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    errors: d.count,
  }));

  return (
    <Panel title="ERROR RATE — LAST 24H">
      <div style={{ height: 200 }}>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#4a6a85] text-xs font-mono">NO ERROR DATA</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3366" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff3366" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2a4a" />
              <XAxis dataKey="hour" tick={{ fill: "#4a6a85", fontSize: 9, fontFamily: "monospace" }} />
              <YAxis tick={{ fill: "#4a6a85", fontSize: 9, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ background: "#060c1a", border: "1px solid #1a2a4a", fontSize: 11, fontFamily: "monospace" }}
                labelStyle={{ color: "#8aabc8" }}
                itemStyle={{ color: "#ff3366" }}
              />
              <Area
                type="monotone"
                dataKey="errors"
                stroke="#ff3366"
                strokeWidth={1.5}
                fill="url(#errorGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

export default function AdminAudit() {
  const isAdmin = useIsAdmin();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const [tick, setTick] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setLastRefresh(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = useCallback(() => {
    setTick((t) => t + 1);
    setLastRefresh(new Date());
  }, []);

  const { data: statsData } = useQuery<AuditStats>({
    queryKey: ["audit-stats", tick],
    queryFn: async () => {
      const res = await authFetch("/audit/stats", getToken);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: isAdmin === true,
    staleTime: 15_000,
  });

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-6 h-6 text-[#4a8ab5] animate-spin mx-auto mb-3" />
          <p className="text-[#4a6a85] text-sm font-mono">CHECKING ACCESS...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const criticalCount = statsData?.severityCounts.find(s => s.severity === "CRITICAL")?.count ?? 0;
  const highCount = statsData?.severityCounts.find(s => s.severity === "HIGH")?.count ?? 0;

  return (
    <Layout>
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(to bottom, #050a15, #060c1a)",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        }}
      >
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1a2a4a]">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Activity className="w-5 h-5 text-[#00FF88]" />
                <h1 className="text-base font-bold font-mono uppercase tracking-widest text-[#8aabc8]">
                  AUDIT DASHBOARD
                </h1>
                <span className="text-[10px] font-mono text-[#2a4a65] border border-[#1a2a4a] px-2 py-0.5 rounded">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#2a4a65]">
                AUTO-REFRESH · LAST UPDATE: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff3366]/10 border border-[#ff3366]/30 rounded text-[#ff3366] text-[10px] font-mono animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  {criticalCount} CRITICAL
                </div>
              )}
              {highCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff8c42]/10 border border-[#ff8c42]/30 rounded text-[#ff8c42] text-[10px] font-mono">
                  <Zap className="w-3 h-3" />
                  {highCount} HIGH
                </div>
              )}
              <button
                onClick={handleManualRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-[#0a1525] border border-[#1a2a4a] rounded text-[#4a8ab5] hover:text-[#8aabc8] hover:border-[#2a4a65] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                REFRESH
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <SystemStatusPanel apiHealth={statsData?.apiHealth ?? []} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RecentIssuesPanel getToken={getToken} />
              <UxSignalsPanel getToken={getToken} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ErrorRateChart getToken={getToken} />
              <ApiHealthPanel getToken={getToken} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1a2a4a] flex items-center justify-between">
            <p className="text-[10px] font-mono text-[#2a4a65]">
              ENTANGLEWEALTH · SELF-AUDITING SYSTEM v1.0
            </p>
            <p className="text-[10px] font-mono text-[#2a4a65]">
              NEXT AUTO-REFRESH IN ~30S
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
