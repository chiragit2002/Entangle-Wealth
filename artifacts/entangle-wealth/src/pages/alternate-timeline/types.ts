export interface HorizonResult {
  horizon: string;
  months: number;
  projectedNetWorth: number;
  savingsAccumulated: number;
  debtRemaining: number;
  investmentValue: number;
  stabilityScore: number;
  stressIndex: number;
  opportunityScore: number;
  milestones: string[];
}

export interface SimResult {
  params: TimelineParams;
  results: HorizonResult[];
  simulatedAt: string;
}

export interface TimelineParams {
  monthlyIncome: number;
  savingsRate: number;
  monthlyDebt: number;
  investmentRate: number;
  currentNetWorth: number;
  emergencyFundMonths: number;
}

export interface SavedTimeline {
  id: number;
  name: string;
  annotation?: string;
  isBaseline: boolean;
  monthlyIncome: number;
  savingsRate: number;
  monthlyDebt: number;
  investmentRate: number;
  currentNetWorth: number;
  emergencyFundMonths: number;
  createdAt: string;
  results: HorizonResult[];
}

export interface DeltaRow {
  horizon: string;
  deltaNetWorth: number;
  deltaStress: number;
  deltaOpportunity: number;
  deltaStability: number;
  deltaSavings: number;
  deltaDebt: number;
}

export interface CompareResult {
  resultsA: HorizonResult[];
  resultsB: HorizonResult[];
  deltas: DeltaRow[];
  summary: {
    deltaNetWorth5yr: number;
    deltaNetWorth10yr: number;
    deltaNetWorth20yr: number;
    deltaStress: number;
    deltaOpportunity: number;
  };
}

export interface WhatIfDecision {
  id: string;
  label: string;
  description: string;
}

export interface WhatIfModelResult {
  appliedDecisions: WhatIfDecision[];
  baseResults: HorizonResult[];
  modifiedResults: HorizonResult[];
  deltas: { horizon: string; deltaNetWorth: number; deltaStress: number; deltaOpportunity: number }[];
  summary: {
    netWorthGain20yr: number;
    stressReduction: number;
    opportunityGain: number;
  };
}

export const STAGES = ["Aware", "Experimenting", "Building", "Strategic"] as const;
export type Stage = typeof STAGES[number];

export const STAGE_COLORS: Record<Stage, string> = {
  Aware: "text-blue-400",
  Experimenting: "text-amber-400",
  Building: "text-emerald-400",
  Strategic: "text-purple-400",
};

export const STAGE_DESCS: Record<Stage, string> = {
  Aware: "You're exploring your financial future — great first step.",
  Experimenting: "Testing different scenarios to find what works for you.",
  Building: "Actively building better financial habits through comparison.",
  Strategic: "You think in systems. Multiple timelines, deliberate choices.",
};

export const DISPLAY_HORIZONS = ["30d", "90d", "180d", "1yr", "5yr", "10yr", "20yr"];

export function fmt(n: number, decimals = 0): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(decimals === 0 ? 0 : 1)}k`;
  return `$${n.toFixed(decimals)}`;
}
