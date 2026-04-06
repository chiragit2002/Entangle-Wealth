import { useLocation, Link } from "wouter";
import { Home, TrendingUp, BarChart3, Newspaper, FileText, Clock, Radar, Activity } from "lucide-react";
import { useState } from "react";

const primaryItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Signals", icon: TrendingUp },
  { href: "/technical", label: "Analysis", icon: BarChart3 },
  { href: "/research", label: "Research", icon: Newspaper },
  { href: "/tax", label: "TaxFlow", icon: FileText },
];

const moreItems = [
  { href: "/time-machine", label: "Time Machine", icon: Clock },
  { href: "/sector-flow", label: "Sector Flow", icon: Radar },
  { href: "/volatility", label: "Vol Lab", icon: Activity },
];

export function BottomNav() {
  const [location] = useLocation();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {showMore && (
        <div
          className="fixed bottom-[72px] left-2 right-2 z-50 lg:hidden rounded-2xl animate-in slide-in-from-bottom-2 duration-200"
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
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-white/50 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-semibold tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: "rgba(4,4,14,0.95)",
          backdropFilter: "blur(24px) saturate(1.3)",
          borderTop: "1px solid rgba(0,212,255,0.08)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{
          background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.12), rgba(255,215,0,0.06), rgba(0,212,255,0.12), transparent)",
        }} />
        <div className="flex h-[72px]">
          {primaryItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 pb-[max(8px,env(safe-area-inset-bottom))] text-[9px] font-semibold tracking-wider transition-colors relative ${
                  isActive ? "text-[#00c8f8]" : "text-[#5a5a7a]"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-primary" />
                )}
                <Icon className="w-[22px] h-[22px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
