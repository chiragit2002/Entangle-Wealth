import { useState, useCallback, useEffect, useMemo } from "react";
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
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Activity,
  Bug,
  Flame,
  Clock,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const SENTRY_ORG = "entaglewealth";
const SENTRY_BASE = `https://sentry.io/organizations/${SENTRY_ORG}`;

interface SentryIssue {
  id: string;
  title: string;
  level: string;
  status: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  culprit: string;
  _project: string;
}

interface IssueDetail {
  issue: SentryIssue & {
    metadata?: { value?: string };
    tags?: { key: string; value: string }[];
  };
  latestEvent: {
    entries?: Array<{
      type: string;
      data: {
        values?: Array<{
          type: string;
          value: string;
          stacktrace?: {
            frames?: Array<{
              filename: string;
              function: string;
              lineNo: number;
              inApp?: boolean;
            }>;
          };
        }>;
      };
    }>;
  } | null;
  tags: Array<{
    key: string;
    name: string;
    topValues: Array<{ value: string; count: number }>;
  }>;
}

interface Summary {
  totalUnresolved: number;
  criticalCount: number;
  errorCount: number;
  events24h: number;
  trend: Array<{ ts: number; count: number }>;
}

type SortKey = "count" | "lastSeen" | "firstSeen" | "level" | "userCount";
type SortDir = "asc" | "desc";

const LEVEL_ORDER: Record<string, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
  debug: 4,
};

const LEVEL_COLOR: Record<string, string> = {
  fatal: "#ff3366",
  error: "#ff8c42",
  warning: "#FFB800",
  info: "#00D4FF",
  debug: "#a0a0b0",
};

const LEVEL_ICON: Record<string, typeof Bug> = {
  fatal: Flame,
  error: Bug,
  warning: AlertTriangle,
  info: CheckCircle2,
  debug: Activity,
};

function LevelBadge({ level }: { level: string }) {
  const color = LEVEL_COLOR[level] || "#a0a0b0";
  const Icon = LEVEL_ICON[level] || Bug;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      <Icon className="w-3 h-3" />
      {level.toUpperCase()}
    </span>
  );
}

function ProjectBadge({ project }: { project: string }) {
  const isFrontend = project?.includes("frontend");
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
        isFrontend
          ? "text-[#a78bfa] border-[#a78bfa]/30 bg-[#a78bfa]/10"
          : "text-[#34d399] border-[#34d399]/30 bg-[#34d399]/10"
      }`}
    >
      {isFrontend ? "frontend" : "backend"}
    </span>
  );
}

function StackTrace({
  entries,
}: {
  entries: IssueDetail["latestEvent"];
}) {
  if (!entries?.entries)
    return <p className="text-white/30 text-xs">No stack trace available</p>;

  const exceptionEntry = entries.entries.find((e) => e.type === "exception");
  if (!exceptionEntry?.data?.values?.length)
    return <p className="text-white/30 text-xs">No exception data</p>;

  const exception = exceptionEntry.data.values[0];
  const frames =
    exception.stacktrace?.frames?.filter((f) => f.inApp).slice(-5) || [];

  return (
    <div className="space-y-2">
      <div className="px-3 py-2 bg-[#ff3366]/10 border border-[#ff3366]/20 rounded-lg">
        <p className="text-[#ff3366] text-xs font-mono font-bold">
          {exception.type}
        </p>
        <p className="text-white/70 text-xs mt-0.5 break-all">
          {exception.value}
        </p>
      </div>
      {frames.length > 0 && (
        <div className="space-y-1">
          {frames.reverse().map((frame, i) => (
            <div
              key={i}
              className="px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded font-mono text-[10px]"
            >
              <span className="text-[#00D4FF]">{frame.filename}</span>
              <span className="text-white/40">:{frame.lineNo}</span>
              <span className="text-white/60"> in </span>
              <span className="text-[#FFB800]">{frame.function || "?"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IssueDetailPanel({
  issueId,
  getToken,
  permalink,
}: {
  issueId: string;
  getToken: () => Promise<string | null>;
  permalink?: string;
}) {
  const { data, isLoading, error } = useQuery<IssueDetail>({
    queryKey: ["sentry-issue-detail", issueId],
    queryFn: async () => {
      const res = await authFetch(`/sentry/issues/${issueId}`, getToken);
      if (!res.ok) throw new Error("Failed to fetch issue details");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <RefreshCw className="w-4 h-4 text-[#00D4FF] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-[#ff3366] text-xs py-4 px-4">
        Failed to load issue details
      </p>
    );
  }

  const { issue, latestEvent, tags } = data;

  return (
    <div className="border-t border-white/[0.06] bg-white/[0.01] px-5 py-4 space-y-5">
      {issue.metadata?.value && (
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
            Error Message
          </p>
          <p className="text-white/80 text-xs break-all font-mono bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.06]">
            {issue.metadata.value}
          </p>
        </div>
      )}

      <div>
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
          Stack Trace
        </p>
        <StackTrace entries={latestEvent} />
      </div>

      {tags.length > 0 && (
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
            Tag Distribution
          </p>
          <div className="grid grid-cols-2 gap-3">
            {tags.map((tag) => (
              <div
                key={tag.key}
                className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3"
              >
                <p className="text-[10px] text-white/50 font-mono mb-2">
                  {tag.name || tag.key}
                </p>
                <div className="space-y-1">
                  {tag.topValues?.slice(0, 4).map((v) => (
                    <div key={v.value} className="flex items-center gap-2">
                      <div className="flex-1 text-[10px] text-white/70 truncate font-mono">
                        {v.value}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {v.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <a
        href={
          permalink ||
          issue.permalink ||
          `${SENTRY_BASE}/issues/${issueId}/`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View full issue in Sentry
      </a>
    </div>
  );
}

function IssueRow({
  issue,
  getToken,
}: {
  issue: SentryIssue;
  getToken: () => Promise<string | null>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <LevelBadge level={issue.level} />
              <ProjectBadge project={issue._project} />
              {issue.status === "resolved" && (
                <span className="text-[10px] text-[#00FF41] border border-[#00FF41]/30 bg-[#00FF41]/10 px-2 py-0.5 rounded-full">
                  resolved
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-white/80 truncate">
              {issue.title}
            </p>
            <p className="text-[10px] text-white/30 font-mono mt-0.5 truncate">
              {issue.culprit}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-sm font-mono font-bold text-white/70">
                {Number(issue.count).toLocaleString()}
              </p>
              <p className="text-[10px] text-white/30">events</p>
            </div>
            <div className="text-right hidden lg:block">
              <p className="text-xs font-mono text-white/50">
                {new Date(issue.firstSeen).toLocaleDateString()}
              </p>
              <p className="text-[10px] text-white/30">first seen</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-mono text-white/50">
                {new Date(issue.lastSeen).toLocaleDateString()}
              </p>
              <p className="text-[10px] text-white/30">last seen</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs font-mono text-white/50">
                {issue.userCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-white/30">users</p>
            </div>
            <span
              className={`hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                issue.status === "resolved"
                  ? "bg-[#00FF41]/10 text-[#00FF41] border-[#00FF41]/30"
                  : issue.status === "ignored"
                  ? "bg-white/5 text-white/30 border-white/10"
                  : "bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/30"
              }`}
            >
              {issue.status}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-white/30" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/30" />
            )}
          </div>
        </div>
      </button>
      {expanded && (
        <IssueDetailPanel
          issueId={issue.id}
          getToken={getToken}
          permalink={issue.permalink}
        />
      )}
    </div>
  );
}

const REFRESH_INTERVALS = [
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "count", label: "Events" },
  { key: "lastSeen", label: "Last Seen" },
  { key: "firstSeen", label: "First Seen" },
  { key: "level", label: "Level" },
  { key: "userCount", label: "Users" },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="w-3.5 h-3.5 text-white/20" />;
  return dir === "asc" ? (
    <ArrowUp className="w-3.5 h-3.5 text-[#00D4FF]" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5 text-[#00D4FF]" />
  );
}

export default function AdminMonitoring() {
  const isAdmin = useIsAdmin();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();

  const [filterProject, setFilterProject] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("unresolved");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const issuesQuery = useQuery<{ issues: SentryIssue[]; warnings?: string[] }>({
    queryKey: ["sentry-issues", filterProject, filterLevel, filterStatus, tick],
    queryFn: async () => {
      const params = new URLSearchParams({ status: filterStatus, limit: "50" });
      if (filterProject !== "all") params.set("project", filterProject);
      if (filterLevel !== "all") params.set("level", filterLevel);
      const res = await authFetch(`/sentry/issues?${params}`, getToken);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Request failed with status ${res.status}`);
      }
      return res.json();
    },
    enabled: isAdmin === true,
    staleTime: 30_000,
    retry: false,
  });

  const summaryQuery = useQuery<Summary>({
    queryKey: ["sentry-summary", tick],
    queryFn: async () => {
      const res = await authFetch("/sentry/summary", getToken);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Request failed with status ${res.status}`);
      }
      return res.json();
    },
    enabled: isAdmin === true,
    staleTime: 30_000,
    retry: false,
  });

  const handleRefresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  const sortedAndFiltered = useMemo(() => {
    const issues = issuesQuery.data?.issues || [];
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? issues.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.culprit?.toLowerCase().includes(q)
        )
      : issues;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "count":
          cmp = Number(a.count) - Number(b.count);
          break;
        case "userCount":
          cmp = a.userCount - b.userCount;
          break;
        case "lastSeen":
          cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
          break;
        case "firstSeen":
          cmp = new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime();
          break;
        case "level":
          cmp = (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [issuesQuery.data, searchQuery, sortKey, sortDir]);

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-6 h-6 text-white/20 animate-spin mx-auto mb-3" />
          <p className="text-white/30 text-sm">Checking access...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const summary = summaryQuery.data;
  const isLoading = issuesQuery.isLoading || summaryQuery.isLoading;
  const hasError = issuesQuery.isError || summaryQuery.isError;
  const errorMsg =
    (issuesQuery.error as Error)?.message ||
    (summaryQuery.error as Error)?.message ||
    "";

  const trendData = (summary?.trend || []).map((d) => ({
    time: new Date(d.ts * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    events: d.count,
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-[#020204] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-[#00D4FF]" />
                Sentry Monitoring
              </h1>
              <p className="text-white/40 text-sm mt-1">
                Live error tracking —{" "}
                <span className="font-mono text-white/60">{SENTRY_ORG}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs text-white/40">Auto-refresh:</span>
                <div className="flex gap-1">
                  {REFRESH_INTERVALS.map((i) => (
                    <button
                      key={i.value}
                      onClick={() => setRefreshInterval(i.value)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        refreshInterval === i.value
                          ? "bg-[#00D4FF]/20 border-[#00D4FF]/50 text-[#00D4FF]"
                          : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white/70"
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/[0.05] border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white/60 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Unresolved Issues",
                value: summary?.totalUnresolved ?? "—",
                icon: XCircle,
                color: "#ff3366",
              },
              {
                label: "Fatal Issues",
                value: summary?.criticalCount ?? "—",
                icon: Flame,
                color: "#ff3366",
              },
              {
                label: "Error Issues",
                value: summary?.errorCount ?? "—",
                icon: Bug,
                color: "#ff8c42",
              },
              {
                label: "Events (24h)",
                value: (summary?.events24h ?? 0).toLocaleString(),
                icon: Activity,
                color: "#00D4FF",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="bg-[#0A0E1A] border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {summaryQuery.isLoading ? (
                    <span className="text-white/20 animate-pulse">—</span>
                  ) : (
                    value
                  )}
                </div>
              </div>
            ))}
          </div>

          {trendData.length > 0 && (
            <div className="bg-[#0A0E1A] border border-white/10 rounded-xl p-5 mb-8">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                Error Trend — Last 24h
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="sentryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0A0E1A",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    fill="url(#sentryGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-[#0A0E1A] border border-white/10 rounded-xl p-4 mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues by title or file..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/40"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
                  Project
                </label>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="h-8 px-3 text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-[#00D4FF]/40 appearance-none"
                >
                  <option value="all" className="bg-[#0A0E1A]">All Projects</option>
                  <option value="entangle-wealth-backend" className="bg-[#0A0E1A]">Backend</option>
                  <option value="entangle-wealth-frontend" className="bg-[#0A0E1A]">Frontend</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
                  Level
                </label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="h-8 px-3 text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-[#00D4FF]/40 appearance-none"
                >
                  <option value="all" className="bg-[#0A0E1A]">All Levels</option>
                  <option value="fatal" className="bg-[#0A0E1A]">Fatal</option>
                  <option value="error" className="bg-[#0A0E1A]">Error</option>
                  <option value="warning" className="bg-[#0A0E1A]">Warning</option>
                  <option value="info" className="bg-[#0A0E1A]">Info</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-8 px-3 text-xs bg-white/[0.04] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-[#00D4FF]/40 appearance-none"
                >
                  <option value="unresolved" className="bg-[#0A0E1A]">Unresolved</option>
                  <option value="resolved" className="bg-[#0A0E1A]">Resolved</option>
                  <option value="all" className="bg-[#0A0E1A]">All</option>
                </select>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-white/30">Showing</p>
                <p className="text-xs font-mono text-white/60">
                  {issuesQuery.isLoading ? "..." : `${sortedAndFiltered.length} issues`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-white/[0.05]">
              <span className="text-[10px] text-white/30 mr-1">Sort:</span>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded border transition-colors ${
                    sortKey === key
                      ? "bg-[#00D4FF]/10 border-[#00D4FF]/40 text-[#00D4FF]"
                      : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/70"
                  }`}
                >
                  {label}
                  <SortIcon active={sortKey === key} dir={sortDir} />
                </button>
              ))}
            </div>
          </div>

          {hasError && (
            <div className="bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-[#ff3366] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#ff3366] text-sm font-semibold">
                    Failed to load Sentry data
                  </p>
                  <p className="text-white/50 text-xs mt-1 break-all">
                    {errorMsg || "Unknown error"}
                  </p>
                  <p className="text-white/40 text-xs mt-2">
                    Ensure{" "}
                    <span className="font-mono text-white/60">SENTRY_AUTH_TOKEN</span>{" "}
                    is set to a valid token from{" "}
                    <a
                      href="https://sentry.io/settings/account/api/auth-tokens/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00D4FF] underline"
                    >
                      sentry.io/settings/account/api/auth-tokens
                    </a>{" "}
                    with scopes: org:read, project:read, event:read.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {issuesQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-pulse"
                />
              ))
            ) : !hasError && sortedAndFiltered.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.01] border border-white/[0.06] rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-[#00FF41]/40 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No issues found</p>
                <p className="text-white/20 text-xs mt-1">
                  {filterStatus === "unresolved"
                    ? "All clear — no unresolved issues"
                    : "No issues matching current filters"}
                </p>
              </div>
            ) : (
              sortedAndFiltered.map((issue) => (
                <IssueRow key={issue.id} issue={issue} getToken={getToken} />
              ))
            )}
          </div>

          {sortedAndFiltered.length > 0 && (
            <div className="mt-6 text-center text-xs text-white/20 font-mono">
              Showing {sortedAndFiltered.length} issues · Auto-refreshes every{" "}
              {refreshInterval}s
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
