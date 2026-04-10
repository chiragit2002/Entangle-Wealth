import { Link, useLocation } from "wouter";
import { Menu, X, Activity, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useUser, useClerk, Show } from "@clerk/react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";

interface NavGroup {
  label: string;
  items: { href: string; label: string; desc?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Trading",
    items: [
      { href: "/dashboard", label: "Dashboard", desc: "Command center" },
      { href: "/market-overview", label: "Markets", desc: "Live overview" },
      { href: "/technical", label: "Analysis", desc: "55+ indicators" },
      { href: "/charts", label: "Charts", desc: "TradingView Pro" },
      { href: "/screener", label: "Screener", desc: "Stock filter" },
      { href: "/options", label: "Options", desc: "Chain & Greeks" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/time-machine", label: "Time Machine", desc: "What-if simulator" },
      { href: "/sector-flow", label: "Sector Flow", desc: "Rotation radar" },
      { href: "/volatility", label: "Vol Lab", desc: "Risk analytics" },
      { href: "/terminal", label: "Terminal", desc: "Pro commands" },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/research", label: "News Intel", desc: "MiroFish feeds" },
      { href: "/stocks", label: "Stocks", desc: "5,000 NASDAQ" },
    ],
  },
  {
    label: "Compete",
    items: [
      { href: "/leaderboard", label: "Leaderboard", desc: "Top 100 traders" },
      { href: "/achievements", label: "Achievements", desc: "Badges & challenges" },
    ],
  },
  {
    label: "EntangleCoin",
    items: [
      { href: "/wallet", label: "Wallet", desc: "ENTGL balance & txns" },
      { href: "/rewards", label: "Rewards", desc: "Monthly distributions" },
      { href: "/marketplace", label: "Travel", desc: "Book with ENTGL" },
      { href: "/token-admin", label: "Admin", desc: "Token management" },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/earn", label: "Earn", desc: "Gig marketplace" },
      { href: "/community", label: "Community", desc: "Groups & events" },
      { href: "/tax", label: "TaxFlow", desc: "Tax suite" },
      { href: "/pricing", label: "Pricing", desc: "Plans" },
      { href: "/resume", label: "Résumé Builder", desc: "Quantum résumé engine" },
      { href: "/about", label: "About", desc: "Our mission" },
      { href: "/competitive-intel", label: "Intel Report", desc: "Competitive analysis" },
      { href: "/open-source-intel", label: "Open Source Intel", desc: "GitHub solutions" },
    ],
  },
];

const MOBILE_SECTIONS = [
  {
    title: "Trading",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/market-overview", label: "Markets" },
      { href: "/technical", label: "Analysis" },
      { href: "/charts", label: "Charts" },
      { href: "/screener", label: "Screener" },
      { href: "/options", label: "Options" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/time-machine", label: "Time Machine" },
      { href: "/sector-flow", label: "Sector Flow" },
      { href: "/volatility", label: "Vol Lab" },
      { href: "/terminal", label: "Terminal" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/research", label: "News Intel" },
      { href: "/stocks", label: "Stocks" },
    ],
  },
  {
    title: "Compete",
    links: [
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/achievements", label: "Achievements" },
    ],
  },
  {
    title: "EntangleCoin",
    links: [
      { href: "/wallet", label: "Wallet" },
      { href: "/rewards", label: "Rewards" },
      { href: "/marketplace", label: "Travel" },
      { href: "/token-admin", label: "Admin" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/earn", label: "Earn" },
      { href: "/community", label: "Community" },
      { href: "/tax", label: "TaxFlow" },
      { href: "/pricing", label: "Pricing" },
      { href: "/resume", label: "Résumé Builder" },
      { href: "/about", label: "About" },
      { href: "/competitive-intel", label: "Intel Report" },
      { href: "/open-source-intel", label: "Open Source Intel" },
    ],
  },
];

function DropdownMenu({ group, isOpen, onToggle }: { group: NavGroup; isOpen: boolean; onToggle: () => void }) {
  const [location] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const isGroupActive = group.items.some((i) => location === i.href);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 text-sm font-medium transition-all duration-200 hover:text-primary ${
          isGroupActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: "rgba(8,8,20,0.96)",
            backdropFilter: "blur(24px) saturate(1.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="p-1.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                className={`flex flex-col px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-white/80 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="text-[13px] font-semibold">{item.label}</span>
                {item.desc && <span className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <nav className="sticky top-0 z-50 w-full" style={{
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(20px) saturate(1.3)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.15) 20%, rgba(255,215,0,0.08) 50%, rgba(0,212,255,0.15) 80%, transparent 100%)",
      }} />

      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,153,255,0.1))",
              border: "1px solid rgba(0,212,255,0.25)",
            }}
          >
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Entangle<span className="text-primary">Wealth</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          <Link
            href="/"
            className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 hover:text-primary hover:bg-white/[0.03] ${
              location === "/" ? "text-primary bg-primary/[0.06]" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>

          {NAV_GROUPS.map((group) => (
            <DropdownMenu
              key={group.label}
              group={group}
              isOpen={openDropdown === group.label}
              onToggle={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
            />
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <NotificationCenter />

          <Show when="signed-in">
            <div className="flex items-center gap-1 ml-1">
              <Link href="/resume">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary text-xs h-9">
                  Resume
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1.5 text-xs h-9">
                  <User className="w-3.5 h-3.5" />
                  {user?.firstName || "Profile"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-400 h-9 w-9 p-0"
                onClick={() => signOut(() => setLocation("/"))}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Show>

          <Show when="signed-out">
            <Link href="/sign-in">
              <Button size="sm" className="h-9 px-4 text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                Sign In
              </Button>
            </Link>
          </Show>
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <NotificationCenter />
          <button
            className="w-10 h-10 flex items-center justify-center rounded-lg text-white hover:bg-white/[0.05] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden absolute top-16 left-0 w-full border-b border-white/[0.06] animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-4rem)] overflow-y-auto"
          style={{
            background: "rgba(4,4,14,0.97)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="p-4 space-y-5">
            {MOBILE_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/60 mb-2 px-2">{section.title}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-sm font-medium px-3 py-2.5 rounded-lg transition-colors ${
                        location === link.href
                          ? "bg-primary/10 text-primary"
                          : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-white/[0.06]">
              <Show when="signed-in">
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <Link href="/resume" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="text-sm font-medium px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/[0.04] block">Resume</span>
                  </Link>
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="text-sm font-medium px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/[0.04] block">Profile</span>
                  </Link>
                </div>
                <Button
                  className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 h-11"
                  onClick={() => { setIsMobileMenuOpen(false); signOut(() => setLocation("/")); }}
                >
                  Sign Out
                </Button>
              </Show>
              <Show when="signed-out">
                <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary text-black hover:bg-primary/90 h-11 font-bold shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                    Sign In
                  </Button>
                </Link>
              </Show>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
