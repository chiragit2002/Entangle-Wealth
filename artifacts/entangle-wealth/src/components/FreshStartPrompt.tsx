import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { X, Star, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { trackEvent } from "@/lib/trackEvent";

type FreshStartReason = "monday" | "first_of_month" | "new_year" | null;

function detectFreshStart(): FreshStartReason {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayOfWeek = now.getDay();

  if (month === 1 && day === 1) return "new_year";
  if (day === 1) return "first_of_month";
  if (dayOfWeek === 1) return "monday";
  return null;
}

function getFreshStartCopy(reason: NonNullable<FreshStartReason>): { title: string; subtitle: string; cta: string; ctaHref: string } {
  const year = new Date().getFullYear();
  const map = {
    monday: {
      title: "New week, new goals",
      subtitle: "Set your wealth target for this week and build on last week's momentum.",
      cta: "Set This Week's Goal",
      ctaHref: "/habits",
    },
    first_of_month: {
      title: "New month, fresh start",
      subtitle: "Review your progress and set a financial goal for the month ahead.",
      cta: "Plan This Month",
      ctaHref: "/habits",
    },
    new_year: {
      title: "New year, new wealth chapter",
      subtitle: "Define your financial goals for the year. Your future self will thank you.",
      cta: `Set Your ${year} Goals`,
      ctaHref: "/habits",
    },
  };
  return map[reason];
}

export function FreshStartPrompt() {
  const { isSignedIn } = useAuth();
  const [reason, setReason] = useState<FreshStartReason>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    const today = new Date().toISOString().slice(0, 10);
    const dismissKey = `ew_fresh_start_dismissed_${today}`;
    if (localStorage.getItem(dismissKey) === "true") {
      setDismissed(true);
      return;
    }

    const detected = detectFreshStart();
    if (detected) {
      setReason(detected);
      trackEvent("fresh_start_prompt_shown", { reason: detected });
    }
  }, [isSignedIn]);

  const dismiss = () => {
    setDismissed(true);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`ew_fresh_start_dismissed_${today}`, "true");
  };

  if (!isSignedIn || !reason || dismissed) return null;

  const copy = getFreshStartCopy(reason);

  return (
    <div className="col-span-12 mb-1.5">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0d0a1a] via-[#0f0a18] to-[#0d0a1a] border border-[#a855f7]/25 rounded-lg px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at left, rgba(168,85,247,0.08) 0%, transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/25 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-[#a855f7]" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#a855f7]">{copy.title}</p>
            <p className="text-[10px] text-muted-foreground/70">{copy.subtitle}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-2 flex-shrink-0">
          <Link
            href={copy.ctaHref}
            onClick={() => { trackEvent("fresh_start_prompt_clicked", { reason }); dismiss(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a855f7]/15 border border-[#a855f7]/25 rounded-lg text-[11px] font-semibold text-[#a855f7] hover:bg-[#a855f7]/25 transition-colors"
          >
            {copy.cta}
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button onClick={dismiss} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-0.5" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
