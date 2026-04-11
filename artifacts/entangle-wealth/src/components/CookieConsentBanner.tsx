import { useState, useEffect } from "react";
import { Link } from "wouter";
import { X, Cookie } from "lucide-react";

const STORAGE_KEY = "ew_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 1500);
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
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-3xl mx-auto bg-[#0a0a14] border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/80">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-[#FFD700]/10 flex items-center justify-center mt-0.5">
            <Cookie className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">We use cookies</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              We use essential cookies for authentication and security, and optional cookies to improve your experience and understand platform usage.
              Read our{" "}
              <Link href="/cookies" className="text-[#00D4FF] hover:underline">Cookie Policy</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-[#00D4FF] hover:underline">Privacy Policy</Link>
              {" "}for more details.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleAccept}
                className="px-4 py-1.5 text-xs font-semibold bg-[#00D4FF] text-black rounded-lg hover:bg-[#00D4FF]/90 transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleDecline}
                className="px-4 py-1.5 text-xs font-semibold bg-white/[0.06] text-white/60 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                Essential Only
              </button>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="shrink-0 text-white/20 hover:text-white/40 transition-colors"
            aria-label="Dismiss cookie banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
