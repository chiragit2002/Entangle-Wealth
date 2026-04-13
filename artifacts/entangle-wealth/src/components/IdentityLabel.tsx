import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { User, TrendingUp, FileSearch, BarChart3, Brain } from "lucide-react";

interface ArchetypeDefinition {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  nudge: string;
}

const ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: "wealth_builder",
    label: "Wealth Builder",
    icon: <TrendingUp className="w-3 h-3" />,
    color: "#00D4FF",
    description: "You focus on growing long-term wealth through consistent habits and smart investing.",
    nudge: "As a Wealth Builder, your next move is reviewing your portfolio allocation.",
  },
  {
    id: "tax_strategist",
    label: "Tax Strategist",
    icon: <FileSearch className="w-3 h-3" />,
    color: "#FFB800",
    description: "You actively seek deductions and optimize for tax efficiency.",
    nudge: "Tax Strategists save an average of $4,800/year. You're on track.",
  },
  {
    id: "market_analyst",
    label: "Market Analyst",
    icon: <BarChart3 className="w-3 h-3" />,
    color: "#00FF41",
    description: "You're data-driven and spend time analyzing signals and market conditions.",
    nudge: "Your signal analysis puts you ahead of 89% of members.",
  },
  {
    id: "habit_former",
    label: "Habit Former",
    icon: <Brain className="w-3 h-3" />,
    color: "#a855f7",
    description: "You build sustainable financial habits that compound over time.",
    nudge: "Consistent habit tracking puts you in the top 15% of Habit Formers.",
  },
];

function detectArchetype(data: {
  signalsViewed?: number;
  taxScansRun?: number;
  habitsCompleted?: number;
  xp?: number;
}): ArchetypeDefinition {
  const scores = {
    market_analyst: (data.signalsViewed || 0) * 2,
    tax_strategist: (data.taxScansRun || 0) * 3,
    habit_former: (data.habitsCompleted || 0) * 2,
    wealth_builder: (data.xp || 0) / 50,
  };

  const topId = Object.entries(scores).reduce((best, [id, score]) => score > best[1] ? [id, score] : best, ["wealth_builder", 0])[0];
  return ARCHETYPES.find(a => a.id === topId) || ARCHETYPES[0];
}

interface IdentityLabelProps {
  variant?: "badge" | "card" | "nudge";
}

export function IdentityLabel({ variant = "badge" }: IdentityLabelProps) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [archetype, setArchetype] = useState<ArchetypeDefinition | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const cached = localStorage.getItem("ew_archetype");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const found = ARCHETYPES.find(a => a.id === parsed.id);
        if (found) { setArchetype(found); setLoaded(true); return; }
      } catch {}
    }

    const load = async () => {
      try {
        const [gamRes, habitsRes] = await Promise.all([
          authFetch("/gamification/me", getToken),
          authFetch("/habits/summary", getToken),
        ]);

        const activityData: Record<string, number> = {};
        if (gamRes.ok) {
          const gam = await gamRes.json();
          activityData.xp = gam?.xp?.totalXp ?? 0;
          activityData.signalsViewed = gam?.xp?.weeklyXp ?? 0;
        }
        if (habitsRes.ok) {
          const habits = await habitsRes.json();
          activityData.habitsCompleted = habits?.totalLifetimeCompletions ?? 0;
        }

        const taxScans = Number(localStorage.getItem("ew_tax_scans_run") || "0");
        activityData.taxScansRun = taxScans;

        const detected = detectArchetype(activityData);
        setArchetype(detected);
        localStorage.setItem("ew_archetype", JSON.stringify({ id: detected.id, ts: Date.now() }));
        setLoaded(true);
      } catch {
        const fallback = ARCHETYPES[0];
        setArchetype(fallback);
        setLoaded(true);
      }
    };

    load();
  }, [isLoaded, isSignedIn, getToken]);

  if (!loaded || !archetype || !isSignedIn) return null;

  if (variant === "badge") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
        style={{
          color: archetype.color,
          background: `${archetype.color}15`,
          border: `1px solid ${archetype.color}30`,
        }}
      >
        <span style={{ color: archetype.color }}>{archetype.icon}</span>
        {archetype.label}
      </div>
    );
  }

  if (variant === "nudge") {
    return (
      <div
        className="flex items-start gap-2.5 p-3 rounded-lg border"
        style={{ borderColor: `${archetype.color}25`, background: `${archetype.color}08` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${archetype.color}15`, border: `1px solid ${archetype.color}25`, color: archetype.color }}
        >
          {archetype.icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: archetype.color }}>
            {archetype.label}
          </p>
          <p className="text-[11px] text-white/50">{archetype.nudge}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06]" style={{ borderLeftWidth: 2, borderLeftColor: archetype.color }}>
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3" style={{ color: archetype.color }} />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: archetype.color }}>YOUR IDENTITY</span>
        </div>
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${archetype.color}15`, border: `1px solid ${archetype.color}25`, color: archetype.color }}
          >
            {archetype.icon}
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">{archetype.label}</p>
            <p className="text-[8px] font-mono text-white/30">Your behavioral archetype</p>
          </div>
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">{archetype.description}</p>
        <p className="text-[10px] font-semibold mt-1.5" style={{ color: archetype.color }}>{archetype.nudge}</p>
      </div>
    </div>
  );
}
