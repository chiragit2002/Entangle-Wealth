import { useState, useEffect, useCallback } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISIT_KEY = "ew_visit_count";
const DISMISS_KEY = "ew_install_dismissed";
const MIN_VISITS = 3;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    const count = parseInt(localStorage.getItem(VISIT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(count));

    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (count >= MIN_VISITS) {
        delayTimer = setTimeout(() => setShow(true), 60000);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
      localStorage.setItem(DISMISS_KEY, "installed");
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-[60] max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="rounded-sm p-4 flex items-start gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(255,140,0,0.12), rgba(0,40,60,0.95))",
          border: "1px solid rgba(255,140,0,0.2)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-1">Install EntangleWealth</p>
          <p className="text-xs text-white/60 leading-relaxed">
            Add to your home screen for instant access to live market signals and analysis.
          </p>
          <button
            onClick={handleInstall}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-black transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FF8C00, #0099cc)" }}
          >
            <Download className="w-3.5 h-3.5" />
            Install App
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
