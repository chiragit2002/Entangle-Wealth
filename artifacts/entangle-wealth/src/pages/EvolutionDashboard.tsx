import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  Info,
  RefreshCw,
  Zap,
  ThumbsUp,
  ThumbsDown,
  MousePointer,
  Clock,
  Gauge,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FunnelStep {
  id: string;
  label: string;
  count: number;
  conversionFromPrev: number;
  conversionFromTop: number;
  dropoffFromPrev: number;
}

interface FunnelData {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  overallConversion: number;
}

interface InsightItem {
  id: string;
  category: "funnel" | "rage_clicks" | "satisfaction" | "performance" | "hesitation";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  metric: string | number;
  recommendation: string;
}

interface InsightsSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  healthScore: number;
  totalEvents7d: number;
  avgSatisfaction: number;
  rageClickTotal: number;
}

interface FeedbackSummaryItem {
  context: string;
  total: number;
  helpfulCount: number;
  unhelpfulCount: number;
  satisfactionPct: number;
}

interface FeedbackComment {
  context: string;
  helpful: boolean;
  comment: string;
  created_at: string;
}

const SENTRY_URL = "https://sentry.io/organizations/";

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const styles = {
    critical: { bg: "rgba(255,51,102,0.15)", border: "rgba(255,51,102,0.3)", text: "#ff3366" },
    warning: { bg: "rgba(255,215,0,0.15)", border: "rgba(255,215,0,0.3)", text: "#FFB800" },
    info: { bg: "rgba(0,180,216,0.15)", border: "rgba(0,180,216,0.3)", text: "#00B4D8" },
  };
  const s = styles[severity];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {severity}
    </span>
  );
}

function CategoryIcon({ category }: { category: InsightItem["category"] }) {
  const icons: Record<InsightItem["category"], React.ElementType> = {
    funnel: TrendingDown,
    rage_clicks: MousePointer,
    satisfaction: ThumbsDown,
    performance: Clock,
    hesitation: Activity,
  };
  const colors: Record<InsightItem["category"], string> = {
    funnel: "#FFB800",
    rage_clicks: "#ff3366",
    satisfaction: "#ff9800",
    performance: "#9c27b0",
    hesitation: "#00B4D8",
  };
  const Icon = icons[category];
  return <Icon className="w-4 h-4" style={{ color: colors[category] }} />;
}

function InsightCard({ insight }: { insight: InsightItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-xl border p-4 transition-all"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <CategoryIcon category={insight.category} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm text-white">{insight.title}</span>
            <SeverityBadge severity={insight.severity} />
          </div>
          <p className="text-xs text-white/50 mb-2">{insight.description}</p>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-white/60 bg-white/5 px-2 py-0.5 rounded">{insight.metric}</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[#00B4D8]/70 hover:text-[#00B4D8] transition-colors"
            >
              Recommendation
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {expanded && (
            <p className="mt-2 text-xs text-white/60 bg-[#00B4D8]/5 border border-[#00B4D8]/10 rounded-lg px-3 py-2">
              {insight.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#00B4D8" : score >= 60 ? "#FFB800" : "#ff3366";
  const label = score >= 80 ? "Healthy" : score >= 60 ? "Needs Attention" : "Critical";
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-32 h-32 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.05) ${score * 3.6}deg)`,
          boxShadow: `0 0 30px ${color}30`,
        }}
      >
        <div
          className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
          style={{ background: "#020204" }}
        >
          <span className="text-3xl font-bold font-mono" style={{ color }}>{score}</span>
          <span className="text-[10px] text-white/50">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

function FunnelViz({ funnel }: { funnel: FunnelData }) {
  const maxVal = funnel.steps[0]?.count || 1;
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{funnel.name}</h3>
        <p className="text-xs text-white/50">{funnel.description}</p>
      </div>
      <div className="space-y-3">
        {funnel.steps.map((step, i) => {
          const pct = maxVal > 0 ? (step.count / maxVal) * 100 : 0;
          const isDropOff = i > 0 && step.dropoffFromPrev > 30;
          return (
            <div key={step.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-white/50 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-white/70">{step.label}</span>
                  {isDropOff && <AlertTriangle className="w-3 h-3 text-[#FFB800]" />}
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-white font-mono">{step.count.toLocaleString()}</span>
                  {i > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${step.dropoffFromPrev > 30 ? "text-[#ff3366] bg-[#ff3366]/10" : "text-white/40 bg-white/5"}`}>
                      -{step.dropoffFromPrev}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-5 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div
                  className="h-full rounded transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isDropOff
                      ? "linear-gradient(90deg, #FFB800, #ff9800)"
                      : "linear-gradient(90deg, #00B4D8, #00B4D8)",
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs border-t border-white/5 pt-3">
        <span className="text-white/50">Overall conversion</span>
        <span
          className="font-mono font-bold"
          style={{ color: funnel.overallConversion >= 50 ? "#00B4D8" : funnel.overallConversion >= 20 ? "#FFB800" : "#ff3366" }}
        >
          {funnel.overallConversion}%
        </span>
      </div>
    </div>
  );
}

export default function EvolutionDashboard() {
  const { getToken } = useAuth();
  const isAdmin = useIsAdmin();
  const [, setLocation] = useLocation();
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [insightsSummary, setInsightsSummary] = useState<InsightsSummary | null>(null);
  const [feedback, setFeedback] = useState<FeedbackSummaryItem[]>([]);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin === false) {
      setLocation("/dashboard");
    }
  }, [isAdmin, setLocation]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [funnelsRes, insightsRes, feedbackRes] = await Promise.all([
        authFetch("/analytics/funnels", getToken),
        authFetch("/analytics/insights", getToken),
        authFetch("/micro-feedback/summary", getToken),
      ]);

      if (funnelsRes.ok) {
        const d = await funnelsRes.json();
        setFunnels(d.funnels || []);
      }
      if (insightsRes.ok) {
        const d = await insightsRes.json();
        setInsights(d.insights || []);
        setInsightsSummary(d.summary || null);
      }
      if (feedbackRes.ok) {
        const d = await feedbackRes.json();
        setFeedback(d.summary || []);
        setComments(d.recentComments || []);
      }
    } catch {
      setError("Failed to load evolution data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const feedbackChartData = feedback.map((f) => ({
    name: f.context.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    satisfaction: f.satisfactionPct,
    total: f.total,
  }));

  return (
    <div className="min-h-screen" style={{ background: "#020204" }}>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-[#FFB800]" />
              Evolution Dashboard
            </h1>
            <p className="text-white/50 text-sm mt-1">UX intelligence, friction signals & system health</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={SENTRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: "rgba(156,39,176,0.1)", border: "1px solid rgba(156,39,176,0.3)", color: "#9c27b0" }}
            >
              <ExternalLink className="w-4 h-4" />
              Sentry Replays
            </a>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00B4D8" }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-6 text-center border border-[#ff3366]/30 bg-[#ff3366]/5 mb-8">
            <p className="text-[#ff3366]">{error}</p>
          </div>
        )}

        {insightsSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="md:col-span-1 flex items-center justify-center rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              <HealthScoreGauge score={insightsSummary.healthScore} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-3">
              <div className="rounded-xl border p-5" style={{ background: "rgba(255,51,102,0.05)", borderColor: "rgba(255,51,102,0.15)" }}>
                <div className="text-3xl font-bold font-mono text-[#ff3366]">{insightsSummary.critical}</div>
                <div className="text-xs text-white/50 mt-1">Critical Issues</div>
                <div className="mt-2 text-xs text-white/30">{insightsSummary.warning} warnings · {insightsSummary.info} info</div>
              </div>
              <div className="rounded-xl border p-5" style={{ background: "rgba(255,215,0,0.05)", borderColor: "rgba(255,215,0,0.15)" }}>
                <div className="text-3xl font-bold font-mono text-[#FFB800]">{insightsSummary.rageClickTotal}</div>
                <div className="text-xs text-white/50 mt-1">Rage Clicks (7d)</div>
                <div className="mt-2 text-xs text-white/30">{insightsSummary.totalEvents7d.toLocaleString()} total events</div>
              </div>
              <div className="rounded-xl border p-5" style={{ background: "rgba(0,180,216,0.05)", borderColor: "rgba(0,180,216,0.15)" }}>
                <div className="text-3xl font-bold font-mono text-[#00B4D8]">{insightsSummary.avgSatisfaction}%</div>
                <div className="text-xs text-white/50 mt-1">Avg Satisfaction</div>
                <div className="mt-2 text-xs text-white/30">Micro-feedback score</div>
              </div>
            </div>
          </div>
        )}

        {loading && !insightsSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl h-32 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#FFB800]" />
              Funnel Analysis
            </h2>
            {loading && funnels.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl h-40 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))}
              </div>
            ) : funnels.length === 0 ? (
              <div className="rounded-xl border p-8 text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <Activity className="w-8 h-8 mx-auto mb-2 text-white/40" />
                <p className="text-white/30 text-sm">No funnel data yet — events will populate as users flow through the app</p>
              </div>
            ) : (
              <div className="space-y-4">
                {funnels.map((funnel) => (
                  <FunnelViz key={funnel.id} funnel={funnel} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ff3366]" />
              Friction Insights
              {insightsSummary && (
                <span className="ml-auto text-xs font-normal text-white/30">{insightsSummary.total} detected</span>
              )}
            </h2>
            {loading && insights.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl h-20 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <div className="rounded-xl border p-8 text-center" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#00B4D8]" />
                <p className="text-white/50 text-sm">No friction patterns detected</p>
                <p className="text-white/30 text-xs mt-1">The system will surface issues as data accumulates</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#00B4D8]" />
              Feature Satisfaction Scores
            </h2>
            {feedbackChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={feedbackChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: "rgba(8,8,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "12px" }}
                      formatter={(v: number) => [`${v}%`, "Satisfaction"]}
                    />
                    <Bar dataKey="satisfaction" radius={[4, 4, 0, 0]} name="Satisfaction" fill="#00B4D8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <ThumbsUp className="w-8 h-8 mx-auto mb-2 text-white/40" />
                  <p className="text-white/30 text-sm">No feedback collected yet</p>
                  <p className="text-white/50 text-xs mt-1">Micro-feedback prompts appear after key flows</p>
                </div>
              </div>
            )}

            {feedback.length > 0 && (
              <div className="mt-4 space-y-2">
                {feedback.map((f) => (
                  <div key={f.context} className="flex items-center justify-between text-xs">
                    <span className="text-white/60 capitalize">{f.context.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/50">{f.total} responses</span>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-[#00B4D8]" />
                        <span className="text-[#00B4D8] font-mono">{f.helpfulCount}</span>
                        <ThumbsDown className="w-3 h-3 text-[#ff3366] ml-1" />
                        <span className="text-[#ff3366] font-mono">{f.unhelpfulCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <h2 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00B4D8]" />
              Recent User Comments
            </h2>
            {comments.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.map((c, i) => (
                  <div key={i} className="rounded-lg border p-3" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      {c.helpful ? (
                        <ThumbsUp className="w-3 h-3 text-[#00B4D8] flex-shrink-0" />
                      ) : (
                        <ThumbsDown className="w-3 h-3 text-[#ff3366] flex-shrink-0" />
                      )}
                      <span className="text-[10px] text-white/50 capitalize">{c.context.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-white/50 ml-auto">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{c.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center">
                <div className="text-center">
                  <Info className="w-8 h-8 mx-auto mb-2 text-white/40" />
                  <p className="text-white/30 text-sm">No comments yet</p>
                  <p className="text-white/50 text-xs mt-1">Users can leave optional comments with their feedback</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <h2 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#9c27b0]" />
            Session Replay & Behavior Observation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center" style={{ background: "rgba(156,39,176,0.05)", borderColor: "rgba(156,39,176,0.15)" }}>
              <div className="text-2xl font-bold font-mono text-[#9c27b0] mb-1">10%</div>
              <div className="text-xs text-white/50">Session Replay Sampling</div>
              <div className="text-[10px] text-white/25 mt-1">1 in 10 sessions recorded</div>
            </div>
            <div className="rounded-lg border p-4 text-center" style={{ background: "rgba(0,180,216,0.05)", borderColor: "rgba(0,180,216,0.15)" }}>
              <div className="text-2xl font-bold font-mono text-[#00B4D8] mb-1">100%</div>
              <div className="text-xs text-white/50">Error Session Capture</div>
              <div className="text-[10px] text-white/25 mt-1">All error sessions recorded</div>
            </div>
            <div className="flex items-center justify-center">
              <a
                href={SENTRY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium text-sm transition-all"
                style={{ background: "rgba(156,39,176,0.15)", border: "1px solid rgba(156,39,176,0.3)", color: "#9c27b0" }}
              >
                <ExternalLink className="w-4 h-4" />
                Open Sentry Replay Console
              </a>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg text-xs text-white/30" style={{ background: "rgba(255,255,255,0.02)" }}>
            All replays have text masking and media blocking enabled to protect user privacy. Sensitive fields are never recorded.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
