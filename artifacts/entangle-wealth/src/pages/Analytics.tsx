import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  BarChart3,
  Users,
  TrendingUp,
  Activity,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  Star,
  MessageSquare,
  ThumbsUp,
  Calendar,
  Timer,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FeedbackEntry {
  id: number;
  user_id: string;
  rating: number;
  comment?: string;
  category: string;
  admin_response?: string;
  created_at: string;
}

interface DashboardData {
  kpi: {
    totalUsers: number;
    dau: number;
    wau: number;
    mau: number;
    proUsers: number;
    businessUsers: number;
    freeUsers: number;
    conversionRate: number;
    totalEvents: number;
    mrr: number;
    arr: number;
    churnRate: number;
    ltv: number;
    visitors: number;
  };
  tierCounts: Record<string, number>;
  conversionFunnel: { stage: string; value: number }[];
  dailySignups: { date: string; count: number }[];
  featureUsage: { event: string; count: number }[];
  dailyEvents: { date: string; count: number }[];
  referralFunnel: { clicks: number; signups: number; conversions: number };
  contentByPlatform: { platform: string; status: string; count: number }[];
  feedback: {
    stats: { avgRating: number; totalCount: number; satisfactionRate: number };
    recent: FeedbackEntry[];
    categoryBreakdown: { category: string; count: number; avgRating: number }[];
    trend: { date: string; count: number; avgRating: number }[];
  };
}

const COLORS = ["#00B4D8", "#FFB800", "#00B4D8", "#ff3366", "#9c27b0", "#ff9800", "#4caf50", "#2196f3"];

type DatePreset = "7d" | "30d" | "90d" | "custom";

function formatEventName(event: string): string {
  return event.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  color = "#00B4D8",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 border transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.06)",
        boxShadow: `0 0 30px ${color}08`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-[#00B4D8]" : trend === "down" ? "text-[#ff3366]" : "text-white/40"}`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? "text-[#FFB800] fill-[#FFB800]" : "text-white/40"}`}
        />
      ))}
    </div>
  );
}

export default function Analytics() {
  const { getToken } = useAuth();
  const isAdmin = useIsAdmin();
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [drilldownEvent, setDrilldownEvent] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<{
    event: string;
    total: number;
    uniqueUsers: number;
    limit: number;
    offset: number;
    events: { id: number; userId: string; sessionId: string; properties: Record<string, unknown>; createdAt: string }[];
    dailyBreakdown: { date: string; count: number; uniqueUsers: number }[];
  } | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownOffset, setDrilldownOffset] = useState(0);
  const DRILLDOWN_LIMIT = 20;

  useEffect(() => {
    if (isAdmin === false) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  const buildQuery = useCallback(() => {
    if (datePreset === "custom" && customStart && customEnd) {
      return `?startDate=${customStart}&endDate=${customEnd}`;
    }
    const days = datePreset === "7d" ? 7 : datePreset === "90d" ? 90 : 30;
    return `?days=${days}`;
  }, [datePreset, customStart, customEnd]);

  const fetchDrilldown = useCallback(async (event: string, offset = 0) => {
    setDrilldownLoading(true);
    try {
      const baseQuery = buildQuery().replace("?", "&");
      const res = await authFetch(
        `/analytics/events/drilldown?event=${encodeURIComponent(event)}&limit=${DRILLDOWN_LIMIT}&offset=${offset}${baseQuery}`,
        getToken
      );
      if (res.ok) {
        const json = await res.json();
        setDrilldownData(json);
        setDrilldownOffset(offset);
      }
    } catch {
      // silently fail — drilldown is non-critical
    } finally {
      setDrilldownLoading(false);
    }
  }, [buildQuery, getToken]);

  const openDrilldown = useCallback((event: string) => {
    setDrilldownEvent(event);
    setDrilldownData(null);
    setDrilldownOffset(0);
    fetchDrilldown(event, 0);
  }, [fetchDrilldown]);

  const closeDrilldown = useCallback(() => {
    setDrilldownEvent(null);
    setDrilldownData(null);
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQuery();
      const res = await authFetch(`/analytics/dashboard${query}`, getToken);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Access denied" }));
        setError(body.error || "Failed to load");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, getToken]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        if (!document.hidden) fetchDashboard();
      }, 30000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, fetchDashboard]);

  const FUNNEL_COLORS = ["#00B4D8", "#FFB800", "#00B4D8", "#9c27b0"];
  const funnelData = data
    ? data.conversionFunnel.map((item, i) => ({
        name: item.stage,
        value: item.value,
        fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
      }))
    : [];

  const tierPieData = data
    ? Object.entries(data.tierCounts).map(([tier, count], i) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        value: count,
        fill: COLORS[i % COLORS.length],
      }))
    : [];

  return (
    <div className="min-h-screen" style={{ background: "#020204" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-[#00B4D8]" />
              Analytics Dashboard
            </h1>
            <p className="text-white/50 text-sm mt-1">Platform health metrics & user intelligence</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/admin/evolution")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: "rgba(255,215,0,0.1)",
                border: "1px solid rgba(255,215,0,0.3)",
                color: "#FFB800",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Evolution
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: autoRefresh ? "rgba(0,180,216,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${autoRefresh ? "rgba(0,180,216,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: autoRefresh ? "#00B4D8" : "rgba(255,255,255,0.5)",
              }}
            >
              <Timer className="w-3.5 h-3.5" />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </button>
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: "rgba(0,180,216,0.1)",
                border: "1px solid rgba(0,180,216,0.3)",
                color: "#00B4D8",
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div
          className="rounded-xl p-4 mb-6 border flex flex-wrap items-center gap-3"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <Calendar className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Date Range</span>
          {(["7d", "30d", "90d", "custom"] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: datePreset === preset ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${datePreset === preset ? "rgba(0,180,216,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: datePreset === preset ? "#00B4D8" : "rgba(255,255,255,0.5)",
              }}
            >
              {preset === "7d" ? "Last 7 days" : preset === "30d" ? "Last 30 days" : preset === "90d" ? "Last 90 days" : "Custom"}
            </button>
          ))}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg text-white focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <span className="text-white/30 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg text-white focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                onClick={fetchDashboard}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#00B4D8]"
                style={{ background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)" }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl p-6 text-center border border-[#ff3366]/30 bg-[#ff3366]/5">
            <p className="text-[#ff3366] text-lg font-semibold">{error}</p>
          </div>
        )}

        {loading && !data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl h-32 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <KPICard label="Total Users" value={data.kpi.totalUsers.toLocaleString()} icon={Users} color="#00B4D8" trend="up" />
              <KPICard label="DAU (24h)" value={data.kpi.dau.toLocaleString()} icon={Activity} color="#00B4D8" />
              <KPICard label="WAU (7d)" value={data.kpi.wau.toLocaleString()} icon={TrendingUp} color="#FFB800" />
              <KPICard label="MAU (30d)" value={data.kpi.mau.toLocaleString()} icon={Zap} color="#9c27b0" />
              <KPICard label="MRR" value={`$${data.kpi.mrr.toLocaleString()}`} icon={BarChart3} color="#00B4D8" trend="up" />
              <KPICard label="ARR" value={`$${data.kpi.arr.toLocaleString()}`} icon={TrendingUp} color="#FFB800" />
              <KPICard label="Churn Rate" value={`${data.kpi.churnRate}%`} icon={ArrowDownRight} color="#ff3366" trend={data.kpi.churnRate > 5 ? "down" : "neutral"} />
              <KPICard label="LTV" value={`$${data.kpi.ltv.toLocaleString()}`} icon={Target} color="#00B4D8" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="User Growth">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailySignups}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(8,8,20,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "white",
                          fontSize: "12px",
                        }}
                        labelFormatter={(v) => new Date(v).toLocaleDateString()}
                      />
                      <Line type="monotone" dataKey="count" stroke="#00B4D8" strokeWidth={2} dot={false} name="Signups" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Daily Event Volume">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyEvents}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="date"
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }}
                        tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(8,8,20,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "white",
                          fontSize: "12px",
                        }}
                        labelFormatter={(v) => new Date(v).toLocaleDateString()}
                      />
                      <Bar dataKey="count" fill="#00B4D8" radius={[4, 4, 0, 0]} name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <ChartCard title="Conversion Funnel: Visitor → Free → Pro → Business">
                <div className="space-y-4">
                  {funnelData.map((item) => {
                    const maxVal = funnelData[0].value || 1;
                    const pct = ((item.value / maxVal) * 100).toFixed(0);
                    return (
                      <div key={item.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/60">{item.name}</span>
                          <span className="text-white font-mono">{item.value.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-6 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-md transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: item.fill,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              <ChartCard title="User Tiers">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {tierPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(8,8,20,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "white",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  {tierPieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs text-white/60">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.fill }} />
                      {item.name}: {item.value}
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Referral Funnel">
                <div className="space-y-4">
                  {[
                    { label: "Clicks", value: data.referralFunnel.clicks, color: "#00B4D8" },
                    { label: "Signups", value: data.referralFunnel.signups, color: "#FFB800" },
                    { label: "Conversions", value: data.referralFunnel.conversions, color: "#00B4D8" },
                  ].map((item) => {
                    const maxVal = data.referralFunnel.clicks || 1;
                    const pct = ((item.value / maxVal) * 100).toFixed(0);
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-white/60">{item.label}</span>
                          <span className="text-white font-mono">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-6 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-md transition-all duration-700"
                            style={{ width: `${pct}%`, background: item.color, opacity: 0.8 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="Feature Usage (Top 20)">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.featureUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} />
                      <YAxis
                        type="category"
                        dataKey="event"
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                        width={130}
                        tickFormatter={formatEventName}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(8,8,20,0.95)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "white",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [value.toLocaleString(), "Events"]}
                        labelFormatter={formatEventName}
                      />
                      <Bar
                        dataKey="count"
                        fill="#00B4D8"
                        radius={[0, 4, 4, 0]}
                        name="Count"
                        cursor="pointer"
                        onClick={(entry: { event?: string; payload?: { event?: string } }) => {
                          const eventName = entry?.payload?.event ?? entry?.event;
                          if (eventName) openDrilldown(eventName);
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-white/50 mt-2 text-center">Click any bar to drill into event details</p>
              </ChartCard>

              <ChartCard title="Content by Platform & Status">
                {data.contentByPlatform.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {data.contentByPlatform.map((item, i) => (
                      <div key={`${item.platform}-${item.status}-${i}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-white/70">{item.platform}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.05)", color: item.status === "published" ? "#00B4D8" : item.status === "draft" ? "#FFB800" : "#fff6" }}>{item.status}</span>
                        </div>
                        <span className="text-white font-mono">{item.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-white/30 text-sm">
                    <div className="text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No content data yet</p>
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* User Feedback Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-[#FFB800]" />
                User Feedback
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <KPICard
                  label="Avg Satisfaction Rating"
                  value={data.feedback.stats.avgRating > 0 ? `${data.feedback.stats.avgRating} / 5` : "—"}
                  icon={Star}
                  color="#FFB800"
                />
                <KPICard
                  label="Total Feedback Submitted"
                  value={data.feedback.stats.totalCount.toLocaleString()}
                  icon={MessageSquare}
                  color="#00B4D8"
                />
                <KPICard
                  label="Satisfaction Rate (4-5★)"
                  value={data.feedback.stats.totalCount > 0 ? `${data.feedback.stats.satisfactionRate}%` : "—"}
                  icon={ThumbsUp}
                  color="#00B4D8"
                  trend={data.feedback.stats.satisfactionRate >= 70 ? "up" : data.feedback.stats.satisfactionRate > 0 ? "down" : "neutral"}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Satisfaction Trend">
                  {data.feedback.trend.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.feedback.trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis
                            dataKey="date"
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          />
                          <YAxis domain={[1, 5]} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(8,8,20,0.95)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              color: "white",
                              fontSize: "12px",
                            }}
                            labelFormatter={(v) => new Date(v).toLocaleDateString()}
                          />
                          <Line type="monotone" dataKey="avgRating" stroke="#FFB800" strokeWidth={2} dot={false} name="Avg Rating" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-white/30 text-sm">
                      <div className="text-center">
                        <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No feedback yet</p>
                      </div>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Category Breakdown">
                  {data.feedback.categoryBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {data.feedback.categoryBreakdown.map((cat, i) => {
                        const maxCount = data.feedback.categoryBreakdown[0].count || 1;
                        const pct = ((cat.count / maxCount) * 100).toFixed(0);
                        return (
                          <div key={cat.category}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white/60 capitalize">{cat.category}</span>
                              <span className="text-white font-mono flex items-center gap-2">
                                {cat.count}
                                <span className="text-[#FFB800]">★{cat.avgRating}</span>
                              </span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length], opacity: 0.8 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-white/30 text-sm">
                      <p>No category data</p>
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Recent Submissions">
                  {data.feedback.recent.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {data.feedback.recent.map((fb) => (
                        <div
                          key={fb.id}
                          className="rounded-lg p-3"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <StarDisplay rating={fb.rating} />
                            <span className="text-[10px] text-white/30 capitalize px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
                              {fb.category}
                            </span>
                          </div>
                          {fb.comment && (
                            <p className="text-xs text-white/60 mt-1 line-clamp-2">{fb.comment}</p>
                          )}
                          {fb.admin_response && (
                            <div className="mt-1.5 px-2 py-1 rounded text-[10px] text-[#00B4D8]" style={{ background: "rgba(0,180,216,0.05)", borderLeft: "2px solid rgba(0,180,216,0.3)" }}>
                              {fb.admin_response}
                            </div>
                          )}
                          <p className="text-[10px] text-white/25 mt-1">
                            {new Date(fb.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-white/30 text-sm">
                      <div className="text-center">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>No recent feedback</p>
                      </div>
                    </div>
                  )}
                </ChartCard>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />

      {drilldownEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={closeDrilldown}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-sm flex flex-col"
            style={{ background: "rgba(8,8,20,0.98)", border: "1px solid rgba(0,180,216,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div>
                <h2 className="text-white font-semibold text-lg">{formatEventName(drilldownEvent)}</h2>
                {drilldownData && (
                  <p className="text-white/50 text-sm mt-0.5">
                    {drilldownData.total.toLocaleString()} total &middot; {drilldownData.uniqueUsers.toLocaleString()} unique users
                  </p>
                )}
              </div>
              <button onClick={closeDrilldown} className="text-white/50 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drilldownLoading && (
                <div className="flex items-center justify-center h-40 text-white/40">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading...
                </div>
              )}

              {!drilldownLoading && drilldownData && (
                <>
                  {drilldownData.dailyBreakdown.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Daily Trend</h3>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={drilldownData.dailyBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                              dataKey="date"
                              stroke="rgba(255,255,255,0.3)"
                              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                              tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            />
                            <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                            <Tooltip
                              contentStyle={{ background: "rgba(8,8,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "12px" }}
                              labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                            />
                            <Line type="monotone" dataKey="count" stroke="#00B4D8" strokeWidth={2} dot={false} name="Events" />
                            <Line type="monotone" dataKey="uniqueUsers" stroke="#FFB800" strokeWidth={2} dot={false} name="Unique Users" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Recent Occurrences</h3>
                    {drilldownData.events.length === 0 ? (
                      <p className="text-white/30 text-sm text-center py-8">No events in this date range</p>
                    ) : (
                      <div className="space-y-2">
                        {drilldownData.events.map((evt) => (
                          <div
                            key={evt.id}
                            className="rounded-lg p-3 text-xs"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/50 font-mono">{evt.userId ? `${evt.userId.slice(0, 16)}…` : "Anonymous"}</span>
                              <span className="text-white/30">{new Date(evt.createdAt).toLocaleString()}</span>
                            </div>
                            {evt.properties && Object.keys(evt.properties).length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(evt.properties).map(([k, v]) => (
                                  <span key={k} className="px-2 py-0.5 rounded font-mono" style={{ background: "rgba(0,180,216,0.08)", color: "#00B4D8" }}>
                                    {k}: {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {drilldownData.total > DRILLDOWN_LIMIT && (
                      <div className="flex items-center justify-between mt-4 text-xs text-white/40">
                        <span>{drilldownOffset + 1}–{Math.min(drilldownOffset + DRILLDOWN_LIMIT, drilldownData.total)} of {drilldownData.total.toLocaleString()}</span>
                        <div className="flex gap-2">
                          <button
                            disabled={drilldownOffset === 0}
                            onClick={() => fetchDrilldown(drilldownEvent, drilldownOffset - DRILLDOWN_LIMIT)}
                            className="p-1 rounded disabled:opacity-30 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={drilldownOffset + DRILLDOWN_LIMIT >= drilldownData.total}
                            onClick={() => fetchDrilldown(drilldownEvent, drilldownOffset + DRILLDOWN_LIMIT)}
                            className="p-1 rounded disabled:opacity-30 hover:text-white transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
