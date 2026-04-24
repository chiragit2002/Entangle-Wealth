import { Link } from "wouter";
import { GitBranch, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { computeWealthProjection } from "@/lib/entanglementEngine";
import { trackEvent } from "@/lib/trackEvent";

interface PutItToWorkCardProps {
  savingsAmount: number;
  className?: string;
}

export function PutItToWorkCard({ savingsAmount, className = "" }: PutItToWorkCardProps) {
  const color = "#a78bfa";

  const projection10 = computeWealthProjection(Math.round(savingsAmount / 12), 10);
  const projection20 = computeWealthProjection(Math.round(savingsAmount / 12), 20);

  const href = `/alternate-timeline?prefill=${savingsAmount}`;

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
            <Sparkles className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>Put It To Work</span>
          <span className="text-[9px] text-muted-foreground/40 font-mono ml-1">TaxGPT → Simulator</span>
        </div>

        <p className="text-xs text-foreground/70 mb-3 leading-relaxed">
          You identified <span className="font-semibold" style={{ color }}>${savingsAmount.toLocaleString()}</span> in potential tax savings.
          Invested annually, that compounds significantly over time.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border))" }}>
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1">10-Year Growth</p>
            <p className="text-sm font-bold font-mono text-emerald-400">${projection10.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground/50 mt-0.5">@ 8% avg return</p>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border))" }}>
            <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-1">20-Year Growth</p>
            <p className="text-sm font-bold font-mono text-emerald-400">${projection20.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground/50 mt-0.5">@ 8% avg return</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3 h-3" style={{ color }} />
          <p className="text-[11px] text-muted-foreground/70">Reinvesting your tax savings accelerates wealth compounding</p>
        </div>

        <Link
          href={href}
          onClick={() => trackEvent("put_it_to_work_clicked", { savingsAmount })}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
          style={{ color, background: `${color}08`, border: `1px solid ${color}20` }}
        >
          <span>Model this in Wealth Simulator</span>
          <div className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
