import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  Coins, Megaphone, BarChart3, Ticket, Rocket, Monitor, Shield,
  FileText, Users, Globe, Radio, Gamepad2, Gift, Brain, TrendingUp,
  Calendar, Search, Briefcase, MapPin, Clock
} from "lucide-react";

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

const REMOVED_PAGES = [
  { href: "/admin/content-calendar", label: "Content Calendar", icon: Calendar },
  { href: "/admin/reddit-engine", label: "Reddit Engine", icon: Globe },
  { href: "/admin/seo", label: "SEO Engine", icon: Search },
  { href: "/admin/daily-content", label: "Daily Content", icon: FileText },
  { href: "/admin/evolution", label: "Evolution Dashboard", icon: TrendingUp },
  { href: "/admin/command-center", label: "Command Center", icon: Briefcase },
  { href: "/admin/wealth-sim", label: "Wealth Simulator", icon: Gamepad2 },
  { href: "/admin/giveaway", label: "Giveaway", icon: Gift },
  { href: "/admin/ai-coach", label: "AI Coach", icon: Brain },
  { href: "/admin/habits", label: "Habits Dashboard", icon: Clock },
  { href: "/admin/life-outcomes", label: "Life Outcomes", icon: MapPin },
];

export default function AdminHub() {
  return (
    <div className="min-h-screen bg-[#020204] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-xl font-mono font-bold text-[#FF8C00] mb-1 uppercase tracking-wider">Admin Hub</h1>
        <p className="text-xs text-muted-foreground font-mono mb-6">Internal tools and administration</p>

        <section className="mb-8">
          <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#FF8C00]/50 mb-3">Active Tools</h2>
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
        </section>

        <section>
          <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-muted-foreground/40 mb-3">Archived / Experimental</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {REMOVED_PAGES.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.href}
                  className="flex items-center gap-2 p-2 border border-white/5 bg-white/[0.02] opacity-50"
                >
                  <Icon className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <span className="text-[10px] font-mono text-muted-foreground/60">{tool.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
