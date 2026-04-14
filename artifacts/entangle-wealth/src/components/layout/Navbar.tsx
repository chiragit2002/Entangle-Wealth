import { Link, useLocation } from "wouter";
import { Menu, X, LogOut, User } from "lucide-react";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";
import { useState, useEffect, useMemo, memo } from "react";
import { useUser, useClerk, Show } from "@clerk/react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface NavLink { href: string; label: string }

const CORE_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stocks", label: "Stocks" },
  { href: "/tax", label: "Tax" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/pricing", label: "Pricing" },
];

const MOBILE_SECTIONS = [
  {
    title: "Core",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/stocks", label: "Stocks" },
      { href: "/tax", label: "Tax" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/charts", label: "Charts" },
      { href: "/technical", label: "Analysis" },
      { href: "/options", label: "Options" },
      { href: "/terminal", label: "Terminal" },
      { href: "/alerts", label: "Alerts" },
      { href: "/taxgpt", label: "TaxGPT" },
      { href: "/achievements", label: "Achievements" },
      { href: "/help", label: "Help" },
      { href: "/about", label: "About" },
    ],
  },
];

const TICKER_SYMBOLS = [
  { symbol: "AAPL", price: "189.30", change: "+1.24", pct: "+0.66%" },
  { symbol: "MSFT", price: "378.85", change: "+2.10", pct: "+0.56%" },
  { symbol: "NVDA", price: "487.21", change: "+8.43", pct: "+1.76%" },
  { symbol: "GOOGL", price: "141.55", change: "-0.82", pct: "-0.58%" },
  { symbol: "AMZN", price: "178.25", change: "+1.67", pct: "+0.95%" },
  { symbol: "META", price: "502.30", change: "+4.15", pct: "+0.83%" },
  { symbol: "TSLA", price: "177.45", change: "-3.22", pct: "-1.78%" },
  { symbol: "BTC", price: "97,420", change: "+2,341", pct: "+2.46%" },
  { symbol: "ETH", price: "3,842", change: "+87", pct: "+2.32%" },
  { symbol: "SPY", price: "523.14", change: "+1.87", pct: "+0.36%" },
  { symbol: "QQQ", price: "446.82", change: "+2.34", pct: "+0.53%" },
  { symbol: "GOLD", price: "2,385", change: "+10.4", pct: "+0.44%" },
  { symbol: "AMD", price: "164.33", change: "-1.55", pct: "-0.93%" },
  { symbol: "PLTR", price: "24.87", change: "+0.43", pct: "+1.76%" },
  { symbol: "RKLB", price: "12.45", change: "+0.33", pct: "+2.72%" },
];

function TickerTape() {
  const items = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS];
  return (
    <div className="ticker-tape border-b border-[rgba(255,140,0,0.10)] bg-[#080C18]" style={{ height: "22px", display: "flex", alignItems: "center" }}>
      <div className="inline-flex items-center gap-6 animate-ticker" style={{ willChange: "transform" }}>
        {items.map((item, i) => {
          const isUp = !item.change.startsWith("-");
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap">
              <span className="font-bold" style={{ color: "rgba(255,140,0,0.6)", letterSpacing: "0.08em" }}>{item.symbol}</span>
              <span style={{ color: "rgba(255,140,0,0.45)" }}>{item.price}</span>
              <span className={isUp ? "ticker-item-up" : "ticker-item-down"} style={{ fontSize: "9px" }}>{item.pct}</span>
              <span style={{ color: "rgba(255,140,0,0.12)", marginLeft: 2 }}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function NavbarComponent() {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const navLinks = useMemo(() => {
    const links = [...CORE_LINKS];
    if (isAdmin) links.push({ href: "/admin", label: "Admin" });
    return links;
  }, [isAdmin]);

  const mobileSections = useMemo(() => {
    const sections = [...MOBILE_SECTIONS];
    if (isAdmin) sections.push({ title: "Admin", links: [{ href: "/admin", label: "Admin Hub" }] });
    return sections;
  }, [isAdmin]);

  return (
    <nav className="sticky top-0 z-50 w-full" aria-label="Main navigation" style={{ background: "var(--nav-bg)", borderBottom: "1px solid rgba(255,140,0,0.12)" }}>
      <TickerTape />
      <div className="container mx-auto px-4 md:px-6 h-11 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <img src={logoImg} alt="EntangleWealth logo" className="w-6 h-6 object-contain opacity-90" />
          <span className="font-mono font-bold text-sm tracking-wider" style={{ color: "#FF8C00" }}>
            ENTANGLE<span style={{ color: "rgba(255,140,0,0.5)" }}>WEALTH</span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-0 mx-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1.5 transition-colors duration-150 hover:text-foreground hover:bg-[var(--nav-hover-bg)] ${
                location === link.href || (link.href !== "/" && location.startsWith(link.href)) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
          <Show when="signed-in">
            <div className="flex items-center gap-1 ml-1">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5 text-xs h-7 font-mono">
                  <User className="w-3 h-3" />{user?.firstName || "PROFILE"}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" aria-label="Sign out" className="text-muted-foreground hover:text-destructive h-7 w-7 p-0" onClick={() => signOut(() => setLocation("/"))}>
                <LogOut className="w-3 h-3" aria-hidden="true" />
              </Button>
            </div>
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in"><Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground font-mono">SIGN IN</Button></Link>
            <Link href="/sign-up"><Button size="sm" className="h-7 px-3 text-xs font-mono font-bold" style={{ background: "#FF8C00", color: "#0A0E1A", borderRadius: 0 }}>GET ACCESS</Button></Link>
          </Show>
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[var(--nav-hover-bg)] transition-colors duration-150" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}>
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-[55px] left-0 w-full border-b border-[rgba(255,140,0,0.12)] animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-3.5rem)] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Mobile navigation menu" style={{ background: "var(--nav-bg)" }}>
          <div className="p-4 space-y-4">
            {mobileSections.map((section) => (
              <div key={section.title}>
                <div className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] mb-2 px-1" style={{ color: "rgba(255,140,0,0.4)" }}>{section.title}</div>
                <div className="grid grid-cols-2 gap-1">
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className={`text-xs font-mono px-2 py-1.5 transition-colors duration-150 ${location === link.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-[var(--nav-hover-bg)] hover:text-foreground"}`}>{link.label}</Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-[rgba(255,140,0,0.10)] space-y-1">
              <Show when="signed-in">
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="flex items-center gap-2 text-xs font-mono px-2 py-2 text-muted-foreground hover:bg-[var(--nav-hover-bg)] hover:text-foreground transition-colors duration-150"><User className="w-3.5 h-3.5" /> PROFILE</span>
                </Link>
                <Button className="w-full h-9 mt-1 text-xs font-mono font-bold" style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.20)", borderRadius: 0 }} onClick={() => { setIsMobileMenuOpen(false); signOut(() => setLocation("/")); }}>SIGN OUT</Button>
              </Show>
              <Show when="signed-out">
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}><Button variant="outline" className="w-full h-9 text-xs font-mono" style={{ borderRadius: 0 }}>SIGN IN</Button></Link>
                  <Link href="/sign-up" onClick={() => setIsMobileMenuOpen(false)}><Button className="w-full h-9 text-xs font-mono font-bold" style={{ background: "#FF8C00", color: "#0A0E1A", borderRadius: 0 }}>GET ACCESS</Button></Link>
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
