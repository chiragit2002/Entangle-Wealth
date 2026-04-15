import { useState, useEffect, useRef, useCallback } from "react";
import { quickAnalyzeStock, fetchStocks, fetchNews, type NewsItem } from "@/lib/api";
import { useAuth } from "@clerk/react";
import { getActiveProfile } from "@/lib/taxflow-profile";
import { getMarginalRate } from "@/lib/taxflow-rates";

interface TerminalNewsItem {
  time: string;
  source: string;
  headline: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface OrderFlowItem {
  time: string;
  action: string;
  symbol: string;
  size: string;
  price: string;
  exchange: string;
  type: string;
}

const HISTORY_KEY = "mirofish_cmd_history";
const WATCHLIST_KEY = "mirofish_watchlist";
const ALERTS_KEY = "mirofish_price_alerts";
const MACROS_KEY = "mirofish_macros";
const TAX_SETTINGS_KEY = "mirofish_tax_settings";

interface TaxSettings {
  bracket: number;
  state: string;
  lotMethod: "FIFO" | "LIFO" | "SPECIFIC";
  visible: boolean;
  disclaimerShown: boolean;
}

const DEFAULT_ST_RATE = 0.37;
const DEFAULT_LT_RATE = 0.20;
const NIIT_RATE = 0.038;

function getTaxFlowRates(): { stRate: number; ltRate: number; entityType: string } {
  try {
    const profile = getActiveProfile();
    if (profile && profile.grossRevenue > 0) {
      const taxableIncome = profile.grossRevenue * 0.7;
      const stRate = getMarginalRate(taxableIncome, profile.taxYear || 2026);
      const ltRate = taxableIncome > 518900 ? 0.20 : taxableIncome > 291850 ? 0.15 : 0.0;
      return { stRate, ltRate: Math.max(ltRate, 0.15), entityType: profile.entityType || "contractor" };
    }
  } catch {}
  return { stRate: DEFAULT_ST_RATE, ltRate: DEFAULT_LT_RATE, entityType: "individual" };
}

function formatTaxImpact(side: "buy" | "sell", qty: number, sym: string, fillPrice: number, position?: { avg_entry_price: string; qty: string; unrealized_pl: string } | null): string {
  const { stRate: ST_RATE, ltRate: LT_RATE, entityType } = getTaxFlowRates();
  const profileNote = entityType !== "individual" ? ` · ${entityType.replace("_", " ").toUpperCase()}` : "";
  const totalValue = qty * fillPrice;
  const lines: string[] = [];
  lines.push(`─── Real-Time Tax Impact${profileNote} ───`);

  if (side === "buy") {
    const costBasis = totalValue;
    const hypothetical5pct = totalValue * 0.05;
    const hypothetical20pct = totalValue * 0.20;
    const stTax5 = hypothetical5pct * ST_RATE;
    const ltTax5 = hypothetical5pct * LT_RATE;
    const stTax20 = hypothetical20pct * ST_RATE;
    const ltTax20 = hypothetical20pct * LT_RATE;
    lines.push(`  Cost Basis: ${qty} × $${fillPrice.toFixed(2)} = $${costBasis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`  ┌─────────────────────────────────────────────┐`);
    lines.push(`  │ IF SOLD @ +5%  ($${(fillPrice * 1.05).toFixed(2)})                    │`);
    lines.push(`  │   Gain: $${hypothetical5pct.toFixed(2).padStart(10)}                          │`);
    lines.push(`  │   Short-Term Tax (${(ST_RATE * 100).toFixed(0)}%): $${stTax5.toFixed(2).padStart(8)}  (<1 yr)   │`);
    lines.push(`  │   Long-Term Tax  (${(LT_RATE * 100).toFixed(0)}%): $${ltTax5.toFixed(2).padStart(8)}  (>1 yr)   │`);
    lines.push(`  │   Tax Savings by Holding: $${(stTax5 - ltTax5).toFixed(2).padStart(7)}          │`);
    lines.push(`  ├─────────────────────────────────────────────┤`);
    lines.push(`  │ IF SOLD @ +20% ($${(fillPrice * 1.20).toFixed(2)})                    │`);
    lines.push(`  │   Gain: $${hypothetical20pct.toFixed(2).padStart(10)}                          │`);
    lines.push(`  │   Short-Term Tax (${(ST_RATE * 100).toFixed(0)}%): $${stTax20.toFixed(2).padStart(8)}  (<1 yr)   │`);
    lines.push(`  │   Long-Term Tax  (${(LT_RATE * 100).toFixed(0)}%): $${ltTax20.toFixed(2).padStart(8)}  (>1 yr)   │`);
    lines.push(`  │   Tax Savings by Holding: $${(stTax20 - ltTax20).toFixed(2).padStart(7)}          │`);
    lines.push(`  └─────────────────────────────────────────────┘`);
    lines.push(`  Tip: Hold >1 year to qualify for long-term rates.`);
  } else {
    const proceeds = totalValue;
    lines.push(`  Proceeds: ${qty} × $${fillPrice.toFixed(2)} = $${proceeds.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    const rawEntry = position ? parseFloat(position.avg_entry_price) : NaN;
    if (!position || isNaN(rawEntry)) {
      lines.push(`  Cost Basis: unavailable (no matching position found)`);
      lines.push(`  ┌─────────────────────────────────────────────┐`);
      lines.push(`  │ Cannot compute realized gain/loss without   │`);
      lines.push(`  │ a cost basis. Check POSITIONS after fill.   │`);
      lines.push(`  └─────────────────────────────────────────────┘`);
    } else {
      const entryPrice = rawEntry;
      const costBasis = entryPrice * qty;
      const gain = proceeds - costBasis;
      const isGain = gain >= 0;
      const stTax = Math.max(0, gain * ST_RATE);
      const ltTax = Math.max(0, gain * LT_RATE);
      const niit = Math.max(0, gain * NIIT_RATE);
      const netAfterST = proceeds - stTax - niit;
      const netAfterLT = proceeds - ltTax - niit;
      lines.push(`  Cost Basis: ${qty} × $${entryPrice.toFixed(2)} = $${costBasis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      lines.push(`  ${isGain ? "Realized Gain" : "Realized Loss"}: ${isGain ? "+" : "-"}$${Math.abs(gain).toFixed(2)}`);
      if (isGain) {
        lines.push(`  ┌─────────────────────────────────────────────┐`);
        lines.push(`  │ SHORT-TERM (held <1 yr)                     │`);
        lines.push(`  │   Federal Tax (${(ST_RATE * 100).toFixed(0)}%):    $${stTax.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   NIIT (3.8%):          $${niit.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   Net After Tax:        $${netAfterST.toFixed(2).padStart(10)}         │`);
        lines.push(`  ├─────────────────────────────────────────────┤`);
        lines.push(`  │ LONG-TERM (held >1 yr)                     │`);
        lines.push(`  │   Federal Tax (${(LT_RATE * 100).toFixed(0)}%):    $${ltTax.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   NIIT (3.8%):          $${niit.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   Net After Tax:        $${netAfterLT.toFixed(2).padStart(10)}         │`);
        lines.push(`  └─────────────────────────────────────────────┘`);
        lines.push(`  Tax Savings (LT vs ST): $${(stTax - ltTax).toFixed(2)}`);
      } else {
        lines.push(`  ┌─────────────────────────────────────────────┐`);
        lines.push(`  │ TAX-LOSS HARVESTING OPPORTUNITY             │`);
        lines.push(`  │   Deductible Loss: $${Math.abs(gain).toFixed(2).padStart(10)}              │`);
        lines.push(`  │   Max Annual Offset: $3,000 vs income       │`);
        lines.push(`  │   Remaining Carry-Forward: $${Math.max(0, Math.abs(gain) - 3000).toFixed(2).padStart(8)}     │`);
        lines.push(`  └─────────────────────────────────────────────┘`);
        lines.push(`  Note: Loss offsets gains first, then up to $3k income/yr.`);
      }
    }
  }
  lines.push(`  ⚠ Estimates only — consult a tax professional.`);
  return lines.join("\n");
}

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  bracket: 0.24,
  state: "",
  lotMethod: "FIFO",
  visible: true,
  disclaimerShown: false,
};

const HIGH_TAX_STATES: Record<string, number> = {
  CA: 0.133, NY: 0.109, NJ: 0.1075, OR: 0.099, MN: 0.0985,
  HI: 0.11, VT: 0.0875, IA: 0.085, DC: 0.0895,
};

function loadLS<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchTaxApi(path: string, token: string | null, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`/api/taxflow${path}${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function formatTaxImpactFromApi(data: any, settings: TaxSettings): string {
  const lines: string[] = [];
  const sep = "─".repeat(50);

  if (data.side === "buy") {
    lines.push(sep);
    lines.push("  TAX IMPACT ANALYSIS");
    lines.push(sep);
    lines.push(`  COST BASIS................ $${fmtMoney(data.costBasis)}`);
    lines.push("");
    lines.push(`  IF SOLD @ +5%  ($${data.price ? (data.price * 1.05).toFixed(2) : "N/A"}):`);
    lines.push(`    Gain: $${fmtMoney(data.scenarios.plus5.gain)}`);
    lines.push(`    Short-Term Tax (${(settings.bracket * 100).toFixed(0)}%): $${fmtMoney(data.scenarios.plus5.stTax)}`);
    lines.push(`    Long-Term Tax  (15%): $${fmtMoney(data.scenarios.plus5.ltTax)}`);
    lines.push(`    Tax Savings by Holding: $${fmtMoney(data.scenarios.plus5.savings)}`);
    lines.push("");
    lines.push(`  IF SOLD @ +20% ($${data.price ? (data.price * 1.20).toFixed(2) : "N/A"}):`);
    lines.push(`    Gain: $${fmtMoney(data.scenarios.plus20.gain)}`);
    lines.push(`    Short-Term Tax (${(settings.bracket * 100).toFixed(0)}%): $${fmtMoney(data.scenarios.plus20.stTax)}`);
    lines.push(`    Long-Term Tax  (15%): $${fmtMoney(data.scenarios.plus20.ltTax)}`);
    lines.push(`    Tax Savings by Holding: $${fmtMoney(data.scenarios.plus20.savings)}`);
    if (data.stateTax) {
      lines.push("");
      lines.push(`  STATE TAX (${data.stateTax.code} ${(data.stateTax.rate * 100).toFixed(1)}%): applies on sale`);
    }
    lines.push(sep);
    lines.push("  > TIP: HOLD >1 YEAR FOR LONG-TERM CAPITAL GAINS RATE (15%)");
    lines.push(sep);
  } else {
    lines.push(sep);
    lines.push("  TAX IMPACT ANALYSIS");
    lines.push(sep);

    if (data.washSale) {
      lines.push("  ⚠ WASH SALE RULE TRIGGERED — LOSS DISALLOWED BY IRS");
      lines.push(`  REPURCHASED ${data.symbol} WITHIN 30-DAY WINDOW`);
      lines.push(`  DISALLOWED LOSS: $${fmtMoney(data.washSaleDisallowed)} — ADDED TO COST BASIS`);
      lines.push(sep);
    }

    if (data.insufficientLots) {
      lines.push(`  ⚠ INSUFFICIENT LOT INVENTORY: Only ${data.matchedQty} of ${data.qty} shares matched`);
      lines.push(`  Tax figures below are based on matched lots only.`);
      lines.push("");
    }

    lines.push(`  HOLDING PERIOD............ ${data.holdingDays} DAYS (${data.isLongTerm ? "LONG-TERM" : "SHORT-TERM"})`);

    if (data.lots && data.lots.length > 0) {
      const costBasis = data.lots.reduce((s: number, l: any) => s + l.buyPrice * l.quantity, 0);
      lines.push(`  COST BASIS................ $${fmtMoney(costBasis)}`);
    }

    lines.push(`  PROCEEDS.................. $${fmtMoney(data.proceeds)}`);
    lines.push(`  REALIZED ${data.isGain ? "GAIN" : "LOSS"}............. ${data.isGain ? "+" : "-"}$${fmtMoney(Math.abs(data.totalGain))}`);
    lines.push(`  TAX CLASSIFICATION........ ${data.classification}`);

    if (data.isGain) {
      const estTax = data.isLongTerm ? data.ltTax : data.stTax;
      lines.push(`  EST. TAX LIABILITY........ $${fmtMoney(estTax + data.niit)} (${data.isLongTerm ? "15%" : (settings.bracket * 100).toFixed(0) + "%"} + 3.8% NIIT)`);

      if (data.stateTax) {
        lines.push(`  STATE TAX (${data.stateTax.code} ${(data.stateTax.rate * 100).toFixed(1)}%)....... $${fmtMoney(data.stateTax.amount)}`);
        const combined = estTax + data.niit + data.stateTax.amount;
        lines.push(`  COMBINED EST. LIABILITY... $${fmtMoney(combined)}`);
      }

      lines.push(`  YTD REALIZED GAINS........ $${fmtMoney(data.ytdRealizedGains)}`);
      lines.push(`  YTD EST. TAX BILL......... $${fmtMoney(data.ytdEstTaxBill)}`);

      if (!data.isLongTerm && data.daysToLongTerm > 0) {
        lines.push(sep);
        lines.push(`  > TIP: HOLD ${data.daysToLongTerm} MORE DAYS FOR LONG-TERM RATE (15%)`);
        lines.push(`  > POTENTIAL TAX SAVINGS IF HELD: $${fmtMoney(data.savings)}`);
      }
    } else {
      lines.push(`  TAX-LOSS HARVESTING OPPORTUNITY`);
      lines.push(`    Deductible Loss: $${fmtMoney(Math.abs(data.totalGain))}`);
      lines.push(`    Max Annual Offset: $3,000 vs income`);
      lines.push(`    Remaining Carry-Forward: $${fmtMoney(Math.max(0, Math.abs(data.totalGain) - 3000))}`);
      lines.push(`  Note: Loss offsets gains first, then up to $3k income/yr.`);
    }

    if (data.lots && data.lots.length > 1) {
      lines.push(sep);
      lines.push(`  LOT DETAILS (${data.method}):`);
      for (const lot of data.lots) {
        const d = new Date(lot.buyDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
        lines.push(`    ${d} | ${lot.quantity} shares @ $${lot.buyPrice.toFixed(2)} | ${lot.holdingDays}d | ${lot.isLongTerm ? "LT" : "ST"} | ${lot.gain >= 0 ? "+" : ""}$${fmtMoney(lot.gain)}`);
      }
    }

    lines.push(sep);
  }

  return lines.join("\n");
}

function formatTaxSummary(data: any): string {
  const lines: string[] = [];
  const sep = "─".repeat(55);
  lines.push(sep);
  lines.push(`  TAX SUMMARY — ${data.year} YEAR-TO-DATE`);
  lines.push(sep);
  lines.push(`  TOTAL TRADES.............. ${data.totalTrades}`);
  lines.push(`  WINNERS................... ${data.winners}`);
  lines.push(`  LOSERS.................... ${data.losers}`);
  lines.push(sep);
  lines.push(`  SHORT-TERM GAINS.......... ${data.shortTermGains >= 0 ? "+" : ""}$${fmtMoney(data.shortTermGains)}`);
  lines.push(`  LONG-TERM GAINS........... ${data.longTermGains >= 0 ? "+" : ""}$${fmtMoney(data.longTermGains)}`);
  lines.push(`  TOTAL REALIZED............ ${data.totalRealizedGains >= 0 ? "+" : ""}$${fmtMoney(data.totalRealizedGains)}`);
  if (data.washSaleAdjustments > 0) {
    lines.push(`  WASH SALE ADJUSTMENTS..... $${fmtMoney(data.washSaleAdjustments)}`);
  }
  lines.push(sep);
  lines.push(`  ESTIMATED FEDERAL TAX:`);
  lines.push(`    Short-Term (ordinary):.. $${fmtMoney(data.estimatedTax.federal.shortTerm)}`);
  lines.push(`    Long-Term (cap gains):.. $${fmtMoney(data.estimatedTax.federal.longTerm)}`);
  lines.push(`    NIIT (3.8%):............ $${fmtMoney(data.estimatedTax.federal.niit)}`);
  lines.push(`    Federal Total:.......... $${fmtMoney(data.estimatedTax.federal.total)}`);
  if (data.estimatedTax.state) {
    lines.push(`  STATE TAX (${data.estimatedTax.state.code} ${(data.estimatedTax.state.rate * 100).toFixed(1)}%):... $${fmtMoney(data.estimatedTax.state.amount)}`);
  }
  lines.push(`  COMBINED EST. TAX BILL:... $${fmtMoney(data.estimatedTax.combined)}`);
  lines.push(sep);

  if (data.events && data.events.length > 0) {
    lines.push(`  RECENT TRANSACTIONS:`);
    for (const e of data.events.slice(0, 10)) {
      const d = new Date(e.sellDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`    ${d} SELL ${e.sellQty} ${e.symbol} @ $${e.sellPrice.toFixed(2)} | ${e.totalGain >= 0 ? "+" : ""}$${fmtMoney(e.totalGain)}${e.washSale ? " ⚠WASH" : ""}`);
    }
    lines.push(sep);
  }

  return lines.join("\n");
}

function formatTaxProjection(data: any): string {
  const lines: string[] = [];
  const sep = "─".repeat(55);
  lines.push(sep);
  lines.push(`  TAX PROJECTION — ${data.year} FULL YEAR ESTIMATE`);
  lines.push(sep);
  lines.push(`  DAY OF YEAR............... ${data.dayOfYear}/365`);
  lines.push(`  YTD REALIZED GAINS........ ${data.ytdRealizedGains >= 0 ? "+" : ""}$${fmtMoney(data.ytdRealizedGains)}`);
  lines.push(`  PROJECTED ANNUAL GAINS.... ${data.projectedAnnualGains >= 0 ? "+" : ""}$${fmtMoney(data.projectedAnnualGains)}`);
  lines.push(sep);
  lines.push(`  TRADING PACE:`);
  lines.push(`    Trades/Day:............. ${data.tradingPace.tradesPerDay.toFixed(2)}`);
  lines.push(`    Avg Gain/Trade:......... $${fmtMoney(data.tradingPace.avgGainPerTrade)}`);
  lines.push(sep);
  lines.push(`  PROJECTED TAX BILL:`);
  lines.push(`    Federal:................ $${fmtMoney(data.projectedTax.federal)}`);
  lines.push(`    NIIT:................... $${fmtMoney(data.projectedTax.niit)}`);
  if (data.projectedTax.state) {
    lines.push(`    State (${data.projectedTax.state.code}):............ $${fmtMoney(data.projectedTax.state.amount)}`);
  }
  lines.push(`    TOTAL PROJECTED:........ $${fmtMoney(data.projectedTax.total)}`);
  lines.push(sep);
  lines.push(`  QUARTERLY ESTIMATED PAYMENTS:`);
  for (const [q, info] of Object.entries(data.quarterlyPayments) as [string, any][]) {
    lines.push(`    ${q} (${info.due}): $${fmtMoney(info.amount)}`);
  }
  lines.push(sep);
  return lines.join("\n");
}

function formatOptimize(data: any): string {
  const lines: string[] = [];
  const sep = "─".repeat(55);
  lines.push(sep);
  lines.push(`  TAX OPTIMIZE — ${data.symbol} @ $${data.currentPrice?.toFixed(2) || "N/A"}`);
  lines.push(sep);

  if (!data.lots || data.lots.length === 0) {
    lines.push(`  No open lots found for ${data.symbol}.`);
    lines.push(sep);
    return lines.join("\n");
  }

  lines.push(`  OPEN LOTS:`);
  for (const lot of data.lots) {
    const d = new Date(lot.buyDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
    const ltLabel = lot.isLongTerm ? "LT" : `ST (${lot.daysToLongTerm}d to LT)`;
    lines.push(`    ${d} | ${lot.remaining} shares @ $${lot.buyPrice.toFixed(2)} | ${ltLabel} | ${lot.unrealizedGain >= 0 ? "+" : ""}$${fmtMoney(lot.unrealizedGain)}`);
  }
  lines.push(sep);
  lines.push(`  TOTAL UNREALIZED:......... ${data.totalUnrealized >= 0 ? "+" : ""}$${fmtMoney(data.totalUnrealized)}`);
  lines.push(`  TAX IF SOLD (ST RATE):.... $${fmtMoney(data.totalTaxIfSoldNow.shortTerm)}`);
  lines.push(`  TAX IF SOLD (LT RATE):.... $${fmtMoney(data.totalTaxIfSoldNow.longTerm)}`);
  lines.push(`  POTENTIAL SAVINGS:........ $${fmtMoney(data.totalTaxIfSoldNow.savings)}`);
  lines.push(sep);

  if (data.recommendations && data.recommendations.length > 0) {
    lines.push(`  RECOMMENDATIONS:`);
    for (const rec of data.recommendations) {
      lines.push(`  > ${rec}`);
    }
    lines.push(sep);
  }

  return lines.join("\n");
}

function formatHarvest(data: any): string {
  const lines: string[] = [];
  const sep = "─".repeat(55);
  lines.push(sep);
  lines.push(`  TAX-LOSS HARVESTING OPPORTUNITIES`);
  lines.push(sep);
  lines.push(`  YTD REALIZED GAINS:....... ${data.ytdRealizedGains >= 0 ? "+" : ""}$${fmtMoney(data.ytdRealizedGains)}`);
  lines.push(`  TOTAL HARVESTABLE:........ $${fmtMoney(data.totalHarvestable)}`);
  lines.push(`  POTENTIAL TAX SAVINGS:.... $${fmtMoney(data.totalPotentialSavings)}`);
  lines.push(`  MAX ANNUAL DEDUCTION:..... $${fmtMoney(data.maxAnnualDeduction)}`);
  lines.push(sep);

  if (!data.opportunities || data.opportunities.length === 0) {
    lines.push(`  No tax-loss harvesting opportunities found.`);
    lines.push(`  All positions are at a gain or no open positions.`);
    lines.push(sep);
    return lines.join("\n");
  }

  for (const opp of data.opportunities) {
    lines.push(`  ${opp.symbol} — ${opp.lotCount} lot(s) with unrealized loss`);
    lines.push(`    Total Loss: -$${fmtMoney(Math.abs(opp.totalUnrealizedLoss))}`);
    lines.push(`    Tax Savings: $${fmtMoney(opp.potentialTaxSavings)}`);
    for (const lot of opp.lots) {
      const d = new Date(lot.buyDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`      ${d} | ${lot.remaining} @ $${lot.buyPrice.toFixed(2)} → $${lot.currentPrice.toFixed(2)} | -$${fmtMoney(Math.abs(lot.loss))} | ${lot.holdingDays}d`);
    }
  }
  lines.push(sep);
  lines.push(`  ⚠ WASH SALE WARNING: Do not repurchase within 30 days`);
  lines.push(sep);
  return lines.join("\n");
}

export function MirofishTerminal() {
  const { getToken, isSignedIn } = useAuth();
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<{ input: string; output: string }[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>(() => loadLS(HISTORY_KEY, []));
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [watchlist, setWatchlist] = useState<string[]>(() => loadLS(WATCHLIST_KEY, ["AAPL", "NVDA", "TSLA"]));
  const [alerts, setAlerts] = useState<{ symbol: string; price: number; dir: "above" | "below" }[]>(() => loadLS(ALERTS_KEY, []));
  const [macros, setMacros] = useState<Record<string, string[]>>(() => loadLS(MACROS_KEY, {}));
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => loadLS(TAX_SETTINGS_KEY, DEFAULT_TAX_SETTINGS));
  const [liveOrderFlow, setLiveOrderFlow] = useState<OrderFlowItem[]>([]);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [liveNews, setLiveNews] = useState<TerminalNewsItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);


  useEffect(() => { saveLS(WATCHLIST_KEY, watchlist); }, [watchlist]);
  useEffect(() => { saveLS(ALERTS_KEY, alerts); }, [alerts]);
  useEffect(() => { saveLS(MACROS_KEY, macros); }, [macros]);
  useEffect(() => { saveLS(TAX_SETTINGS_KEY, taxSettings); }, [taxSettings]);

  useEffect(() => {
    let cancelled = false;
    async function loadNews() {
      try {
        const data = await fetchNews({ limit: 12 });
        if (cancelled) return;
        const mapped: TerminalNewsItem[] = data.items.slice(0, 8).map((item: NewsItem) => {
          const d = new Date(item.published || Date.now());
          const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          return { time, source: item.source.split(" ").slice(0, 2).join(" ").slice(0, 15), headline: item.title.slice(0, 100), sentiment: item.sentiment };
        });
        setLiveNews(mapped);
      } catch {
        setLiveNews([{ time: "00:00", source: "System", headline: "News feeds loading...", sentiment: "neutral" }]);
      }
    }
    loadNews();
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/orders?status=filled&limit=10", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLiveOrderFlow(data.map((o: any) => ({
            time: new Date(o.filled_at || o.submitted_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            action: (o.side || "").toUpperCase(),
            symbol: o.symbol || "",
            size: o.filled_qty || o.qty || "0",
            price: o.filled_avg_price ? `$${parseFloat(o.filled_avg_price).toFixed(2)}` : "MKT",
            exchange: "PAPER",
            type: o.type?.toUpperCase() || "MKT",
          })));
        }
      } catch {}
    }
    loadOrders();
    const interval = setInterval(loadOrders, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isSignedIn, getToken]);

  const addOutput = useCallback((input: string, output: string) => {
    setCommandHistory(prev => [...prev, { input, output }]);
    setCommandInput("");
    setHistoryIdx(-1);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
  }, []);

  const appendOutput = useCallback((output: string) => {
    setCommandHistory(prev => [...prev, { input: "", output }]);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
  }, []);

  const persistCmd = useCallback((cmd: string) => {
    setCmdHistory(prev => {
      const next = [cmd, ...prev.filter(c => c !== cmd)].slice(0, 100);
      saveLS(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const updateTaxSettings = useCallback((updates: Partial<TaxSettings>) => {
    setTaxSettings(prev => {
      const next = { ...prev, ...updates };
      saveLS(TAX_SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const runCommand = useCallback(async (rawInput: string) => {
    const cmd = rawInput.trim().toUpperCase();
    if (!cmd) return;
    persistCmd(rawInput.trim());

    if (cmd === "HELP") {
      addOutput(rawInput, `Commands:
  QUOTE <SYM>               — Get stock quote
  ANALYZE <SYM>             — AI analysis (7 agents)
  SEARCH <QUERY>            — Search stocks
  NEWS [TOPIC]              — Live news feed
  BUY <QTY> <SYM>          — Paper buy order + TaxFlow impact
  SELL <QTY> <SYM>         — Paper sell order + TaxFlow impact
  POSITIONS                 — View open positions
  ORDERS                    — View recent orders
  WATCHLIST                 — Show watchlist
  WATCHLIST ADD <SYM>       — Add to watchlist
  WATCHLIST REMOVE <SYM>   — Remove from watchlist
  ALERTS                    — Show price alerts
  ALERTS SET <SYM> <PRICE> — Set price alert
  HISTORY                   — Show command history
  MACRO <NAME> <CMDS>      — Save command macro
  MACRO RUN <NAME>          — Run a saved macro
  RISK                      — Portfolio risk metrics
  STATUS                    — System status
  SIGNALS                   — Active signals
  PORTFOLIO                 — Portfolio summary
  ─── TAX COMMANDS ─────────────────────────
  TAX SUMMARY              — YTD tax report
  TAX PROJECTION           — End-of-year tax estimate
  TAX OPTIMIZE <SYM>       — Tax-optimal sell analysis
  HARVEST                   — Tax-loss harvesting scan
  EXPORT TAX REPORT        — Download CSV tax report
  SET BRACKET <RATE>       — Set federal tax rate (e.g. 32)
  SET STATE <ST>           — Set state for tax (e.g. CA)
  SET LOT METHOD <M>      — FIFO, LIFO, or SPECIFIC
  HIDE TAX                  — Suppress tax blocks
  SHOW TAX                  — Show tax blocks
  CLEAR                     — Clear terminal`);
      return;
    }

    if (cmd === "HIDE TAX") {
      updateTaxSettings({ visible: false });
      addOutput(rawInput, "[TAXFLOW] Tax impact blocks hidden. Type SHOW TAX to re-enable.");
      return;
    }

    if (cmd === "SHOW TAX") {
      updateTaxSettings({ visible: true });
      addOutput(rawInput, "[TAXFLOW] Tax impact blocks enabled.");
      return;
    }

    if (cmd.startsWith("SET BRACKET ")) {
      const rate = parseFloat(cmd.slice(12).trim());
      if (isNaN(rate) || rate < 0 || rate > 100) {
        addOutput(rawInput, "[ERROR] Usage: SET BRACKET <RATE>  (e.g. SET BRACKET 32 for 32%)");
        return;
      }
      const decimal = rate > 1 ? rate / 100 : rate;
      updateTaxSettings({ bracket: decimal });
      addOutput(rawInput, `[TAXFLOW] Federal tax bracket set to ${(decimal * 100).toFixed(0)}%.`);
      return;
    }

    if (cmd.startsWith("SET STATE ")) {
      const state = cmd.slice(10).trim().toUpperCase();
      if (state.length !== 2) {
        addOutput(rawInput, "[ERROR] Usage: SET STATE <2-LETTER CODE>  (e.g. SET STATE CA)");
        return;
      }
      updateTaxSettings({ state });
      const stateRate = HIGH_TAX_STATES[state];
      const rateInfo = stateRate ? ` (${(stateRate * 100).toFixed(1)}% rate)` : " (no state income tax or standard rate)";
      addOutput(rawInput, `[TAXFLOW] State set to ${state}${rateInfo}.`);
      return;
    }

    if (cmd.startsWith("SET LOT METHOD ")) {
      const method = cmd.slice(15).trim().toUpperCase();
      if (method !== "FIFO" && method !== "LIFO" && method !== "SPECIFIC") {
        addOutput(rawInput, "[ERROR] Usage: SET LOT METHOD <FIFO|LIFO|SPECIFIC>");
        return;
      }
      if (method === "SPECIFIC") {
        addOutput(rawInput, "[TAXFLOW] Specific lot identification is not yet supported in terminal mode. Use FIFO or LIFO.");
        return;
      }
      updateTaxSettings({ lotMethod: method as "FIFO" | "LIFO" });
      addOutput(rawInput, `[TAXFLOW] Lot method set to ${method}.`);
      return;
    }

    if (cmd === "TAX SUMMARY") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[TAXFLOW] Computing YTD tax summary...");
      try {
        const token = await getToken();
        const data = await fetchTaxApi("/summary", token, {
          bracket: taxSettings.bracket.toString(),
          state: taxSettings.state,
          method: taxSettings.lotMethod,
        });
        if (data.error) {
          appendOutput(`[ERROR] ${data.error}`);
        } else {
          appendOutput(formatTaxSummary(data));
        }
      } catch {
        appendOutput("[ERROR] Failed to compute tax summary. Ensure trade history is available.");
      }
      return;
    }

    if (cmd === "TAX PROJECTION") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[TAXFLOW] Projecting end-of-year tax liability...");
      try {
        const token = await getToken();
        const data = await fetchTaxApi("/projection", token, {
          bracket: taxSettings.bracket.toString(),
          state: taxSettings.state,
          method: taxSettings.lotMethod,
        });
        if (data.error) {
          appendOutput(`[ERROR] ${data.error}`);
        } else {
          appendOutput(formatTaxProjection(data));
        }
      } catch {
        appendOutput("[ERROR] Failed to compute tax projection.");
      }
      return;
    }

    if (cmd.startsWith("TAX OPTIMIZE")) {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      const sym = cmd.slice(12).trim();
      if (!sym) { addOutput(rawInput, "Usage: TAX OPTIMIZE <SYMBOL>  (e.g. TAX OPTIMIZE AAPL)"); return; }
      addOutput(rawInput, `[TAXFLOW] Analyzing ${sym} for tax-optimal strategy...`);
      try {
        const token = await getToken();
        const data = await fetchTaxApi(`/optimize/${sym}`, token, {
          bracket: taxSettings.bracket.toString(),
          method: taxSettings.lotMethod,
        });
        if (data.error) {
          appendOutput(`[ERROR] ${data.error}`);
        } else {
          appendOutput(formatOptimize(data));
        }
      } catch {
        appendOutput(`[ERROR] Failed to analyze ${sym}.`);
      }
      return;
    }

    if (cmd === "HARVEST") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[TAXFLOW] Scanning portfolio for tax-loss harvesting opportunities...");
      try {
        const token = await getToken();
        const data = await fetchTaxApi("/harvest", token, {
          bracket: taxSettings.bracket.toString(),
          method: taxSettings.lotMethod,
        });
        if (data.error) {
          appendOutput(`[ERROR] ${data.error}`);
        } else {
          appendOutput(formatHarvest(data));
        }
      } catch {
        appendOutput("[ERROR] Failed to scan for harvest opportunities.");
      }
      return;
    }

    if (cmd === "EXPORT TAX REPORT") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[TAXFLOW] Generating tax report CSV...");
      try {
        const token = await getToken();
        const params = new URLSearchParams({
          bracket: taxSettings.bracket.toString(),
          method: taxSettings.lotMethod,
        });
        const res = await fetch(`/api/taxflow/export?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-report-${new Date().getFullYear()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        appendOutput(`[TAXFLOW] Tax report downloaded: tax-report-${new Date().getFullYear()}.csv\n  Includes: All realized gains/losses, ST vs LT breakdown,\n  wash sale adjustments. Formatted for CPA review.`);
      } catch {
        appendOutput("[ERROR] Failed to generate tax report.");
      }
      return;
    }

    if (cmd === "NEWS" || cmd.startsWith("NEWS ")) {
      const rawTopicArg = rawInput.trim().slice(4).trim();
      const topicMap: Record<string, string> = { MICROELECTRONICS: "Microelectronics", GEOPOLITICS: "Geopolitics", "SUPPLY CHAIN": "Supply Chain", "TECH POLICY": "Tech Policy" };
      const topicArg = topicMap[rawTopicArg.toUpperCase()] || rawTopicArg;
      addOutput(rawInput, `[NEWS] Fetching live intelligence${topicArg ? ` for ${topicArg}` : ""}...`);
      try {
        const data = await fetchNews({ topic: topicArg || undefined, limit: 8 });
        if (data.initializing) {
          appendOutput("[NEWS] Intelligence feeds initializing. Data will be available shortly.");
        } else if (data.items.length === 0) {
          appendOutput("[NEWS] No articles found. Try: NEWS Microelectronics");
        } else {
          const lines = data.items.map((item: NewsItem, i: number) => {
            const sent = item.sentiment === "positive" ? "+" : item.sentiment === "negative" ? "▼" : "~";
            const tickers = item.tickers.length > 0 ? ` [${item.tickers.join(",")}]` : "";
            return `  ${i + 1}. [${sent}] ${item.title.slice(0, 70)}${tickers}\n     ${item.source} | ${item.topic}`;
          });
          appendOutput(`[NEWS] ${data.total} articles:\n${lines.join("\n")}`);
        }
      } catch {
        appendOutput("[ERROR] Failed to fetch news.");
      }
      return;
    }

    if (cmd.startsWith("ANALYZE ") || cmd.startsWith("AI ")) {
      const sym = cmd.split(" ")[1];
      if (!sym) { addOutput(rawInput, "Usage: ANALYZE <SYMBOL>"); return; }
      addOutput(rawInput, `[QUANTUM] Dispatching 7 agents to analyze ${sym}...`);
      try {
        const result = await quickAnalyzeStock(sym);
        const out = `[QUANTUM] ${sym} — ${result.signal} @ ${result.confidence}% confidence | Risk: ${result.risk}\nKey Level: $${result.keyLevel}\n${result.summary}\n⚠ ${result.disclaimer}`;
        appendOutput(out);
      } catch {
        appendOutput(`[ERROR] Analysis failed for ${sym}.`);
      }
      return;
    }

    if (cmd.startsWith("SEARCH ")) {
      const q = cmd.slice(7).trim();
      if (!q) { addOutput(rawInput, "Usage: SEARCH <QUERY>"); return; }
      try {
        const data = await fetchStocks({ q, limit: 8 });
        if (data.stocks.length === 0) {
          addOutput(rawInput, `No stocks found for "${q}".`);
        } else {
          const lines = data.stocks.map((s: any) =>
            `  ${s.symbol.padEnd(6)} $${s.price.toFixed(2).padStart(8)} ${(s.changePercent >= 0 ? "+" : "") + Math.abs(s.changePercent).toFixed(2) + "%"} ${s.name.slice(0, 25)}`
          );
          addOutput(rawInput, `[SEARCH] ${data.stocks.length} results:\n${lines.join("\n")}`);
        }
      } catch {
        addOutput(rawInput, `[ERROR] Search failed.`);
      }
      return;
    }

    if (cmd.startsWith("QUOTE")) {
      const sym = cmd.split(" ")[1] || "SPY";
      try {
        const data = await fetchStocks({ q: sym, limit: 1 });
        if (data.stocks.length > 0) {
          const s = data.stocks[0];
          addOutput(rawInput, `${s.symbol} | $${s.price.toFixed(2)} | ${s.changePercent >= 0 ? "+" : ""}${Math.abs(s.changePercent).toFixed(2)}% | ${s.sector}`);
        } else {
          addOutput(rawInput, `Symbol ${sym} not found.`);
        }
      } catch {
        addOutput(rawInput, `Symbol ${sym} not found.`);
      }
      return;
    }

    if (cmd.startsWith("BUY ") || cmd.startsWith("SELL ")) {
      const parts = cmd.split(" ");
      const side = parts[0].toLowerCase() as "buy" | "sell";
      const qty = parseInt(parts[1]);
      const sym = parts[2];
      if (!sym || isNaN(qty) || qty <= 0) {
        addOutput(rawInput, `Usage: ${side.toUpperCase()} <QTY> <SYM>  (e.g. ${side.toUpperCase()} 10 AAPL)`);
        return;
      }
      if (!isSignedIn) {
        addOutput(rawInput, "[ERROR] You must be signed in to execute paper trades.");
        return;
      }
      addOutput(rawInput, `[PAPER] Submitting ${side.toUpperCase()} order: ${qty} shares of ${sym}...`);
      try {
        const token = await getToken();

        const res = await fetch("/api/alpaca/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ symbol: sym, qty, side, type: "market" }),
        });
        const data = await res.json();
        if (!res.ok) {
          appendOutput(`[ERROR] Order failed: ${data.error || "Unknown error"}`);
        } else {
          const fillPrice = data.filled_avg_price ? parseFloat(data.filled_avg_price) : 0;

          let estimatedPrice = fillPrice;
          if (!estimatedPrice) {
            try {
              const quoteRes = await fetch(`/api/alpaca/snapshot/${sym}`);
              if (quoteRes.ok) {
                const snap = await quoteRes.json();
                estimatedPrice = snap?.latestTrade?.p || snap?.minuteBar?.c || snap?.dailyBar?.c || 0;
              }
            } catch {}
          }
          if (!estimatedPrice) {
            estimatedPrice = 0;
          }

          const isFilled = data.status === "filled" && fillPrice > 0;
          const statusLabel = isFilled ? "FILLED" : "SUBMITTED";
          const priceLabel = isFilled ? `$${fillPrice.toFixed(2)}` : "MARKET (pending)";
          const fillLine = `> ${side.toUpperCase()} ${qty} ${sym} @ ${priceLabel} — ORDER ${statusLabel}`;
          appendOutput(fillLine);

          if (taxSettings.visible) {
            try {
              const taxData = await fetchTaxApi("/impact", token, {
                symbol: sym,
                side,
                qty: qty.toString(),
                price: estimatedPrice.toString(),
                bracket: taxSettings.bracket.toString(),
                state: taxSettings.state,
                method: taxSettings.lotMethod,
              });

              if (!taxData.error) {
                const taxBlock = formatTaxImpactFromApi(taxData, taxSettings);
                let disclaimerBlock = "";
                if (!taxSettings.disclaimerShown) {
                  disclaimerBlock = "\n  ⚠ AI-ESTIMATED TAX FIGURES — NOT PROFESSIONAL TAX ADVICE — CONSULT A LICENSED CPA";
                  updateTaxSettings({ disclaimerShown: true });
                }
                appendOutput(`[TAXFLOW]\n${taxBlock}${disclaimerBlock}`);
              }
            } catch {
              appendOutput("[TAXFLOW] TAX DATA UNAVAILABLE — ENSURE TRADE HISTORY IS ACTIVE");
            }

            if (side === "sell") {
              try {
                const washData = await fetchTaxApi(`/wash-check/${sym}`, token);
                if (washData.washSaleRisk) {
                  appendOutput(`⚠ WASH SALE WARNING: You have recent buy/sell activity in ${sym} within 30 days.\n  IRS wash sale rule may apply — losses could be disallowed.`);
                }
              } catch {}
            }
          }
        }
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch (err: any) {
        appendOutput(`[ERROR] Order failed: ${err.message}`);
      }
      return;
    }

    if (cmd === "POSITIONS") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[PAPER] Fetching open positions...");
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/positions", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          appendOutput(`[ERROR] ${data.error}`);
        } else if (!Array.isArray(data) || data.length === 0) {
          appendOutput("[POSITIONS] No open positions.");
        } else {
          const lines = data.map((p: any) =>
            `  ${(p.symbol || "").padEnd(6)} ${p.qty} shares @ $${parseFloat(p.avg_entry_price || 0).toFixed(2)} | MV: $${parseFloat(p.market_value || 0).toFixed(2)} | P/L: ${parseFloat(p.unrealized_pl || 0) >= 0 ? "+" : ""}$${parseFloat(p.unrealized_pl || 0).toFixed(2)} (${(parseFloat(p.unrealized_plpc || 0) * 100).toFixed(2)}%)`
          );
          appendOutput(`[POSITIONS] ${data.length} open:\n${lines.join("\n")}`);
        }
      } catch {
        appendOutput("[ERROR] Could not fetch positions.");
      }
      return;
    }

    if (cmd === "ORDERS") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[PAPER] Fetching recent orders...");
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/orders?status=all&limit=10", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          appendOutput(`[ERROR] ${data.error}`);
        } else if (!Array.isArray(data) || data.length === 0) {
          appendOutput("[ORDERS] No recent orders.");
        } else {
          const lines = data.slice(0, 8).map((o: any) =>
            `  ${(o.side || "").toUpperCase().padEnd(5)} ${(o.qty || "").toString().padEnd(4)} ${(o.symbol || "").padEnd(6)} ${o.status?.padEnd(10)} ${o.filled_avg_price ? "$" + parseFloat(o.filled_avg_price).toFixed(2) : "PENDING"}`
          );
          appendOutput(`[ORDERS] Recent ${data.length} orders:\n${lines.join("\n")}`);
        }
      } catch {
        appendOutput("[ERROR] Could not fetch orders.");
      }
      return;
    }

    if (cmd === "WATCHLIST") {
      addOutput(rawInput, watchlist.length === 0 ? "[WATCHLIST] Empty. Use: WATCHLIST ADD <SYM>" : `[WATCHLIST] ${watchlist.join("  |  ")}`);
      return;
    }

    if (cmd.startsWith("WATCHLIST ADD ")) {
      const sym = cmd.slice(14).trim();
      if (!sym) { addOutput(rawInput, "Usage: WATCHLIST ADD <SYM>"); return; }
      if (!watchlist.includes(sym)) {
        setWatchlist(prev => [...prev, sym]);
        addOutput(rawInput, `[WATCHLIST] Added ${sym}. Now tracking: ${[...watchlist, sym].join(", ")}`);
      } else {
        addOutput(rawInput, `[WATCHLIST] ${sym} already in watchlist.`);
      }
      return;
    }

    if (cmd.startsWith("WATCHLIST REMOVE ")) {
      const sym = cmd.slice(17).trim();
      if (!watchlist.includes(sym)) { addOutput(rawInput, `[WATCHLIST] ${sym} not in watchlist.`); return; }
      setWatchlist(prev => prev.filter(s => s !== sym));
      addOutput(rawInput, `[WATCHLIST] Removed ${sym}.`);
      return;
    }

    if (cmd === "ALERTS") {
      if (alerts.length === 0) {
        addOutput(rawInput, "[ALERTS] None set. Use: ALERTS SET <SYM> <PRICE>");
      } else {
        const lines = alerts.map((a, i) => `  ${i + 1}. ${a.symbol} ${a.dir} $${a.price}`);
        addOutput(rawInput, `[ALERTS] ${alerts.length} active:\n${lines.join("\n")}`);
      }
      return;
    }

    if (cmd.startsWith("ALERTS SET ")) {
      const parts = cmd.slice(11).trim().split(" ");
      const sym = parts[0];
      const price = parseFloat(parts[1]);
      if (!sym || isNaN(price)) { addOutput(rawInput, "Usage: ALERTS SET <SYM> <PRICE>  (e.g. ALERTS SET AAPL 200)"); return; }
      const dir = "above";
      setAlerts(prev => [...prev, { symbol: sym, price, dir }]);
      addOutput(rawInput, `[ALERTS] Set: Alert when ${sym} goes ${dir} $${price}`);
      return;
    }

    if (cmd === "HISTORY") {
      if (cmdHistory.length === 0) { addOutput(rawInput, "[HISTORY] No commands yet."); return; }
      const lines = cmdHistory.slice(0, 20).map((c, i) => `  ${i + 1}. ${c}`);
      addOutput(rawInput, `[HISTORY] Last ${Math.min(cmdHistory.length, 20)} commands:\n${lines.join("\n")}`);
      return;
    }

    if (cmd.startsWith("MACRO ")) {
      const rest = rawInput.trim().slice(6).trim();
      if (rest.toUpperCase().startsWith("RUN ")) {
        const macroName = rest.slice(4).trim().toUpperCase();
        const macro = macros[macroName];
        if (!macro) { addOutput(rawInput, `[MACRO] "${macroName}" not found. Use MACRO to see saved macros.`); return; }
        addOutput(rawInput, `[MACRO] Running "${macroName}" (${macro.length} commands)...`);
        for (const c of macro) {
          await runCommand(c);
          await new Promise(r => setTimeout(r, 100));
        }
        return;
      }
      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx === -1) {
        const names = Object.keys(macros);
        addOutput(rawInput, names.length === 0 ? "[MACRO] None saved. Use: MACRO <NAME> <CMD1>; <CMD2>" : `[MACROS] Saved: ${names.join(", ")}`);
        return;
      }
      const macroName = rest.slice(0, spaceIdx).toUpperCase();
      const cmds = rest.slice(spaceIdx + 1).split(";").map((c: string) => c.trim()).filter(Boolean);
      setMacros(prev => ({ ...prev, [macroName]: cmds }));
      addOutput(rawInput, `[MACRO] Saved "${macroName}" with ${cmds.length} command(s): ${cmds.join(" → ")}`);
      return;
    }

    if (cmd === "RISK") {
      addOutput(rawInput, "[RISK] Live risk metrics are derived from your portfolio. Use POSITIONS to view holdings. Detailed risk analytics are available on the Dashboard.");
    } else if (cmd === "STATUS") {
      addOutput(rawInput, `ENTANGLE-CORE: ONLINE | 5,000 NASDAQ Stocks indexed | Tax: ${taxSettings.visible ? "ON" : "OFF"} (${(taxSettings.bracket * 100).toFixed(0)}% bracket, ${taxSettings.lotMethod})`);
    } else if (cmd === "SIGNALS") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[QUANTUM] Fetching active signals...");
      try {
        const token = await getToken();
        const res = await fetch("/api/quant/signals", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data: { signals?: { symbol: string; action?: string; signal?: string; confidence: number }[] } = await res.json();
          const signals = data.signals ?? [];
          if (signals.length > 0) {
            const top5 = signals.slice(0, 5).map(s => `${s.symbol} ${s.action ?? s.signal ?? "?"} ${s.confidence}%`).join(" | ");
            appendOutput(`[SIGNALS] Active: ${top5}`);
          } else {
            appendOutput("[SIGNALS] No signals currently available. The quant engine may still be processing.");
          }
        } else {
          appendOutput("[SIGNALS] Signal data unavailable.");
        }
      } catch {
        appendOutput("[SIGNALS] Signal data unavailable.");
      }
    } else if (cmd === "PORTFOLIO") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[PAPER] Fetching portfolio summary...");
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/account", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const equity = parseFloat(data.equity || data.portfolio_value || "0");
          const lastEquity = parseFloat(data.last_equity || "0");
          const dayPL = lastEquity > 0 ? equity - lastEquity : 0;
          const cash = parseFloat(data.cash || data.buying_power || "0");
          appendOutput(`[PORTFOLIO] Value: $${equity.toFixed(2)} | Day P&L: ${dayPL >= 0 ? "+" : ""}$${dayPL.toFixed(2)} | Cash: $${cash.toFixed(2)}`);
        } else {
          appendOutput("[PORTFOLIO] Data unavailable — ensure paper trading account is connected.");
        }
      } catch {
        appendOutput("[PORTFOLIO] Data unavailable — ensure paper trading account is connected.");
      }
    } else if (cmd === "CLEAR") {
      setCommandHistory([]);
      setCommandInput("");
    } else {
      addOutput(rawInput, `Unknown command: ${cmd}. Type HELP for available commands.`);
    }
  }, [addOutput, appendOutput, persistCmd, updateTaxSettings, isSignedIn, getToken, watchlist, alerts, macros, cmdHistory, taxSettings]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = commandInput;
    setCommandInput("");
    await runCommand(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      setCommandInput(cmdHistory[nextIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setCommandInput(nextIdx === -1 ? "" : cmdHistory[nextIdx] || "");
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "WARN": return "text-yellow-400";
      case "DATA": return "text-purple-400";
      default: return "text-primary";
    }
  };

  const getSentimentColor = (s: string) => {
    switch (s) {
      case "positive": return "text-green-400";
      case "negative": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const newsItems = liveNews.length > 0 ? liveNews : [
    { time: "00:00", source: "Loading", headline: "Fetching live news feeds...", sentiment: "neutral" as const },
  ];

  return (
    <div className="overflow-hidden bg-[#000810]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10 bg-primary/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">EntangleWealth Terminal v4.0</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-green-400">7 MODELS ONLINE</span>
          <span className={`${taxSettings.visible ? "text-green-400" : "text-red-400/60"}`}>TAX:{taxSettings.visible ? "ON" : "OFF"}</span>
          <span className="text-amber-400/60">{taxSettings.lotMethod}</span>
          <span className="text-amber-400/60">{watchlist.length} WATCHING</span>
          <span className="text-muted-foreground">{clock}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="border-r border-primary/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400/70 uppercase tracking-wider">
              {isSignedIn ? "Live Paper Order Flow" : "Order Flow (Demo)"}
            </span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {liveOrderFlow.slice(0, 8).map((order, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-1 border-b border-white/[0.03] animate-in fade-in duration-500">
                <span className="text-white/30 w-16">{order.time}</span>
                <span className={`w-8 font-bold ${order.action === "BUY" ? "text-green-400" : "text-red-400"}`}>{order.action}</span>
                <span className="text-white font-bold w-10">{order.symbol}</span>
                <span className="text-white/50 w-12 text-right">{order.size}</span>
                <span className="text-white/70 w-14 text-right">{order.price}</span>
                <span className="text-primary/40 text-[8px] w-10">{order.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-r border-primary/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">News Feed | Live</span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {newsItems.map((item, i) => (
              <div key={i} className="py-1.5 border-b border-white/[0.03]">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-white/30">{item.time}</span>
                  <span className="text-[9px] font-mono text-primary/50">{item.source}</span>
                  <span className={`text-[8px] font-mono ml-auto ${getSentimentColor(item.sentiment)}`}>
                    {item.sentiment === "positive" ? "+" : item.sentiment === "negative" ? "▼" : "~"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/70 leading-tight">{item.headline}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[9px] font-mono text-purple-400/70 uppercase tracking-wider">System Log</span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            <div className="text-[10px] font-mono py-4 text-center text-white/15">No system events</div>
          </div>
        </div>
      </div>

      <div className="border-t border-primary/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[9px] font-mono text-primary/60 uppercase tracking-wider">Command Interface</span>
          <span className="text-[8px] font-mono text-muted-foreground ml-auto">↑↓ history · BUY/SELL/TAX SUMMARY/HARVEST</span>
        </div>
        <div ref={scrollRef} className="max-h-40 overflow-y-auto mb-2 space-y-1">
          {commandHistory.map((cmd, i) => (
            <div key={i} className="text-[10px] font-mono">
              {cmd.input && (
                <div className="text-primary">
                  <span className="text-primary/40">entangle@core:~$ </span>{cmd.input}
                </div>
              )}
              <div className="text-white/60 pl-4 whitespace-pre-wrap">{cmd.output}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleCommand} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-primary/40">entangle@core:~$</span>
          <input
            data-tour="terminal-input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-primary caret-primary"
            placeholder="Type a command... (HELP for all commands)"
            autoComplete="off"
          />
          <span className="text-primary animate-blink">_</span>
        </form>
      </div>
    </div>
  );
}

export default MirofishTerminal;
