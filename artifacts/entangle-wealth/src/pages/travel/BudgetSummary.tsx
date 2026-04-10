import { useState } from "react";
import { DollarSign, TrendingUp, PiggyBank } from "lucide-react";
import type { PersonalActivity, PersonalTripForm } from "./types";
import { BUDGET_ESTIMATES } from "./types";

interface Props {
  form: PersonalTripForm;
  activities: PersonalActivity[];
  dayCount: number;
}

const CATEGORIES = [
  { key: "flights", label: "Flights", color: "#00D4FF" },
  { key: "accommodation", label: "Accommodation", color: "#9c27b0" },
  { key: "food", label: "Food & Dining", color: "#FFD700" },
  { key: "activities", label: "Activities", color: "#00ff88" },
  { key: "transport", label: "Local Transport", color: "#ff6b6b" },
];

export default function BudgetSummary({ form, activities, dayCount }: Props) {
  const [monthlySavings, setMonthlySavings] = useState<number>(500);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000);

  const rates = BUDGET_ESTIMATES[form.budgetLevel] || BUDGET_ESTIMATES["mid-range"];

  const activityCostsByType = activities.reduce((acc, a) => {
    const cat = a.type === "hotel" ? "accommodation"
      : a.type === "restaurant" ? "food"
      : a.type === "transit" ? "transport"
      : "activities";
    acc[cat] = (acc[cat] || 0) + a.cost;
    return acc;
  }, {} as Record<string, number>);

  const hasManualCosts = activities.some(a => a.cost > 0);

  const breakdown = CATEGORIES.map(cat => {
    let amount: number;
    if (hasManualCosts && activityCostsByType[cat.key]) {
      amount = activityCostsByType[cat.key];
    } else if (cat.key === "flights") {
      amount = rates.flights * form.travelers;
    } else {
      amount = (rates[cat.key] || 0) * dayCount * form.travelers;
    }
    return { ...cat, amount };
  });

  const tripTotal = breakdown.reduce((s, b) => s + b.amount, 0);
  const maxAmount = Math.max(...breakdown.map(b => b.amount));

  const costAsPercent = monthlyIncome > 0 ? ((tripTotal / monthlyIncome) * 100).toFixed(1) : "0";
  const monthsToFund = monthlySavings > 0 ? Math.ceil(tripTotal / monthlySavings) : 0;

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5 md:p-7 border border-[rgba(0,212,255,0.15)]">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Budget Summary</h2>
        </div>
        <p className="text-[12px] text-muted-foreground mb-5">
          Estimated costs based on your {form.budgetLevel} budget level for {form.travelers} traveler{form.travelers > 1 ? "s" : ""} over {dayCount} days.
          {hasManualCosts && " Includes your manually entered costs."}
        </p>

        <div className="rounded-xl bg-gradient-to-br from-primary/[0.08] to-[#00ff88]/[0.04] border border-primary/20 p-5 mb-5 text-center">
          <p className="text-[11px] uppercase tracking-wider text-white/30 font-semibold mb-1">Estimated Trip Total</p>
          <p className="text-[36px] font-black text-primary font-mono">${tripTotal.toLocaleString()}</p>
          <p className="text-[12px] text-white/40 mt-1">{form.budgetLevel.charAt(0).toUpperCase() + form.budgetLevel.slice(1)} · {form.travelers} traveler{form.travelers > 1 ? "s" : ""} · {dayCount} day{dayCount > 1 ? "s" : ""}</p>
        </div>

        <div className="space-y-3 mb-5">
          {breakdown.map(cat => (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-white/60">{cat.label}</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: cat.color }}>${cat.amount.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: maxAmount > 0 ? `${(cat.amount / maxAmount) * 100}%` : "0%", background: cat.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {breakdown.map(cat => (
            <div key={cat.key} className="rounded-xl p-3 text-center" style={{ background: `${cat.color}08`, border: `1px solid ${cat.color}20` }}>
              <p className="text-[14px] font-black font-mono" style={{ color: cat.color }}>${cat.amount.toLocaleString()}</p>
              <p className="text-[9px] text-white/30 mt-0.5">{cat.label}</p>
              <p className="text-[9px] text-white/20">{tripTotal > 0 ? ((cat.amount / tripTotal) * 100).toFixed(0) : 0}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 md:p-7 border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.02)]">
        <div className="flex items-center gap-2 mb-1">
          <PiggyBank className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-bold">Trip Cost vs. Savings</h2>
        </div>
        <p className="text-[12px] text-muted-foreground mb-5">
          See how this trip fits into your financial picture.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Monthly Income</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input type="number" min={0} max={999999} value={monthlyIncome}
                onChange={e => setMonthlyIncome(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-[14px] font-mono focus:outline-none focus:border-primary/50"
                aria-label="Monthly income" />
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/30 font-semibold mb-2 block">Monthly Savings for Travel</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input type="number" min={0} max={999999} value={monthlySavings}
                onChange={e => setMonthlySavings(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-[14px] font-mono focus:outline-none focus:border-primary/50"
                aria-label="Monthly savings" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 bg-primary/[0.06] border border-primary/15 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[24px] font-black text-primary font-mono">{costAsPercent}%</p>
            <p className="text-[10px] text-white/30 mt-1">of monthly income</p>
          </div>
          <div className="rounded-xl p-4 bg-[#00ff88]/[0.06] border border-[#00ff88]/15 text-center">
            <PiggyBank className="w-5 h-5 text-[#00ff88] mx-auto mb-2" />
            <p className="text-[24px] font-black text-[#00ff88] font-mono">
              {monthsToFund > 0 ? `${monthsToFund} mo` : "—"}
            </p>
            <p className="text-[10px] text-white/30 mt-1">
              {monthlySavings > 0
                ? `saving $${monthlySavings.toLocaleString()}/mo`
                : "enter savings amount"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
