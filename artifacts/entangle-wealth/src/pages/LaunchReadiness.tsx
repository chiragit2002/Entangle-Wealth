import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { authFetch } from "@/lib/authFetch";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  Shield,
  CreditCard,
  Database,
  Server,
  Key,
  Cpu,
  BarChart3,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Check {
  id: string;
  label: string;
  category: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

interface LaunchData {
  checks: Check[];
  summary: {
    total: number;
    passing: number;
    warnings: number;
    failing: number;
    score: number;
    ready: boolean;
  };
  timestamp: string;
}

interface ManualCheck {
  id: string;
  label: string;
  category: string;
  detail: string;
  checked: boolean;
}

const MANUAL_CHECKS_KEY = "entangle_launch_manual_checks";

function getManualChecksFromStorage(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(MANUAL_CHECKS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveManualChecks(checks: Record<string, boolean>) {
  localStorage.setItem(MANUAL_CHECKS_KEY, JSON.stringify(checks));
}

const DEFAULT_MANUAL_CHECKS: ManualCheck[] = [
  { id: "custom_domain", label: "Custom Domain Connected", category: "DNS", detail: "Domain pointing to Replit deployment via A/CNAME records", checked: false },
  { id: "analytics", label: "Analytics Installed", category: "Monitoring", detail: "Google Analytics, Mixpanel, or equivalent tracking active", checked: false },
];

const CATEGORY_ICONS: Record<string, typeof Server> = {
  Infrastructure: Server,
  Payments: CreditCard,
  Authentication: Key,
  Data: BarChart3,
  Security: Shield,
  Performance: Cpu,
  DNS: Globe,
  Monitoring: BarChart3,
  Legal: Shield,
  Support: Server,
  Content: Globe,
  UX: Rocket,
  Communications: Globe,
};

const ENV_VARS = [
  { name: "DATABASE_URL", desc: "Production PostgreSQL connection string", production: "<your-production-db-url>" },
  { name: "CLERK_SECRET_KEY", desc: "Clerk production secret key", production: "<clerk-live-secret>" },
  { name: "VITE_CLERK_PUBLISHABLE_KEY", desc: "Clerk production publishable key", production: "<clerk-live-publishable>" },
  { name: "STRIPE_SECRET_KEY", desc: "Stripe live secret key", production: "<stripe-live-secret>" },
  { name: "STRIPE_WEBHOOK_SECRET", desc: "Stripe webhook signing secret", production: "<stripe-webhook-secret>" },
  { name: "VITE_STRIPE_PUBLISHABLE_KEY", desc: "Stripe live publishable key", production: "<stripe-live-publishable>" },
  { name: "ALPACA_API_KEY", desc: "Alpaca live trading API key", production: "configured" },
  { name: "ALPACA_API_SECRET", desc: "Alpaca live trading API secret", production: "<alpaca-api-secret>" },
  { name: "SESSION_SECRET", desc: "Session signing secret (min 32 chars)", production: "<random-32-char-string>" },
  { name: "NODE_ENV", desc: "Environment mode", production: "production" },
];

const DNS_STEPS = [
  { step: 1, title: "Get Your Deployment URL", desc: "After publishing on Replit, note your .replit.app domain (e.g., entanglewealth.replit.app)." },
  { step: 2, title: "Add CNAME Record for www", desc: 'In your DNS provider, add a CNAME record:\n• Name: www\n• Target: your-app.replit.app\n• TTL: 300 (5 min)' },
  { step: 3, title: "Add A Record for Root Domain", desc: "For the root domain (@), add an A record pointing to Replit's IP address. Check Replit docs for the current IP." },
  { step: 4, title: "Configure Custom Domain in Replit", desc: "Go to your Repl's deployment settings and add your custom domain. Replit will automatically provision an SSL certificate." },
  { step: 5, title: "Verify DNS Propagation", desc: "Wait 5-30 minutes for DNS changes to propagate. Use dig or nslookup to verify:\n$ dig yourdomain.com +short" },
  { step: 6, title: "Verify SSL", desc: 'Visit https://yourdomain.com and verify the lock icon appears. Replit handles SSL via Let\'s Encrypt automatically.' },
];

function StatusIcon({ status }: { status: "pass" | "fail" | "warn" | boolean }) {
  if (status === "pass" || status === true) return <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />;
  if (status === "warn") return <AlertTriangle className="w-5 h-5 text-[#FFD700]" />;
  return <XCircle className="w-5 h-5 text-[#ff3366]" />;
}

function ScoreRing({ score, ready }: { score: number; ready: boolean }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = ready ? "#00ff88" : score >= 70 ? "#FFD700" : "#ff3366";

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{score}%</span>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          {ready ? "Ready" : "Not Ready"}
        </span>
      </div>
    </div>
  );
}

export default function LaunchReadiness() {
  const [, setLocation] = useLocation();
  const isAdmin = useIsAdmin();
  const { getToken } = useAuth();
  const [data, setData] = useState<LaunchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [manualChecks, setManualChecks] = useState<ManualCheck[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>("checks");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin === false) setLocation("/");
  }, [isAdmin, setLocation]);

  useEffect(() => {
    const stored = getManualChecksFromStorage();
    setManualChecks(DEFAULT_MANUAL_CHECKS.map((c) => ({ ...c, checked: stored[c.id] ?? false })));
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      const res = await authFetch("/admin/launch-checks", getToken);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [getToken]);

  useEffect(() => {
    if (isAdmin === true) fetchChecks();
  }, [isAdmin, fetchChecks]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchChecks();
  };

  const toggleManualCheck = (id: string) => {
    setManualChecks((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c));
      const stored: Record<string, boolean> = {};
      updated.forEach((c) => { stored[c.id] = c.checked; });
      saveManualChecks(stored);
      return updated;
    });
  };

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(name);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  if (isAdmin === null || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-8 h-8 text-[#00D4FF] animate-spin" />
        </div>
      </Layout>
    );
  }

  const autoChecks = data?.checks || [];
  const autoPassCount = autoChecks.filter((c) => c.status === "pass").length;
  const manualPassCount = manualChecks.filter((c) => c.checked).length;
  const totalChecks = autoChecks.length + manualChecks.length;
  const totalPassing = autoPassCount + manualPassCount;
  const overallScore = totalChecks > 0 ? Math.round((totalPassing / totalChecks) * 100) : 0;
  const isReady = totalPassing === totalChecks;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#9c27b0]/20 border border-[#00D4FF]/30 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Launch Readiness</h1>
            </div>
            <p className="text-sm text-white/50">Go/No-Go checklist for production deployment</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Checks
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 bg-[#0a0a0f] border border-white/10 rounded-2xl p-8">
          <ScoreRing score={overallScore} ready={isReady} />
          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-bold text-white">
              {isReady ? "All Systems Go!" : "Action Required"}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold font-mono text-[#00ff88]">{autoPassCount + manualPassCount}</div>
                <div className="text-xs text-white/40">Passing</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-[#FFD700]">{data?.summary.warnings || 0}</div>
                <div className="text-xs text-white/40">Warnings</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-[#ff3366]">
                  {(data?.summary.failing || 0) + manualChecks.filter((c) => !c.checked).length}
                </div>
                <div className="text-xs text-white/40">Failing</div>
              </div>
            </div>
            <div className="text-xs text-white/30">
              Last checked: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => toggleSection("checks")}
            className="w-full flex items-center justify-between bg-[#0a0a0f] border border-white/10 rounded-xl px-6 py-4 hover:bg-white/[0.02] transition"
          >
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-[#00D4FF]" />
              <span className="text-lg font-semibold text-white">Automated Checks</span>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {autoPassCount}/{autoChecks.length} passing
              </span>
            </div>
            {expandedSection === "checks" ? (
              <ChevronUp className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/40" />
            )}
          </button>

          {expandedSection === "checks" && (
            <div className="grid gap-3 md:grid-cols-2">
              {autoChecks.map((check) => {
                const Icon = CATEGORY_ICONS[check.category] || Server;
                return (
                  <div
                    key={check.id}
                    className="flex items-start gap-3 bg-[#0a0a0f] border border-white/10 rounded-xl p-4"
                  >
                    <StatusIcon status={check.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-sm font-medium text-white">{check.label}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">{check.detail}</p>
                      <span className="text-[10px] text-white/20 uppercase tracking-wider">{check.category}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => toggleSection("manual")}
            className="w-full flex items-center justify-between bg-[#0a0a0f] border border-white/10 rounded-xl px-6 py-4 hover:bg-white/[0.02] transition"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
              <span className="text-lg font-semibold text-white">Manual Checks</span>
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {manualPassCount}/{manualChecks.length} confirmed
              </span>
            </div>
            {expandedSection === "manual" ? (
              <ChevronUp className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/40" />
            )}
          </button>

          {expandedSection === "manual" && (
            <div className="grid gap-3 md:grid-cols-2">
              {manualChecks.map((check) => {
                const Icon = CATEGORY_ICONS[check.category] || Server;
                return (
                  <button
                    key={check.id}
                    onClick={() => toggleManualCheck(check.id)}
                    className="flex items-start gap-3 bg-[#0a0a0f] border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.02] transition w-full"
                  >
                    <StatusIcon status={check.checked} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-sm font-medium text-white">{check.label}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">{check.detail}</p>
                      <span className="text-[10px] text-white/20 uppercase tracking-wider">{check.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => toggleSection("domain")}
            className="w-full flex items-center justify-between bg-[#0a0a0f] border border-white/10 rounded-xl px-6 py-4 hover:bg-white/[0.02] transition"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#9c27b0]" />
              <span className="text-lg font-semibold text-white">Custom Domain Setup Guide</span>
            </div>
            {expandedSection === "domain" ? (
              <ChevronUp className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/40" />
            )}
          </button>

          {expandedSection === "domain" && (
            <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-6 space-y-6">
              {DNS_STEPS.map((step) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#9c27b0]/20 border border-[#9c27b0]/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#9c27b0]">{step.step}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">{step.title}</h4>
                    <pre className="text-xs text-white/50 whitespace-pre-wrap font-mono bg-white/[0.02] rounded-lg p-3 border border-white/5">
                      {step.desc}
                    </pre>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <ExternalLink className="w-4 h-4 text-[#00D4FF]" />
                <a
                  href="https://docs.replit.com/hosting/deployments/custom-domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#00D4FF] hover:underline"
                >
                  Replit Custom Domain Documentation
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => toggleSection("env")}
            className="w-full flex items-center justify-between bg-[#0a0a0f] border border-white/10 rounded-xl px-6 py-4 hover:bg-white/[0.02] transition"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-[#FFD700]" />
              <span className="text-lg font-semibold text-white">Production Environment Config</span>
            </div>
            {expandedSection === "env" ? (
              <ChevronUp className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white/40" />
            )}
          </button>

          {expandedSection === "env" && (
            <div className="bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <p className="text-xs text-white/40">
                  These environment variables must be updated when switching from development to production.
                  Click the copy icon to copy the variable name.
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {ENV_VARS.map((v) => (
                  <div key={v.name} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-[#00D4FF]">{v.name}</code>
                        <button
                          onClick={() => copyToClipboard(v.name, v.name)}
                          className="text-white/20 hover:text-white/60 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedVar === v.name && (
                          <span className="text-[10px] text-[#00ff88]">Copied!</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{v.desc}</p>
                    </div>
                    <code className="text-xs text-white/20 font-mono hidden md:block">{v.production}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
