import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth } from "@clerk/react";

const DISMISS_KEY = "ew_notif_prompt_dismissed";
const ALERTS_ENABLED_KEY = "ew_inapp_alerts_enabled";

async function subscribeToPush(getToken: () => Promise<string | null>) {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    const { publicKey } = await res.json();
    if (!publicKey) return;

    const registration = await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const token = await getToken();
      if (token) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: existing.toJSON() }),
        });
      }
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const token = await getToken();
    if (token) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    }
  } catch {
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (localStorage.getItem(ALERTS_ENABLED_KEY)) return;

    const timer = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      "serviceWorker" in navigator
    ) {
      subscribeToPush(getToken);
    }
  }, [getToken]);

  const handleAllow = useCallback(async () => {
    localStorage.setItem(ALERTS_ENABLED_KEY, "1");
    trackEvent("inapp_alerts_enabled");
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        trackEvent("notifications_enabled");
        await subscribeToPush(getToken);
      }
    } catch {
    }
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }, [getToken]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-4 z-[60] max-w-sm animate-in slide-in-from-right-4 duration-300">
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(30,20,0,0.95))",
          border: "1px solid rgba(255,215,0,0.15)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#FFD700]/15 flex items-center justify-center">
          <Bell className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-1">Stay Updated</p>
          <p className="text-xs text-white/60 leading-relaxed">
            Enable in-app alerts for market signals, price movements, and portfolio updates — displayed right inside the platform.
          </p>
          <button
            onClick={handleAllow}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FFD700, #cc9900)" }}
          >
            <Bell className="w-3.5 h-3.5" />
            Enable In-App Alerts
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
