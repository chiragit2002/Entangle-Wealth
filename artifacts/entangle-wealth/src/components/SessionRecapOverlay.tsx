import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { X, TrendingUp, Zap, Flame, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface SessionData {
  analysesRun: number;
  deductionsSaved: number;
  xpEarned: number;
  currentStreak: number;
}

const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const STORAGE_KEY = "ew_session_recap_shown";

function getSessionData(): SessionData {
  return {
    analysesRun: Number(sessionStorage.getItem("ew_analyses_run") || "0"),
    deductionsSaved: Number(sessionStorage.getItem("ew_deductions_saved") || "0"),
    xpEarned: Number(sessionStorage.getItem("ew_session_xp") || "0"),
    currentStreak: Number(sessionStorage.getItem("ew_session_streak") || "0"),
  };
}

function hasSessionActivity(data: SessionData): boolean {
  return data.analysesRun > 0 || data.deductionsSaved > 0 || data.xpEarned > 0;
}

export function SessionRecapOverlay() {
  const { isSignedIn, getToken } = useAuth();
  const [show, setShow] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [gamData, setGamData] = useState<{ currentStreak: number; xpEarned?: number } | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownRef = useRef(false);

  const triggerRecap = useCallback(async () => {
    if (shownRef.current || !isSignedIn) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(STORAGE_KEY) === today) return;

    const data = getSessionData();
    if (!hasSessionActivity(data)) return;

    shownRef.current = true;
    setSessionData(data);

    try {
      const res = await authFetch("/gamification/me", getToken);
      if (res.ok) {
        const gam = await res.json();
        setGamData({
          currentStreak: gam?.streak?.currentStreak ?? data.currentStreak,
        });
      }
    } catch {}

    setShow(true);
    localStorage.setItem(STORAGE_KEY, today);
  }, [isSignedIn, getToken]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(triggerRecap, IDLE_TIMEOUT_MS);
  }, [triggerRecap]);

  useEffect(() => {
    if (!isSignedIn) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(evt => document.addEventListener(evt, resetIdleTimer, { passive: true }));

    const handleBlur = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(triggerRecap, 3000);
    };
    window.addEventListener("blur", handleBlur);

    resetIdleTimer();

    return () => {
      events.forEach(evt => document.removeEventListener(evt, resetIdleTimer));
      window.removeEventListener("blur", handleBlur);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isSignedIn, resetIdleTimer, triggerRecap]);

  useEffect(() => {
    const incrementAnalyses = () => {
      const current = Number(sessionStorage.getItem("ew_analyses_run") || "0");
      sessionStorage.setItem("ew_analyses_run", String(current + 1));
    };

    const handleTrack = (e: CustomEvent) => {
      const { event, properties } = e.detail || {};
      if (event === "signal_viewed" || event === "analysis_run" || event === "stock_analyzed" || event === "taxflow_analyzed") {
        incrementAnalyses();
      }
      if ((event === "taxflow_scan" || event === "deduction_found") && properties?.savings) {
        const current = Number(sessionStorage.getItem("ew_deductions_saved") || "0");
        sessionStorage.setItem("ew_deductions_saved", String(current + (properties.savings || 0)));
      }
      if (event === "xp_earned" && properties?.amount) {
        const current = Number(sessionStorage.getItem("ew_session_xp") || "0");
        sessionStorage.setItem("ew_session_xp", String(current + (properties.amount || 0)));
      }
    };

    window.addEventListener("onboarding-event", handleTrack as EventListener);
    return () => window.removeEventListener("onboarding-event", handleTrack as EventListener);
  }, []);

  if (!show || !sessionData) return null;

  const streak = gamData?.currentStreak ?? sessionData.currentStreak;
  const analyses = sessionData.analysesRun;
  const savings = sessionData.deductionsSaved;
  const xp = sessionData.xpEarned;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) setShow(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Session summary"
    >
      <div className="relative bg-card border border-[#00D4FF]/20 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl shadow-black/70 animate-in zoom-in-95 duration-300">
        <button
          onClick={() => setShow(false)}
          className="absolute top-3 right-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00D4FF]/25 bg-[#00D4FF]/10 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00D4FF]">Session Summary</span>
          </div>
          <h2 className="text-lg font-black text-foreground mb-1">Nice work today</h2>
          <p className="text-xs text-muted-foreground/70">Here's what you accomplished this session</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {analyses > 0 && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
              <TrendingUp className="w-4 h-4 text-[#00D4FF] mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-[#00D4FF]">{analyses}</p>
              <p className="text-[9px] text-muted-foreground/50">analyses</p>
            </div>
          )}
          {xp > 0 && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
              <Zap className="w-4 h-4 text-[#FFB800] mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-[#FFB800]">+{xp}</p>
              <p className="text-[9px] text-muted-foreground/50">XP earned</p>
            </div>
          )}
          {streak > 0 && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-mono text-orange-400">{streak}d</p>
              <p className="text-[9px] text-muted-foreground/50">streak</p>
            </div>
          )}
        </div>

        {savings > 0 && (
          <div className="bg-[#00FF41]/[0.06] border border-[#00FF41]/20 rounded-lg px-3 py-2.5 mb-4 text-center">
            <p className="text-sm font-bold text-[#00FF41]">+${savings.toLocaleString()} in potential savings found</p>
            <p className="text-[10px] text-muted-foreground/70">from deduction analysis</p>
          </div>
        )}

        {streak > 1 && (
          <p className="text-xs text-muted-foreground text-center mb-4">
            Come back tomorrow to keep your <span className="text-orange-400 font-semibold">{streak}-day streak</span> alive
          </p>
        )}

        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-gradient-to-r from-[#00D4FF]/20 to-[#00FF41]/10 border border-[#00D4FF]/25 rounded-lg text-xs font-bold text-[#00D4FF] hover:border-[#00D4FF]/40 transition-colors"
            onClick={() => setShow(false)}
          >
            Back to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setShow(false)}
            className="px-4 h-10 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
