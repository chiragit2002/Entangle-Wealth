import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from "lucide-react";
import { Confetti } from "./Confetti";
import { trackEvent } from "@/lib/trackEvent";

interface ChecklistItem {
  id: string;
  label: string;
  href: string;
}

const ITEMS: ChecklistItem[] = [
  { id: "view_signal", label: "View a signal", href: "/dashboard" },
  { id: "run_tax_scan", label: "Run a tax scan", href: "/tax" },
  { id: "set_alert", label: "Set a price alert", href: "/alerts" },
  { id: "join_community", label: "Join a community group", href: "/community" },
  { id: "enable_notifications", label: "Enable notifications", href: "/profile" },
];

const EVENTS_TO_CHECKLIST: Record<string, string> = {
  signal_viewed: "view_signal",
  taxflow_scan: "run_tax_scan",
  alert_created: "set_alert",
  community_post: "join_community",
  notifications_enabled: "enable_notifications",
};

interface OnboardingEventDetail {
  event: string;
}

export function GettingStartedChecklist() {
  const { getToken, isSignedIn } = useAuth();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [daysSinceSignup, setDaysSinceSignup] = useState(0);
  const [loaded, setLoaded] = useState(false);

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
        setShowConfetti(true);
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

  if (!loaded || !isSignedIn || dismissed || daysSinceSignup > 14 || allDone) {
    return showConfetti ? <Confetti onDone={() => setShowConfetti(false)} /> : null;
  }

  const localDismissed = localStorage.getItem("ew_checklist_dismissed");
  if (localDismissed === "true") return null;

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-72">
        <div className="bg-[#0a0a14] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
            onClick={() => setCollapsed((c) => !c)}
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-xs font-bold text-white/80">Getting Started</span>
              <span className="text-[10px] font-mono text-[#00D4FF]">
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
                className="text-white/15 hover:text-white/30 transition-colors p-0.5"
                aria-label="Dismiss checklist"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {collapsed ? (
                <ChevronUp className="w-4 h-4 text-white/30" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/30" />
              )}
            </div>
          </div>

          <div className="px-4 pb-1">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00D4FF] to-[#00ff88] transition-all duration-500 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {!collapsed && (
            <div className="px-4 py-2 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
              {ITEMS.map((item) => {
                const done = checklist[item.id];
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors ${
                      done
                        ? "opacity-50"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00ff88] shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/20 shrink-0" />
                    )}
                    <span
                      className={`text-xs ${
                        done ? "text-white/30 line-through" : "text-white/60"
                      }`}
                    >
                      {item.label}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
