import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Sparkles, Users, Zap } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const plans = [
  {
    name: "Starter",
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
  useEffect(() => { trackEvent("upgrade_modal_shown"); }, []);
  const handleCta = (plan: string) => {
    if (plan === "Starter") {
      toast({ title: "You are on the free plan" });
    } else {
      toast({ title: "Coming soon!", description: "Stripe checkout integration is being finalized." });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
            Simple <span className="electric-text">Pricing</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">30 days free. No card. Cancel anytime.</p>
          <div className="inline-block mt-4 bg-[rgba(0,230,118,0.1)] border border-[rgba(0,230,118,0.3)] rounded-full px-4 py-1.5 text-xs font-bold text-[#00e676]">
            ✅ FREE TRIAL — NO CREDIT CARD NEEDED
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {plans.map((plan) => (
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
                onClick={() => handleCta(plan.name)}
                className={`w-full mt-5 h-12 font-bold text-sm ${
                  plan.ctaStyle === "gold"
                    ? "bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black hover:opacity-90"
                    : plan.ctaStyle === "blue"
                    ? "bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black hover:opacity-90"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mobile-card-glow text-center p-6 md:p-8">
          <div className="text-2xl font-black tracking-tight mb-2">💰 Referral Program</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Earn <strong className="text-[#f5c842]">20% monthly</strong> for every person you refer. For life. Build your own income stream.
          </p>
          <Button
            onClick={() => toast({ title: "🔗 Referral link copied!" })}
            className="bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black font-bold hover:opacity-90 h-12 px-8"
          >
            Get Your Referral Link
          </Button>
        </div>
      </div>
    </Layout>
  );
}
