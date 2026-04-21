import { TrendingUp, BarChart3, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function InvestmentStrategyModule() {
  const strategies = [
    {
      label: "Tax-Loss Harvesting",
      detail: "Offset gains, deduct $3,000/yr against ordinary income, carry forward remainder",
      tag: "Wash-sale 30-day rule applies",
      priority: "high",
    },
    {
      label: "Asset Location Optimization",
      detail: "Place bonds/REITs in tax-deferred; growth stocks in taxable for lower LTCG rates",
      tag: "Tax efficiency",
      priority: "high",
    },
    {
      label: "Qualified Dividends",
      detail: "Qualified dividends taxed at 0/15/20% — lower than ordinary income rates",
      tag: "Rate optimization",
      priority: "medium",
    },
    {
      label: "NIIT Awareness",
      detail: "3.8% Net Investment Income Tax kicks in above $200K single / $250K MFJ",
      tag: "Threshold planning",
      priority: "medium",
    },
    {
      label: "Charitable Appreciated Stock",
      detail: "Donate appreciated stock: avoid capital gains + deduct full FMV",
      tag: "Dual benefit",
      priority: "low",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/80">Investment Strategy</p>
            <p className="text-[10px] text-muted-foreground/60">Portfolio tax efficiency</p>
          </div>
        </div>
        <Link href="/terminal" className="flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors">
          Signals <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {strategies.map((s) => (
          <div key={s.label} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${s.priority === "high" ? "bg-blue-400" : s.priority === "medium" ? "bg-[#FFB800]" : "bg-white/20"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground/80">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.detail}</p>
            </div>
            <div className="shrink-0">
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/70">{s.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
