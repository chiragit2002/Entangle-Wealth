import { lazy, Suspense } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageSkeleton } from "@/components/pwa/PageSkeleton";
import {
  Coins, Megaphone, BarChart3, Ticket, Rocket, Monitor, Shield,
  Users, Radio, TrendingUp,
} from "lucide-react";

const TokenAdmin = lazy(() => import("@/pages/TokenAdmin"));
const MarketingCenter = lazy(() => import("@/pages/MarketingCenter"));
const AnalyticsPage = lazy(() => import("@/pages/Analytics"));
const AdminTicketsPage = lazy(() => import("@/pages/AdminTickets"));
const LaunchReadinessPage = lazy(() => import("@/pages/LaunchReadiness"));
const AdminMonitoringPage = lazy(() => import("@/pages/AdminMonitoring"));
const AdminAuditPage = lazy(() => import("@/pages/AdminAudit"));
const AdminScalabilityPage = lazy(() => import("@/pages/AdminScalability"));
const AdminKycPage = lazy(() => import("@/pages/AdminKyc"));
const AdminStatusPage = lazy(() => import("@/pages/AdminStatus"));

const ADMIN_TOOLS = [
  { href: "/admin/token", label: "Token Admin", icon: Coins, desc: "Manage token economy" },
  { href: "/admin/marketing", label: "Marketing AI", icon: Megaphone, desc: "Content generation" },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, desc: "Usage analytics" },
  { href: "/admin/tickets", label: "Support Tickets", icon: Ticket, desc: "Customer support" },
  { href: "/admin/launch", label: "Launch Readiness", icon: Rocket, desc: "Launch checklist" },
  { href: "/admin/monitoring", label: "Sentry Monitoring", icon: Monitor, desc: "Error tracking" },
  { href: "/admin/audit", label: "Audit Dashboard", icon: Shield, desc: "Security audit log" },
  { href: "/admin/scalability", label: "Scalability", icon: TrendingUp, desc: "Infrastructure" },
  { href: "/admin/kyc", label: "KYC Review", icon: Users, desc: "Identity verification" },
  { href: "/admin/status", label: "Status Page", icon: Radio, desc: "System status" },
];

function AdminIndex() {
  return (
    <div className="min-h-screen bg-[#020204] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-xl font-mono font-bold text-[#FF8C00] mb-1 uppercase tracking-wider">Admin Hub</h1>
        <p className="text-xs text-muted-foreground font-mono mb-6">Internal tools and administration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADMIN_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center gap-3 p-3 border border-[#FF8C00]/10 bg-[#0A0E1A] hover:bg-[#FF8C00]/5 hover:border-[#FF8C00]/20 transition-colors"
              >
                <Icon className="w-4 h-4 text-[#FF8C00]/60 shrink-0" />
                <div>
                  <div className="text-xs font-mono font-medium text-white/80">{tool.label}</div>
                  <div className="text-[10px] text-muted-foreground">{tool.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

function Lazy({ component: C }: { component: React.ComponentType }) {
  return <Suspense fallback={<PageSkeleton />}><C /></Suspense>;
}

export default function AdminHub() {
  const [location] = useLocation();
  const isIndex = location === "/admin" || location === "/admin/";

  if (isIndex) return <AdminIndex />;

  return (
    <Switch>
      <Route path="/admin/token">{() => <Lazy component={TokenAdmin} />}</Route>
      <Route path="/admin/marketing">{() => <Lazy component={MarketingCenter} />}</Route>
      <Route path="/admin/analytics">{() => <Lazy component={AnalyticsPage} />}</Route>
      <Route path="/admin/tickets">{() => <Lazy component={AdminTicketsPage} />}</Route>
      <Route path="/admin/launch">{() => <Lazy component={LaunchReadinessPage} />}</Route>
      <Route path="/admin/monitoring">{() => <Lazy component={AdminMonitoringPage} />}</Route>
      <Route path="/admin/audit">{() => <Lazy component={AdminAuditPage} />}</Route>
      <Route path="/admin/scalability">{() => <Lazy component={AdminScalabilityPage} />}</Route>
      <Route path="/admin/kyc">{() => <Lazy component={AdminKycPage} />}</Route>
      <Route path="/admin/status">{() => <Lazy component={AdminStatusPage} />}</Route>
      <Route>{() => <AdminIndex />}</Route>
    </Switch>
  );
}
