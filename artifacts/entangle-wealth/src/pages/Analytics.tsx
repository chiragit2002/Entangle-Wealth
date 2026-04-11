import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
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
}

const COLORS = ["#00D4FF", "#FFD700", "#00ff88", "#ff3366", "#9c27b0", "#ff9800", "#4caf50", "#2196f3"];

function formatEventName(event: string): string {
  return event.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  color = "#00D4FF",
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
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-[#00ff88]" : trend === "down" ? "text-[#ff3366]" : "text-white/40"}`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
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

export default function Analytics() {
  const { getToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/analytics/dashboard", getToken);
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
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const FUNNEL_COLORS = ["#00D4FF", "#FFD700", "#00ff88", "#9c27b0"];
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-[#00D4FF]" />
              Analytics Dashboard
            </h1>
            <p className="text-white/40 text-sm mt-1">Platform health metrics & user intelligence</p>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00D4FF",
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
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
              <KPICard label="Total Users" value={data.kpi.totalUsers.toLocaleString()} icon={Users} color="#00D4FF" trend="up" />
              <KPICard label="DAU (24h)" value={data.kpi.dau.toLocaleString()} icon={Activity} color="#00ff88" />
              <KPICard label="WAU (7d)" value={data.kpi.wau.toLocaleString()} icon={TrendingUp} color="#FFD700" />
              <KPICard label="MAU (30d)" value={data.kpi.mau.toLocaleString()} icon={Zap} color="#9c27b0" />
              <KPICard label="MRR" value={`$${data.kpi.mrr.toLocaleString()}`} icon={BarChart3} color="#00ff88" trend="up" />
              <KPICard label="ARR" value={`$${data.kpi.arr.toLocaleString()}`} icon={TrendingUp} color="#FFD700" />
              <KPICard label="Churn Rate" value={`${data.kpi.churnRate}%`} icon={ArrowDownRight} color="#ff3366" trend={data.kpi.churnRate > 5 ? "down" : "neutral"} />
              <KPICard label="LTV" value={`$${data.kpi.ltv.toLocaleString()}`} icon={Target} color="#00D4FF" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="User Growth (30 Days)">
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
                      <Line type="monotone" dataKey="count" stroke="#00D4FF" strokeWidth={2} dot={false} name="Signups" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Daily Event Volume (30 Days)">
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
                      <Bar dataKey="count" fill="#00D4FF" radius={[4, 4, 0, 0]} name="Events" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <ChartCard title="Conversion Funnel: Visitor → Free → Pro → Business">
                <div className="space-y-4">
                  {funnelData.map((item, i) => {
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
                    { label: "Clicks", value: data.referralFunnel.clicks, color: "#00D4FF" },
                    { label: "Signups", value: data.referralFunnel.signups, color: "#FFD700" },
                    { label: "Conversions", value: data.referralFunnel.conversions, color: "#00ff88" },
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
                      <Bar dataKey="count" fill="#00D4FF" radius={[0, 4, 4, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Content by Platform & Status">
                {data.contentByPlatform.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {data.contentByPlatform.map((item, i) => (
                      <div key={`${item.platform}-${item.status}-${i}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-white/70">{item.platform}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.05)", color: item.status === "published" ? "#00ff88" : item.status === "draft" ? "#FFD700" : "#fff6" }}>{item.status}</span>
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
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
