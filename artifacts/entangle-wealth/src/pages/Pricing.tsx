import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Sparkles, Users, Zap, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth, useUser } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

interface StripeProduct {
  id: string;
  name: string;
  metadata: Record<string, string>;
  price_id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string } | null;
}

const plans = [
  {
    name: "Starter",
    tier: "free",
    price: "$0",
    period: "Free forever",
    color: "text-[#00e676]",
    icon: Zap,
    features: [
      { text: "3 signals per day", on: true },
      { text: "Basic options flow", on: true },
      { text: "Community access", on: true },
      { text: "Market overview", on: true },
      { text: "TaxGPT", on: false },
      { text: "Receipt scanner", on: false },
      { text: "Full 55+ indicators", on: false },
      { text: "AI analysis agents", on: false },
    ],
    cta: "Current Plan",
    ctaStyle: "outline" as const,
    featured: false,
  },
  {
    name: "Pro",
    tier: "pro",
    price: "$29",
    period: "per month · After 30-day free trial",
    color: "text-[#f5c842]",
    icon: Sparkles,
    features: [
      { text: "Unlimited signals + full indicators", on: true },
      { text: "RSI, MACD, Bollinger, Aroon & 50+ more", on: true },
      { text: "Full options flow + Greeks", on: true },
      { text: "6 AI analysis agents", on: true },
      { text: "TaxGPT unlimited", on: true },
      { text: "Unlimited receipt scanning", on: true },
      { text: "Travel itinerary builder", on: true },
      { text: "Bloomberg-style terminal", on: true },
      { text: "Resume builder + job finder", on: true },
      { text: "Compliance score dashboard", on: true },
    ],
    cta: "Start Free 30-Day Trial →",
    ctaStyle: "gold" as const,
    featured: true,
  },
  {
    name: "Business",
    tier: "enterprise",
    price: "$79",
    period: "per month · For teams · After free trial",
    color: "text-[#00c8f8]",
    icon: Users,
    features: [
      { text: "Everything in Pro", on: true },
      { text: "5 team members", on: true },
      { text: "White-label CPA reports", on: true },
      { text: "Event creation tools", on: true },
      { text: "Priority support", on: true },
      { text: "Custom API access", on: true },
    ],
    cta: "Start Free 30-Day Trial →",
    ctaStyle: "blue" as const,
    featured: false,
  },
];

export default function Pricing() {
  const { toast } = useToast();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [stripeAvailable, setStripeAvailable] = useState(true);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [promo, setPromo] = useState<{ active: boolean; endsAt: string } | null>(null);

  useEffect(() => { trackEvent("upgrade_modal_shown"); }, []);

  useEffect(() => {
    fetch("/api/stripe/promo")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPromo(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/stripe/products")
      .then(res => {
        if (!res.ok) { setStripeAvailable(false); return []; }
        return res.json();
      })
      .then((data: StripeProduct[]) => { setProducts(data); if (data.length === 0) setStripeAvailable(false); })
      .catch(() => { setStripeAvailable(false); });
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    authFetch("/viral/referral/code", getToken)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.code) setReferralCode(data.code); })
      .catch((err) => { console.error("[Pricing] Failed to load referral code:", err); });
  }, [isSignedIn, getToken]);

  const fetchAuth = useCallback(
    (path: string, options: RequestInit = {}) => authFetch(path, getToken, options),
    [getToken]
  );

  const handleCta = async (plan: typeof plans[0]) => {
    if (plan.tier === "free") {
      toast({ title: "You are on the free plan" });
      return;
    }

    if (!isSignedIn) {
      window.location.href = `/sign-in?reason=protected&redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }

    const matchedProduct = products.find(
      p => p.metadata?.tier === plan.tier
    );

    if (!matchedProduct) {
      trackEvent("upgrade_checkout_failed", { tier: plan.tier, reason: "product_not_found" });
      if (!stripeAvailable) {
        toast({
          title: "Payment system temporarily unavailable",
          description: "Please contact support@entanglewealth.com to get started.",
        });
      } else {
        toast({
          title: "Setting up checkout",
          description: "Stripe products are being configured. Please try again in a moment.",
        });
      }
      return;
    }

    setLoadingTier(plan.tier);
    try {
      const res = await fetchAuth("/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: matchedProduct.price_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        const reason = data.error || "server_error";
        trackEvent("upgrade_checkout_failed", { tier: plan.tier, reason });
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        trackEvent("upgrade_checkout_failed", { tier: plan.tier, reason: "no_url" });
        toast({
          title: "Checkout error",
          description: "Could not redirect to checkout. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      if (!err.message?.includes("checkout")) {
        trackEvent("upgrade_checkout_failed", { tier: plan.tier, reason: "network_error" });
      }
      toast({
        title: "Checkout error",
        description: err.message || "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        {!stripeAvailable && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            <span className="font-semibold">Payment system temporarily unavailable.</span>
            <span className="text-amber-400/70">Plans are shown for reference. Email us at support@entanglewealth.com to get started.</span>
          </div>
        )}
        {promo?.active && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-[#00e676]/30 bg-gradient-to-r from-[#00e676]/10 via-[#00c8f8]/10 to-[#f5c842]/10 p-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00e676]/5 to-transparent animate-pulse" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-[#00e676]/20 rounded-full px-4 py-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-[#00e676]" />
                <span className="text-sm font-black text-[#00e676] uppercase tracking-wider">Launch Window — Limited Time</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
                Full Pro access. <span className="text-[#00e676]">Zero cost.</span> Right now.
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                All Pro features unlocked until{" "}
                <span className="font-bold text-foreground">
                  {new Date(promo.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
                . No credit card. No catch. Just use it.
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            Institutional tools. <span className="electric-text">Not institutional prices.</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {promo?.active ? "All Pro features unlocked — no card needed." : "30 days free. No card. Cancel anytime."}
          </p>
          {!promo?.active && (
            <div className="inline-block mt-4 bg-[rgba(0,230,118,0.1)] border border-[rgba(0,230,118,0.3)] rounded-full px-4 py-1.5 text-xs font-bold text-[#00e676]">
              30-DAY FREE TRIAL | NO CREDIT CARD NEEDED
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {plans.map((plan) => {
            const isLoading = loadingTier === plan.tier;
            return (
              <div
                key={plan.name}
                className={`pricing-card ${plan.featured ? "featured" : ""} flex flex-col`}
              >
                {plan.featured && (
                  <div className="absolute top-4 right-4">
                    <span className="mobile-badge mobile-badge-gold">POPULAR</span>
                  </div>
                )}
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1px] mb-2">
                  {plan.name}
                </div>
                <div className={`text-5xl font-black tracking-tight mb-1 ${plan.color}`}>
                  {plan.price}
                  {plan.price !== "$0" && <span className="text-xl font-semibold">/mo</span>}
                </div>
                <div className="text-sm text-muted-foreground mb-5">{plan.period}</div>

                <div className="flex-1 space-y-0">
                  {plan.features.map((f) => (
                    <div key={f.text} className={`pricing-feature ${f.on ? "on" : ""}`}>
                      <span className="w-5 text-center flex-shrink-0">
                        {f.on ? (
                          <Check className="w-4 h-4 text-[#00e676] inline" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/40 inline" />
                        )}
                      </span>
                      {f.text}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleCta(plan)}
                  disabled={isLoading}
                  aria-busy={isLoading}
                  aria-label={isLoading ? `Redirecting to checkout for ${plan.name}` : plan.cta}
                  className={`w-full mt-5 h-12 font-bold text-sm active:scale-[0.98] transition-all ${
                    plan.ctaStyle === "gold"
                      ? "bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black hover:opacity-90"
                      : plan.ctaStyle === "blue"
                      ? "bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black hover:opacity-90"
                      : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                      Redirecting...
                    </>
                  ) : plan.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mobile-card-glow text-center p-6 md:p-8">
          <div className="text-2xl font-black tracking-tight mb-2">Get paid to share it.</div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5c842]/10 border border-[#f5c842]/25 text-[#f5c842] text-xs font-bold mb-3">
            🏆 $36,000 Anniversary Bonus Pool — Your slice is waiting
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-1">
            Earn <strong className="text-[#f5c842]">20% monthly</strong> for every person you refer — for life. That adds up faster than you'd think.
          </p>
          <p className="text-xs text-white/50 mb-4">
            Every referral also gets you 5 entries into the $50K anniversary drawing and a share of the $36K bonus pool. Real money, not just points.
          </p>
          <Button
            onClick={async () => {
              if (!isSignedIn) {
                toast({ title: "Sign in required", description: "Please sign in to get your referral link." });
                return;
              }
              if (!referralCode) {
                toast({ title: "Loading...", description: "Your referral code is being generated. Please try again." });
                return;
              }
              const link = `${window.location.origin}?ref=${referralCode}`;
              try {
                await navigator.clipboard.writeText(link);
                toast({ title: "Referral link copied!", description: link });
              } catch {
                toast({ title: "Could not copy link", description: "Please copy manually: " + link, variant: "destructive" });
              }
            }}
            className="bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black font-bold hover:opacity-90 h-12 px-8"
          >
            Get Your Referral Link
          </Button>
        </div>
      </div>
    </Layout>
  );
}
