import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User, ChevronDown, Volume2, VolumeX } from "lucide-react";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";
import { useState, useRef, useEffect, useMemo } from "react";
import { useUser, useClerk, Show } from "@clerk/react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";
import { TaxYearSelector } from "@/components/tax/TaxYearSelector";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { isMuted, toggleMute } from "@/lib/confetti";

interface NavGroup {
  label: string;
  items: { href: string; label: string; desc?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Trade",
    items: [
      { href: "/dashboard", label: "Dashboard", desc: "Command center" },
      { href: "/market-overview", label: "Markets", desc: "Live overview" },
      { href: "/charts", label: "Charts", desc: "TradingView Pro" },
      { href: "/options", label: "Options", desc: "Chain & Greeks" },
      { href: "/screener", label: "Screener", desc: "Stock filter" },
    ],
  },
  {
    label: "Analyze",
    items: [
      { href: "/technical", label: "Analysis", desc: "55+ indicators" },
      { href: "/sector-flow", label: "Sector Flow", desc: "Rotation radar" },
      { href: "/volatility", label: "Vol Lab", desc: "Risk analytics" },
      { href: "/stocks", label: "Stocks", desc: "5,000 NASDAQ" },
      { href: "/research", label: "News", desc: "Market intel feeds" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/time-machine", label: "Time Machine", desc: "What-if simulator" },
      { href: "/wealth-sim", label: "Wealth Sim", desc: "Compound growth" },
      { href: "/ai-coach", label: "AI Coach", desc: "Behavioral finance" },
      { href: "/tax", label: "TaxFlow", desc: "Tax dashboard" },
      { href: "/alerts", label: "Alerts", desc: "Real-time alerts" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/leaderboard", label: "Leaderboard", desc: "Top 100 traders" },
      { href: "/achievements", label: "Achievements", desc: "Badges & challenges" },
      { href: "/community", label: "Community", desc: "Groups & events" },
      { href: "/blog", label: "Blog", desc: "Insights & education" },
      { href: "/earn", label: "Earn", desc: "Gig marketplace" },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/wallet", label: "Wallet", desc: "ENTGL balance" },
      { href: "/pricing", label: "Pricing", desc: "Plans & features" },
      { href: "/help", label: "Help Center", desc: "FAQ & support" },
      { href: "/about", label: "About", desc: "Our mission" },
      { href: "/status", label: "Status", desc: "Service health" },
    ],
  },
];

const MOBILE_SECTIONS = [
  {
    title: "Trade",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/market-overview", label: "Markets" },
      { href: "/charts", label: "Charts" },
      { href: "/options", label: "Options" },
      { href: "/screener", label: "Screener" },
    ],
  },
  {
    title: "Analyze",
    links: [
      { href: "/technical", label: "Analysis" },
      { href: "/sector-flow", label: "Sector Flow" },
      { href: "/volatility", label: "Vol Lab" },
      { href: "/stocks", label: "Stocks" },
      { href: "/research", label: "News" },
    ],
  },
  {
    title: "Tools",
    links: [
      { href: "/time-machine", label: "Time Machine" },
      { href: "/wealth-sim", label: "Wealth Sim" },
      { href: "/ai-coach", label: "AI Coach" },
      { href: "/tax", label: "TaxFlow" },
      { href: "/alerts", label: "Alerts" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/achievements", label: "Achievements" },
      { href: "/community", label: "Community" },
      { href: "/blog", label: "Blog" },
      { href: "/earn", label: "Earn" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/wallet", label: "Wallet" },
      { href: "/pricing", label: "Pricing" },
      { href: "/help", label: "Help" },
      { href: "/about", label: "About" },
      { href: "/status", label: "Status" },
    ],
  },
];

function DropdownMenu({ group, isOpen, onToggle }: { group: NavGroup; isOpen: boolean; onToggle: () => void }) {
  const [location] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const isGroupActive = group.items.some((i) => location === i.href);
  const dropdownId = `nav-dropdown-${group.label.toLowerCase().replace(/\s+/g, "-")}`;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onToggle();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        aria-haspopup="true"
        className={`flex items-center gap-1 text-sm font-medium px-2 py-1.5 rounded-lg transition-all duration-200 hover:text-primary hover:bg-white/[0.03] ${
          isGroupActive ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={dropdownId}
          role="menu"
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: "rgba(8,8,20,0.97)",
            backdropFilter: "blur(24px) saturate(1.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="p-1.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                role="menuitem"
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

const ADMIN_NAV_GROUP: NavGroup = {
  label: "Admin",
  items: [
    { href: "/token-admin", label: "Token Admin", desc: "Token management" },
    { href: "/marketing", label: "Marketing AI", desc: "9-agent command center" },
    { href: "/analytics", label: "Analytics", desc: "Platform metrics" },
    { href: "/admin/tickets", label: "Support Tickets", desc: "Manage tickets" },
    { href: "/launch", label: "Launch Readiness", desc: "Go/No-Go checklist" },
  ],
};

const ADMIN_MOBILE_SECTION = {
  title: "Admin",
  links: [
    { href: "/token-admin", label: "Token Admin" },
    { href: "/marketing", label: "Marketing AI" },
    { href: "/analytics", label: "Analytics" },
    { href: "/admin/tickets", label: "Support Tickets" },
    { href: "/launch", label: "Launch Readiness" },
  ],
};

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(() => isMuted());
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = useIsAdmin();

  const handleToggleMute = () => {
    const next = toggleMute();
    setSoundMuted(next);
  };

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isMobileMenuOpen) setIsMobileMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  const navGroups = useMemo(() => {
    return isAdmin ? [...NAV_GROUPS, ADMIN_NAV_GROUP] : NAV_GROUPS;
  }, [isAdmin]);

  const mobileSections = useMemo(() => {
    return isAdmin ? [...MOBILE_SECTIONS, ADMIN_MOBILE_SECTION] : MOBILE_SECTIONS;
  }, [isAdmin]);

  return (
    <nav className="sticky top-0 z-50 w-full" aria-label="Main navigation" style={{
      background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(20px) saturate(1.3)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.12) 30%, rgba(0,212,255,0.12) 70%, transparent 100%)",
      }} />

      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <img
            src={logoImg}
            alt="EntangleWealth logo"
            className="w-9 h-9 rounded-lg object-contain transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
          />
          <span className="font-bold text-lg tracking-tight text-white">
            Entangle<span className="text-primary">Wealth</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 mx-4">
          {navGroups.map((group) => (
            <DropdownMenu
              key={group.label}
              group={group}
              isOpen={openDropdown === group.label}
              onToggle={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
            />
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <TaxYearSelector />
          <button
            onClick={handleToggleMute}
            title={soundMuted ? "Unmute sounds" : "Mute sounds"}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
            aria-label={soundMuted ? "Unmute sounds" : "Mute sounds"}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <NotificationCenter />

          <Show when="signed-in">
            <div className="flex items-center gap-1 ml-1">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-1.5 text-xs h-9">
                  <User className="w-3.5 h-3.5" />
                  {user?.firstName || "Profile"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Sign out"
                className="text-muted-foreground hover:text-red-400 h-9 w-9 p-0"
                onClick={() => signOut(() => setLocation("/"))}
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          </Show>

          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="h-9 px-4 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.05]">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="h-9 px-4 text-xs font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                Get Started
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
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          style={{
            background: "rgba(4,4,14,0.98)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="p-4 space-y-6">
            {mobileSections.map((section) => (
              <div key={section.title}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/50 mb-2.5 px-1">{section.title}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-sm font-medium px-3 py-2.5 rounded-xl transition-colors ${
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

            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <button
                onClick={handleToggleMute}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/[0.04] hover:text-white/70 transition-colors"
              >
                {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {soundMuted ? "Unmute sounds" : "Mute sounds"}
              </button>
              <Show when="signed-in">
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/[0.04]">
                    <User className="w-4 h-4" /> Profile
                  </span>
                </Link>
                <Button
                  className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 h-11 mt-1"
                  onClick={() => { setIsMobileMenuOpen(false); signOut(() => setLocation("/")); }}
                >
                  Sign Out
                </Button>
              </Show>
              <Show when="signed-out">
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/[0.05] h-11 font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary text-black hover:bg-primary/90 h-11 font-bold shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </Show>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
