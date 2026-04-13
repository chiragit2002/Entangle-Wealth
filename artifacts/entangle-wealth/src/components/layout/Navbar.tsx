import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User, ChevronDown } from "lucide-react";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";
import { useState, useRef, useEffect, useMemo, memo } from "react";
import { useUser, useClerk, Show } from "@clerk/react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsAdmin } from "@/hooks/useIsAdmin";

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
      { href: "/sector-flow", label: "Sector Analysis", desc: "Rotation radar" },
      { href: "/volatility", label: "Volatility Analysis", desc: "Risk analytics" },
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
      { href: "/alerts", label: "Alerts", desc: "Real-time alerts" },
      { href: "/tax", label: "TaxFlow", desc: "Tax dashboard" },
      { href: "/travel", label: "Business Travel", desc: "IRS trip planner" },
      { href: "/receipts", label: "Receipt Capture", desc: "Scan & track receipts" },
      { href: "/integrations", label: "Integrations", desc: "Connect accounting apps" },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/leaderboard", label: "Leaderboard", desc: "Top 100 traders" },
      { href: "/achievements", label: "Achievements", desc: "Badges & challenges" },
      { href: "/community", label: "Community", desc: "Groups & events" },
      { href: "/wallet", label: "Rewards Balance", desc: "Tokens & rewards" },
      { href: "/blog", label: "Blog", desc: "Insights & education" },
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
      { href: "/sector-flow", label: "Sector Analysis" },
      { href: "/volatility", label: "Volatility Analysis" },
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
      { href: "/alerts", label: "Alerts" },
      { href: "/tax", label: "TaxFlow" },
      { href: "/travel", label: "Business Travel" },
      { href: "/receipts", label: "Receipt Capture" },
      { href: "/integrations", label: "Integrations" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/achievements", label: "Achievements" },
      { href: "/community", label: "Community" },
      { href: "/wallet", label: "Rewards Balance" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/help", label: "Help Center" },
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
        className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-150 hover:text-foreground hover:bg-[var(--nav-hover-bg)] ${
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
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            background: "var(--nav-dropdown-bg)",
            border: "var(--nav-dropdown-border)",
            boxShadow: "var(--nav-dropdown-shadow)",
          }}
        >
          <div className="p-1.5">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onToggle}
                role="menuitem"
                className={`flex flex-col px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-[var(--nav-hover-bg)] hover:text-foreground"
                }`}
              >
                <span className="text-[13px] font-medium">{item.label}</span>
                {item.desc && <span className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</span>}
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
    { href: "/admin/monitoring", label: "Sentry Monitoring", desc: "Live error tracking" },
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
    { href: "/admin/monitoring", label: "Sentry Monitoring" },
  ],
};

function NavbarComponent() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = useIsAdmin();

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
    <nav
      className="sticky top-0 z-50 w-full border-b border-border/60"
      aria-label="Main navigation"
      style={{
        background: "var(--nav-bg)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="container mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <img
            src={logoImg}
            alt="EntangleWealth logo"
            className="w-8 h-8 rounded-lg object-contain transition-opacity duration-200 group-hover:opacity-90"
          />
          <span className="font-bold text-base tracking-tight text-foreground">
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

        <div className="hidden lg:flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationCenter />

          <Show when="signed-in">
            <div className="flex items-center gap-1 ml-1">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 text-xs h-8">
                  <User className="w-3.5 h-3.5" />
                  {user?.firstName || "Profile"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Sign out"
                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                onClick={() => signOut(() => setLocation("/"))}
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
          </Show>

          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="h-8 px-3 text-xs font-semibold">
                Get clarity — it's free
              </Button>
            </Link>
          </Show>
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--nav-hover-bg)] transition-colors duration-150"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden absolute top-14 left-0 w-full border-b border-border/60 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          style={{
            background: "var(--nav-bg)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="p-4 space-y-5">
            {mobileSections.map((section) => (
              <div key={section.title}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-2 px-1">{section.title}</div>
                <div className="grid grid-cols-2 gap-1">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 ${
                        location === link.href
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/60 hover:bg-[var(--nav-hover-bg)] hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-border/60 space-y-1">
              <Show when="signed-in">
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg text-foreground/60 hover:bg-[var(--nav-hover-bg)] hover:text-foreground transition-colors duration-150">
                    <User className="w-4 h-4" /> Profile
                  </span>
                </Link>
                <Button
                  className="w-full bg-destructive/10 text-destructive hover:bg-destructive/15 border border-destructive/20 h-10 mt-1 text-sm font-medium"
                  onClick={() => { setIsMobileMenuOpen(false); signOut(() => setLocation("/")); }}
                >
                  Sign Out
                </Button>
              </Show>
              <Show when="signed-out">
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full h-10 text-sm font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full h-10 text-sm font-semibold">
                      Get clarity — free
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

export const Navbar = memo(NavbarComponent);
