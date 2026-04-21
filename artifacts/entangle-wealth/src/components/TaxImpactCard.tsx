import { Link } from "wouter";
import { FileSearch, AlertTriangle, ChevronRight, TrendingDown, TrendingUp, Info } from "lucide-react";
import { estimateTaxImpact } from "@/lib/entanglementEngine";
import { trackEvent } from "@/lib/trackEvent";

interface TaxImpactCardProps {
  symbol: string;
  signal: string;
  estimatedGain?: number;
  filingStatus?: "single" | "married" | "hoh";
  hasTaxProfile: boolean;
  className?: string;
}

export function TaxImpactCard({
  symbol,
  signal,
  estimatedGain = 1000,
  filingStatus = "single",
  hasTaxProfile,
  className = "",
}: TaxImpactCardProps) {
  const color = "#f5c842";
  const impact = estimateTaxImpact(signal, estimatedGain, filingStatus);

  const isBullish = signal.includes("BUY") || signal === "BULLISH";

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{ border: `1px solid ${color}25`, background: "var(--glass-bg)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${color}06 0%, transparent 60%)` }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />

      <div className="relative px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <FileSearch className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>Tax Impact</span>
          <span className="text-[9px] text-muted-foreground/40 font-mono ml-1">
            {DOMAIN_LABEL} → TaxGPT
          </span>
        </div>

        {!hasTaxProfile ? (
          <div className="flex items-start gap-2 mb-3">
            <Info className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Set up your TaxFlow profile to see personalized capital gains impact, wash sale warnings, and bracket effects for your {symbol} trades.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1">Short-term gain tax</p>
                <p className="text-sm font-bold font-mono text-red-400">~${impact.estimatedShortTermTax.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground/50 mt-0.5">{(impact.shortTermRate * 100).toFixed(0)}% rate · held &lt;1yr</p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1">Long-term gain tax</p>
                <p className="text-sm font-bold font-mono text-emerald-400">~${impact.estimatedLongTermTax.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground/50 mt-0.5">{(impact.longTermRate * 100).toFixed(0)}% rate · held &gt;1yr</p>
              </div>
            </div>

            {impact.washSaleWarning && (
              <div className="flex items-start gap-2 mb-3 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.2)" }}>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300">
                  Wash sale risk: selling at a loss and rebuying within 30 days disallows the deduction (IRC §1091).
                </p>
              </div>
            )}

            <div className="flex items-center gap-1.5 mb-2">
              {isBullish ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <p className="text-[11px] text-muted-foreground">{impact.bracketNote}</p>
            </div>
          </>
        )}

        <Link
          href={hasTaxProfile ? "/taxgpt?q=capital+gains+tax+and+bracket+impact" : "/taxflow"}
          onClick={() => trackEvent("tax_impact_card_clicked", { symbol, signal })}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
          style={{ color, background: `${color}08`, border: `1px solid ${color}20` }}
        >
          <span>{hasTaxProfile ? "Ask TaxGPT about this trade" : "Set up TaxFlow profile"}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

const DOMAIN_LABEL = "Portfolio";
