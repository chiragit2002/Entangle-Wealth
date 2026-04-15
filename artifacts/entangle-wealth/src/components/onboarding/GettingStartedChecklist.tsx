import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket, ArrowRight } from "lucide-react";
import { fireCelebration } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { trackEvent } from "@/lib/trackEvent";
import { Link } from "wouter";
import { useJourney } from "@/hooks/useJourney";
import { JOURNEY_PHASES } from "@/lib/journeyConfig";

const DISCOVER_PHASE = JOURNEY_PHASES[0];
const MAX_DAYS_VISIBLE = 14;

export function GettingStartedChecklist() {
  const { isSignedIn, getToken } = useAuth();
  const { state, loading } = useJourney();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("ew_checklist_dismissed") === "true"
  );
  const [showBigWin, setShowBigWin] = useState(false);
  const [daysSinceSignup, setDaysSinceSignup] = useState<number | null>(null);
  const [daysLoaded, setDaysLoaded] = useState(false);

  const fetchDays = useCallback(async () => {
    if (!isSignedIn) { setDaysLoaded(true); return; }
    try {
      const res = await authFetch("/onboarding", getToken);
      if (res.ok) {
        const data = await res.json();
        setDaysSinceSignup(data.daysSinceSignup ?? 0);
      }
    } catch {
    } finally {
      setDaysLoaded(true);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => { fetchDays(); }, [fetchDays]);

  const milestones = DISCOVER_PHASE.milestones;
  const completedCount = milestones.filter(m => state.completedMilestones[m.id]).length;
  const allDone = completedCount === milestones.length || state.completedPhases.includes(DISCOVER_PHASE.id);
  const progressPct = (completedCount / milestones.length) * 100;

  useEffect(() => {
    if (allDone && !showBigWin && completedCount === milestones.length) {
      fireCelebration(1000, "xp");
      setShowBigWin(true);
      trackEvent("onboarding_checklist_completed");
    }
  }, [allDone, completedCount, milestones.length, showBigWin]);

  const tooOld = daysSinceSignup !== null && daysSinceSignup > MAX_DAYS_VISIBLE;

  if (loading || !daysLoaded || !isSignedIn || dismissed || allDone || tooOld) return null;

  return (
    <>
      <BigWinOverlay show={showBigWin} label="CHAPTER 1 COMPLETE!" onDone={() => setShowBigWin(false)} />
      <div
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-72 animate-in slide-in-from-bottom-4 fade-in duration-300"
        role="complementary"
        aria-label="Getting started checklist"
      >
        <div className="bg-[#0a0a14] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
            onClick={() => setCollapsed((c) => !c)}
            role="button"
            aria-expanded={!collapsed}
            aria-controls="checklist-items"
            tabIndex={0}
            onKeyDown={e => e.key === "Enter" || e.key === " " ? setCollapsed(c => !c) : undefined}
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#00B4D8]" aria-hidden="true" />
              <span className="text-xs font-bold text-white/80">Chapter 1: Discover</span>
              <span
                className="text-[10px] font-mono text-[#00B4D8]"
                aria-label={`${completedCount} of ${milestones.length} complete`}
              >
                {completedCount}/{milestones.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissed(true);
                  localStorage.setItem("ew_checklist_dismissed", "true");
                }}
                className="text-white/50 hover:text-white/40 transition-colors p-1 rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label="Dismiss checklist"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {collapsed ? (
                <ChevronUp className="w-4 h-4 text-white/30" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/30" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="px-4 pb-1">
            <div
              className="h-1 bg-white/5 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${Math.round(progressPct)}% complete`}
            >
              <div
                className="h-full bg-gradient-to-r from-[#00B4D8] to-[#00B4D8] transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {!collapsed && (
            <div id="checklist-items" className="px-4 py-2 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
              {milestones.map((milestone) => {
                const done = !!state.completedMilestones[milestone.id];
                return (
                  <Link
                    key={milestone.id}
                    href={milestone.href}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors group ${
                      done
                        ? "opacity-50 cursor-default pointer-events-none"
                        : "hover:bg-white/[0.04] cursor-pointer"
                    }`}
                    aria-disabled={done}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00B4D8] shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/40 shrink-0 group-hover:text-white/40 transition-colors" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs block ${
                          done ? "text-white/30 line-through" : "text-white/70 group-hover:text-white/90 transition-colors"
                        }`}
                      >
                        {milestone.label}
                      </span>
                      {!done && milestone.desc && (
                        <span className="text-[9px] text-white/30 block mt-0.5">{milestone.desc}</span>
                      )}
                    </div>
                    {!done && (
                      <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors shrink-0" aria-hidden="true" />
                    )}
                  </Link>
                );
              })}
              <div className="pt-1 pb-2">
                <p className="text-[9px] text-white/40 text-center">Complete all 4 to unlock Chapter 2 — Analyze</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
