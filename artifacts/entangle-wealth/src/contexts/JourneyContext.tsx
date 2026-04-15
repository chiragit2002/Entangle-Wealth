import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import {
  type JourneyState,
  type JourneyPhase,
  type JourneyMilestone,
  JOURNEY_PHASES,
  JOURNEY_EVENTS_TO_MILESTONES,
  getDefaultJourneyState,
  isPhaseComplete,
  getNextMilestone,
} from "@/lib/journeyConfig";

interface JourneyContextValue {
  state: JourneyState;
  loading: boolean;
  currentPhase: JourneyPhase;
  nextMilestone: { phase: JourneyPhase; milestone: JourneyMilestone } | null;
  markMilestone: (milestoneId: string, phaseId: string) => Promise<{ phaseCompleted?: string; xpEarned?: number }>;
  onEvent: (eventKey: string) => void;
  totalMilestones: number;
  completedCount: number;
  overallProgress: number;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

const CACHE_KEY = "ew_journey_state";
const CACHE_TTL = 5 * 60 * 1000;

function getCachedState(): JourneyState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedState(state: JourneyState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: state, ts: Date.now() }));
  } catch {}
}


export function JourneyProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [state, setState] = useState<JourneyState>(() => getCachedState() ?? getDefaultJourneyState());
  const [loading, setLoading] = useState(true);
  const pendingEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setState(getCachedState() ?? getDefaultJourneyState());
      setLoading(false);
      return;
    }

    const cached = getCachedState();
    if (cached) {
      setState(cached);
      setLoading(false);
    }

    authFetch("/journey", getToken)
      .then(r => r.ok ? r.json() : null)
      .then((data: JourneyState | null) => {
        if (data) {
          setState(data);
          setCachedState(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoaded, isSignedIn, getToken]);

  const markMilestone = useCallback(async (milestoneId: string, phaseId: string): Promise<{ phaseCompleted?: string; xpEarned?: number }> => {
    let result: { phaseCompleted?: string; xpEarned?: number } = {};

    setState(prev => {
      if (prev.completedMilestones[milestoneId]) return prev;

      const updated: JourneyState = {
        ...prev,
        completedMilestones: { ...prev.completedMilestones, [milestoneId]: true },
        updatedAt: new Date().toISOString(),
      };

      const phase = JOURNEY_PHASES.find(p => p.id === phaseId);
      if (phase && isPhaseComplete(phase, updated.completedMilestones) && !prev.completedPhases.includes(phaseId)) {
        const completedAt = new Date().toISOString();
        updated.completedPhases = [...prev.completedPhases, phaseId];
        updated.phaseCompletedAt = { ...(prev.phaseCompletedAt ?? {}), [phaseId]: completedAt };
        const nextPhaseIdx = phase.index + 1;
        if (nextPhaseIdx < JOURNEY_PHASES.length) {
          updated.currentPhaseId = JOURNEY_PHASES[nextPhaseIdx].id;
        }
        result.phaseCompleted = phaseId;
      }

      setCachedState(updated);
      return updated;
    });

    if (!isSignedIn) return result;

    try {
      const res = await authFetch("/journey/milestone", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, phaseId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.xpEarned) result.xpEarned = data.xpEarned;
        if (data.updatedState) {
          setState(data.updatedState);
          setCachedState(data.updatedState);
        }
      }
    } catch {}

    return result;
  }, [isSignedIn, getToken]);

  const onEvent = useCallback((eventKey: string) => {
    const mapping = JOURNEY_EVENTS_TO_MILESTONES[eventKey];
    if (!mapping) return;
    const { phaseId, milestoneId } = mapping;
    if (pendingEvents.current.has(milestoneId)) return;

    setState(prev => {
      if (prev.completedMilestones[milestoneId]) return prev;
      pendingEvents.current.add(milestoneId);
      markMilestone(milestoneId, phaseId).finally(() => pendingEvents.current.delete(milestoneId));
      return prev;
    });
  }, [markMilestone]);

  const currentPhaseIdx = Math.min(
    JOURNEY_PHASES.findIndex(p => p.id === state.currentPhaseId),
    JOURNEY_PHASES.length - 1
  );
  const currentPhase = JOURNEY_PHASES[Math.max(0, currentPhaseIdx)];
  const nextMilestone = getNextMilestone(state);
  const totalMilestones = JOURNEY_PHASES.reduce((sum, p) => sum + p.milestones.length, 0);
  const completedCount = Object.values(state.completedMilestones).filter(Boolean).length;
  const overallProgress = totalMilestones > 0 ? (completedCount / totalMilestones) * 100 : 0;

  return (
    <JourneyContext.Provider value={{
      state,
      loading,
      currentPhase,
      nextMilestone,
      markMilestone,
      onEvent,
      totalMilestones,
      completedCount,
      overallProgress,
    }}>
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney(): JourneyContextValue {
  const ctx = useContext(JourneyContext);
  if (!ctx) {
    throw new Error("useJourney must be used within JourneyProvider");
  }
  return ctx;
}
