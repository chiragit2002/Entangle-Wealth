import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "ew_dismissed_tooltips";

interface TooltipDef {
  id: string;
  selector: string;
  message: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOOLTIPS: TooltipDef[] = [
  {
    id: "signal_cards",
    selector: ".signal-card",
    message: "These are AI-generated signals with confidence scores from 6 models.",
    position: "top",
  },
  {
    id: "cmd_search",
    selector: "[data-cmd-search]",
    message: "Search any ticker here. Press / for quick access.",
    position: "bottom",
  },
];

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismiss(id: string) {
  const set = getDismissed();
  set.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function FirstVisitTooltips() {
  const [activeTooltip, setActiveTooltip] = useState<TooltipDef | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const findNext = useCallback(() => {
    const dismissed = getDismissed();
    for (const tip of TOOLTIPS) {
      if (dismissed.has(tip.id)) continue;
      const el = document.querySelector(tip.selector);
      if (el) {
        setActiveTooltip(tip);
        setRect(el.getBoundingClientRect());
        return;
      }
    }
    setActiveTooltip(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(findNext, 2000);
    return () => clearTimeout(timer);
  }, [findNext]);

  const handleDismiss = () => {
    if (activeTooltip) {
      dismiss(activeTooltip.id);
      setActiveTooltip(null);
      setTimeout(findNext, 500);
    }
  };

  if (!activeTooltip || !rect) return null;

  const style: React.CSSProperties = {};
  if (activeTooltip.position === "bottom") {
    style.top = rect.bottom + 8;
    style.left = Math.max(8, rect.left + rect.width / 2 - 140);
  } else if (activeTooltip.position === "top") {
    style.bottom = window.innerHeight - rect.top + 8;
    style.left = Math.max(8, rect.left + rect.width / 2 - 140);
  } else {
    style.top = rect.top;
    style.left = rect.right + 8;
  }

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/30" onClick={handleDismiss} />
      <div
        className="fixed z-[91] w-[280px] bg-[#0a0a14] border border-[#00D4FF]/20 rounded-lg p-3 shadow-xl shadow-[#00D4FF]/10 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={style}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-white/70 leading-relaxed">{activeTooltip.message}</p>
          <button
            onClick={handleDismiss}
            className="text-white/20 hover:text-white/50 transition-colors shrink-0 mt-0.5"
            aria-label="Dismiss tooltip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[10px] font-mono text-[#00D4FF] mt-2 hover:underline"
        >
          Got it
        </button>
      </div>
    </>
  );
}
