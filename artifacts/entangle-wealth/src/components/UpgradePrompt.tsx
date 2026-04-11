import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { X, Sparkles, Zap, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/trackEvent";

export interface UpgradePromptConfig {
  limitType: "signals" | "alert_rules" | "alert_triggers" | "taxgpt" | "terminal";
  limitLabel: string;
  currentUsage?: number;
  maxUsage?: number;
  unlocks: string[];
}

interface UpgradePromptProps {
  config: UpgradePromptConfig;
  onClose: () => void;
}

const LIMIT_COPY: Record<UpgradePromptConfig["limitType"], { headline: string; sub: string }> = {
  signals: {
    headline: "Daily signal limit reached",
    sub: "Free users get 3 signals/day. Upgrade to Pro for unlimited real-time signals.",
  },
  alert_rules: {
    headline: "Alert rule limit reached",
    sub: "Free users can create up to 20 alert rules. Pro gives you unlimited alerts.",
  },
  alert_triggers: {
    headline: "Daily alert trigger limit reached",
    sub: "You've hit the 10 daily alert triggers for free accounts. Go Pro for unlimited.",
  },
  taxgpt: {
    headline: "TaxGPT is a Pro feature",
    sub: "Upgrade to Pro to unlock unlimited TaxGPT queries and advanced tax analysis.",
  },
  terminal: {
    headline: "Bloomberg Terminal is Pro-only",
    sub: "The full terminal with live data, Greeks, and advanced analytics requires Pro.",
  },
};

export function UpgradePrompt({ config, onClose }: UpgradePromptProps) {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    trackEvent("upgrade_prompt_shown", { limitType: config.limitType });
  }, [config.limitType]);

  const handleUpgrade = useCallback(async () => {
    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }

    setLoading(true);
    try {
      const productsRes = await fetch("/api/stripe/products");
      const products = productsRes.ok ? await productsRes.json() : [];
      const proProduct = products.find((p: { metadata?: { tier?: string }; price_id?: string }) => p.metadata?.tier === "pro");

      if (!proProduct) {
        window.location.href = "/pricing";
        return;
      }

      const res = await authFetch("/stripe/create-checkout", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: proProduct.price_id }),
      });

      const data = await res.json();
      if (data.url) {
        trackEvent("upgrade_checkout_started", { limitType: config.limitType });
        window.location.href = data.url;
      } else {
        window.location.href = "/pricing";
      }
    } catch {
      window.location.href = "/pricing";
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken, config.limitType]);

  if (suppressed) return null;

  const copy = LIMIT_COPY[config.limitType];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Pro"
    >
      <div className="relative bg-[#0a0a14] border border-[#f5c842]/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/20 hover:text-white/50 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#f5c842]/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-[#f5c842]" />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-tight">{copy.headline}</p>
            {config.currentUsage !== undefined && config.maxUsage !== undefined && (
              <p className="text-[10px] font-mono text-white/30 mt-0.5">
                {config.currentUsage} / {config.maxUsage} used
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-white/50 mb-5 leading-relaxed">{copy.sub}</p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 mb-5">
          <p className="text-[10px] font-bold text-[#f5c842] uppercase tracking-widest mb-2">
            Pro unlocks
          </p>
          <ul className="space-y-1.5">
            {config.unlocks.map((unlock) => (
              <li key={unlock} className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#f5c842] flex-shrink-0" />
                <span className="text-[11px] text-white/60">{unlock}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-[10px] text-white/20 mb-3 text-center">
          30-day free trial · No credit card required
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full h-11 bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Starting checkout...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Start 30-Day Free Trial</>
          )}
        </Button>

        <button
          onClick={() => { setSuppressed(true); onClose(); }}
          className="w-full mt-2 text-[10px] text-white/15 hover:text-white/30 transition-colors py-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export function useUpgradePrompt() {
  const [promptConfig, setPromptConfig] = useState<UpgradePromptConfig | null>(null);
  const [daysSinceSignup, setDaysSinceSignup] = useState<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setDaysSinceSignup(999);
      setDataLoaded(true);
      return;
    }
    authFetch("/onboarding", getToken)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setDaysSinceSignup(data?.daysSinceSignup ?? 999);
        setDataLoaded(true);
      })
      .catch(() => {
        setDaysSinceSignup(999);
        setDataLoaded(true);
      });
  }, [isSignedIn, getToken]);

  const showUpgradePrompt = useCallback((config: UpgradePromptConfig) => {
    if (!dataLoaded) return;
    if (daysSinceSignup !== null && daysSinceSignup < 3) return;
    setPromptConfig(config);
  }, [dataLoaded, daysSinceSignup]);

  const closePrompt = useCallback(() => setPromptConfig(null), []);

  return { promptConfig, showUpgradePrompt, closePrompt };
}
