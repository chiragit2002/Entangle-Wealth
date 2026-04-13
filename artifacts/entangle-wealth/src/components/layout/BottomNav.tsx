import { useLocation, Link } from "wouter";
import { Home, TrendingUp, BarChart3, Newspaper, Trophy, Clock, Radar, Activity, MoreHorizontal } from "lucide-react";
import { useState, useEffect, memo } from "react";

const primaryItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Signals", icon: TrendingUp },
  { href: "/technical", label: "Analysis", icon: BarChart3 },
  { href: "/research", label: "Research", icon: Newspaper },
  { href: "/leaderboard", label: "Compete", icon: Trophy },
];

const moreItems = [
  { href: "/time-machine", label: "Time Machine", icon: Clock },
  { href: "/sector-flow", label: "Sector Analysis", icon: Radar },
  { href: "/volatility", label: "Volatility", icon: Activity },
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
            className="fixed bottom-[72px] left-2 right-2 z-50 lg:hidden rounded-xl animate-in slide-in-from-bottom-2 duration-200 border border-border/60"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
            style={{
              background: "var(--bottomnav-bg)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div className="p-3 grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors duration-150 min-h-[60px] justify-center ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-[var(--nav-hover-bg)] hover:text-foreground/70"
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50"
        aria-label="Main navigation"
        style={{
          background: "var(--bottomnav-bg)",
          backdropFilter: "blur(16px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex h-[64px]">
          {primaryItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center justify-center gap-1 pb-1 text-[9px] font-semibold tracking-wide transition-colors duration-150 relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground/60"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-primary" aria-hidden="true" />
                )}
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            aria-label="More pages"
            className={`flex-1 flex flex-col items-center justify-center gap-1 pb-1 text-[9px] font-semibold tracking-wide transition-colors duration-150 ${
              showMore ? "text-primary" : "text-muted-foreground hover:text-foreground/60"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export const BottomNav = memo(BottomNavComponent);
