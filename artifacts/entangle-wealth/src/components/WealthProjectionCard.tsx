import { Link } from "wouter";
import { GitBranch, ChevronRight, TrendingUp, ArrowUpRight } from "lucide-react";
import { computeWealthProjection } from "@/lib/entanglementEngine";
import { trackEvent } from "@/lib/trackEvent";

interface WealthProjectionCardProps {
  jobTitle: string;
  currentIncome?: number;
  newIncome: number;
  className?: string;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

export function WealthProjectionCard({ jobTitle, currentIncome = 60000, newIncome, className = "" }: WealthProjectionCardProps) {
  const color = "#00e676";

  const savingsRateDecimal = 0.15;
  const currentMonthlySavings = Math.round((currentIncome * savingsRateDecimal) / 12);
  const newMonthlySavings = Math.round((newIncome * savingsRateDecimal) / 12);

  const current10 = computeWealthProjection(currentMonthlySavings, 10);
  const new10 = computeWealthProjection(newMonthlySavings, 10);
  const current20 = computeWealthProjection(currentMonthlySavings, 20);
  const new20 = computeWealthProjection(newMonthlySavings, 20);

  const delta10 = new10 - current10;
  const delta20 = new20 - current20;
  const incomeIncrease = newIncome - currentIncome;

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{ border: `1px solid ${color}25`, background: "rgba(8,8,18,0.97)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${color}06 0%, transparent 60%)` }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />

      <div className="relative px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <GitBranch className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>What This Means For Your Wealth</span>
          <span className="text-[9px] text-white/25 font-mono ml-1">Career → Timeline</span>
        </div>

        <p className="text-xs text-white/60 mb-3">
          <span className="font-semibold text-white/80">{jobTitle}</span>
          {incomeIncrease > 0 ? (
            <> adds <span style={{ color }} className="font-semibold">+${incomeIncrease.toLocaleString()}/yr</span> to your income — here's the compounding effect at 15% savings rate:</>
          ) : (
            <> earns <span style={{ color }} className="font-semibold">${newIncome.toLocaleString()}/yr</span> — here's how that builds wealth over time:</>
          )}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">Current Path</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-white/40">10yr</span>
                <span className="text-[10px] font-mono text-white/60">{fmt(current10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-white/40">20yr</span>
                <span className="text-[10px] font-mono text-white/60">{fmt(current20)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: `${color}06`, border: `1px solid ${color}20` }}>
            <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color }}>With This Income</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-white/40">10yr</span>
                <span className="text-[10px] font-mono font-bold" style={{ color }}>{fmt(new10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-white/40">20yr</span>
                <span className="text-[10px] font-mono font-bold" style={{ color }}>{fmt(new20)}</span>
              </div>
            </div>
          </div>
        </div>

        {delta10 > 0 && (
          <div className="flex items-center gap-1.5 mb-3 rounded-lg px-2.5 py-2" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            <p className="text-[11px]" style={{ color }}>
              +{fmt(delta10)} difference at 10yr · +{fmt(delta20)} at 20yr
            </p>
          </div>
        )}

        <Link
          href="/alternate-timeline"
          onClick={() => trackEvent("wealth_projection_card_clicked", { jobTitle, newIncome })}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
          style={{ color, background: `${color}08`, border: `1px solid ${color}20` }}
        >
          <span>Model your full Alternate Timeline</span>
          <div className="flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
