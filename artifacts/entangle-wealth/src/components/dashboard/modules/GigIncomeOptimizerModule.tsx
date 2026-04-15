import { Zap, CalendarClock, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function GigIncomeOptimizerModule() {
  const items = [
    {
      label: "SE Tax Deduction",
      detail: "Deduct 50% of self-employment tax (15.3%) above-the-line — reduces AGI",
      impact: "~7.65% of net SE income",
      priority: "high",
    },
    {
      label: "QBI Deduction (§199A)",
      detail: "20% of qualified business income if below $200K single / $400K MFJ",
      impact: "Up to 20% of net income",
      priority: "high",
    },
    {
      label: "Quarterly Estimated Taxes",
      detail: "Due Apr 15, Jun 15, Sep 15, Jan 15 — avoid underpayment penalty",
      impact: "Avoid penalty",
      priority: "high",
    },
    {
      label: "SE Health Insurance",
      detail: "100% of health, dental, and vision premiums are deductible above the line",
      impact: "100% deductible",
      priority: "medium",
    },
    {
      label: "Solo 401(k) / SEP-IRA",
      detail: "Reduce taxable income while building retirement wealth",
      impact: "Max $71,000",
      priority: "medium",
    },
    {
      label: "Platform Fees & Tools",
      detail: "Upwork, Fiverr fees, SaaS tools, accounting software are fully deductible",
      impact: "100% deductible",
      priority: "low",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">Gig Income Optimizer</p>
            <p className="text-[10px] text-white/35">SE tax · QBI · quarterly estimates</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-yellow-400/70 hover:text-yellow-400 transition-colors">
          Estimate <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.priority === "high" ? "bg-yellow-400" : item.priority === "medium" ? "bg-[#FF8C00]" : "bg-white/20"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80">{item.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{item.detail}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[10px] font-mono text-yellow-400/70">{item.impact}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
        <CalendarClock className="w-3.5 h-3.5 text-yellow-400/70 shrink-0" />
        <p className="text-[10px] text-white/50">Safe harbor: pay 100% of prior year tax (110% if AGI &gt; $150K) to avoid penalties</p>
      </div>
    </div>
  );
}
