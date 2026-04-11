import { useState, useEffect } from "react";
import { Link } from "wouter";
import { X, Cookie } from "lucide-react";

const STORAGE_KEY = "ew_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-500 pointer-events-none">
      <div className="max-w-xl mx-auto pointer-events-auto">
        <div
          className="rounded-2xl p-4 shadow-2xl shadow-black/60"
          style={{
            background: "rgba(10,10,20,0.97)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center mt-0.5">
              <Cookie className="w-4 h-4 text-[#FFD700]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-0.5">We use cookies</h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Essential cookies for auth & security, plus optional analytics to improve your experience.{" "}
                <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleAccept}
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-black rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={handleDecline}
                  className="px-4 py-1.5 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors"
                >
                  Essential Only
                </button>
              </div>
            </div>
            <button
              onClick={handleDecline}
              className="shrink-0 text-white/25 hover:text-white/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
