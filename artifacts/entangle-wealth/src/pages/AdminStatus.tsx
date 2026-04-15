import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import { Server, Database, Brain, Shield, CreditCard, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Plus } from "lucide-react";

interface ServiceStatus {
  service_name: string;
  status: string;
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

const STATUS_OPTIONS = [
  { value: "operational", label: "Operational", color: "#00B4D8", icon: CheckCircle2 },
  { value: "degraded", label: "Degraded", color: "#FFB800", icon: AlertTriangle },
  { value: "outage", label: "Outage", color: "#ff3366", icon: XCircle },
];

export default function AdminStatus() {
  const isAdmin = useIsAdmin();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ serviceName: "", title: "", description: "", severity: "minor" });

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, incRes] = await Promise.all([
        fetch("/api/status/services"),
        fetch("/api/status/incidents"),
      ]);
      if (svcRes.ok) setServices((await svcRes.json()).services);
      if (incRes.ok) setIncidents((await incRes.json()).incidents);
    } catch {
      toast({ title: "Error", description: "Failed to load status data" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const updateServiceStatus = async (serviceName: string, status: string) => {
    try {
      const res = await authFetch(`/status/admin/services/${encodeURIComponent(serviceName)}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({ title: "Updated", description: `${serviceName} set to ${status}` });
        fetchData();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to update" });
      }
    } catch {
      toast({ title: "Error", description: "Network error" });
    }
  };

  const createIncident = async () => {
    if (!incidentForm.serviceName || !incidentForm.title.trim()) {
      toast({ title: "Missing fields", description: "Service and title are required" });
      return;
    }
    try {
      const res = await authFetch("/status/admin/incidents", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: incidentForm.serviceName,
          title: incidentForm.title.trim(),
          description: incidentForm.description.trim() || null,
          severity: incidentForm.severity,
        }),
      });
      if (res.ok) {
        toast({ title: "Created", description: "Incident reported" });
        setShowNewIncident(false);
        setIncidentForm({ serviceName: "", title: "", description: "", severity: "minor" });
        fetchData();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to create incident" });
      }
    } catch {
      toast({ title: "Error", description: "Network error" });
    }
  };

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-6 h-6 text-white/40 animate-spin mx-auto mb-3" />
          <p className="text-white/30 text-sm">Checking access...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Service Status Management</h1>
            <p className="text-xs text-white/30 mt-1">Toggle service states and manage incidents</p>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/[0.05] border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white/60">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="space-y-3 mb-10">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Services</h2>
          {services.map((svc) => {
            const Icon = SERVICE_ICONS[svc.service_name] || Server;
            const currentOpt = STATUS_OPTIONS.find((o) => o.value === svc.status) || STATUS_OPTIONS[0];
            const CurrentIcon = currentOpt.icon;
            return (
              <div key={svc.service_name} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-white/30" />
                    <span className="text-sm font-semibold text-white/80">{svc.service_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CurrentIcon className="w-4 h-4" style={{ color: currentOpt.color }} />
                    <span className="text-xs font-semibold" style={{ color: currentOpt.color }}>{currentOpt.label}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateServiceStatus(svc.service_name, opt.value)}
                      disabled={svc.status === opt.value}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                        svc.status === opt.value
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:opacity-80 cursor-pointer"
                      }`}
                      style={{
                        color: opt.color,
                        borderColor: `${opt.color}33`,
                        backgroundColor: svc.status === opt.value ? `${opt.color}20` : `${opt.color}08`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/50 mt-2 font-mono">Updated: {new Date(svc.updated_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Recent Incidents</h2>
            <button
              onClick={() => setShowNewIncident(!showNewIncident)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#ff3366]/10 text-[#ff3366] border border-[#ff3366]/20 rounded-lg hover:bg-[#ff3366]/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Report Incident
            </button>
          </div>

          {showNewIncident && (
            <div className="bg-white/[0.02] border border-[#ff3366]/20 rounded-xl p-5 mb-4 space-y-4">
              <h3 className="text-sm font-bold text-white/70">New Incident</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider">Service</label>
                  <select
                    value={incidentForm.serviceName}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, serviceName: e.target.value }))}
                    className="w-full h-9 mt-1 px-3 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-[#00B4D8]/40 appearance-none"
                  >
                    <option value="" className="bg-black">Select service...</option>
                    {services.map((s) => (
                      <option key={s.service_name} value={s.service_name} className="bg-black">{s.service_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider">Severity</label>
                  <select
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, severity: e.target.value }))}
                    className="w-full h-9 mt-1 px-3 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-[#00B4D8]/40 appearance-none"
                  >
                    <option value="minor" className="bg-black">Minor</option>
                    <option value="major" className="bg-black">Major</option>
                    <option value="critical" className="bg-black">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider">Title</label>
                <input
                  value={incidentForm.title}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Brief incident title"
                  maxLength={200}
                  className="w-full h-9 mt-1 px-3 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/40"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider">Description (optional)</label>
                <textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Details about the incident..."
                  rows={3}
                  maxLength={2000}
                  className="w-full mt-1 px-3 py-2 text-xs bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/40 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={createIncident} className="px-4 py-2 text-xs font-semibold bg-[#ff3366] text-white rounded-lg hover:bg-[#ff3366]/90 transition-colors">
                  Create Incident
                </button>
                <button onClick={() => setShowNewIncident(false)} className="px-4 py-2 text-xs font-semibold bg-white/[0.05] text-white/50 rounded-lg hover:bg-white/10 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {incidents.length === 0 ? (
            <div className="text-center py-12 bg-white/[0.01] border border-white/[0.06] rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-[#00B4D8]/40 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No recent incidents</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => {
                const sevColor = inc.severity === "critical" ? "#ff3366" : inc.severity === "major" ? "#FFB800" : "#00B4D8";
                return (
                  <div key={inc.id} className="px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white/70">{inc.title}</p>
                      <p className="text-[10px] text-white/50 font-mono">{inc.service_name} · {new Date(inc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: sevColor, borderColor: `${sevColor}33`, backgroundColor: `${sevColor}10` }}>
                        {inc.severity}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${inc.resolved_at ? "bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/20" : "bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20"}`}>
                        {inc.resolved_at ? "Resolved" : inc.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
