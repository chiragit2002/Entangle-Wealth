import { useAuth } from "@clerk/react";
import { TrendingUp, FileSearch, BarChart3, Brain, Compass, BookOpen, Target, Zap } from "lucide-react";
import { useJourney } from "@/hooks/useJourney";
import { JOURNEY_PHASES } from "@/lib/journeyConfig";

const PHASE_ICONS: Record<string, React.ReactNode> = {
  discover: <Compass className="w-3 h-3" />,
  analyze: <BookOpen className="w-3 h-3" />,
  optimize: <Target className="w-3 h-3" />,
  grow: <Zap className="w-3 h-3" />,
};

interface ArchetypeInfo {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  nudge: string;
}

function getPhaseArchetype(phaseId: string): ArchetypeInfo {
  const archetypes: Record<string, ArchetypeInfo> = {
    discover: {
      label: "Explorer",
      icon: <Compass className="w-3 h-3" />,
      color: "#FF8C00",
      description: "You're exploring the platform and building your financial awareness.",
      nudge: "Complete Chapter 1 to unlock Analyst-level insights.",
    },
    analyze: {
      label: "Analyst",
      icon: <BarChart3 className="w-3 h-3" />,
      color: "#0099cc",
      description: "You run simulations and analyze data to understand your financial future.",
      nudge: "Analysts who model 3+ scenarios outperform passive investors by 2x.",
    },
    optimize: {
      label: "Strategist",
      icon: <Target className="w-3 h-3" />,
      color: "#FFB800",
      description: "You're sharpening your strategy, reducing costs, and building momentum.",
      nudge: "Strategists save an average of $4,800/year through tax optimization.",
    },
    grow: {
      label: "Builder",
      icon: <Zap className="w-3 h-3" />,
      color: "#00D4FF",
      description: "You're executing on your plan and building real compounding wealth.",
      nudge: "Builders who execute paper trades develop 40% stronger conviction.",
    },
  };
  return archetypes[phaseId] ?? archetypes.discover;
}

interface IdentityLabelProps {
  variant?: "badge" | "card" | "nudge";
}

export function IdentityLabel({ variant = "badge" }: IdentityLabelProps) {
  const { isSignedIn } = useAuth();
  const { state, loading, currentPhase } = useJourney();

  if (loading || !isSignedIn) return null;

  const phaseId = state.currentPhaseId ?? "discover";
  const archetype = getPhaseArchetype(phaseId);
  const phase = JOURNEY_PHASES.find(p => p.id === phaseId) ?? JOURNEY_PHASES[0];
  const completedMilestonesInPhase = phase.milestones.filter(m => state.completedMilestones[m.id]).length;
  const phaseProgress = phase.milestones.length > 0 ? completedMilestonesInPhase / phase.milestones.length : 0;

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
        <span className="opacity-50 font-normal">· {phase.theme}</span>
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
            {archetype.label} <span className="opacity-50 normal-case font-normal">— {phase.theme}</span>
          </p>
          <p className="text-[11px] text-white/50">{archetype.nudge}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06]"
        style={{ borderLeftWidth: 2, borderLeftColor: archetype.color }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: archetype.color }}>{archetype.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: archetype.color }}>YOUR IDENTITY</span>
        </div>
        <span className="text-[9px] text-white/30 font-mono">{phase.theme}</span>
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
            <p className="text-[8px] font-mono text-white/30">{phase.name} Phase · {completedMilestonesInPhase}/{phase.milestones.length} milestones</p>
          </div>
        </div>
        <div className="mb-2">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${phaseProgress * 100}%`, background: archetype.color }}
            />
          </div>
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">{archetype.description}</p>
        <p className="text-[10px] font-semibold mt-1.5" style={{ color: archetype.color }}>{archetype.nudge}</p>
      </div>
    </div>
  );
}
