import { HomeIcon, DollarSign, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function RealEstateDeductionsModule() {
  const deductions = [
    {
      label: "Mortgage Interest",
      detail: "Deductible on up to $750K of acquisition debt — Schedule A",
      tag: "Itemize required",
      priority: "high",
    },
    {
      label: "Depreciation (Rental)",
      detail: "Residential: 27.5 years | Commercial: 39 years straight-line",
      tag: "Schedule E",
      priority: "high",
    },
    {
      label: "1031 Like-Kind Exchange",
      detail: "Defer capital gains by rolling proceeds into a replacement property",
      tag: "Defer gains",
      priority: "high",
    },
    {
      label: "Rental Operating Expenses",
      detail: "Repairs, management fees, insurance, utilities, advertising — all deductible",
      tag: "Schedule E",
      priority: "medium",
    },
    {
      label: "Passive Activity Loss Rules",
      detail: "$25K special allowance for active rental participants (phase-out $100K-$150K AGI)",
      tag: "PAL rules",
      priority: "medium",
    },
    {
      label: "REPS Status",
      detail: "Real Estate Professional Status: >750 hrs/yr unlocks unlimited passive losses",
      tag: "Material participation",
      priority: "low",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <HomeIcon className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">Real Estate Deductions</p>
            <p className="text-[10px] text-white/35">Mortgage · depreciation · 1031 exchange</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-colors">
          Analyze <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {deductions.map((d) => (
          <div key={d.label} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${d.priority === "high" ? "bg-emerald-400" : d.priority === "medium" ? "bg-[#FFB800]" : "bg-white/20"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80">{d.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{d.detail}</p>
            </div>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70 shrink-0">{d.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
