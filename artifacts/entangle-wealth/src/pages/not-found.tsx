import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, ArrowLeft, Search, Activity, TrendingUp, BarChart3, Shield, HelpCircle } from "lucide-react";

const QUICK_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: Activity, desc: "Command center" },
  { href: "/market-overview", label: "Markets", icon: TrendingUp, desc: "Live overview" },
  { href: "/screener", label: "Screener", icon: BarChart3, desc: "Stock filter" },
  { href: "/help", label: "Help Center", icon: HelpCircle, desc: "FAQ & support" },
];

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-3xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(156,39,176,0.08))",
              border: "1px solid rgba(0,212,255,0.15)",
            }}
          >
            <span className="text-6xl font-bold font-mono bg-gradient-to-br from-[#00D4FF] to-[#9c27b0] bg-clip-text text-transparent">
              404
            </span>
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#ff3366] flex items-center justify-center">
              <Search className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)" }}
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-base text-white/50 mb-2 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <p className="text-sm text-white/30 mb-8 max-w-sm">
          Check the URL or navigate to one of the pages below.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Link href="/">
            <Button className="bg-[#00D4FF] text-black hover:bg-[#00D4FF]/90 gap-2 font-semibold shadow-[0_0_20px_rgba(0,212,255,0.2)]">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-white/10 text-white/70 hover:bg-white/5 gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </div>

        <div className="w-full max-w-lg">
          <div className="text-xs uppercase tracking-[0.15em] text-white/30 mb-4 font-semibold">
            Popular Pages
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0a0a0f] border border-white/10 hover:border-[#00D4FF]/30 hover:bg-white/[0.02] transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 group-hover:bg-[#00D4FF]/10 transition">
                    <link.icon className="w-4 h-4 text-white/40 group-hover:text-[#00D4FF] transition" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white group-hover:text-[#00D4FF] transition">
                      {link.label}
                    </div>
                    <div className="text-[11px] text-white/30">{link.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2 text-xs text-white/20">
          <Shield className="w-3.5 h-3.5" />
          <span>EntangleWealth — Bloomberg-Parity Financial Intelligence</span>
        </div>
      </div>
    </Layout>
  );
}
