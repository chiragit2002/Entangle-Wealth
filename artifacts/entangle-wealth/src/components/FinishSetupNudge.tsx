import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Rocket, X, ArrowRight } from "lucide-react";
import { Link } from "wouter";

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

interface FinishSetupNudgeUIProps {
  incompleteItems: ChecklistItem[];
  onDismiss: () => void;
}

export function FinishSetupNudgeUI({ incompleteItems, onDismiss }: FinishSetupNudgeUIProps) {
  return (
    <div className="col-span-12 mb-1.5" data-testid="finish-setup-nudge">
      <div className="bg-gradient-to-r from-[#001a10] via-[#00ff8808] to-[#001a10] border border-[#00ff88]/15 rounded-sm px-3 py-2.5 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Rocket className="w-4 h-4 text-[#00D4FF] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-white/70">
                You left {incompleteItems.length} setup {incompleteItems.length === 1 ? "step" : "steps"} unfinished
              </p>
              <p className="text-[9px] font-mono text-white/25 mb-2">Complete your setup to get the most out of EntangleWealth</p>
              <div className="flex flex-wrap gap-1.5">
                {incompleteItems.map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-1 px-2 py-1 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-sm text-[9px] font-mono text-[#00D4FF] hover:bg-[#00D4FF]/15 transition-colors"
                  >
                    {item.label}
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/15 hover:text-white/40 transition-colors p-0.5 flex-shrink-0"
            aria-label="Dismiss setup nudge"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinishSetupNudge() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [incompleteItems, setIncompleteItems] = useState<ChecklistItem[]>([]);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const dismissKey = `ew_setup_nudge_dismissed_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(dismissKey) === "true") {
      setDismissed(true);
      return;
    }

    authFetch("/onboarding", getToken)
      .then(r => r.ok ? r.json() : null)
      .then((data: { checklist?: Record<string, boolean>; daysSinceSignup?: number } | null) => {
        if (!data) return;
        const { checklist, daysSinceSignup } = data;
        if (!checklist || daysSinceSignup === undefined) return;
        if (daysSinceSignup < 2) return;
        if (daysSinceSignup > 14) return;

        const incomplete = ITEMS.filter(item => !checklist[item.id]);
        if (incomplete.length > 0) {
          setIncompleteItems(incomplete);
          setShow(true);
        }
      })
      .catch((err) => { console.error("[FinishSetupNudge] Failed to load onboarding checklist:", err); });
  }, [isLoaded, isSignedIn, getToken]);

  const dismiss = () => {
    setDismissed(true);
    setShow(false);
    const dismissKey = `ew_setup_nudge_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(dismissKey, "true");
  };

  if (!show || dismissed || incompleteItems.length === 0) return null;

  return <FinishSetupNudgeUI incompleteItems={incompleteItems} onDismiss={dismiss} />;
}
