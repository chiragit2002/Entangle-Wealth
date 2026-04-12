import { trackEvent } from "./trackEvent";

const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 500;
const HESITATION_IDLE_MS = 5000;
const SLOW_PAGE_LOAD_MS = 3000;

interface ClickRecord {
  time: number;
  target: string;
}

const recentClicks: ClickRecord[] = [];
let hesitationTimer: ReturnType<typeof setTimeout> | null = null;
let activeElement: string | null = null;
let navigationStart: number = performance.now();
let signalsActive = false;

function getElementLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent || "").trim().slice(0, 40);
  const id = (el as HTMLElement).id ? `#${(el as HTMLElement).id}` : "";
  const cls = (el as HTMLElement).className
    ? `.${String((el as HTMLElement).className).split(" ")[0]}`
    : "";
  return `${tag}${id || cls}${text ? `:${text}` : ""}`.slice(0, 80);
}

function getCurrentPage(): string {
  return window.location.pathname;
}

function handleClick(e: MouseEvent) {
  const target = e.target as Element;
  if (!target) return;

  const label = getElementLabel(target);
  const now = Date.now();

  recentClicks.push({ time: now, target: label });

  const windowStart = now - RAGE_CLICK_WINDOW_MS;
  const recent = recentClicks.filter((c) => c.time >= windowStart && c.target === label);

  while (recentClicks.length > 20) recentClicks.shift();

  if (recent.length >= RAGE_CLICK_THRESHOLD) {
    trackEvent("rage_click", {
      element: label,
      page: getCurrentPage(),
      clickCount: recent.length,
    });
    recentClicks.length = 0;
  }
}

function handlePointerEnter(e: PointerEvent) {
  const target = e.target as Element;
  if (!target) return;

  const tag = target.tagName.toLowerCase();
  const isInteractive = ["button", "a", "input", "select", "textarea"].includes(tag) ||
    (target as HTMLElement).role === "button" ||
    target.getAttribute("role") === "button";

  if (!isInteractive) return;

  const label = getElementLabel(target);
  activeElement = label;

  if (hesitationTimer) clearTimeout(hesitationTimer);

  const enterTime = Date.now();
  hesitationTimer = setTimeout(() => {
    if (activeElement === label) {
      trackEvent("hesitation", {
        element: label,
        page: getCurrentPage(),
        duration: Date.now() - enterTime,
      });
    }
  }, HESITATION_IDLE_MS);
}

function handlePointerLeave() {
  activeElement = null;
  if (hesitationTimer) {
    clearTimeout(hesitationTimer);
    hesitationTimer = null;
  }
}

function handlePageTransition() {
  const now = performance.now();
  const duration = now - navigationStart;

  if (duration > SLOW_PAGE_LOAD_MS) {
    trackEvent("slow_page_load", {
      page: getCurrentPage(),
      duration: Math.round(duration),
    });
  }

  navigationStart = now;
}

export function initInteractionSignals() {
  if (signalsActive || typeof window === "undefined") return;
  signalsActive = true;

  document.addEventListener("click", handleClick, { passive: true, capture: true });
  document.addEventListener("pointerenter", handlePointerEnter, { passive: true, capture: true });
  document.addEventListener("pointerleave", handlePointerLeave, { passive: true, capture: true });

  if (typeof window.PerformanceObserver !== "undefined") {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            const loadTime = navEntry.loadEventEnd - navEntry.startTime;
            if (loadTime > SLOW_PAGE_LOAD_MS) {
              trackEvent("slow_page_load", {
                page: getCurrentPage(),
                duration: Math.round(loadTime),
              });
            }
          }
        }
      });
      observer.observe({ type: "navigation", buffered: true });
    } catch {
      // Not all browsers support this
    }
  }

  window.addEventListener("popstate", handlePageTransition, { passive: true });

  const origPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    handlePageTransition();
    return origPushState(...args);
  };

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function (...args) {
    handlePageTransition();
    return origReplaceState(...args);
  };
}

export function cleanupInteractionSignals() {
  if (!signalsActive) return;
  document.removeEventListener("click", handleClick, true);
  document.removeEventListener("pointerenter", handlePointerEnter, true);
  document.removeEventListener("pointerleave", handlePointerLeave, true);
  signalsActive = false;
}
