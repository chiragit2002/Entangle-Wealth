export interface EntanglementInsight {
  id: string;
  sourceDomain: "portfolio" | "tax" | "career" | "simulation" | "coaching";
  targetDomain: "portfolio" | "tax" | "career" | "simulation" | "coaching";
  message: string;
  actionLabel: string;
  actionHref: string;
  relevanceScore: number;
  accentColor: string;
  prefillAmount?: number;
}

export interface UserEntanglementContext {
  portfolioGainThisWeek?: number;
  portfolioPositions?: { symbol: string; quantity: number; avgCost: number }[];
  taxSavingsFound?: number;
  taxFilingStatus?: string;
  hasCompletedTaxProfile?: boolean;
  currentIncome?: number;
  gigIncomeMonthly?: number;
  simulationSavingsRate?: number;
  simulationNetWorth10yr?: number;
  coachRageClicks?: number;
  uncheckedTaxDeductions?: number;
  recentlyAnalyzedSymbol?: string;
  recentlyAnalyzedSignal?: string;
}

const ENTANGLEMENT_ACCENT = "#00B4D8";
const TAX_ACCENT = "#f5c842";
const CAREER_ACCENT = "#00e676";
const SIM_ACCENT = "#a78bfa";
const COACH_ACCENT = "#ff6b6b";

function compoundAmount(principal: number, years: number, rate = 0.08): number {
  return Math.round(principal * Math.pow(1 + rate, years));
}

export function generateEntanglementInsights(ctx: UserEntanglementContext): EntanglementInsight[] {
  const insights: EntanglementInsight[] = [];

  if (ctx.portfolioGainThisWeek && ctx.portfolioGainThisWeek > 500) {
    const iraMonthlyMax = Math.round(7500 / 12);
    insights.push({
      id: "portfolio-to-ira",
      sourceDomain: "portfolio",
      targetDomain: "tax",
      message: `Your portfolio gained $${ctx.portfolioGainThisWeek.toLocaleString()} this week — that's enough to max your IRA contribution for the month ($${iraMonthlyMax}/mo).`,
      actionLabel: "Check Tax Impact",
      actionHref: "/taxgpt?q=IRA+contribution+strategy",
      relevanceScore: 90,
      accentColor: TAX_ACCENT,
    });
  }

  if (ctx.taxSavingsFound && ctx.taxSavingsFound > 0) {
    const compounded10 = compoundAmount(ctx.taxSavingsFound, 10);
    insights.push({
      id: "tax-to-simulation",
      sourceDomain: "tax",
      targetDomain: "simulation",
      message: `TaxGPT identified $${ctx.taxSavingsFound.toLocaleString()} in potential savings → invested today, that grows to $${compounded10.toLocaleString()} in 10 years at 8% avg return.`,
      actionLabel: "Put It To Work",
      actionHref: `/alternate-timeline?prefill=${ctx.taxSavingsFound}`,
      relevanceScore: 95,
      accentColor: SIM_ACCENT,
      prefillAmount: ctx.taxSavingsFound,
    });
  }

  if (ctx.gigIncomeMonthly && ctx.gigIncomeMonthly > 0) {
    const annualGig = ctx.gigIncomeMonthly * 12;
    const qbiDeduction = Math.round(annualGig * 0.2);
    insights.push({
      id: "gig-to-tax",
      sourceDomain: "career",
      targetDomain: "tax",
      message: `Your side gig income (~$${ctx.gigIncomeMonthly.toLocaleString()}/mo) qualifies you for the QBI deduction worth ~$${qbiDeduction.toLocaleString()} — that's real money left on the table.`,
      actionLabel: "Check Deductions",
      actionHref: "/taxgpt?q=QBI+deduction+for+gig+income",
      relevanceScore: 88,
      accentColor: TAX_ACCENT,
    });
  }

  if (ctx.currentIncome && ctx.simulationSavingsRate !== undefined) {
    const monthlyExtra = Math.round((ctx.currentIncome * 0.03) / 12);
    insights.push({
      id: "income-to-timeline",
      sourceDomain: "career",
      targetDomain: "simulation",
      message: `Increasing your savings rate by just 3% with your current income adds ~$${monthlyExtra.toLocaleString()}/mo to your Alternate Timeline — see the compounding effect.`,
      actionLabel: "Explore Timeline",
      actionHref: "/alternate-timeline",
      relevanceScore: 82,
      accentColor: SIM_ACCENT,
    });
  }

  if (ctx.coachRageClicks && ctx.coachRageClicks > 2 && ctx.uncheckedTaxDeductions) {
    insights.push({
      id: "rage-to-tax",
      sourceDomain: "coaching",
      targetDomain: "tax",
      message: `You've been focused on short-term market moves, but you have $${ctx.uncheckedTaxDeductions.toLocaleString()} in unclaimed deductions that dwarf most trading drawdowns.`,
      actionLabel: "Claim Deductions",
      actionHref: "/taxgpt",
      relevanceScore: 92,
      accentColor: COACH_ACCENT,
    });
  }

  if (ctx.recentlyAnalyzedSymbol && ctx.recentlyAnalyzedSignal) {
    insights.push({
      id: "analysis-to-tax",
      sourceDomain: "portfolio",
      targetDomain: "tax",
      message: `You analyzed ${ctx.recentlyAnalyzedSymbol} (${ctx.recentlyAnalyzedSignal}). Before trading, check your tax bracket impact — short-term gains are taxed as ordinary income.`,
      actionLabel: "Check Tax Impact",
      actionHref: "/taxgpt?q=capital+gains+tax+bracket",
      relevanceScore: 78,
      accentColor: TAX_ACCENT,
    });
  }

  if (!ctx.hasCompletedTaxProfile) {
    insights.push({
      id: "no-tax-profile",
      sourceDomain: "tax",
      targetDomain: "coaching",
      message: "Set up your TaxFlow profile to unlock personalized deductions across every feature — your coach, portfolio analysis, and timeline simulations all get smarter.",
      actionLabel: "Set Up Profile",
      actionHref: "/taxflow",
      relevanceScore: 70,
      accentColor: ENTANGLEMENT_ACCENT,
    });
  }

  return insights.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function estimateTaxImpact(
  signal: string,
  estimatedGain: number,
  filingStatus: "single" | "married" | "hoh" = "single"
): {
  shortTermRate: number;
  longTermRate: number;
  estimatedShortTermTax: number;
  estimatedLongTermTax: number;
  washSaleWarning: boolean;
  bracketNote: string;
} {
  const stRates: Record<string, number> = { single: 0.22, married: 0.22, hoh: 0.22 };
  const ltRates: Record<string, number> = { single: 0.15, married: 0.15, hoh: 0.15 };

  const stRate = stRates[filingStatus] ?? 0.22;
  const ltRate = ltRates[filingStatus] ?? 0.15;

  return {
    shortTermRate: stRate,
    longTermRate: ltRate,
    estimatedShortTermTax: Math.round(estimatedGain * stRate),
    estimatedLongTermTax: Math.round(estimatedGain * ltRate),
    washSaleWarning: signal === "SELL" || signal === "STRONG_SELL",
    bracketNote: `At 22% bracket (short-term) vs 15% (long-term held >1yr)`,
  };
}

export function computeWealthProjection(monthlyAmount: number, years = 10, rate = 0.08): number {
  const n = years * 12;
  const r = rate / 12;
  return Math.round(monthlyAmount * ((Math.pow(1 + r, n) - 1) / r));
}
