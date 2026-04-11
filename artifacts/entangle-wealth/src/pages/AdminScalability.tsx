import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { authFetch } from "@/lib/authFetch";
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  BarChart3,
} from "lucide-react";

interface MetricsData {
  uptime: { seconds: number; formatted: string };
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  requests: { total: number; avgResponseTimeMs: number };
  eventLoopLagMs: number;
  node: string;
  timestamp: string;
  circuits: Array<{
    name: string;
    state: string;
    failureCount: number;
    lastFailureTime: number;
  }>;
  aiQueue: {
    active: number;
    queued: number;
    maxConcurrent: number;
    totalProcessed: number;
    totalFailed: number;
  };
  caches: {
    stockCache: { size: number };
    newsCache: { size: number };
  };
}

function CircuitStateIcon({ state }: { state: string }) {
  if (state === "closed") return <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />;
  if (state === "half-open") return <AlertTriangle className="w-5 h-5 text-[#FFD700]" />;
  return <XCircle className="w-5 h-5 text-[#ff3366]" />;
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: typeof Activity; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#00D4FF]" />
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminScalability() {
  const { getToken } = useAuth();
  const isAdmin = useIsAdmin();
  const [, setLocation] = useLocation();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authFetch("metrics", getToken);
      setMetrics(data);
      setError("");
    } catch {
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isAdmin === false) {
      setLocation("/");
      return;
    }
    if (isAdmin === true) {
      fetchMetrics();
    }
  }, [isAdmin, fetchMetrics, setLocation]);

  useEffect(() => {
    if (isAdmin !== true) return;
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchMetrics]);

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#020204] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  const heapPercent = metrics
    ? Math.round((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100)
    : 0;

  const checklist = metrics
    ? [
        {
          label: "Memory usage under 80%",
          ok: heapPercent < 80,
          detail: `${heapPercent}% heap used (${metrics.memory.heapUsed}MB / ${metrics.memory.heapTotal}MB)`,
        },
        {
          label: "Avg response time under 500ms",
          ok: metrics.requests.avgResponseTimeMs < 500,
          detail: `${metrics.requests.avgResponseTimeMs}ms average`,
        },
        {
          label: "Event loop lag under 100ms",
          ok: metrics.eventLoopLagMs < 100,
          detail: `${metrics.eventLoopLagMs}ms current lag`,
        },
        {
          label: "All circuit breakers closed",
          ok: metrics.circuits.every((c) => c.state === "closed"),
          detail: metrics.circuits.map((c) => `${c.name}: ${c.state}`).join(", "),
        },
        {
          label: "AI queue not backed up",
          ok: metrics.aiQueue.queued < 10,
          detail: `${metrics.aiQueue.queued} queued, ${metrics.aiQueue.active} active`,
        },
        {
          label: "AI failure rate under 10%",
          ok:
            metrics.aiQueue.totalProcessed === 0 ||
            metrics.aiQueue.totalFailed / (metrics.aiQueue.totalProcessed + metrics.aiQueue.totalFailed) < 0.1,
          detail: `${metrics.aiQueue.totalFailed} failed / ${metrics.aiQueue.totalProcessed + metrics.aiQueue.totalFailed} total`,
        },
      ]
    : [];

  const passCount = checklist.filter((c) => c.ok).length;

  return (
    <Layout>
      <div className="min-h-screen bg-[#020204] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Zap className="w-8 h-8 text-[#00D4FF]" />
                Scalability Dashboard
              </h1>
              <p className="text-white/50 mt-1">Real-time system performance & health</p>
            </div>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg text-[#00D4FF] hover:bg-[#00D4FF]/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
              {error}
            </div>
          )}

          {metrics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard icon={Clock} label="Uptime" value={metrics.uptime.formatted} />
                <MetricCard
                  icon={HardDrive}
                  label="Memory (RSS)"
                  value={`${metrics.memory.rss}MB`}
                  sub={`Heap: ${metrics.memory.heapUsed}/${metrics.memory.heapTotal}MB`}
                />
                <MetricCard
                  icon={BarChart3}
                  label="Requests"
                  value={metrics.requests.total.toLocaleString()}
                  sub={`Avg: ${metrics.requests.avgResponseTimeMs}ms`}
                />
                <MetricCard
                  icon={Activity}
                  label="Event Loop Lag"
                  value={`${metrics.eventLoopLagMs}ms`}
                  sub={`Node ${metrics.node}`}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-[#00D4FF]" />
                    Circuit Breakers
                  </h2>
                  <div className="space-y-3">
                    {metrics.circuits.map((circuit) => (
                      <div key={circuit.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CircuitStateIcon state={circuit.state} />
                          <div>
                            <div className="text-white font-medium capitalize">{circuit.name}</div>
                            <div className="text-xs text-white/40">
                              {circuit.failureCount} failures
                              {circuit.lastFailureTime > 0 && ` | Last: ${new Date(circuit.lastFailureTime).toLocaleTimeString()}`}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            circuit.state === "closed"
                              ? "bg-[#00ff88]/10 text-[#00ff88]"
                              : circuit.state === "half-open"
                              ? "bg-[#FFD700]/10 text-[#FFD700]"
                              : "bg-[#ff3366]/10 text-[#ff3366]"
                          }`}
                        >
                          {circuit.state.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Cpu className="w-5 h-5 text-[#00D4FF]" />
                    AI Request Queue
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-white/40">Active</div>
                        <div className="text-2xl font-mono text-[#00D4FF]">
                          {metrics.aiQueue.active}/{metrics.aiQueue.maxConcurrent}
                        </div>
                      </div>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="text-xs text-white/40">Queued</div>
                        <div className="text-2xl font-mono text-[#FFD700]">{metrics.aiQueue.queued}</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-white/60">
                      <span>Processed: {metrics.aiQueue.totalProcessed}</span>
                      <span>Failed: {metrics.aiQueue.totalFailed}</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#00D4FF] rounded-full transition-all"
                        style={{
                          width: `${Math.min((metrics.aiQueue.active / metrics.aiQueue.maxConcurrent) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Server className="w-5 h-5 text-[#00D4FF]" />
                    Cache Status
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/70">Stock Cache</span>
                      <span className="font-mono text-[#00D4FF]">{metrics.caches.stockCache.size} entries</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/70">News Cache</span>
                      <span className="font-mono text-[#00D4FF]">{metrics.caches.newsCache.size} entries</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-[#00D4FF]" />
                    Health Checklist ({passCount}/{checklist.length})
                  </h2>
                  <div className="space-y-2">
                    {checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-2">
                        {item.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00ff88] mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#ff3366] mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <div className={`text-sm ${item.ok ? "text-white/70" : "text-[#ff3366]"}`}>{item.label}</div>
                          <div className="text-xs text-white/40">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-white/30">
                Last updated: {new Date(metrics.timestamp).toLocaleString()} | Auto-refreshes every 15s
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
