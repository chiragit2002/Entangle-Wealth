import { Router } from "express";
import { db } from "@workspace/db";
import { paperTradesTable, paperPositionsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, asc, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveUserId } from "../lib/resolveUserId";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { getStockBySymbol } from "../data/nasdaq-stocks";

const router = Router();

interface TaxLot {
  tradeId: number;
  symbol: string;
  quantity: number;
  remaining: number;
  price: number;
  date: Date;
}

interface MatchedLot {
  tradeId: number;
  quantity: number;
  buyPrice: number;
  buyDate: Date;
  holdingDays: number;
  isLongTerm: boolean;
  gain: number;
}

interface RealizedEvent {
  symbol: string;
  sellDate: Date;
  sellPrice: number;
  sellQty: number;
  lots: MatchedLot[];
  totalGain: number;
  washSale: boolean;
  washSaleDisallowed: number;
}

const STATE_TAX_RATES: Record<string, { rate: number; name: string }> = {
  CA: { rate: 0.133, name: "California" },
  NY: { rate: 0.109, name: "New York" },
  NJ: { rate: 0.1075, name: "New Jersey" },
  OR: { rate: 0.099, name: "Oregon" },
  MN: { rate: 0.0985, name: "Minnesota" },
  HI: { rate: 0.11, name: "Hawaii" },
  VT: { rate: 0.0875, name: "Vermont" },
  IA: { rate: 0.085, name: "Iowa" },
  DC: { rate: 0.0895, name: "District of Columbia" },
  WI: { rate: 0.0765, name: "Wisconsin" },
  ME: { rate: 0.0715, name: "Maine" },
  SC: { rate: 0.07, name: "South Carolina" },
  CT: { rate: 0.0699, name: "Connecticut" },
  MT: { rate: 0.0675, name: "Montana" },
  NE: { rate: 0.0684, name: "Nebraska" },
  ID: { rate: 0.06, name: "Idaho" },
  NC: { rate: 0.0525, name: "North Carolina" },
  MA: { rate: 0.05, name: "Massachusetts" },
  CO: { rate: 0.044, name: "Colorado" },
  IL: { rate: 0.0495, name: "Illinois" },
  UT: { rate: 0.0485, name: "Utah" },
  GA: { rate: 0.055, name: "Georgia" },
  VA: { rate: 0.0575, name: "Virginia" },
  MD: { rate: 0.0575, name: "Maryland" },
  OH: { rate: 0.04, name: "Ohio" },
  PA: { rate: 0.0307, name: "Pennsylvania" },
  AZ: { rate: 0.025, name: "Arizona" },
  MI: { rate: 0.0425, name: "Michigan" },
  IN: { rate: 0.0323, name: "Indiana" },
  KY: { rate: 0.04, name: "Kentucky" },
  TX: { rate: 0, name: "Texas" },
  FL: { rate: 0, name: "Florida" },
  WA: { rate: 0, name: "Washington" },
  NV: { rate: 0, name: "Nevada" },
  WY: { rate: 0, name: "Wyoming" },
  SD: { rate: 0, name: "South Dakota" },
  TN: { rate: 0, name: "Tennessee" },
  NH: { rate: 0, name: "New Hampshire" },
  AK: { rate: 0, name: "Alaska" },
};

function detectStateFromLocation(location: string | null): string | null {
  if (!location) return null;
  const upper = location.toUpperCase().trim();
  for (const [code, info] of Object.entries(STATE_TAX_RATES)) {
    if (upper.includes(code) || upper.includes(info.name.toUpperCase())) {
      return code;
    }
  }
  return null;
}

async function getAllTrades(userId: string) {
  return db
    .select()
    .from(paperTradesTable)
    .where(eq(paperTradesTable.userId, userId))
    .orderBy(asc(paperTradesTable.createdAt));
}

function buildOpenLots(trades: { id: number; symbol: string; side: string; quantity: number; price: number; createdAt: Date | null }[], method: "FIFO" | "LIFO"): Map<string, TaxLot[]> {
  const lots = new Map<string, TaxLot[]>();

  for (const t of trades) {
    if (t.side === "buy") {
      const existing = lots.get(t.symbol) || [];
      existing.push({
        tradeId: t.id,
        symbol: t.symbol,
        quantity: t.quantity,
        remaining: t.quantity,
        price: t.price,
        date: t.createdAt || new Date(),
      });
      lots.set(t.symbol, existing);
    } else if (t.side === "sell") {
      const symbolLots = lots.get(t.symbol);
      if (!symbolLots) continue;
      let remaining = t.quantity;
      const sorted = method === "FIFO"
        ? symbolLots.sort((a, b) => a.date.getTime() - b.date.getTime())
        : symbolLots.sort((a, b) => b.date.getTime() - a.date.getTime());
      for (const lot of sorted) {
        if (remaining <= 0) break;
        if (lot.remaining <= 0) continue;
        const qty = Math.min(remaining, lot.remaining);
        lot.remaining -= qty;
        remaining -= qty;
      }
    }
  }
  return lots;
}

function matchSellToLots(lots: TaxLot[], sellQty: number, sellDate: Date, sellPrice: number, method: "FIFO" | "LIFO"): MatchedLot[] {
  const matched: MatchedLot[] = [];
  let remaining = sellQty;

  const sortedLots = method === "FIFO"
    ? [...lots].sort((a, b) => a.date.getTime() - b.date.getTime())
    : [...lots].sort((a, b) => b.date.getTime() - a.date.getTime());

  for (const lot of sortedLots) {
    if (remaining <= 0) break;
    if (lot.remaining <= 0) continue;

    const qty = Math.min(remaining, lot.remaining);
    const holdingDays = Math.floor((sellDate.getTime() - lot.date.getTime()) / (1000 * 60 * 60 * 24));
    const isLongTerm = holdingDays >= 365;
    const gain = (sellPrice - lot.price) * qty;

    matched.push({
      tradeId: lot.tradeId,
      quantity: qty,
      buyPrice: lot.price,
      buyDate: lot.date,
      holdingDays,
      isLongTerm,
      gain,
    });

    lot.remaining -= qty;
    remaining -= qty;
  }

  return matched;
}

function computeRealizedEvents(trades: { id: number; symbol: string; side: string; quantity: number; price: number; createdAt: Date | null }[], method: "FIFO" | "LIFO"): RealizedEvent[] {
  const lots = new Map<string, TaxLot[]>();
  const events: RealizedEvent[] = [];

  for (const t of trades) {
    if (t.side === "buy") {
      const existing = lots.get(t.symbol) || [];
      existing.push({
        tradeId: t.id,
        symbol: t.symbol,
        quantity: t.quantity,
        remaining: t.quantity,
        price: t.price,
        date: t.createdAt || new Date(),
      });
      lots.set(t.symbol, existing);
    } else if (t.side === "sell") {
      const symbolLots = lots.get(t.symbol);
      if (!symbolLots) continue;

      const sellDate = t.createdAt || new Date();
      const matched = matchSellToLots(symbolLots, t.quantity, sellDate, t.price, method);
      const totalGain = matched.reduce((sum, m) => sum + m.gain, 0);

      let washSale = false;
      let washSaleDisallowed = 0;

      if (totalGain < 0) {
        const sellTime = sellDate.getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const adjacentBuy = trades.find(tr =>
          tr.side === "buy" &&
          tr.symbol === t.symbol &&
          tr.createdAt &&
          Math.abs(tr.createdAt.getTime() - sellTime) <= thirtyDays &&
          tr.createdAt.getTime() !== sellTime
        );
        if (adjacentBuy) {
          washSale = true;
          washSaleDisallowed = Math.abs(totalGain);
        }
      }

      events.push({
        symbol: t.symbol,
        sellDate,
        sellPrice: t.price,
        sellQty: t.quantity,
        lots: matched,
        totalGain,
        washSale,
        washSaleDisallowed,
      });
    }
  }

  return events;
}

router.get("/taxflow/impact", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ error: "User not found" });
      return;
    }

    const { symbol, side, qty, price, bracket, state, method } = req.query;
    const sym = (symbol as string || "").toUpperCase();
    const tradeSide = (side as string || "buy").toLowerCase();
    const tradeQty = parseInt(qty as string) || 0;
    const tradePrice = parseFloat(price as string) || 0;
    const taxBracket = parseFloat(bracket as string) || 0.24;
    const stateCode = (state as string || "").toUpperCase();
    const lotMethod = ((method as string) || "FIFO").toUpperCase() as "FIFO" | "LIFO";

    const trades = await getAllTrades(dbUserId);
    const totalValue = tradeQty * tradePrice;

    if (tradeSide === "buy") {
      const hypothetical5 = totalValue * 0.05;
      const hypothetical20 = totalValue * 0.20;
      const stTax5 = hypothetical5 * taxBracket;
      const ltTax5 = hypothetical5 * 0.15;
      const stTax20 = hypothetical20 * taxBracket;
      const ltTax20 = hypothetical20 * 0.15;

      const stateRate = STATE_TAX_RATES[stateCode]?.rate || 0;

      res.json({
        side: "buy",
        symbol: sym,
        qty: tradeQty,
        price: tradePrice,
        costBasis: totalValue,
        scenarios: {
          plus5: {
            gain: hypothetical5,
            stTax: stTax5,
            ltTax: ltTax5,
            savings: stTax5 - ltTax5,
          },
          plus20: {
            gain: hypothetical20,
            stTax: stTax20,
            ltTax: ltTax20,
            savings: stTax20 - ltTax20,
          },
        },
        stateTax: stateRate > 0 ? { code: stateCode, rate: stateRate, name: STATE_TAX_RATES[stateCode].name } : null,
        bracket: taxBracket,
      });
    } else {
      const lots = buildOpenLots(trades, lotMethod);
      const symbolLots = lots.get(sym) || [];
      const now = new Date();
      const matched = matchSellToLots(symbolLots, tradeQty, now, tradePrice, lotMethod);
      const matchedQty = matched.reduce((sum, m) => sum + m.quantity, 0);
      const totalGain = matched.reduce((sum, m) => sum + m.gain, 0);
      const isGain = totalGain >= 0;

      const weightedHoldingDays = matched.length > 0
        ? Math.round(matched.reduce((sum, m) => sum + m.holdingDays * m.quantity, 0) / matched.reduce((sum, m) => sum + m.quantity, 0))
        : 0;
      const isLongTerm = weightedHoldingDays >= 365;
      const daysToLongTerm = isLongTerm ? 0 : 365 - weightedHoldingDays;

      const stTax = Math.max(0, totalGain * taxBracket);
      const ltTax = Math.max(0, totalGain * 0.15);
      const niit = Math.max(0, totalGain * 0.038);
      const stateRate = STATE_TAX_RATES[stateCode]?.rate || 0;
      const stateTax = Math.max(0, totalGain * stateRate);

      const events = computeRealizedEvents(trades, lotMethod);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const ytdEvents = events.filter(e => e.sellDate >= yearStart);
      const ytdGains = ytdEvents.reduce((sum, e) => sum + e.totalGain, 0);

      let washSale = false;
      if (totalGain < 0) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const recentBuy = trades.find(t =>
          t.side === "buy" &&
          t.symbol === sym &&
          t.createdAt &&
          Math.abs(now.getTime() - t.createdAt.getTime()) < thirtyDays
        );
        if (recentBuy) washSale = true;
      }

      res.json({
        side: "sell",
        symbol: sym,
        qty: tradeQty,
        price: tradePrice,
        proceeds: totalValue,
        insufficientLots: matchedQty < tradeQty,
        matchedQty,
        lots: matched.map(m => ({
          buyDate: m.buyDate.toISOString(),
          buyPrice: m.buyPrice,
          quantity: m.quantity,
          holdingDays: m.holdingDays,
          isLongTerm: m.isLongTerm,
          gain: m.gain,
        })),
        totalGain,
        isGain,
        holdingDays: weightedHoldingDays,
        isLongTerm,
        daysToLongTerm,
        classification: isLongTerm ? "LONG-TERM CAPITAL GAIN" : "SHORT-TERM CAPITAL GAIN",
        stTax,
        ltTax,
        niit,
        stateTax: stateRate > 0 ? { code: stateCode, rate: stateRate, name: STATE_TAX_RATES[stateCode].name, amount: stateTax } : null,
        netAfterST: totalValue - stTax - niit - stateTax,
        netAfterLT: totalValue - ltTax - niit - stateTax,
        savings: stTax - ltTax,
        ytdRealizedGains: ytdGains,
        ytdEstTaxBill: Math.max(0, ytdGains * taxBracket),
        washSale,
        washSaleDisallowed: washSale ? Math.abs(totalGain) : 0,
        bracket: taxBracket,
        method: lotMethod,
      });
    }
  } catch (err) {
    logger.error({ err }, "TaxFlow impact error");
    res.status(500).json({ error: "Failed to compute tax impact" });
  }
});

router.get("/taxflow/summary", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ error: "User not found" });
      return;
    }

    const bracket = parseFloat(req.query.bracket as string) || 0.24;
    const stateCode = ((req.query.state as string) || "").toUpperCase();
    const method = ((req.query.method as string) || "FIFO").toUpperCase() as "FIFO" | "LIFO";

    const trades = await getAllTrades(dbUserId);
    const events = computeRealizedEvents(trades, method);

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdEvents = events.filter(e => e.sellDate >= yearStart);

    const stGains = ytdEvents.reduce((sum, e) =>
      sum + e.lots.filter(l => !l.isLongTerm).reduce((s, l) => s + l.gain, 0), 0);
    const ltGains = ytdEvents.reduce((sum, e) =>
      sum + e.lots.filter(l => l.isLongTerm).reduce((s, l) => s + l.gain, 0), 0);
    const totalGains = stGains + ltGains;
    const washSaleAdj = ytdEvents.reduce((sum, e) => sum + e.washSaleDisallowed, 0);

    const stTax = Math.max(0, stGains * bracket);
    const ltTax = Math.max(0, ltGains * 0.15);
    const niit = Math.max(0, totalGains * 0.038);
    const stateRate = STATE_TAX_RATES[stateCode]?.rate || 0;
    const stateTax = Math.max(0, totalGains * stateRate);

    const totalTrades = ytdEvents.length;
    const winners = ytdEvents.filter(e => e.totalGain > 0).length;
    const losers = ytdEvents.filter(e => e.totalGain < 0).length;

    res.json({
      year: now.getFullYear(),
      totalTrades,
      winners,
      losers,
      shortTermGains: stGains,
      longTermGains: ltGains,
      totalRealizedGains: totalGains,
      washSaleAdjustments: washSaleAdj,
      estimatedTax: {
        federal: {
          shortTerm: stTax,
          longTerm: ltTax,
          niit,
          total: stTax + ltTax + niit,
        },
        state: stateRate > 0 ? {
          code: stateCode,
          name: STATE_TAX_RATES[stateCode].name,
          rate: stateRate,
          amount: stateTax,
        } : null,
        combined: stTax + ltTax + niit + stateTax,
      },
      bracket,
      method,
      events: ytdEvents.map(e => ({
        symbol: e.symbol,
        sellDate: e.sellDate.toISOString(),
        sellPrice: e.sellPrice,
        sellQty: e.sellQty,
        totalGain: e.totalGain,
        washSale: e.washSale,
        lots: e.lots.map(l => ({
          buyDate: l.buyDate.toISOString(),
          buyPrice: l.buyPrice,
          quantity: l.quantity,
          holdingDays: l.holdingDays,
          isLongTerm: l.isLongTerm,
          gain: l.gain,
        })),
      })),
    });
  } catch (err) {
    logger.error({ err }, "TaxFlow summary error");
    res.status(500).json({ error: "Failed to compute tax summary" });
  }
});

router.get("/taxflow/projection", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ error: "User not found" });
      return;
    }

    const bracket = parseFloat(req.query.bracket as string) || 0.24;
    const stateCode = ((req.query.state as string) || "").toUpperCase();
    const method = ((req.query.method as string) || "FIFO").toUpperCase() as "FIFO" | "LIFO";

    const trades = await getAllTrades(dbUserId);
    const events = computeRealizedEvents(trades, method);

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdEvents = events.filter(e => e.sellDate >= yearStart);
    const ytdGains = ytdEvents.reduce((sum, e) => sum + e.totalGain, 0);

    const dayOfYear = Math.floor((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysInYear = 365;
    const projectedGains = (ytdGains / dayOfYear) * daysInYear;

    const stateRate = STATE_TAX_RATES[stateCode]?.rate || 0;
    const projectedFederalTax = Math.max(0, projectedGains * bracket);
    const projectedNIIT = Math.max(0, projectedGains * 0.038);
    const projectedStateTax = Math.max(0, projectedGains * stateRate);
    const projectedTotal = projectedFederalTax + projectedNIIT + projectedStateTax;

    const q1Due = projectedTotal * 0.25;
    const q2Due = projectedTotal * 0.25;
    const q3Due = projectedTotal * 0.25;
    const q4Due = projectedTotal * 0.25;

    res.json({
      year: now.getFullYear(),
      dayOfYear,
      ytdRealizedGains: ytdGains,
      projectedAnnualGains: projectedGains,
      tradingPace: {
        tradesPerDay: ytdEvents.length / dayOfYear,
        avgGainPerTrade: ytdEvents.length > 0 ? ytdGains / ytdEvents.length : 0,
      },
      projectedTax: {
        federal: projectedFederalTax,
        niit: projectedNIIT,
        state: stateRate > 0 ? { code: stateCode, amount: projectedStateTax } : null,
        total: projectedTotal,
      },
      quarterlyPayments: {
        Q1: { due: "Apr 15", amount: q1Due },
        Q2: { due: "Jun 15", amount: q2Due },
        Q3: { due: "Sep 15", amount: q3Due },
        Q4: { due: "Jan 15 (next year)", amount: q4Due },
      },
      bracket,
    });
  } catch (err) {
    logger.error({ err }, "TaxFlow projection error");
    res.status(500).json({ error: "Failed to compute tax projection" });
  }
});

router.get("/taxflow/optimize/:symbol", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ error: "User not found" });
      return;
    }

    const sym = (req.params.symbol as string).toUpperCase();
    const bracket = parseFloat(req.query.bracket as string) || 0.24;
    const method = ((req.query.method as string) || "FIFO").toUpperCase() as "FIFO" | "LIFO";

    const trades = await getAllTrades(dbUserId);
    const lots = buildOpenLots(trades, method);
    const symbolLots = (lots.get(sym) || []).filter(l => l.remaining > 0);

    if (symbolLots.length === 0) {
      res.json({ symbol: sym, message: "No open lots found", lots: [], recommendations: [] });
      return;
    }

    const stockData = getStockBySymbol(sym);
    const currentPrice = stockData?.price || 0;
    const now = new Date();

    const lotAnalysis = symbolLots.map(lot => {
      const holdingDays = Math.floor((now.getTime() - lot.date.getTime()) / (1000 * 60 * 60 * 24));
      const isLongTerm = holdingDays >= 365;
      const daysToLT = isLongTerm ? 0 : 365 - holdingDays;
      const unrealizedGain = (currentPrice - lot.price) * lot.remaining;
      const stTax = Math.max(0, unrealizedGain * bracket);
      const ltTax = Math.max(0, unrealizedGain * 0.15);
      const taxSavings = stTax - ltTax;

      return {
        tradeId: lot.tradeId,
        buyDate: lot.date.toISOString(),
        buyPrice: lot.price,
        remaining: lot.remaining,
        holdingDays,
        isLongTerm,
        daysToLongTerm: daysToLT,
        currentPrice,
        unrealizedGain,
        stTax,
        ltTax,
        taxSavings,
      };
    });

    const recommendations: string[] = [];
    const nearLT = lotAnalysis.filter(l => l.daysToLongTerm > 0 && l.daysToLongTerm <= 60 && l.unrealizedGain > 0);
    if (nearLT.length > 0) {
      recommendations.push(`${nearLT.length} lot(s) within 60 days of long-term status — holding saves $${nearLT.reduce((s, l) => s + l.taxSavings, 0).toFixed(2)} in taxes`);
    }

    const losers = lotAnalysis.filter(l => l.unrealizedGain < 0);
    if (losers.length > 0) {
      const totalLoss = losers.reduce((s, l) => s + Math.abs(l.unrealizedGain), 0);
      recommendations.push(`${losers.length} lot(s) with unrealized losses totaling $${totalLoss.toFixed(2)} — consider harvesting`);
    }

    const ltGainers = lotAnalysis.filter(l => l.isLongTerm && l.unrealizedGain > 0);
    if (ltGainers.length > 0) {
      recommendations.push(`${ltGainers.length} lot(s) qualify for long-term rates (15-20%) — favorable to sell now`);
    }

    res.json({
      symbol: sym,
      currentPrice,
      lots: lotAnalysis,
      recommendations,
      totalUnrealized: lotAnalysis.reduce((s, l) => s + l.unrealizedGain, 0),
      totalTaxIfSoldNow: {
        shortTerm: lotAnalysis.reduce((s, l) => s + l.stTax, 0),
        longTerm: lotAnalysis.reduce((s, l) => s + l.ltTax, 0),
        savings: lotAnalysis.reduce((s, l) => s + l.taxSavings, 0),
      },
    });
  } catch (err) {
    logger.error({ err }, "TaxFlow optimize error");
    res.status(500).json({ error: "Failed to compute tax optimization" });
  }
});

router.get("/taxflow/harvest", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ error: "User not found" });
      return;
    }

    const bracket = parseFloat(req.query.bracket as string) || 0.24;
    const method = ((req.query.method as string) || "FIFO").toUpperCase() as "FIFO" | "LIFO";

    const trades = await getAllTrades(dbUserId);
    const lots = buildOpenLots(trades, method);
    const now = new Date();

    const opportunities: {
      symbol: string;
      totalUnrealizedLoss: number;
      lotCount: number;
      potentialTaxSavings: number;
      lots: { buyDate: string; buyPrice: number; remaining: number; currentPrice: number; loss: number; holdingDays: number }[];
    }[] = [];

    const events = computeRealizedEvents(trades, method);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdEvents = events.filter(e => e.sellDate >= yearStart);
    const ytdGains = ytdEvents.reduce((sum, e) => sum + e.totalGain, 0);

    for (const [symbol, symbolLots] of lots) {
      const activeLots = symbolLots.filter(l => l.remaining > 0);
      if (activeLots.length === 0) continue;

      const stockData = getStockBySymbol(symbol);
      if (!stockData) continue;
      const currentPrice = stockData.price;

      const losingLots = activeLots.filter(l => currentPrice < l.price);
      if (losingLots.length === 0) continue;

      const totalLoss = losingLots.reduce((sum, l) => sum + (currentPrice - l.price) * l.remaining, 0);
      const taxSavings = Math.abs(totalLoss) * bracket;

      opportunities.push({
        symbol,
        totalUnrealizedLoss: totalLoss,
        lotCount: losingLots.length,
        potentialTaxSavings: taxSavings,
        lots: losingLots.map(l => ({
          buyDate: l.date.toISOString(),
          buyPrice: l.price,
          remaining: l.remaining,
          currentPrice,
          loss: (currentPrice - l.price) * l.remaining,
          holdingDays: Math.floor((now.getTime() - l.date.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      });
    }

    opportunities.sort((a, b) => a.totalUnrealizedLoss - b.totalUnrealizedLoss);

    res.json({
      ytdRealizedGains: ytdGains,
      opportunities,
      totalHarvestable: opportunities.reduce((s, o) => s + Math.abs(o.totalUnrealizedLoss), 0),
      totalPotentialSavings: opportunities.reduce((s, o) => s + o.potentialTaxSavings, 0),
      maxAnnualDeduction: 3000,
      bracket,
    });
  } catch (err) {
    logger.error({ err }, "TaxFlow harvest error");
    res.status(500).json({ error: "Failed to compute harvest opportunities" });
  }
});

router.get("/taxflow/export", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    const bracket = parseFloat(req.query.bracket as string) || 0.24;
    const method = ((req.query.method as string) || "FIFO").toUpperCase() as "FIFO" | "LIFO";

    const trades = await getAllTrades(dbUserId);
    const events = computeRealizedEvents(trades, method);

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const ytdEvents = events.filter(e => e.sellDate >= yearStart);

    const lines: string[] = [];
    lines.push("Symbol,Sell Date,Sell Price,Sell Qty,Buy Date,Buy Price,Buy Qty,Holding Days,Classification,Gain/Loss,Wash Sale,Wash Sale Disallowed");

    for (const event of ytdEvents) {
      for (const lot of event.lots) {
        lines.push([
          event.symbol,
          event.sellDate.toISOString().split("T")[0],
          event.sellPrice.toFixed(2),
          event.sellQty,
          lot.buyDate.toISOString().split("T")[0],
          lot.buyPrice.toFixed(2),
          lot.quantity,
          lot.holdingDays,
          lot.isLongTerm ? "Long-Term" : "Short-Term",
          lot.gain.toFixed(2),
          event.washSale ? "YES" : "NO",
          event.washSaleDisallowed.toFixed(2),
        ].join(","));
      }
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tax-report-${now.getFullYear()}.csv"`);
    res.send(lines.join("\n"));
  } catch (err) {
    logger.error({ err }, "TaxFlow export error");
    res.status(500).json({ error: "Failed to export tax report" });
  }
});

router.get("/taxflow/wash-check/:symbol", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ error: "User not found" });
      return;
    }

    const sym = (req.params.symbol as string).toUpperCase();
    const trades = await getAllTrades(dbUserId);
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const recentSells = trades.filter(t =>
      t.side === "sell" &&
      t.symbol === sym &&
      t.createdAt &&
      now.getTime() - t.createdAt.getTime() < thirtyDays
    );

    const recentBuys = trades.filter(t =>
      t.side === "buy" &&
      t.symbol === sym &&
      t.createdAt &&
      now.getTime() - t.createdAt.getTime() < thirtyDays
    );

    const washSaleRisk = recentSells.length > 0 && recentBuys.some(b => {
      return recentSells.some(s =>
        s.createdAt && b.createdAt &&
        Math.abs(b.createdAt.getTime() - s.createdAt.getTime()) <= thirtyDays
      );
    });

    res.json({
      symbol: sym,
      washSaleRisk,
      recentSells: recentSells.length,
      recentBuys: recentBuys.length,
      windowDays: 30,
    });
  } catch (err) {
    logger.error({ err }, "TaxFlow wash check error");
    res.status(500).json({ error: "Failed to check wash sale" });
  }
});

export default router;
