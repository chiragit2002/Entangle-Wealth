import { Building, DollarSign, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function BusinessDeductionsModule() {
  const deductions = [
    {
      label: "QBI Deduction (§199A)",
      detail: "20% of qualified business income — most frequently missed",
      impact: "≈ $0-$12,400/yr",
      priority: "high",
    },
    {
      label: "Section 179 Expensing",
      detail: "Deduct up to $1,250,000 of equipment in year of purchase",
      impact: "Full cost, year 1",
      priority: "high",
    },
    {
      label: "SE Health Insurance",
      detail: "100% of self-employed health premiums — above the line",
      impact: "100% deductible",
      priority: "high",
    },
    {
      label: "Bonus Depreciation (40%)",
      detail: "2026 schedule: 40% first-year bonus depreciation on assets",
      impact: "40% year 1",
      priority: "medium",
    },
    {
      label: "S-Corp Salary Optimization",
      detail: "Reasonable salary vs. distribution to minimize SE tax",
      impact: "Up to 15.3% savings",
      priority: "medium",
    },
    {
      label: "Solo 401(k) / SEP-IRA",
      detail: "Contribute up to $71,000 as employee + employer",
      impact: "Max $71,000 deduction",
      priority: "medium",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Building className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/80">Business Deductions</p>
            <p className="text-[10px] text-muted-foreground/60">Section 179 · QBI · Entity strategies</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-green-400/70 hover:text-green-400 transition-colors">
          Analyze <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {deductions.map((d) => (
          <div key={d.label} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${d.priority === "high" ? "bg-green-400" : "bg-[#FFB800]"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground/80">{d.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{d.detail}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <DollarSign className="w-3 h-3 text-green-400/60" />
              <span className="text-[10px] text-green-400/70 font-mono">{d.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
