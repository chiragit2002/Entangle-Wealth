import { useLocation, Link } from "wouter";
import { LayoutDashboard, BarChart3, Receipt, Trophy, DollarSign } from "lucide-react";
import { memo } from "react";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stocks", label: "Stocks", icon: BarChart3 },
  { href: "/tax", label: "Tax", icon: Receipt },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
];

function BottomNavComponent() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Main navigation"
      style={{
        background: "var(--bottomnav-bg)",
        borderTop: "1px solid rgba(0,180,216,0.12)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex h-[56px]">
        {items.map((item) => {
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
      </div>
    </nav>
  );
}

export const BottomNav = memo(BottomNavComponent);
