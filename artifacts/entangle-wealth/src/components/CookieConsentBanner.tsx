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
    <div className="fixed left-4 right-4 z-[100] animate-in slide-in-from-bottom-4 duration-500 pointer-events-none bottom-[calc(84px+env(safe-area-inset-bottom,0px))] lg:bottom-6">
      <div className="max-w-xl mx-auto pointer-events-auto">
        <div
          className="rounded-sm p-4 shadow-2xl shadow-black/60"
          style={{
            background: "var(--nav-dropdown-bg, rgba(10,10,20,0.97))",
            backdropFilter: "blur(24px)",
            border: "var(--nav-dropdown-border, 1px solid hsl(var(--border)))",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-[#FFB800]/10 flex items-center justify-center mt-0.5">
              <Cookie className="w-4 h-4 text-[#FFB800]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">We use cookies</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
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
                  className="px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Essential Only
                </button>
              </div>
            </div>
            <button
              onClick={handleDecline}
              className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
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
