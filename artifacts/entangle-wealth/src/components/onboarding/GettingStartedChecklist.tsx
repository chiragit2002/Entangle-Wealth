import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket, ArrowRight } from "lucide-react";
import { fireCelebration } from "@/lib/confetti";
import { BigWinOverlay } from "@/components/BigWinOverlay";
import { trackEvent } from "@/lib/trackEvent";
import { Link } from "wouter";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  desc?: string;
}

const ITEMS: ChecklistItem[] = [
  { id: "view_signal", label: "View a signal", desc: "See the AI buy/sell signals", href: "/dashboard" },
  { id: "run_tax_scan", label: "Run a tax scan", desc: "Discover deductions", href: "/tax" },
  { id: "set_alert", label: "Set a price alert", desc: "Get notified on price moves", href: "/alerts" },
  { id: "join_community", label: "Join a community group", desc: "Connect with traders", href: "/community" },
  { id: "enable_notifications", label: "Enable notifications", desc: "Never miss an update", href: "/profile" },
];

const EVENTS_TO_CHECKLIST: Record<string, string> = {
  signal_viewed: "view_signal",
  dashboard_viewed: "view_signal",
  taxflow_scan: "run_tax_scan",
  alert_created: "set_alert",
  community_post: "join_community",
  notifications_enabled: "enable_notifications",
};

interface OnboardingEventDetail {
  event: string;
}

function isFirstSession(): boolean {
  try {
    const visited = localStorage.getItem("ew_visited_before");
    if (!visited) {
      localStorage.setItem("ew_visited_before", "true");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function GettingStartedChecklist() {
  const { getToken, isSignedIn } = useAuth();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(() => isFirstSession());
  const [dismissed, setDismissed] = useState(false);
  const [daysSinceSignup, setDaysSinceSignup] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);

  const fetchState = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/onboarding", getToken);
      if (!res.ok) return;
      const data = await res.json();
      setChecklist(data.checklist ?? {});
      setDaysSinceSignup(data.daysSinceSignup ?? 0);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const markItem = useCallback(async (itemId: string) => {
    setChecklist((prev) => {
      const updated = { ...prev, [itemId]: true };
      const allDone = ITEMS.every((item) => updated[item.id]);
      if (allDone) {
        fireCelebration(1000, "xp");
        setShowBigWin(true);
        trackEvent("onboarding_checklist_completed");
      }
      return updated;
    });

    try {
      await authFetch("/onboarding/checklist", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: itemId, completed: true }),
      });
    } catch {
    }
  }, [getToken]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OnboardingEventDetail>).detail;
      const checklistKey = EVENTS_TO_CHECKLIST[detail.event];
      if (checklistKey && !checklist[checklistKey]) {
        markItem(checklistKey);
      }
    };
    window.addEventListener("onboarding-event", handler);
    return () => window.removeEventListener("onboarding-event", handler);
  }, [checklist, markItem]);

  const completedCount = ITEMS.filter((item) => checklist[item.id]).length;
  const allDone = completedCount === ITEMS.length;
  const progressPct = (completedCount / ITEMS.length) * 100;

  const localDismissed = typeof window !== "undefined" && localStorage.getItem("ew_checklist_dismissed") === "true";

  if (!loaded || !isSignedIn || dismissed || localDismissed || daysSinceSignup > 14 || allDone) {
    return null;
  }

  return (
    <>
      <BigWinOverlay show={showBigWin} label="ALL DONE!" onDone={() => setShowBigWin(false)} />
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
              <Rocket className="w-4 h-4 text-[#00D4FF]" aria-hidden="true" />
              <span className="text-xs font-bold text-white/80">Getting Started</span>
              <span className="text-[10px] font-mono text-[#00D4FF]" aria-label={`${completedCount} of ${ITEMS.length} complete`}>
                {completedCount}/{ITEMS.length}
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
            <div className="h-1 bg-white/5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${Math.round(progressPct)}% complete`}>
              <div
                className="h-full bg-gradient-to-r from-[#00D4FF] to-[#00ff88] transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {!collapsed && (
            <div id="checklist-items" className="px-4 py-2 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
              {ITEMS.map((item) => {
                const done = checklist[item.id];
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors group ${
                      done
                        ? "opacity-50 cursor-default"
                        : "hover:bg-white/[0.04] cursor-pointer"
                    }`}
                    aria-disabled={done}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00ff88] shrink-0" aria-hidden="true" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/40 shrink-0 group-hover:text-white/40 transition-colors" aria-hidden="true" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs block ${
                          done ? "text-white/30 line-through" : "text-white/70 group-hover:text-white/90 transition-colors"
                        }`}
                      >
                        {item.label}
                      </span>
                      {!done && item.desc && (
                        <span className="text-[9px] text-white/25 group-hover:text-white/40 transition-colors">{item.desc}</span>
                      )}
                    </div>
                    {!done && (
                      <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors shrink-0" aria-hidden="true" />
                    )}
                  </Link>
                );
              })}
              <div className="pt-1 pb-2">
                <p className="text-[9px] text-white/40 text-center">Complete all 5 to earn a bonus reward!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
