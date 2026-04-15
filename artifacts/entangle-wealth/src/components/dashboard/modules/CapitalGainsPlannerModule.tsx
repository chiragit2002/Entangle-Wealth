import { BarChart3, TrendingDown, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function CapitalGainsPlannerModule() {
  const rates = [
    { holding: "Short-term (<1 yr)", rate: "Ordinary income rate", example: "Up to 37%" },
    { holding: "Long-term (>1 yr)", rate: "0% / 15% / 20%", example: "Based on income" },
    { holding: "NIIT surcharge", rate: "+3.8%", example: ">$200K single" },
    { holding: "QOZ (Opp. Zone)", rate: "Deferred + reduced", example: "10-yr hold benefit" },
  ];

  const strategies = [
    {
      label: "Tax-Loss Harvesting",
      detail: "Offset realized gains; deduct up to $3,000/yr against ordinary income",
      tag: "Wash-sale 30-day rule",
    },
    {
      label: "Hold for LTCG Rates",
      detail: "Holding positions >12 months can reduce rate from ordinary (37%) to 20% max",
      tag: "Timing strategy",
    },
    {
      label: "Qualified Opportunity Zones",
      detail: "Invest capital gains in QOZ fund: defer and potentially reduce tax owed",
      tag: "Defer + reduce",
    },
    {
      label: "Charitable Stock Donation",
      detail: "Donate appreciated shares: no capital gains + deduct full fair market value",
      tag: "Dual benefit",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">Capital Gains Planner</p>
            <p className="text-[10px] text-white/35">Rates · harvesting · timing strategies</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors">
          Plan <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {rates.map((r) => (
          <div key={r.holding} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[9px] text-white/35 mb-0.5">{r.holding}</p>
            <p className="text-xs font-semibold text-cyan-400">{r.rate}</p>
            <p className="text-[9px] text-white/30">{r.example}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {strategies.map((s) => (
          <div key={s.label} className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
            <TrendingDown className="w-3 h-3 text-cyan-400/60 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80">{s.label}</p>
              <p className="text-[10px] text-white/40">{s.detail}</p>
            </div>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/70 shrink-0">{s.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
