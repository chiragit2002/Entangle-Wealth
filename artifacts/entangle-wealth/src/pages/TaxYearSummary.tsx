import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import {
  TrendingUp, TrendingDown, AlertTriangle, Download, FileText,
  ChevronLeft, BarChart2, Shield, Info, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveProfile, getTaxYear } from "@/lib/taxflow-profile";
import { calculateIncomeTax, calculateSETax, getMarginalRate, TAX_RATES } from "@/lib/taxflow-rates";
import { ALL_STRATEGIES } from "@/lib/taxflow-strategies";
import { getPlanStrategies } from "@/lib/taxflow-profile";

function formatDollar(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDollarSigned(n: number): string {
  const sign = n < 0 ? "-" : n > 0 ? "+" : "";
  return sign + formatDollar(n);
}

interface PaperTrade {
  id?: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price?: number;
  totalCost: number;
  createdAt: string;
}

interface PaperPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
}

interface WashSaleFlag {
  sellTrade: PaperTrade & { lossAmount: number; costBasis: number };
  triggeringBuyDate: string;
  disallowedLoss: number;
  daysApart: number;
}

interface RealizedGain {
  symbol: string;
  quantity: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  isLongTerm: boolean;
  date: string;
  washSale?: boolean;
  disallowedLoss?: number;
}

function detectWashSales(trades: PaperTrade[]): WashSaleFlag[] {
  const flags: WashSaleFlag[] = [];
  const sells = trades.filter(t => t.side === "sell");
  const buys = trades.filter(t => t.side === "buy");

  for (const sell of sells) {
    const sellPrice = sell.totalCost / sell.quantity;
    const sellDate = new Date(sell.createdAt).getTime();

    const recentBuysForSymbol = buys.filter(b => {
      if (b.symbol !== sell.symbol) return false;
      const buyDate = new Date(b.createdAt).getTime();
      const daysDiff = Math.abs((buyDate - sellDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    });

    const buysBefore = buys.filter(b => {
      if (b.symbol !== sell.symbol) return false;
      const buyDate = new Date(b.createdAt).getTime();
      return buyDate < sellDate;
    });

    if (buysBefore.length === 0) continue;

    const lastBuy = buysBefore.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const costBasis = lastBuy.totalCost / lastBuy.quantity;

    if (sellPrice >= costBasis) continue;

    const lossAmount = (costBasis - sellPrice) * sell.quantity;

    if (recentBuysForSymbol.length > 0) {
      const trigBuy = recentBuysForSymbol[0];
      const trigBuyDate = new Date(trigBuy.createdAt);
      const daysApart = Math.abs(
        (trigBuyDate.getTime() - sellDate) / (1000 * 60 * 60 * 24)
      );

      flags.push({
        sellTrade: { ...sell, lossAmount, costBasis },
        triggeringBuyDate: trigBuyDate.toLocaleDateString("en-US"),
        disallowedLoss: lossAmount,
        daysApart: Math.round(daysApart),
      });
    }
  }

  return flags;
}

function computeRealizedGains(trades: PaperTrade[]): RealizedGain[] {
  const gains: RealizedGain[] = [];
  const buysMap: Record<string, PaperTrade[]> = {};

  const sorted = [...trades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const trade of sorted) {
    if (trade.side === "buy") {
      if (!buysMap[trade.symbol]) buysMap[trade.symbol] = [];
      buysMap[trade.symbol].push(trade);
    } else {
      const buys = buysMap[trade.symbol] || [];
      if (buys.length === 0) continue;

      const lastBuy = buys[buys.length - 1];
      const costBasis = (lastBuy.totalCost / lastBuy.quantity) * trade.quantity;
      const proceeds = trade.totalCost;
      const gain = proceeds - costBasis;

      const buyDate = new Date(lastBuy.createdAt).getTime();
      const sellDate = new Date(trade.createdAt).getTime();
      const holdingDays = (sellDate - buyDate) / (1000 * 60 * 60 * 24);

      gains.push({
        symbol: trade.symbol,
        quantity: trade.quantity,
        proceeds,
        costBasis,
        gain,
        isLongTerm: holdingDays >= 365,
        date: new Date(trade.createdAt).toLocaleDateString("en-US"),
      });
    }
  }

  return gains;
}

const SAMPLE_TRADES: PaperTrade[] = [
  { symbol: "AAPL", side: "buy", quantity: 10, totalCost: 1730, createdAt: "2025-03-15T10:00:00Z" },
  { symbol: "AAPL", side: "sell", quantity: 10, totalCost: 1650, createdAt: "2025-05-20T10:00:00Z" },
  { symbol: "AAPL", side: "buy", quantity: 5, totalCost: 870, createdAt: "2025-06-01T10:00:00Z" },
  { symbol: "TSLA", side: "buy", quantity: 20, totalCost: 3400, createdAt: "2024-12-01T10:00:00Z" },
  { symbol: "TSLA", side: "sell", quantity: 20, totalCost: 4800, createdAt: "2025-01-10T10:00:00Z" },
  { symbol: "NVDA", side: "buy", quantity: 15, totalCost: 1650, createdAt: "2025-02-10T10:00:00Z" },
  { symbol: "NVDA", side: "sell", quantity: 15, totalCost: 1500, createdAt: "2025-02-28T10:00:00Z" },
  { symbol: "NVDA", side: "buy", quantity: 10, totalCost: 1100, createdAt: "2025-03-10T10:00:00Z" },
  { symbol: "MSFT", side: "buy", quantity: 5, totalCost: 1950, createdAt: "2023-06-01T10:00:00Z" },
  { symbol: "MSFT", side: "sell", quantity: 5, totalCost: 2200, createdAt: "2025-08-15T10:00:00Z" },
];

const SAMPLE_POSITIONS: PaperPosition[] = [
  { symbol: "AAPL", quantity: 5, avgCost: 174 },
  { symbol: "NVDA", quantity: 10, avgCost: 110 },
  { symbol: "GOOGL", quantity: 3, avgCost: 165 },
];

const CURRENT_PRICES: Record<string, number> = {
  AAPL: 185,
  NVDA: 135,
  GOOGL: 172,
};

interface PortfolioData {
  positions: PaperPosition[];
  trades: PaperTrade[];
  cashBalance: number;
  totalValue?: number;
}

export default function TaxYearSummary() {
  const { toast } = useToast();
  const { getToken, isSignedIn } = useAuth();
  const profile = getActiveProfile();
  const taxYear = getTaxYear();
  const planIds = getPlanStrategies();
  const rates = TAX_RATES[taxYear] || TAX_RATES[2026];
  const [activeTab, setActiveTab] = useState<"summary" | "washsales" | "quarterly">("summary");

  const portfolioQuery = useQuery<PortfolioData>({
    queryKey: ["paper-trading-portfolio"],
    queryFn: async () => {
      const res = await authFetch("/paper-trading/portfolio", getToken);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !!isSignedIn,
    staleTime: 2 * 60_000,
  });

  const trades: PaperTrade[] = portfolioQuery.data?.trades?.length
    ? portfolioQuery.data.trades
    : SAMPLE_TRADES;

  const positions: PaperPosition[] = portfolioQuery.data?.positions?.length
    ? portfolioQuery.data.positions
    : SAMPLE_POSITIONS;

  const isDemo = !portfolioQuery.data?.trades?.length;

  const realizedGains = useMemo(() => computeRealizedGains(trades), [trades]);
  const washSaleFlags = useMemo(() => detectWashSales(trades), [trades]);

  const washSaleSymbols = new Set(washSaleFlags.map(f => f.sellTrade.symbol));

  const gainsWithWashSale = useMemo(() => {
    return realizedGains.map(g => {
      const isWashSale = g.gain < 0 && washSaleSymbols.has(g.symbol);
      if (isWashSale) {
        const flag = washSaleFlags.find(f => f.sellTrade.symbol === g.symbol);
        return { ...g, washSale: true, disallowedLoss: flag?.disallowedLoss ?? 0 };
      }
      return g;
    });
  }, [realizedGains, washSaleFlags, washSaleSymbols]);

  const shortTermGains = gainsWithWashSale.filter(g => !g.isLongTerm && !g.washSale).reduce((s, g) => s + g.gain, 0);
  const longTermGains = gainsWithWashSale.filter(g => g.isLongTerm).reduce((s, g) => s + g.gain, 0);
  const washSaleAdjustment = gainsWithWashSale.filter(g => g.washSale).reduce((s, g) => s + (g.disallowedLoss || 0), 0);
  const totalRealizedGain = shortTermGains + longTermGains;

  const unrealizedGains = useMemo(() => {
    return positions.map(pos => {
      const currentPrice = CURRENT_PRICES[pos.symbol] ?? pos.avgCost * 1.05;
      const unrealized = (currentPrice - pos.avgCost) * pos.quantity;
      return {
        symbol: pos.symbol,
        quantity: pos.quantity,
        avgCost: pos.avgCost,
        currentPrice,
        unrealized,
        marketValue: currentPrice * pos.quantity,
        costBasisTotal: pos.avgCost * pos.quantity,
      };
    });
  }, [positions]);

  const totalUnrealizedGain = unrealizedGains.reduce((s, p) => s + p.unrealized, 0);

  const marginalRate = profile ? getMarginalRate(profile.grossRevenue * 0.7, taxYear) : 0.24;
  const ltcgRate = marginalRate <= 0.12 ? 0 : marginalRate <= 0.35 ? 0.15 : 0.20;

  const estimatedTaxOnGains =
    Math.max(0, shortTermGains) * marginalRate +
    Math.max(0, longTermGains) * ltcgRate;

  const QUARTERLY_DATES = [
    { quarter: "Q1", due: `April 15, ${taxYear}`, period: `Jan 1 – Mar 31, ${taxYear}` },
    { quarter: "Q2", due: `June 16, ${taxYear}`, period: `Apr 1 – May 31, ${taxYear}` },
    { quarter: "Q3", due: `Sep 15, ${taxYear}`, period: `Jun 1 – Aug 31, ${taxYear}` },
    { quarter: "Q4", due: `Jan 15, ${taxYear + 1}`, period: `Sep 1 – Dec 31, ${taxYear}` },
  ];

  const grossRevenue = profile?.grossRevenue ?? 120000;
  const seNet = grossRevenue * 0.9235;
  const seTax = calculateSETax(grossRevenue, taxYear);
  const seDeduct = seTax * 0.5;
  const taxableIncome = Math.max(0, grossRevenue - seDeduct - rates.standardDeductionSingle);
  const incomeTax = calculateIncomeTax(taxableIncome, taxYear);
  const totalTax = seTax + incomeTax + Math.max(0, estimatedTaxOnGains);
  const quarterlyPayment = Math.ceil(totalTax / 4 / 100) * 100;

  const priorYearTax = totalTax * 0.95;
  const safeHarbor100 = Math.ceil(priorYearTax / 4);
  const safeHarbor110 = Math.ceil(priorYearTax * 1.1 / 4);
  const safeHarborRequired = grossRevenue > 150000 ? safeHarbor110 : safeHarbor100;

  const exportCSV = () => {
    const lines: string[] = [];
    lines.push(`ENTANGLEWEALTH | TAXFLOW — TAX YEAR SUMMARY`);
    lines.push(`Tax Year: ${taxYear}`);
    if (profile) lines.push(`Client: ${profile.name || profile.businessName}`);
    lines.push(`Generated: ${new Date().toLocaleDateString("en-US")}`);
    lines.push(``);
    lines.push(`REALIZED GAINS/LOSSES`);
    lines.push(`Symbol,Date,Quantity,Proceeds,Cost Basis,Gain/Loss,Term,Wash Sale`);
    gainsWithWashSale.forEach(g => {
      lines.push(`${g.symbol},${g.date},${g.quantity},${g.proceeds.toFixed(2)},${g.costBasis.toFixed(2)},${g.gain.toFixed(2)},${g.isLongTerm ? "Long-Term" : "Short-Term"},${g.washSale ? "YES - Disallowed: $" + (g.disallowedLoss || 0).toFixed(2) : "No"}`);
    });
    lines.push(``);
    lines.push(`Short-Term Gains,${shortTermGains.toFixed(2)}`);
    lines.push(`Long-Term Gains,${longTermGains.toFixed(2)}`);
    lines.push(`Wash Sale Adjustments,${washSaleAdjustment.toFixed(2)}`);
    lines.push(`Net Realized P&L,${totalRealizedGain.toFixed(2)}`);
    lines.push(``);
    lines.push(`UNREALIZED GAINS/LOSSES`);
    lines.push(`Symbol,Quantity,Avg Cost,Current Price,Market Value,Unrealized Gain/Loss`);
    unrealizedGains.forEach(p => {
      lines.push(`${p.symbol},${p.quantity},${p.avgCost.toFixed(2)},${p.currentPrice.toFixed(2)},${p.marketValue.toFixed(2)},${p.unrealized.toFixed(2)}`);
    });
    lines.push(``);
    lines.push(`Total Unrealized Gain/Loss,${totalUnrealizedGain.toFixed(2)}`);
    lines.push(``);
    lines.push(`WASH SALE VIOLATIONS`);
    if (washSaleFlags.length === 0) {
      lines.push(`No wash sale violations detected.`);
    } else {
      lines.push(`Symbol,Sell Date,Loss Amount,Triggering Buy Date,Days Apart,Disallowed Loss`);
      washSaleFlags.forEach(f => {
        lines.push(`${f.sellTrade.symbol},${new Date(f.sellTrade.createdAt).toLocaleDateString("en-US")},${f.sellTrade.lossAmount.toFixed(2)},${f.triggeringBuyDate},${f.daysApart},${f.disallowedLoss.toFixed(2)}`);
      });
    }
    lines.push(``);
    lines.push(`QUARTERLY ESTIMATED TAX PAYMENTS`);
    lines.push(`Quarter,Due Date,Period,Payment`);
    QUARTERLY_DATES.forEach((q, i) => {
      lines.push(`${q.quarter},${q.due},"${q.period}",${quarterlyPayment}`);
    });
    lines.push(``);
    lines.push(`Safe Harbor (100% prior year),${safeHarbor100}`);
    lines.push(`Safe Harbor (110% prior year),${safeHarbor110}`);
    lines.push(`Annual Tax Estimate,${totalTax.toFixed(0)}`);
    lines.push(``);
    lines.push(`Disclaimer: Educational purposes only. Consult a licensed CPA for professional tax advice.`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxflow-year-summary-${taxYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `Tax year ${taxYear} summary CSV downloaded.` });
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 50;
    let y = 60;
    const LINE = 18;

    const heading = (text: string, size = 13) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(text, margin, y);
      y += LINE + 4;
    };

    const body = (text: string, color?: [number, number, number]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...(color ?? [40, 40, 40]));
      doc.text(text, margin, y);
      y += LINE;
    };

    const rule = () => {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageW - margin, y);
      y += 10;
    };

    const checkPage = () => {
      if (y > 700) { doc.addPage(); y = 60; }
    };

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("EntangleWealth | TaxFlow — CPA Review Report", margin, y);
    y += 24;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax Year: ${taxYear}   |   Generated: ${new Date().toLocaleDateString("en-US")}`, margin, y);
    y += 28;
    rule();

    if (profile) {
      heading("CLIENT PROFILE", 12);
      body(`Name: ${profile.name || profile.businessName}`);
      body(`Entity: ${profile.entityType}   Industry: ${profile.industry || "N/A"}   State: ${profile.homeState}`);
      body(`Gross Revenue: ${formatDollar(profile.grossRevenue)}`);
      y += 8;
      rule();
    }

    heading("TAX YEAR SUMMARY — REALIZED GAINS / LOSSES", 12);
    body(`Short-Term Gains (held < 1 yr):   ${formatDollarSigned(shortTermGains)}`, shortTermGains >= 0 ? [0, 140, 0] : [200, 0, 0]);
    body(`Long-Term Gains (held ≥ 1 yr):    ${formatDollarSigned(longTermGains)}`, longTermGains >= 0 ? [0, 140, 0] : [200, 0, 0]);
    body(`Wash Sale Adjustments:            -${formatDollar(washSaleAdjustment)}`, [200, 100, 0]);
    body(`Net Realized P&L:                 ${formatDollarSigned(totalRealizedGain)}`, totalRealizedGain >= 0 ? [0, 140, 0] : [200, 0, 0]);
    body(`Unrealized Gain/Loss:             ${formatDollarSigned(totalUnrealizedGain)}`, totalUnrealizedGain >= 0 ? [0, 140, 0] : [200, 0, 0]);
    y += 8;
    rule();
    checkPage();

    if (gainsWithWashSale.length > 0) {
      heading("REALIZED TRADES DETAIL", 12);
      gainsWithWashSale.forEach(g => {
        checkPage();
        const ws = g.washSale ? " ⚠ WASH SALE" : "";
        body(`${g.symbol}  ${g.date}  Qty: ${g.quantity}  Proceeds: ${formatDollar(g.proceeds)}  Basis: ${formatDollar(g.costBasis)}  Gain: ${formatDollarSigned(g.gain)}  [${g.isLongTerm ? "LT" : "ST"}]${ws}`, g.washSale ? [200, 100, 0] : undefined);
      });
      y += 8;
      rule();
    }

    checkPage();
    if (washSaleFlags.length > 0) {
      heading("WASH SALE VIOLATIONS — IRS §1091", 12);
      washSaleFlags.forEach(f => {
        checkPage();
        body(`⚠ ${f.sellTrade.symbol}: Sold at loss of ${formatDollar(f.sellTrade.lossAmount)}, repurchased within ${f.daysApart} days (${f.triggeringBuyDate})`);
        body(`  Disallowed loss: ${formatDollar(f.disallowedLoss)} — must be added to cost basis of new shares`, [200, 100, 0]);
      });
      y += 8;
      rule();
    } else {
      heading("WASH SALE VIOLATIONS — IRS §1091", 12);
      body("No wash sale violations detected in trade history.");
      y += 8;
      rule();
    }

    checkPage();
    heading("QUARTERLY ESTIMATED TAX PAYMENTS", 12);
    body(`Annual Tax Estimate: ${formatDollar(totalTax)}`);
    body(`Safe Harbor (100% prior year / quarter): ${formatDollar(safeHarbor100)}`);
    body(`Safe Harbor (110% prior year / quarter): ${formatDollar(safeHarbor110)}`);
    y += 6;
    QUARTERLY_DATES.forEach((q, i) => {
      checkPage();
      body(`${q.quarter} — ${q.due} (${q.period}):  ${formatDollar(quarterlyPayment)}`);
    });
    y += 8;
    rule();

    checkPage();
    heading("ACTIVE TAX STRATEGIES", 12);
    if (planIds.length === 0) {
      body("No strategies selected. Visit TaxFlow to add strategies.");
    } else {
      planIds.forEach(id => {
        const s = ALL_STRATEGIES.find(st => st.id === id);
        if (s) {
          checkPage();
          body(`• ${s.title} (${s.code})`);
        }
      });
    }
    y += 16;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    const disclaimer = "DISCLAIMER: This report is for educational purposes only and does not constitute professional tax, legal, or financial advice. Consult a licensed CPA for your specific situation.";
    const lines = doc.splitTextToSize(disclaimer, pageW - margin * 2);
    doc.text(lines, margin, y);

    doc.save(`taxflow-cpa-report-${taxYear}.pdf`);
    toast({ title: "PDF Exported", description: `CPA report for ${taxYear} downloaded.` });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/tax">
            <Button variant="outline" size="sm" className="border-white/10 text-white/50 gap-1 text-xs">
              <ChevronLeft className="w-3 h-3" /> TaxFlow
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Tax Year Summary</h1>
            <p className="text-white/40 text-xs">Paper trading gains, wash sales & quarterly estimates — {taxYear}</p>
          </div>
        </div>

        {isDemo && (
          <div className="glass-panel rounded-xl p-3 mb-4 border border-[#ffb800]/20 bg-[#ffb800]/5 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#ffb800] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#ffb800]/80">
              Showing demo data. Your actual paper trading history will appear once you start trading.
            </p>
          </div>
        )}

        <div className="glass-panel rounded-xl p-3 mb-6 border border-white/[0.06]">
          <p className="text-[11px] text-white/30 leading-relaxed">
            For education only. Paper trading gains/losses are simulated. Consult a CPA for real tax situations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass-panel rounded-xl p-4 border border-[rgba(0,255,65,0.15)]">
            <p className="text-[11px] text-white/40 mb-1">Net Realized P&L</p>
            <p className={`text-xl font-extrabold font-mono ${totalRealizedGain >= 0 ? "text-[#00FF41]" : "text-[#ff4757]"}`}>
              {formatDollarSigned(totalRealizedGain)}
            </p>
            <p className="text-[10px] text-white/30 mt-1">{gainsWithWashSale.length} closed position{gainsWithWashSale.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(0,255,65,0.15)]">
            <p className="text-[11px] text-white/40 mb-1">Unrealized Gain/Loss</p>
            <p className={`text-xl font-extrabold font-mono ${totalUnrealizedGain >= 0 ? "text-[#00FF41]" : "text-[#ff4757]"}`}>
              {formatDollarSigned(totalUnrealizedGain)}
            </p>
            <p className="text-[10px] text-white/30 mt-1">{positions.length} open position{positions.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(0,255,65,0.1)]">
            <p className="text-[11px] text-white/40 mb-1">Short-Term Gains</p>
            <p className={`text-lg font-bold font-mono ${shortTermGains >= 0 ? "text-[#00FF41]" : "text-[#ff4757]"}`}>
              {formatDollarSigned(shortTermGains)}
            </p>
            <p className="text-[10px] text-white/30 mt-1">Ordinary income rate ({Math.round(marginalRate * 100)}%)</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(0,255,65,0.1)]">
            <p className="text-[11px] text-white/40 mb-1">Long-Term Gains</p>
            <p className={`text-lg font-bold font-mono ${longTermGains >= 0 ? "text-[#00FF41]" : "text-[#ff4757]"}`}>
              {formatDollarSigned(longTermGains)}
            </p>
            <p className="text-[10px] text-white/30 mt-1">LTCG rate ({Math.round(ltcgRate * 100)}%)</p>
          </div>
        </div>

        {washSaleFlags.length > 0 && (
          <div className="glass-panel rounded-xl p-4 mb-6 border border-[#ff4757]/30 bg-[#ff4757]/5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ff4757] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[14px] text-[#ff4757]">{washSaleFlags.length} Wash Sale Violation{washSaleFlags.length !== 1 ? "s" : ""} Detected</p>
              <p className="text-[12px] text-white/50 mt-0.5">
                {formatDollar(washSaleAdjustment)} in losses are disallowed under IRS §1091. See Wash Sales tab.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {(["summary", "washsales", "quarterly"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30"
                  : "text-white/40 border border-transparent hover:text-white/60"
              }`}
            >
              {tab === "summary" ? "Year Summary" : tab === "washsales" ? `Wash Sales ${washSaleFlags.length > 0 ? `(${washSaleFlags.length})` : ""}` : "Quarterly Est."}
            </button>
          ))}
        </div>

        {activeTab === "summary" && (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
              <TrendingUp className="w-5 h-5 text-[#00FF41]" />
              <h2 className="text-base font-semibold">Realized Gains &amp; Losses</h2>
            </div>
            <div className="space-y-2 mb-8">
              {gainsWithWashSale.map((g, i) => (
                <div key={i} className={`glass-panel rounded-xl p-3 ${g.washSale ? "border border-[#ffb800]/30 bg-[#ffb800]/5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] font-mono">{g.symbol}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${g.isLongTerm ? "bg-[#00FF41]/10 text-[#00FF41]" : "bg-blue-500/10 text-blue-400"}`}>
                        {g.isLongTerm ? "LONG" : "SHORT"}
                      </span>
                      {g.washSale && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ffb800]/15 text-[#ffb800] flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> WASH SALE
                        </span>
                      )}
                    </div>
                    <span className={`font-mono font-bold text-[15px] ${g.gain >= 0 ? "text-[#00FF41]" : "text-[#ff4757]"}`}>
                      {formatDollarSigned(g.gain)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-white/40">{g.quantity} shares · {g.date}</span>
                    <span className="text-[11px] text-white/30">Proceeds {formatDollar(g.proceeds)} · Basis {formatDollar(g.costBasis)}</span>
                  </div>
                  {g.washSale && (
                    <p className="text-[10px] text-[#ffb800] mt-1">
                      ⚠ Disallowed loss: {formatDollar(g.disallowedLoss || 0)} — added to basis of replacement shares
                    </p>
                  )}
                </div>
              ))}
              {gainsWithWashSale.length === 0 && (
                <p className="text-[13px] text-white/30 text-center py-8">No closed positions for this tax year.</p>
              )}
            </div>

            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
              <BarChart2 className="w-5 h-5 text-[#00FF41]" />
              <h2 className="text-base font-semibold">Unrealized Positions</h2>
            </div>
            <div className="space-y-2 mb-8">
              {unrealizedGains.map((p, i) => (
                <div key={i} className="glass-panel rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[14px] font-mono">{p.symbol}</span>
                    <span className={`font-mono font-bold text-[15px] ${p.unrealized >= 0 ? "text-[#00FF41]" : "text-[#ff4757]"}`}>
                      {formatDollarSigned(p.unrealized)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-white/40">{p.quantity} shares · Avg cost {formatDollar(p.avgCost)}</span>
                    <span className="text-[11px] text-white/30">Market value {formatDollar(p.marketValue)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[rgba(0,255,65,0.15)] mb-6">
              <p className="text-[11px] text-white/40 mb-3 uppercase tracking-wider">Estimated Tax on Capital Gains</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/60">Short-term tax ({Math.round(marginalRate * 100)}%)</span>
                  <span className="font-mono text-[#ffb800]">{formatDollar(Math.max(0, shortTermGains) * marginalRate)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/60">Long-term tax ({Math.round(ltcgRate * 100)}%)</span>
                  <span className="font-mono text-[#ffb800]">{formatDollar(Math.max(0, longTermGains) * ltcgRate)}</span>
                </div>
                <div className="flex justify-between text-[13px] font-bold border-t border-white/10 pt-2">
                  <span className="text-white">Estimated capital gains tax</span>
                  <span className="font-mono text-[#00FF41]">{formatDollar(estimatedTaxOnGains)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "washsales" && (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
              <Shield className="w-5 h-5 text-[#ff4757]" />
              <h2 className="text-base font-semibold">Wash Sale Detection — IRS §1091</h2>
            </div>

            <div className="glass-panel rounded-xl p-4 mb-6 border border-white/[0.06]">
              <p className="text-[12px] text-white/50 leading-relaxed">
                <strong className="text-white">Wash sale rule:</strong> If you sell a security at a loss and repurchase the same or "substantially identical" security within 30 days before or after the sale, the loss is <strong className="text-[#ffb800]">disallowed</strong> for that tax year. The disallowed amount is added to the cost basis of the new shares.
              </p>
            </div>

            {washSaleFlags.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-10 h-10 mx-auto mb-3 text-[#00FF41]/40" />
                <p className="font-semibold text-white/50 mb-1">No Wash Sale Violations</p>
                <p className="text-[13px] text-white/30">All your loss trades appear to be compliant with the 30-day repurchase rule.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                {washSaleFlags.map((f, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 border-l-4 border-l-[#ff4757]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-[#ff4757]" />
                          <span className="font-bold text-[15px] font-mono">{f.sellTrade.symbol}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff4757]/15 text-[#ff4757] font-bold">WASH SALE</span>
                        </div>
                        <p className="text-[12px] text-white/50">
                          Sold at loss on {new Date(f.sellTrade.createdAt).toLocaleDateString("en-US")}
                          {" · "}Repurchased {f.daysApart} days {new Date(f.triggeringBuyDate) < new Date(f.sellTrade.createdAt) ? "before" : "after"} ({f.triggeringBuyDate})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-white/40">Disallowed Loss</p>
                        <p className="font-bold font-mono text-[#ff4757] text-[16px]">{formatDollar(f.disallowedLoss)}</p>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 mt-2 space-y-1">
                      <p className="text-[11px] text-white/40">
                        <span className="text-white/60">Sell price:</span> {formatDollar(f.sellTrade.totalCost / f.sellTrade.quantity)}/share
                        {" · "}
                        <span className="text-white/60">Cost basis:</span> {formatDollar(f.sellTrade.costBasis)}/share
                      </p>
                      <p className="text-[11px] text-[#ffb800]">
                        ⚠ The disallowed loss of {formatDollar(f.disallowedLoss)} is added to the cost basis of your replacement shares of {f.sellTrade.symbol}.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {washSaleFlags.length > 0 && (
              <div className="glass-panel rounded-xl p-4 border border-[#ffb800]/20 bg-[#ffb800]/5">
                <p className="font-bold text-[13px] mb-2">How to avoid wash sales:</p>
                <ul className="space-y-1 text-[12px] text-white/60">
                  <li>• Wait 31+ days before repurchasing the same security after a loss sale</li>
                  <li>• Buy a similar (but not "substantially identical") ETF instead</li>
                  <li>• Use tax-loss harvesting paired with a substitute holding during the 30-day window</li>
                  <li>• Consult your CPA before year-end to clean up any potential wash sale situations</li>
                </ul>
              </div>
            )}
          </>
        )}

        {activeTab === "quarterly" && (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
              <Calendar className="w-5 h-5 text-[#00FF41]" />
              <h2 className="text-base font-semibold">Quarterly Estimated Tax Payments</h2>
            </div>

            <div className="glass-panel rounded-xl p-4 mb-6 border border-white/[0.06]">
              <p className="text-[12px] text-white/50 leading-relaxed">
                Self-employed individuals and investors with capital gains must make quarterly estimated payments to avoid an underpayment penalty. The <strong className="text-white">safe harbor</strong> rule protects you if you pay at least 100% of prior year tax (110% if AGI &gt; $150K).
              </p>
            </div>

            <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(0,255,65,0.15)]">
              <p className="text-[11px] text-white/40 mb-3 uppercase tracking-wider">Tax Estimate — {taxYear}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/60">SE Tax (15.3%)</span>
                  <span className="font-mono">{formatDollar(seTax)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/60">Income Tax (federal)</span>
                  <span className="font-mono">{formatDollar(incomeTax)}</span>
                </div>
                {estimatedTaxOnGains > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-white/60">Capital Gains Tax</span>
                    <span className="font-mono">{formatDollar(estimatedTaxOnGains)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] font-bold border-t border-white/10 pt-2">
                  <span>Estimated Annual Tax</span>
                  <span className="font-mono text-[#00FF41]">{formatDollar(totalTax)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {QUARTERLY_DATES.map((q, i) => (
                <div key={i} className="glass-panel rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#00FF41]/10 border border-[#00FF41]/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-black text-[#00FF41] text-lg">{q.quarter}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px]">Due: {q.due}</p>
                    <p className="text-[11px] text-white/40">{q.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-white/40">Payment</p>
                    <p className="font-mono font-bold text-[18px] text-[#00FF41]">{formatDollar(quarterlyPayment)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel rounded-xl p-4 mb-6 border border-[#ffb800]/20">
              <p className="font-bold text-[13px] mb-3">Safe Harbor Thresholds</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/60">100% of prior year tax / quarter</span>
                  <span className="font-mono font-bold text-[#ffb800]">{formatDollar(safeHarbor100)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/60">110% of prior year tax / quarter (AGI &gt; $150K)</span>
                  <span className="font-mono font-bold text-[#ffb800]">{formatDollar(safeHarbor110)}</span>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                  <p className="text-[11px] text-white/40">
                    Your required safe harbor payment: <strong className="text-white">{formatDollar(safeHarborRequired)} / quarter</strong>
                    {grossRevenue > 150000
                      ? " (110% rule applies — AGI likely over $150K)"
                      : " (100% rule applies)"}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[#ff4757]/20 bg-[#ff4757]/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ff4757] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[13px] text-[#ff4757] mb-1">Underpayment Penalty Warning</p>
                  <p className="text-[12px] text-white/50">
                    If you pay less than the safe harbor amount in any quarter, the IRS charges an underpayment penalty (currently ~8% annualized on the shortfall). Pay the safe harbor amount by each due date to avoid this penalty even if your final tax is higher.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            onClick={exportPDF}
            className="flex-1 bg-gradient-to-r from-[#00FF41] to-[#0099cc] text-black font-bold gap-2 min-h-[44px]"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </Button>
          <Button
            onClick={exportCSV}
            variant="outline"
            className="flex-1 border-[#00FF41]/30 text-[#00FF41] gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
    </Layout>
  );
}
