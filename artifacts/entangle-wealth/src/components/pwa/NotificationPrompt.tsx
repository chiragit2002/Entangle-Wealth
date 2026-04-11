import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";

const DISMISS_KEY = "ew_notif_prompt_dismissed";

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const timer = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = useCallback(async () => {
    try {
      await Notification.requestPermission();
    } catch {
      // ignore
    }
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

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
            Get notified about market alerts, price signals, and important updates.
          </p>
          <button
            onClick={handleAllow}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FFD700, #cc9900)" }}
          >
            <Bell className="w-3.5 h-3.5" />
            Enable Notifications
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
