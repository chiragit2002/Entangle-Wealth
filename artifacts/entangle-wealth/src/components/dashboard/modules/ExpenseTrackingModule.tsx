import { Receipt, Home, Car, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export function ExpenseTrackingModule() {
  const categories = [
    {
      icon: Home,
      label: "Home Office",
      detail: "Simplified: $5/sq ft × 300 sq ft = $1,500 | Or track actual expenses (Form 8829)",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      icon: Car,
      label: "Vehicle / Mileage",
      detail: "2026 rate: 70¢/mile for business use | Or track actual vehicle expenses",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Receipt,
      label: "Business Travel",
      detail: "100% of transportation + lodging; 50% of meals",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  const quickItems = [
    "Professional subscriptions & software",
    "Equipment & tools (Section 179 eligible)",
    "Professional development & courses",
    "Business phone & internet (% of use)",
    "State & local business license fees",
    "Marketing & advertising spend",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/80">Expense Tracking</p>
            <p className="text-[10px] text-muted-foreground/60">Home office · mileage · business spend</p>
          </div>
        </div>
        <Link href="/taxgpt" className="flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-400 transition-colors">
          Review <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-2">
        {categories.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`flex items-start gap-2 p-2.5 rounded-lg ${c.bg}`}>
              <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.color}`} />
              <div>
                <p className={`text-xs font-semibold ${c.color}`}>{c.label}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{c.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-2">
        <p className="text-[10px] text-muted-foreground/60 mb-1.5 font-semibold uppercase tracking-wider">Also deductible</p>
        <div className="grid grid-cols-2 gap-1">
          {quickItems.map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-orange-400/40 shrink-0" />
              <span className="text-[10px] text-muted-foreground/70">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
