let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return sessionId;
}

function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem("ew_cookie_consent") !== "declined";
  } catch {
    return true;
  }
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  try {
    if (!hasAnalyticsConsent()) return;

    const body = JSON.stringify({
      event,
      properties: properties || undefined,
      sessionId: getSessionId(),
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(err => console.error('Failed to send analytics event:', event, err));
    }

    window.dispatchEvent(
      new CustomEvent("onboarding-event", { detail: { event } })
    );
  } catch {
    // non-blocking
  }
}
