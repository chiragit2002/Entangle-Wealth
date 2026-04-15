import { lazy, Suspense, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageSkeleton } from "@/components/pwa/PageSkeleton";
import {
  Coins, Megaphone, BarChart3, Ticket, Rocket, Monitor, Shield,
  Users, Radio, TrendingUp, ArrowLeft,
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

const ADMIN_TABS = [
  { id: "token", label: "Token", icon: Coins, component: TokenAdmin },
  { id: "marketing", label: "Marketing", icon: Megaphone, component: MarketingCenter },
  { id: "analytics", label: "Analytics", icon: BarChart3, component: AnalyticsPage },
  { id: "tickets", label: "Tickets", icon: Ticket, component: AdminTicketsPage },
  { id: "launch", label: "Launch", icon: Rocket, component: LaunchReadinessPage },
  { id: "monitoring", label: "Monitoring", icon: Monitor, component: AdminMonitoringPage },
  { id: "audit", label: "Audit", icon: Shield, component: AdminAuditPage },
  { id: "scalability", label: "Scale", icon: TrendingUp, component: AdminScalabilityPage },
  { id: "kyc", label: "KYC", icon: Users, component: AdminKycPage },
  { id: "status", label: "Status", icon: Radio, component: AdminStatusPage },
] as const;

export default function AdminHub() {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const activeEntry = ADMIN_TABS.find((t) => t.id === activeTab);
  const ActiveComponent = activeEntry?.component;

  return (
    <div className="min-h-screen bg-[#020204] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-4">
          {activeTab && (
            <button
              onClick={() => setActiveTab(null)}
              className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back
            </button>
          )}
          <h1 className="text-lg font-mono font-bold text-[#FF8C00] uppercase tracking-wider">
            {activeEntry ? activeEntry.label : "Admin Hub"}
          </h1>
        </div>

        <div className="flex gap-1 flex-wrap mb-5 border-b border-[#FF8C00]/10 pb-3">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "text-[#FF8C00] bg-[#FF8C00]/10 border border-[#FF8C00]/30"
                    : "text-muted-foreground hover:text-white hover:bg-[#FF8C00]/5 border border-transparent"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {ActiveComponent ? (
          <Suspense fallback={<PageSkeleton />}>
            <ActiveComponent />
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-3 p-3 border border-[#FF8C00]/10 bg-[#0A0E1A] hover:bg-[#FF8C00]/5 hover:border-[#FF8C00]/20 transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-[#FF8C00]/60 shrink-0" />
                  <span className="text-xs font-mono font-medium text-white/80">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
