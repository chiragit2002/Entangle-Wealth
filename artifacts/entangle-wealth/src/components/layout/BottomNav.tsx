import { useLocation, Link } from "wouter";
import { Home, TrendingUp, BarChart3, Wrench, FileText } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Signals", icon: TrendingUp },
  { href: "/technical", label: "Analysis", icon: BarChart3 },
  { href: "/gigs", label: "Gigs", icon: Wrench },
  { href: "/tax", label: "TaxFlow", icon: FileText },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#080810]/98 border-t border-[rgba(0,212,255,0.15)] lg:hidden">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 pb-[max(14px,env(safe-area-inset-bottom))] text-[10px] transition-colors ${
                isActive ? "text-[#00D4FF]" : "text-[#444]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
