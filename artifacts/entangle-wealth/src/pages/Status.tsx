import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock, Server, Database, Brain, Shield, CreditCard } from "lucide-react";

interface ServiceStatus {
  service_name: string;
  status: "operational" | "degraded" | "outage";
  updated_at: string;
}

interface Incident {
  id: number;
  service_name: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const SERVICE_ICONS: Record<string, typeof Server> = {
  "API Server": Server,
  "Market Data": Database,
  "AI Analysis": Brain,
  Authentication: Shield,
  Payments: CreditCard,
};

const STATUS_CONFIG = {
  operational: { label: "Operational", color: "#00B4D8", icon: CheckCircle2, bg: "bg-[#00B4D8]/10 border-[#00B4D8]/20" },
  degraded: { label: "Degraded", color: "#FFB800", icon: AlertTriangle, bg: "bg-[#FFB800]/10 border-[#FFB800]/20" },
  outage: { label: "Outage", color: "#ff3366", icon: XCircle, bg: "bg-[#ff3366]/10 border-[#ff3366]/20" },
};

export default function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [svcRes, incRes] = await Promise.all([
        fetch("/api/status/services"),
        fetch("/api/status/incidents"),
      ]);
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setServices(svcData.services);
      }
      if (incRes.ok) {
        const incData = await incRes.json();
        setIncidents(incData.incidents);
      }
      setLastRefresh(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, []);

  const overallStatus = services.some((s) => s.status === "outage")
    ? "outage"
    : services.some((s) => s.status === "degraded")
    ? "degraded"
    : "operational";

  const overallCfg = STATUS_CONFIG[overallStatus];
  const OverallIcon = overallCfg.icon;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            System <span className="electric-text">Status</span>
          </h1>
          <p className="text-white/50 text-sm">
            Current operational status of EntangleWealth services
          </p>
        </div>

        <div className={`border rounded-sm p-6 mb-8 text-center ${overallCfg.bg}`}>
          <OverallIcon className="w-10 h-10 mx-auto mb-3" style={{ color: overallCfg.color }} />
          <h2 className="text-xl font-bold" style={{ color: overallCfg.color }}>
            {overallStatus === "operational"
              ? "All Systems Operational"
              : overallStatus === "degraded"
              ? "Some Systems Experiencing Issues"
              : "Service Disruption Detected"}
          </h2>
          <p className="text-white/30 text-xs mt-2 flex items-center justify-center gap-1.5">
            <Clock className="w-3 h-3" />
            Last checked: {lastRefresh.toLocaleTimeString()}
            <button onClick={fetchData} disabled={loading} className="ml-2 text-[#00B4D8] hover:text-[#00B4D8]/80">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </button>
          </p>
        </div>

        <div className="space-y-3 mb-12">
          {services.map((svc) => {
            const cfg = STATUS_CONFIG[svc.status] || STATUS_CONFIG.operational;
            const Icon = SERVICE_ICONS[svc.service_name] || Server;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={svc.service_name}
                className="flex items-center justify-between px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-white/30" />
                  <span className="text-sm font-semibold text-white/80">{svc.service_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4" style={{ color: cfg.color }} />
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-4">Incident History (Last 30 Days)</h2>
          {incidents.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.01] border border-white/[0.06] rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-[#00B4D8]/40 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No incidents in the last 30 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => {
                const severityColor = inc.severity === "major" ? "#ff3366" : inc.severity === "minor" ? "#FFB800" : "#00B4D8";
                return (
                  <div key={inc.id} className="px-5 py-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white/80">{inc.title}</h3>
                        <p className="text-[10px] text-white/50 font-mono mt-0.5">{inc.service_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: severityColor, borderColor: `${severityColor}33`, backgroundColor: `${severityColor}10` }}>
                          {inc.severity}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${inc.resolved_at ? "bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/20" : "bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20"}`}>
                          {inc.resolved_at ? "Resolved" : inc.status}
                        </span>
                      </div>
                    </div>
                    {inc.description && <p className="text-xs text-white/50">{inc.description}</p>}
                    <p className="text-[10px] text-white/50 mt-2 font-mono">
                      {new Date(inc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {inc.resolved_at && <> | Resolved {new Date(inc.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/help" className="text-xs text-white/50 hover:text-[#00B4D8] transition-colors">
            Need help? Visit the Help Center
          </Link>
        </div>
      </div>
    </Layout>
  );
}
