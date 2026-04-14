import { useLocation, Link } from "wouter";
import { Home, TrendingUp, BarChart3, Newspaper, Trophy, MoreHorizontal, Receipt, Terminal, Gamepad2 } from "lucide-react";
import { useState, useEffect, memo } from "react";

const primaryItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Signals", icon: TrendingUp },
  { href: "/technical", label: "Analysis", icon: BarChart3 },
  { href: "/research", label: "Research", icon: Newspaper },
  { href: "/leaderboard", label: "Compete", icon: Trophy },
];

const moreItems = [
  { href: "/tax", label: "Tax", icon: Receipt },
  { href: "/terminal", label: "Terminal", icon: Terminal },
  { href: "/gamification", label: "Gamification", icon: Gamepad2 },
];

function BottomNavComponent() {
  const [location] = useLocation();
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && showMore) setShowMore(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showMore]);

  return (
    <>
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setShowMore(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-[58px] left-0 right-0 z-50 lg:hidden animate-in slide-in-from-bottom-2 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
            style={{
              background: "var(--bottomnav-bg)",
              borderTop: "1px solid rgba(255,140,0,0.12)",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
            }}
          >
            <div className="p-2 grid grid-cols-3 gap-1">
              {moreItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-col items-center gap-1 py-2.5 transition-colors duration-150 min-h-[52px] justify-center ${
                      isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-[var(--nav-hover-bg)] hover:text-foreground/70"
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span className="text-[8px] font-mono font-bold tracking-widest uppercase">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        aria-label="Main navigation"
        style={{
          background: "var(--bottomnav-bg)",
          borderTop: "1px solid rgba(255,140,0,0.12)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex h-[56px]">
          {primaryItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 pb-0.5 text-[8px] font-mono font-bold tracking-widest uppercase transition-colors duration-150 relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/60"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-primary" aria-hidden="true" />
                )}
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            aria-label="More pages"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 pb-0.5 text-[8px] font-mono font-bold tracking-widest uppercase transition-colors duration-150 ${
              showMore ? "text-primary" : "text-muted-foreground hover:text-foreground/60"
            }`}
          >
            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export const BottomNav = memo(BottomNavComponent);
