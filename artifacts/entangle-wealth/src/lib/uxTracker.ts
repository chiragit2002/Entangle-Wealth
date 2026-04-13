let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    let id = sessionStorage.getItem("ew_session_id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("ew_session_id", id);
    }
    sessionId = id;
  }
  return sessionId;
}

interface UxSignalPayload {
  pageUrl: string;
  signalType: string;
  elementSelector?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

const pendingSignals: UxSignalPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function flushSignals() {
  if (pendingSignals.length === 0) return;
  const batch = pendingSignals.splice(0, pendingSignals.length);
  try {
    await fetch("/api/audit/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signals: batch }),
    });
  } catch {
    // best effort — push back if flush failed
    pendingSignals.unshift(...batch);
  }
}

function addSignal(signal: Omit<UxSignalPayload, "sessionId">) {
  pendingSignals.push({ ...signal, sessionId: getSessionId() });
}

function getSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string"
    ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
    : "";
  return `${tag}${id}${cls}`.slice(0, 200);
}

function isInteractive(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (["a", "button", "input", "select", "textarea", "label"].includes(tag)) return true;
  if (el.getAttribute("role") === "button") return true;
  if (el.getAttribute("tabindex") !== null) return true;
  if ((el as HTMLElement).onclick) return true;
  return false;
}

function setupRageClickDetection() {
  const clickTimes: Map<string, number[]> = new Map();

  document.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (!target) return;
    const selector = getSelector(target);
    const now = Date.now();
    const times = clickTimes.get(selector) || [];
    times.push(now);
    const recent = times.filter((t) => now - t < 2000);
    clickTimes.set(selector, recent);

    if (recent.length >= 3) {
      addSignal({
        pageUrl: window.location.pathname,
        signalType: "rage_click",
        elementSelector: selector,
        metadata: { clickCount: recent.length },
      });
      clickTimes.set(selector, []);
    }
  });
}

function setupDeadClickDetection() {
  document.addEventListener("click", (e) => {
    const target = e.target as Element;
    if (!target) return;

    let el: Element | null = target;
    let interactive = false;
    for (let i = 0; i < 5 && el; i++) {
      if (isInteractive(el)) {
        interactive = true;
        break;
      }
      el = el.parentElement;
    }

    if (!interactive) {
      const selector = getSelector(target);
      addSignal({
        pageUrl: window.location.pathname,
        signalType: "dead_click",
        elementSelector: selector,
        metadata: { x: e.clientX, y: e.clientY },
      });
    }
  });
}

function setupFormAbandonmentTracking() {
  const formStates: Map<string, boolean> = new Map();

  document.addEventListener("input", (e) => {
    const target = e.target as HTMLElement;
    const form = target.closest("form");
    if (!form) return;
    const id = form.id || getSelector(form);
    formStates.set(id, false);
  });

  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement;
    const id = form.id || getSelector(form);
    formStates.set(id, true);
  });

  window.addEventListener("beforeunload", () => {
    for (const [id, submitted] of formStates.entries()) {
      if (!submitted) {
        addSignal({
          pageUrl: window.location.pathname,
          signalType: "form_abandonment",
          elementSelector: id,
          metadata: { formId: id },
        });
      }
    }
  });
}

function setupScrollDepthTracking() {
  let maxDepth = 0;
  let tracked = false;

  const handleScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const depth = Math.round((scrollTop / docHeight) * 100);
    if (depth > maxDepth) maxDepth = depth;
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  const reportDepth = () => {
    if (tracked || maxDepth === 0) return;
    tracked = true;
    addSignal({
      pageUrl: window.location.pathname,
      signalType: "scroll_depth",
      metadata: { depthPercent: maxDepth },
    });
  };

  window.addEventListener("beforeunload", reportDepth);

  const THRESHOLDS = [25, 50, 75, 100];
  const reported = new Set<number>();
  setInterval(() => {
    for (const threshold of THRESHOLDS) {
      if (maxDepth >= threshold && !reported.has(threshold)) {
        reported.add(threshold);
        addSignal({
          pageUrl: window.location.pathname,
          signalType: "scroll_depth",
          metadata: { depthPercent: threshold, milestone: true },
        });
      }
    }
  }, 5000);
}

let initialized = false;

export function initUxTracker() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  setupRageClickDetection();
  setupDeadClickDetection();
  setupFormAbandonmentTracking();
  setupScrollDepthTracking();

  flushTimer = setInterval(flushSignals, 5 * 60 * 1000);

  window.addEventListener("beforeunload", () => {
    if (flushTimer) clearInterval(flushTimer);
    flushSignals();
  });
}

export function destroyUxTracker() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  initialized = false;
}
