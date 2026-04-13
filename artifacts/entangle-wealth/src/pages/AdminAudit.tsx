import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { RefreshCw, AlertTriangle, CheckCircle2, Activity, Zap, Play, Eye, ThumbsUp, Camera } from "lucide-react";

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

interface CrawlRun {
  id: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalPages: number;
  totalIssues: number;
  totalRegressions: number;
  triggeredBy: string;
  errorMessage: string | null;
}

interface VisualBaseline {
  id: number;
  pageUrl: string;
  viewport: string;
  screenshotPath: string;
  baselinePath: string | null;
  diffPath: string | null;
  diffPercent: number;
  isRegression: boolean;
  approvedAt: string | null;
  isCurrent: boolean;
  crawlRunId: number | null;
  createdAt: string;
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

function HealthColor(ms: number): string {
  if (ms < 300) return "#00FF88";
  if (ms < 1000) return "#FFD700";
  return "#ff3366";
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#1a2a4a] rounded bg-[#060c1a] overflow-hidden ${className ?? ""}`}>
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
            <div key={svc.label} className="flex flex-col items-center gap-1.5 p-3 border border-[#1a2a4a] rounded bg-[#0a1525]">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-[10px] font-mono text-[#8aabc8] uppercase tracking-wider text-center">{svc.label}</span>
              <span className="text-[10px] font-bold font-mono" style={{ color }}>
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
          <div key={log.id} className="flex items-start gap-3 px-3 py-2 bg-[#0a1525] border border-[#1a2a4a] rounded text-xs font-mono">
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
          <div key={s.key} className="p-3 border border-[#1a2a4a] rounded bg-[#0a1525]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{s.icon}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
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
          <p className="text-[#4a6a85] text-xs font-mono text-center py-4">NO HEALTH DATA YET</p>
        )}
        {checks.map((c) => (
          <div key={c.endpoint} className="flex items-center gap-3 px-3 py-2 bg-[#0a1525] border border-[#1a2a4a] rounded">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.isHealthy ? "#00FF88" : "#ff3366" }} />
            <p className="flex-1 text-[11px] font-mono text-[#8aabc8] truncate">{c.label || c.endpoint}</p>
            <p className="text-[11px] font-mono font-bold" style={{ color: HealthColor(c.avgMs) }}>{c.avgMs}ms</p>
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
              <Area type="monotone" dataKey="errors" stroke="#ff3366" strokeWidth={1.5} fill="url(#errorGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Panel>
  );
}

function CrawlRunsPanel({ getToken, onTriggerCrawl, isCrawling }: {
  getToken: () => Promise<string | null>;
  onTriggerCrawl: (interactive: boolean) => void;
  isCrawling: boolean;
}) {
  const { data } = useQuery<{ runs: CrawlRun[]; activePid: number | null }>({
    queryKey: ["crawl-runs"],
    queryFn: async () => {
      const res = await authFetch("/audit/crawl/runs", getToken);
      if (!res.ok) throw new Error("Failed to fetch crawl runs");
      return res.json();
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const STATUS_COLORS: Record<string, string> = {
    pending: "#FFD700",
    running: "#00D4FF",
    completed: "#00FF88",
    failed: "#ff3366",
  };

  const [interactive, setInteractive] = useState(false);

  return (
    <Panel title="CRAWLER CONTROL">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono text-[#4a6a85]">
          {data?.activePid ? `CRAWL ACTIVE (PID ${data.activePid})` : "NO ACTIVE CRAWL"}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#4a6a85] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={interactive}
              onChange={(e) => setInteractive(e.target.checked)}
              className="accent-[#FFD700]"
            />
            INTERACTIVE
          </label>
          <button
            onClick={() => onTriggerCrawl(interactive)}
            disabled={isCrawling || !!data?.activePid}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-[#00FF88]/10 border border-[#00FF88]/30 rounded text-[#00FF88] hover:bg-[#00FF88]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isCrawling ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            {isCrawling ? "STARTING..." : "RUN CRAWL NOW"}
          </button>
        </div>
      </div>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {(!data?.runs || data.runs.length === 0) && (
          <p className="text-[#4a6a85] text-xs font-mono text-center py-4">
            NO CRAWL RUNS YET — CLICK "RUN CRAWL NOW" TO START
          </p>
        )}
        {data?.runs.map((run) => (
          <div key={run.id} className="flex items-center gap-3 px-3 py-2 bg-[#0a1525] border border-[#1a2a4a] rounded">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[run.status] ?? "#4a6a85" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-[#8aabc8]">
                Run #{run.id} · {run.triggeredBy}
              </p>
              <p className="text-[10px] font-mono text-[#4a6a85]">
                {new Date(run.startedAt).toLocaleString()} ·{" "}
                {run.totalPages} pages · {run.totalIssues} issues · {run.totalRegressions} regressions
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono uppercase" style={{ color: STATUS_COLORS[run.status] ?? "#4a6a85" }}>
              {run.status}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ScreenshotImage({ path: screenshotPath, label, getToken }: {
  path: string | null;
  label: string;
  getToken: () => Promise<string | null>;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!screenshotPath) return;
    setLoading(true);
    setError(false);
    try {
      const runMatch = screenshotPath.match(/run-(\d+)[/\\]/);
      if (!runMatch) { setError(true); setLoading(false); return; }
      const runId = runMatch[1];
      const afterRun = screenshotPath.split(`run-${runId}/`)[1] || screenshotPath.split(`run-${runId}\\`)[1];
      if (!afterRun) { setError(true); setLoading(false); return; }
      const isDiff = afterRun.startsWith("diffs/") || afterRun.startsWith("diffs\\");
      const filename = isDiff
        ? afterRun.replace(/^diffs[/\\]/, "")
        : afterRun;
      const endpoint = isDiff
        ? `/api/audit/screenshots/${runId}/diffs/${filename}`
        : `/api/audit/screenshots/${runId}/${filename}`;
      const token = await getToken();
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { setError(true); setLoading(false); return; }
      const blob = await res.blob();
      setImgSrc(URL.createObjectURL(blob));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [screenshotPath, getToken]);

  if (!screenshotPath) {
    return (
      <div className="flex flex-col items-center justify-center h-24 bg-[#0a1525] border border-[#1a2a4a] rounded">
        <Camera className="w-4 h-4 text-[#2a4a65] mb-1" />
        <p className="text-[9px] font-mono text-[#2a4a65]">NO {label.toUpperCase()}</p>
      </div>
    );
  }

  if (!imgSrc && !loading && !error) {
    return (
      <button onClick={load} className="flex flex-col items-center justify-center h-24 w-full bg-[#0a1525] border border-[#1a2a4a] rounded hover:border-[#2a4a65] transition-colors">
        <Eye className="w-4 h-4 text-[#4a6a85] mb-1" />
        <p className="text-[9px] font-mono text-[#4a6a85]">LOAD {label.toUpperCase()}</p>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 bg-[#0a1525] border border-[#1a2a4a] rounded">
        <RefreshCw className="w-3 h-3 text-[#4a8ab5] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-24 bg-[#0a1525] border border-[#1a2a4a] rounded">
        <p className="text-[9px] font-mono text-[#ff3366]">LOAD ERROR</p>
      </div>
    );
  }

  return (
    <div className="border border-[#1a2a4a] rounded overflow-hidden">
      <img src={imgSrc!} alt={label} className="w-full h-auto max-h-40 object-cover object-top" />
      <p className="text-[9px] font-mono text-[#4a6a85] text-center py-1 bg-[#0a1525]">{label}</p>
    </div>
  );
}

function VisualRegressionsPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const [onlyRegressions, setOnlyRegressions] = useState(true);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ regressions: VisualBaseline[] }>({
    queryKey: ["visual-regressions", onlyRegressions],
    queryFn: async () => {
      const param = onlyRegressions ? "?onlyRegressions=true" : "";
      const res = await authFetch(`/audit/visual-regressions${param}`, getToken);
      if (!res.ok) throw new Error("Failed to fetch visual regressions");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authFetch(`/audit/visual-regressions/${id}/approve`, getToken, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve baseline");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visual-regressions"] });
    },
  });

  const items = data?.regressions ?? [];

  return (
    <Panel title="VISUAL REGRESSIONS">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyRegressions(true)}
            className={`px-3 py-1 text-[10px] font-mono uppercase rounded border transition-colors ${
              onlyRegressions
                ? "bg-[#ff3366]/10 border-[#ff3366]/30 text-[#ff3366]"
                : "bg-[#0a1525] border-[#1a2a4a] text-[#4a6a85] hover:text-[#8aabc8]"
            }`}
          >
            REGRESSIONS ONLY
          </button>
          <button
            onClick={() => setOnlyRegressions(false)}
            className={`px-3 py-1 text-[10px] font-mono uppercase rounded border transition-colors ${
              !onlyRegressions
                ? "bg-[#4a8ab5]/10 border-[#4a8ab5]/30 text-[#4a8ab5]"
                : "bg-[#0a1525] border-[#1a2a4a] text-[#4a6a85] hover:text-[#8aabc8]"
            }`}
          >
            ALL SNAPSHOTS
          </button>
        </div>
        <p className="text-[10px] font-mono text-[#4a6a85]">{items.length} RESULTS</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="w-4 h-4 text-[#4a8ab5] animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-10">
          <CheckCircle2 className="w-8 h-8 text-[#00FF88]/30 mx-auto mb-2" />
          <p className="text-[#4a8ab5] text-xs font-mono">
            {onlyRegressions ? "NO VISUAL REGRESSIONS DETECTED" : "NO SCREENSHOTS YET — RUN A CRAWL FIRST"}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded p-3 ${item.isRegression ? "border-[#ff3366]/30 bg-[#ff3366]/5" : "border-[#1a2a4a] bg-[#0a1525]"}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {item.isRegression && (
                    <span className="text-[10px] font-mono font-bold text-[#ff3366] bg-[#ff3366]/10 border border-[#ff3366]/30 px-2 py-0.5 rounded">
                      REGRESSION
                    </span>
                  )}
                  {item.approvedAt && (
                    <span className="text-[10px] font-mono text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/30 px-2 py-0.5 rounded">
                      APPROVED
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#4a8ab5] border border-[#1a2a4a] px-2 py-0.5 rounded uppercase">
                    {item.viewport}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#8aabc8] truncate">{item.pageUrl}</p>
                <p className="text-[10px] font-mono text-[#4a6a85] mt-0.5">
                  {new Date(item.createdAt).toLocaleString()} ·{" "}
                  {item.diffPercent != null ? `${Number(item.diffPercent).toFixed(2)}% pixel diff` : "no baseline diff"}
                </p>
              </div>
              {item.isRegression && !item.approvedAt && (
                <button
                  onClick={() => approveMutation.mutate(item.id)}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase bg-[#00FF88]/10 border border-[#00FF88]/30 rounded text-[#00FF88] hover:bg-[#00FF88]/20 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <ThumbsUp className="w-3 h-3" />
                  APPROVE
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ScreenshotImage path={item.baselinePath} label="Baseline" getToken={getToken} />
              <ScreenshotImage path={item.screenshotPath} label="Current" getToken={getToken} />
              <ScreenshotImage path={item.diffPath} label="Diff (red = changed)" getToken={getToken} />
            </div>
          </div>
        ))}
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
  const [isCrawling, setIsCrawling] = useState(false);
  const queryClient = useQueryClient();

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
    queryClient.invalidateQueries();
  }, [queryClient]);

  const handleTriggerCrawl = useCallback(async (interactive: boolean) => {
    setIsCrawling(true);
    try {
      const res = await authFetch("/audit/crawl", getToken, {
        method: "POST",
        body: JSON.stringify({ triggeredBy: "admin_ui", interactive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        alert(`Crawl failed: ${err.error || "Unknown error"}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ["crawl-runs"] });
      }
    } catch {
      alert("Failed to trigger crawl");
    } finally {
      setIsCrawling(false);
    }
  }, [getToken, queryClient]);

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

            <CrawlRunsPanel
              getToken={getToken}
              onTriggerCrawl={handleTriggerCrawl}
              isCrawling={isCrawling}
            />

            <VisualRegressionsPanel getToken={getToken} />
          </div>

          <div className="mt-6 pt-4 border-t border-[#1a2a4a] flex items-center justify-between">
            <p className="text-[10px] font-mono text-[#2a4a65]">
              ENTANGLEWEALTH · SELF-AUDITING SYSTEM v2.0 · PLAYWRIGHT CRAWLER · AUTO-CRAWLS EVERY 24H
            </p>
            <p className="text-[10px] font-mono text-[#2a4a65]">NEXT AUTO-REFRESH IN ~30S</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
