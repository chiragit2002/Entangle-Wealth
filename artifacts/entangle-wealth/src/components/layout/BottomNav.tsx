import { useLocation, Link } from "wouter";
import { Home, TrendingUp, BarChart3, Newspaper, Trophy, Clock, Radar, Activity, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

const primaryItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Signals", icon: TrendingUp },
  { href: "/technical", label: "Analysis", icon: BarChart3 },
  { href: "/research", label: "Research", icon: Newspaper },
  { href: "/leaderboard", label: "Compete", icon: Trophy },
];

const moreItems = [
  { href: "/time-machine", label: "Time Machine", icon: Clock },
  { href: "/sector-flow", label: "Sector Flow", icon: Radar },
  { href: "/volatility", label: "Vol Lab", icon: Activity },
];

export function BottomNav() {
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
            className="fixed bottom-[72px] left-2 right-2 z-50 lg:hidden rounded-2xl animate-in slide-in-from-bottom-2 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
            style={{
              background: "rgba(8,8,20,0.97)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
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
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors min-h-[60px] justify-center ${
                      isActive ? "bg-primary/10 text-primary" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="text-[9px] font-semibold tracking-wider">{item.label}</span>
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
          background: "rgba(4,4,14,0.95)",
          backdropFilter: "blur(24px) saturate(1.3)",
          borderTop: "1px solid rgba(0,212,255,0.08)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
          background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.12), rgba(255,215,0,0.06), rgba(0,212,255,0.12), transparent)",
        }} aria-hidden="true" />
        <div className="flex h-[72px]">
          {primaryItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`flex-1 flex flex-col items-center justify-center gap-1 pb-1 text-[9px] font-semibold tracking-wider transition-colors relative ${
                  isActive ? "text-[#00c8f8]" : "text-[#5a5a7a] hover:text-white/50"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary" aria-hidden="true" />
                )}
                <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            aria-label="More pages"
            className={`flex-1 flex flex-col items-center justify-center gap-1 pb-1 text-[9px] font-semibold tracking-wider transition-colors ${
              showMore ? "text-[#00c8f8]" : "text-[#5a5a7a] hover:text-white/50"
            }`}
          >
            <MoreHorizontal className="w-[22px] h-[22px]" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
