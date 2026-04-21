import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { X, Sparkles, Zap, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { trackEvent } from "@/lib/trackEvent";
import { Link } from "wouter";

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
    headline: "You've hit the free signal limit",
    sub: "3 signals/day was enough to see what this does. Pro removes the cap entirely — unlimited real-time signals, all day.",
  },
  alert_rules: {
    headline: "Alert rule limit reached",
    sub: "Free tier caps you at 20 rules. Pro gives you as many as your strategy needs — no ceiling.",
  },
  alert_triggers: {
    headline: "You've hit your daily alert limit",
    sub: "Free tier: 10 triggers/day. The market doesn't wait. Pro removes the limit so your alerts don't either.",
  },
  taxgpt: {
    headline: "TaxGPT is a Pro feature",
    sub: "The tool that finds deductions your CPA missed. Unlimited queries, full IRS analysis — Pro only.",
  },
  terminal: {
    headline: "Terminal is a Pro feature",
    sub: "Live data. Full Greeks. Advanced analytics. The Bloomberg-style terminal you actually want — Pro only.",
  },
};

export function UpgradePrompt({ config, onClose }: UpgradePromptProps) {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKycError, setIsKycError] = useState(false);

  useEffect(() => {
    trackEvent("upgrade_prompt_shown", { limitType: config.limitType });
  }, [config.limitType]);

  const handleUpgrade = useCallback(async () => {
    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsKycError(false);

    try {
      const productsRes = await fetch("/api/stripe/products");
      const products = productsRes.ok ? await productsRes.json() : [];
      const proProduct = products.find((p: { metadata?: { tier?: string }; price_id?: string }) => p.metadata?.tier === "pro");

      if (!proProduct) {
        setErrorMessage("We couldn't find the Pro plan right now. Please try again in a moment.");
        trackEvent("upgrade_checkout_failed", { limitType: config.limitType, reason: "product_not_found" });
        return;
      }

      const res = await authFetch("/stripe/create-checkout", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: proProduct.price_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        const reason = data.error || "server_error";
        trackEvent("upgrade_checkout_failed", { limitType: config.limitType, reason });

        if (res.status === 403 && data.error?.toLowerCase().includes("kyc")) {
          setIsKycError(true);
          setErrorMessage("Identity verification is required before checkout.");
        } else {
          setErrorMessage(data.error || "Something went wrong starting checkout. Please try again.");
        }
        return;
      }

      if (data.url) {
        trackEvent("upgrade_checkout_started", { limitType: config.limitType });
        window.location.href = data.url;
      } else {
        setErrorMessage("Checkout session could not be created. Please try again.");
        trackEvent("upgrade_checkout_failed", { limitType: config.limitType, reason: "no_url" });
      }
    } catch {
      setErrorMessage("A network error occurred. Please check your connection and try again.");
      trackEvent("upgrade_checkout_failed", { limitType: config.limitType, reason: "network_error" });
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken, config.limitType]);

  if (suppressed) return null;

  const copy = LIMIT_COPY[config.limitType];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70  p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Pro"
    >
      <div className="relative bg-card border border-[#FFB800]/20 rounded-sm p-6 max-w-sm w-full shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FFB800]/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-[#FFB800]" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground leading-tight">{copy.headline}</p>
            {config.currentUsage !== undefined && config.maxUsage !== undefined && (
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">
                {config.currentUsage} / {config.maxUsage} used
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">{copy.sub}</p>

        <div className="bg-muted/50 border border-border rounded-xl p-3 mb-5">
          <p className="text-[10px] font-bold text-[#FFB800] uppercase tracking-widest mb-2">
            Pro unlocks
          </p>
          <ul className="space-y-1.5">
            {config.unlocks.map((unlock) => (
              <li key={unlock} className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#FFB800] flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{unlock}</span>
              </li>
            ))}
          </ul>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4" role="alert">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-[11px] text-red-300 leading-relaxed">{errorMessage}</p>
              {isKycError && (
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-[#00B4D8] hover:text-[#00a8d8] underline underline-offset-2 transition-colors"
                >
                  Go to profile settings to verify identity
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="text-[10px] text-muted-foreground mb-3 text-center">
          30-day free trial · No credit card required
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full h-11 bg-gradient-to-r from-[#FFB800] to-[#cc9900] text-black font-bold text-sm hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Starting checkout...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Start 30-Day Free Trial</>
          )}
        </Button>

        <button
          onClick={() => { setSuppressed(true); onClose(); }}
          className="w-full mt-2 text-[10px] text-muted-foreground/70 hover:text-muted-foreground/50 transition-colors py-1"
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
  const [promoActive, setPromoActive] = useState(false);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    fetch("/api/stripe/promo")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.active) setPromoActive(true); })
      .catch(() => {});
  }, []);

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
    if (promoActive) return;
    if (!dataLoaded) return;
    if (daysSinceSignup !== null && daysSinceSignup < 3) return;
    setPromptConfig(config);
  }, [dataLoaded, daysSinceSignup, promoActive]);

  const closePrompt = useCallback(() => setPromptConfig(null), []);

  return { promptConfig, showUpgradePrompt, closePrompt };
}
