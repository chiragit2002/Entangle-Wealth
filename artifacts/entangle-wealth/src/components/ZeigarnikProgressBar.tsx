import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Link } from "wouter";
import { ArrowRight, Target, FileText, Wrench, BookOpen } from "lucide-react";

interface ProgressItem {
  id: string;
  label: string;
  current: number;
  total: number;
  href: string;
  icon: React.ReactNode;
  color: string;
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const isNearComplete = pct >= 75;
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: isNearComplete
            ? `linear-gradient(90deg, ${color}, ${color}cc)`
            : color,
          boxShadow: isNearComplete ? `0 0 8px ${color}60` : undefined,
          animation: isNearComplete ? "pulse 1.5s ease-in-out infinite" : undefined,
        }}
      />
    </div>
  );
}

interface ZeigarnikProgressBarProps {
  compact?: boolean;
}

export function ZeigarnikProgressBar({ compact = false }: ZeigarnikProgressBarProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const load = async () => {
      try {
        const [onboardRes, habitsRes] = await Promise.all([
          authFetch("/onboarding", getToken),
          authFetch("/habits/summary", getToken),
        ]);

        const progressItems: ProgressItem[] = [];

        if (onboardRes.ok) {
          const data = await onboardRes.json();

          const onboardingSteps = [
            data?.profileComplete ?? false,
            data?.goalSet ?? false,
            data?.firstAnalysis ?? false,
            data?.habitCreated ?? false,
            data?.checklist ? Object.values(data.checklist as Record<string, boolean>).some(Boolean) : false,
          ];
          const onboardingDone = onboardingSteps.filter(Boolean).length;
          progressItems.push({
            id: "onboarding",
            label: "Getting started",
            current: onboardingDone,
            total: onboardingSteps.length,
            href: "/profile",
            icon: <BookOpen className="w-3 h-3" />,
            color: "#a855f7",
          });

          const checklist: Record<string, boolean> = data.checklist ?? {};
          const completed = Object.values(checklist).filter(Boolean).length;
          const total = 5;
          progressItems.push({
            id: "tax_profile",
            label: "Tax profile setup",
            current: completed,
            total,
            href: "/tax",
            icon: <FileText className="w-3 h-3" />,
            color: "#FFB800",
          });
        }

        if (habitsRes.ok) {
          const data = await habitsRes.json();
          progressItems.push({
            id: "wealth_habits",
            label: "Wealth habits tracked",
            current: data.completedToday ?? 0,
            total: data.totalHabits ?? 8,
            href: "/habits",
            icon: <Target className="w-3 h-3" />,
            color: "#00D4FF",
          });
        }

        const toolsExplored = Number(localStorage.getItem("ew_tools_explored") || "4");
        progressItems.push({
          id: "tools_explored",
          label: "Tools explored",
          current: Math.min(toolsExplored, 12),
          total: 12,
          href: "/dashboard",
          icon: <Wrench className="w-3 h-3" />,
          color: "#00FF41",
        });

        setItems(progressItems);
        setLoaded(true);
      } catch (err) {
        console.error("[ZeigarnikProgressBar] Failed to load progress:", err);
        setLoaded(true);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    const nav = ["dashboard", "terminal", "taxgpt", "habits", "gamification", "achievements", "market-overview", "technical", "options", "screener", "community", "alternate-timeline"];
    const visited = new Set(JSON.parse(localStorage.getItem("ew_visited_pages") || "[]"));
    const current = window.location.pathname.replace("/", "").split("/")[0];
    if (current && nav.includes(current)) {
      visited.add(current);
      localStorage.setItem("ew_visited_pages", JSON.stringify([...visited]));
      localStorage.setItem("ew_tools_explored", String(visited.size));
    }
  }, []);

  if (!isSignedIn || !loaded || items.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-2">
        {items.map(item => {
          const pct = item.total > 0 ? Math.round((item.current / item.total) * 100) : 0;
          const remaining = item.total - item.current;
          return (
            <Link key={item.id} href={item.href} className="block group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5" style={{ color: item.color }}>
                  {item.icon}
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: item.color }}>
                    {item.label}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-white/30">
                  {item.current}/{item.total}
                </span>
              </div>
              <ProgressBar pct={pct} color={item.color} />
              {remaining > 0 && pct >= 60 && (
                <p className="text-[8px] font-mono text-white/25 mt-0.5">
                  {remaining} more to complete
                </p>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06] border-l-2 border-l-[#00D4FF]">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-[#00D4FF]" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#00D4FF]">YOUR PROGRESS</span>
        </div>
        <span className="text-[8px] font-mono text-white/25">finish what you started</span>
      </div>
      <div className="p-2 space-y-2.5">
        {items.map(item => {
          const pct = item.total > 0 ? Math.round((item.current / item.total) * 100) : 0;
          const remaining = item.total - item.current;
          const isNearComplete = pct >= 80;
          return (
            <Link key={item.id} href={item.href} className="block group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5" style={{ color: item.color }}>
                  {item.icon}
                  <span className="text-[9px] font-mono font-bold" style={{ color: item.color }}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-white/30">
                    {pct}%
                  </span>
                  {remaining > 0 && (
                    <ArrowRight className="w-2.5 h-2.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  )}
                </div>
              </div>
              <ProgressBar pct={pct} color={item.color} />
              {isNearComplete && remaining > 0 && (
                <p className="text-[8px] font-mono mt-0.5" style={{ color: item.color }}>
                  So close! {remaining} more to go →
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
