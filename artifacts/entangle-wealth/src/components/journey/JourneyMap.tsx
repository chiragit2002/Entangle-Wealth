import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useJourney } from "@/hooks/useJourney";
import { JOURNEY_PHASES } from "@/lib/journeyConfig";
import { fireCelebration } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import {
  ChevronDown, ChevronUp, Map, CheckCircle2, Circle,
  ArrowRight, Zap, Star, X,
} from "lucide-react";

const DISMISS_KEY = "ew_journey_map_dismissed";
const SHOW_AFTER_DAYS = 0;

function useJourneyMapVisible() {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "true") setDismissed(true);
    } catch {}
  }, []);
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "true"); } catch {}
  };
  return { dismissed, dismiss };
}

export function JourneyMap() {
  const { state, loading, currentPhase, completedCount, totalMilestones, overallProgress } = useJourney();
  const { dismissed, dismiss } = useJourneyMapVisible();
  const [collapsed, setCollapsed] = useState(true);
  const [showBigWin, setShowBigWin] = useState(false);
  const [celebratedPhases, setCelebratedPhases] = useState<string[]>([]);

  useEffect(() => {
    if (!state.completedPhases?.length) return;
    for (const phaseId of state.completedPhases) {
      if (!celebratedPhases.includes(phaseId)) {
        const stored = localStorage.getItem(`ew_journey_celebrated_${phaseId}`);
        if (!stored) {
          setCelebratedPhases(prev => [...prev, phaseId]);
          fireCelebration(500, "xp");
          setShowBigWin(true);
          try { localStorage.setItem(`ew_journey_celebrated_${phaseId}`, "true"); } catch {}
          break;
        }
      }
    }
  }, [state.completedPhases, celebratedPhases]);

  if (loading || dismissed) return null;

  const allDone = completedCount === totalMilestones;

  const completedPhaseName = showBigWin && state.completedPhases.length > 0
    ? JOURNEY_PHASES.find(p => p.id === state.completedPhases[state.completedPhases.length - 1])?.name
    : undefined;

  return (
    <>
      <BigWinOverlay
        show={showBigWin}
        label={completedPhaseName ? `${completedPhaseName} Complete!` : "Phase Complete!"}
        onDone={() => setShowBigWin(false)}
      />
      <div
        className="fixed bottom-20 left-4 lg:bottom-6 lg:left-6 z-40 w-72 animate-in slide-in-from-bottom-4 fade-in duration-300"
        role="complementary"
        aria-label="Financial journey progress map"
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setCollapsed(c => !c)}
            role="button"
            aria-expanded={!collapsed}
            tabIndex={0}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && setCollapsed(c => !c)}
          >
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-[#FF8C00]" aria-hidden="true" />
              <span className="text-xs font-bold text-foreground/80">Your Journey</span>
              <span className="text-[10px] font-mono text-[#FF8C00]" aria-label={`${completedCount} of ${totalMilestones} milestones complete`}>
                {completedCount}/{totalMilestones}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={e => { e.stopPropagation(); dismiss(); }}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label="Dismiss journey map"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {collapsed
                ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" aria-hidden="true" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground/50" aria-hidden="true" />}
            </div>
          </div>

          <div className="px-4 pb-1">
            <div className="h-1 bg-muted/50 rounded-full overflow-hidden" role="progressbar" aria-valuenow={overallProgress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full transition-all duration-700 ease-out rounded-full"
                style={{ width: `${overallProgress}%`, background: `linear-gradient(90deg, #FF8C00, #0099cc)` }}
              />
            </div>
          </div>

          {!collapsed && (
            <div className="px-3 py-2 space-y-1 animate-in slide-in-from-top-2 duration-200" id="journey-phases">
              {JOURNEY_PHASES.map((phase, phaseIdx) => {
                const isPhaseCompleted = state.completedPhases?.includes(phase.id);
                const isCurrentPhase = currentPhase.id === phase.id;
                const isLocked = phaseIdx > (state.completedPhases?.length ?? 0);

                return (
                  <div key={phase.id} className={`rounded-lg overflow-hidden transition-all ${isLocked ? "opacity-40" : ""}`}>
                    <div
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${isCurrentPhase ? "bg-muted/50" : ""}`}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: isPhaseCompleted ? phase.color + "20" : "hsl(var(--muted) / 0.3)", border: `1px solid ${isPhaseCompleted ? phase.color + "60" : "hsl(var(--border))"}` }}
                      >
                        {isPhaseCompleted
                          ? <CheckCircle2 className="w-3 h-3" style={{ color: phase.color }} />
                          : <span className="text-[8px] font-bold font-mono" style={{ color: isCurrentPhase ? phase.color : "hsl(var(--muted-foreground))" }}>{phaseIdx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono" style={{ color: phase.color }}>{phase.theme}</span>
                          {isCurrentPhase && <span className="text-[8px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground/50 font-mono">ACTIVE</span>}
                        </div>
                        <span className="text-xs font-bold text-foreground/80">{phase.name}</span>
                      </div>
                      {isPhaseCompleted && <Star className="w-3 h-3 shrink-0" style={{ color: phase.color }} />}
                    </div>

                    {(isCurrentPhase || isPhaseCompleted) && (
                      <div className="ml-7 mb-1 space-y-0.5">
                        {phase.milestones.map(milestone => {
                          const done = state.completedMilestones?.[milestone.id];
                          return (
                            <Link
                              key={milestone.id}
                              href={milestone.href}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group ${done ? "opacity-50" : "hover:bg-muted/50 cursor-pointer"}`}
                              aria-disabled={done}
                            >
                              {done
                                ? <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: phase.color }} />
                                : <Circle className="w-3 h-3 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground" />}
                              <span className={`text-[11px] flex-1 ${done ? "text-muted-foreground/50 line-through" : "text-muted-foreground group-hover:text-foreground/80"}`}>
                                {milestone.label}
                              </span>
                              {!done && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0" />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {allDone ? (
                <div className="pt-1 pb-2 text-center">
                  <p className="text-[10px] text-[#FF8C00] font-bold flex items-center justify-center gap-1">
                    <Star className="w-3 h-3" /> Journey Complete — Master Builder!
                  </p>
                </div>
              ) : (
                <div className="pt-1 pb-2 text-center">
                  <p className="text-[9px] text-muted-foreground/50">
                    <span style={{ color: currentPhase.color }}>{currentPhase.name}</span> phase · {completedCount}/{totalMilestones} milestones
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {collapsed && (
          <div className="mt-2 px-4 py-2 bg-card border border-border rounded-xl flex items-center gap-2">
            <span className="text-[9px] font-mono text-muted-foreground/50">Identity:</span>
            <span className="text-[10px] font-bold" style={{ color: currentPhase.color }}>
              {state.completedPhases?.length ? JOURNEY_PHASES[Math.min(state.completedPhases.length, JOURNEY_PHASES.length - 1)].identityStage : "Explorer"}
            </span>
            <div className="flex-1" />
            <Zap className="w-3 h-3 text-[#FF8C00]" />
            <span className="text-[9px] font-mono text-[#FF8C00]">{currentPhase.name}</span>
          </div>
        )}
      </div>
    </>
  );
}
