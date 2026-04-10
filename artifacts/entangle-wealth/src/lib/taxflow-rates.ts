export interface TaxYearRates {
  year: number;
  seTaxRate: number;
  seDeductiblePct: number;
  standardDeductionSingle: number;
  standardDeductionMFJ: number;
  bracketsSingle: { rate: number; upTo: number }[];
  sepIraMax: number;
  solo401kEmployeeMax: number;
  solo401kTotalMax: number;
  mileageRate: number;
  hsaSingle: number;
  hsaFamily: number;
  qbiPhaseoutSingle: number;
  qbiPhaseoutMFJ: number;
  section179Max: number;
  bonusDepreciationPct: number;
  ssWageBase: number;
  iraMax: number;
}

export const TAX_RATES: Record<number, TaxYearRates> = {
  2024: {
    year: 2024,
    seTaxRate: 0.153,
    seDeductiblePct: 0.5,
    standardDeductionSingle: 14600,
    standardDeductionMFJ: 29200,
    bracketsSingle: [
      { rate: 0.10, upTo: 11600 },
      { rate: 0.12, upTo: 47150 },
      { rate: 0.22, upTo: 100525 },
      { rate: 0.24, upTo: 191950 },
      { rate: 0.32, upTo: 243725 },
      { rate: 0.35, upTo: 609350 },
      { rate: 0.37, upTo: Infinity },
    ],
    sepIraMax: 69000,
    solo401kEmployeeMax: 23000,
    solo401kTotalMax: 69000,
    mileageRate: 0.67,
    hsaSingle: 4150,
    hsaFamily: 8300,
    qbiPhaseoutSingle: 191950,
    qbiPhaseoutMFJ: 383900,
    section179Max: 1220000,
    bonusDepreciationPct: 0.60,
    ssWageBase: 168600,
    iraMax: 7000,
  },
  2025: {
    year: 2025,
    seTaxRate: 0.153,
    seDeductiblePct: 0.5,
    standardDeductionSingle: 15000,
    standardDeductionMFJ: 30000,
    bracketsSingle: [
      { rate: 0.10, upTo: 11925 },
      { rate: 0.12, upTo: 48475 },
      { rate: 0.22, upTo: 103350 },
      { rate: 0.24, upTo: 197300 },
      { rate: 0.32, upTo: 250525 },
      { rate: 0.35, upTo: 626350 },
      { rate: 0.37, upTo: Infinity },
    ],
    sepIraMax: 70000,
    solo401kEmployeeMax: 23500,
    solo401kTotalMax: 70000,
    mileageRate: 0.70,
    hsaSingle: 4300,
    hsaFamily: 8550,
    qbiPhaseoutSingle: 197300,
    qbiPhaseoutMFJ: 394600,
    section179Max: 1250000,
    bonusDepreciationPct: 0.40,
    ssWageBase: 176100,
    iraMax: 7500,
  },
  2026: {
    year: 2026,
    seTaxRate: 0.153,
    seDeductiblePct: 0.5,
    standardDeductionSingle: 15700,
    standardDeductionMFJ: 31400,
    bracketsSingle: [
      { rate: 0.10, upTo: 12500 },
      { rate: 0.12, upTo: 50800 },
      { rate: 0.22, upTo: 108500 },
      { rate: 0.24, upTo: 207000 },
      { rate: 0.32, upTo: 263000 },
      { rate: 0.35, upTo: 657000 },
      { rate: 0.37, upTo: Infinity },
    ],
    sepIraMax: 71000,
    solo401kEmployeeMax: 24000,
    solo401kTotalMax: 71000,
    mileageRate: 0.70,
    hsaSingle: 4400,
    hsaFamily: 8750,
    qbiPhaseoutSingle: 200000,
    qbiPhaseoutMFJ: 400000,
    section179Max: 1250000,
    bonusDepreciationPct: 0.40,
    ssWageBase: 176100,
    iraMax: 7500,
  },
};

export function calculateIncomeTax(taxableIncome: number, year: number): number {
  const rates = TAX_RATES[year] || TAX_RATES[2026];
  const brackets = rates.bracketsSingle;
  let tax = 0;
  let remaining = Math.max(0, taxableIncome);
  let prev = 0;
  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.upTo - prev);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    prev = bracket.upTo;
  }
  return tax;
}

export function calculateSETax(netSEIncome: number, year: number): number {
  const rates = TAX_RATES[year] || TAX_RATES[2026];
  const taxableBase = netSEIncome * 0.9235;
  const ssTax = Math.min(taxableBase, rates.ssWageBase) * 0.124;
  const medicareTax = taxableBase * 0.029;
  const additionalMedicare = Math.max(0, taxableBase - 200000) * 0.009;
  return ssTax + medicareTax + additionalMedicare;
}

export function calculateQBIDeduction(qbi: number, taxableIncome: number, year: number): number {
  const rates = TAX_RATES[year] || TAX_RATES[2026];
  if (taxableIncome <= rates.qbiPhaseoutSingle) {
    return qbi * 0.20;
  }
  const phaseoutEnd = rates.qbiPhaseoutSingle + 50000;
  if (taxableIncome >= phaseoutEnd) return 0;
  const pct = 1 - (taxableIncome - rates.qbiPhaseoutSingle) / 50000;
  return qbi * 0.20 * pct;
}

export function getEffectiveRate(taxableIncome: number, year: number): number {
  if (taxableIncome <= 0) return 0;
  const tax = calculateIncomeTax(taxableIncome, year);
  return tax / taxableIncome;
}

export function getMarginalRate(taxableIncome: number, year: number): number {
  const rates = TAX_RATES[year] || TAX_RATES[2026];
  const brackets = rates.bracketsSingle;
  let prev = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.upTo) return bracket.rate;
    prev = bracket.upTo;
  }
  return 0.37;
}
