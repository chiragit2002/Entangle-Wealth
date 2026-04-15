import { Shield, TrendingDown, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface TaxSavingsModuleProps {
  occupationCategory?: string;
  taxCategory?: string;
}

export function TaxSavingsModule({ occupationCategory, taxCategory }: TaxSavingsModuleProps) {
  const isEducator = occupationCategory === "Education";
  const strategies = [
    {
      label: "HSA Contribution",
      detail: "2026 limit: $4,400 self / $8,750 family",
      savings: "Triple tax advantage",
      priority: "high",
    },
    {
      label: taxCategory === "W-2" ? "401(k) Max Deferral" : "IRA / Backdoor Roth",
      detail: taxCategory === "W-2" ? "$24,000 limit (+$7,500 catch-up 50+)" : "$7,500 limit (+$1,000 catch-up 50+)",
      savings: "Tax-deferred growth",
      priority: "high",
    },
    ...(isEducator ? [{
      label: "Educator Expense Deduction",
      detail: "$300 above-the-line deduction for classroom supplies",
      savings: "~$66 at 22% bracket",
      priority: "medium",
    }] : []),
    {
      label: "Standard vs. Itemized Analysis",
      detail: `2026 standard: $15,700 single / $31,400 MFJ`,
      savings: "Optimize your deduction method",
      priority: "medium",
    },
    {
      label: "Saver's Credit",
      detail: "Up to $1,000/$2,000 credit if AGI ≤ $40,500/$81,000",
      savings: "Direct tax reduction",
      priority: "low",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00B4D8]/10 border border-[#00B4D8]/20 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-[#00B4D8]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">Tax Savings Opportunities</p>
            <p className="text-[10px] text-white/35">Personalized for your tax profile</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-[#00B4D8]/70 hover:text-[#00B4D8] transition-colors">
          Ask TaxGPT <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {strategies.map((s) => (
          <div key={s.label} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${s.priority === "high" ? "bg-[#00B4D8]" : s.priority === "medium" ? "bg-[#FFB800]" : "bg-white/20"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80">{s.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{s.detail}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TrendingDown className="w-3 h-3 text-green-400/60" />
              <span className="text-[10px] text-green-400/70">{s.savings}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
