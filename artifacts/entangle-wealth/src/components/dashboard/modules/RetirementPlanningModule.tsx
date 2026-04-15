import { PiggyBank, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export function RetirementPlanningModule() {
  const accounts = [
    {
      name: "HSA",
      limit: "$4,400 / $8,750",
      note: "Triple tax advantage — prioritize first",
      badge: "#1 Priority",
      color: "text-[#00B4D8]",
      badgeColor: "bg-[#00B4D8]/15 text-[#00B4D8]",
    },
    {
      name: "401(k) to Match",
      limit: "Up to employer match",
      note: "Instant 50-100% return on contributions",
      badge: "#2 Priority",
      color: "text-yellow-400",
      badgeColor: "bg-yellow-400/15 text-yellow-400",
    },
    {
      name: "Roth IRA",
      limit: "$7,500 (+$1,000 catch-up 50+)",
      note: "Phase-out: $160K-$175K single / $240K-$250K MFJ",
      badge: "#3 Priority",
      color: "text-blue-400",
      badgeColor: "bg-blue-400/15 text-blue-400",
    },
    {
      name: "Max 401(k)",
      limit: "$24,000 (+$7,500 catch-up 50+)",
      note: "Super catch-up ages 60-63: +$11,250",
      badge: "#4 Priority",
      color: "text-purple-400",
      badgeColor: "bg-purple-400/15 text-purple-400",
    },
    {
      name: "SEP-IRA / Solo 401(k)",
      limit: "Max $71,000",
      note: "25% of net SE income for SEP-IRA",
      badge: "Self-Employed",
      color: "text-green-400",
      badgeColor: "bg-green-400/15 text-green-400",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <PiggyBank className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">Retirement Planning</p>
            <p className="text-[10px] text-white/35">2026 contribution limits</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-purple-400/70 hover:text-purple-400 transition-colors">
          Optimize <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.name} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${a.badgeColor}`}>{a.badge}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${a.color}`}>{a.name}</p>
              <p className="text-[10px] text-white/40">{a.note}</p>
            </div>
            <p className="text-[10px] font-mono text-white/50 shrink-0 text-right">{a.limit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
