import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/trackEvent";

export function usePageTracking() {
  const [location] = useLocation();
  const sessionStartRef = useRef<number>(Date.now());
  const prevLocationRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevLocationRef.current !== null && prevLocationRef.current !== location) {
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      trackEvent("page_view_duration", {
        path: prevLocationRef.current,
        durationSeconds,
      });
    }

    trackEvent("page_view", { path: location });
    sessionStartRef.current = Date.now();
    prevLocationRef.current = location;
  }, [location]);

  useEffect(() => {
    const handleUnload = () => {
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      trackEvent("page_view_duration", {
        path: prevLocationRef.current || location,
        durationSeconds,
      });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [location]);
}
