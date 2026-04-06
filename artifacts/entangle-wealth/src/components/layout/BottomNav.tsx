import { useLocation, Link } from "wouter";
import { Home, TrendingUp, BarChart3, FileText, Newspaper } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Signals", icon: TrendingUp },
  { href: "/technical", label: "Analysis", icon: BarChart3 },
  { href: "/research", label: "Research", icon: Newspaper },
  { href: "/tax", label: "TaxFlow", icon: FileText },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#050510]/96 backdrop-blur-xl border-t border-[rgba(0,212,255,0.12)] lg:hidden">
      <div className="flex h-[72px]">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pb-[max(8px,env(safe-area-inset-bottom))] text-[9px] font-semibold tracking-wider transition-colors ${
                isActive ? "text-[#00c8f8]" : "text-[#5a5a7a]"
              }`}
            >
              <Icon className="w-[22px] h-[22px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
