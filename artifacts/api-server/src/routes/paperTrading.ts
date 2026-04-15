import { Router } from "express";
import { db } from "@workspace/db";
import { paperPortfoliosTable, paperTradesTable, paperPositionsTable, paperOptionsTradesTable, paperOptionsPositionsTable, dailySpinsTable, userXpTable, xpTransactionsTable, streaksTable, usersTable, balanceTransactionsTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveUserId } from "../lib/resolveUserId";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { validateBody, z } from "../lib/validateRequest";
import { getLivePrice, getLivePrices } from "../lib/priceService";
import type { InferSelectModel } from "drizzle-orm";

type DbPosition = InferSelectModel<typeof paperPositionsTable>;

interface PositionWithLiveData extends DbPosition {
  currentPrice?: number;
  unrealizedPnl?: number;
}

const router = Router();

const DEFAULT_STARTING_CASH = 100_000;

function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

async function ensurePortfolio(userId: string) {
  const [existing] = await db
    .select()
    .from(paperPortfoliosTable)
    .where(eq(paperPortfoliosTable.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(paperPortfoliosTable)
    .values({ userId, cashBalance: DEFAULT_STARTING_CASH })
    .returning();
  return created;
}

async function getPositions(userId: string) {
  return db
    .select()
    .from(paperPositionsTable)
    .where(and(eq(paperPositionsTable.userId, userId)));
}

router.get("/paper-trading/portfolio", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ cashBalance: DEFAULT_STARTING_CASH, positions: [], trades: [], portfolioValue: 0, totalValue: DEFAULT_STARTING_CASH, startingCash: DEFAULT_STARTING_CASH, marketDataAvailable: false });
      return;
    }

    const portfolio = await ensurePortfolio(dbUserId);
    const positions = await getPositions(dbUserId);
    const trades = await db
      .select()
      .from(paperTradesTable)
      .where(eq(paperTradesTable.userId, dbUserId))
      .orderBy(desc(paperTradesTable.createdAt))
      .limit(50);

    const activePositions = positions.filter(p => p.quantity > 0);

    const optionsPositions = await db
      .select()
      .from(paperOptionsPositionsTable)
      .where(eq(paperOptionsPositionsTable.userId, dbUserId));
    const activeOptionsPositions = optionsPositions.filter(p => p.contracts > 0);

    const optionsTrades = await db
      .select()
      .from(paperOptionsTradesTable)
      .where(eq(paperOptionsTradesTable.userId, dbUserId))
      .orderBy(desc(paperOptionsTradesTable.createdAt))
      .limit(20);

    let portfolioValue: number | null = null;
    let marketDataAvailable = true;
    let positionsWithLivePrice: PositionWithLiveData[] = [...activePositions];

    if (activePositions.length > 0) {
      const symbols = activePositions.map(p => p.symbol);
      const livePrices = await getLivePrices(symbols);

      if (Object.keys(livePrices).length === 0 && symbols.length > 0) {
        marketDataAvailable = false;
      } else {
        portfolioValue = 0;
        positionsWithLivePrice = activePositions.map(pos => {
          const lp = livePrices[pos.symbol];
          if (lp) {
            portfolioValue = (portfolioValue ?? 0) + pos.quantity * lp;
            return { ...pos, currentPrice: lp, unrealizedPnl: pos.quantity * (lp - pos.avgCost) };
          }
          portfolioValue = (portfolioValue ?? 0) + pos.quantity * pos.avgCost;
          return pos;
        });
      }
    } else {
      portfolioValue = 0;
    }

    const optionsValue = activeOptionsPositions.reduce((sum, p) => sum + p.contracts * p.avgPremium * 100, 0);

    res.json({
      cashBalance: portfolio.cashBalance,
      positions: positionsWithLivePrice,
      trades,
      portfolioValue: portfolioValue !== null ? portfolioValue + optionsValue : null,
      totalValue: portfolioValue !== null ? portfolio.cashBalance + portfolioValue + optionsValue : null,
      startingCash: DEFAULT_STARTING_CASH,
      optionsPositions: activeOptionsPositions,
      optionsTrades,
      marketDataAvailable,
    });
  } catch (err) {
    logger.error({ err }, "Paper trading portfolio error");
    res.status(500).json({ error: "Failed to load portfolio" });
  }
});

const TradeSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]{1,10}$/, "Symbol must be 1-10 letters"),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive().max(1_000_000),
});

router.post("/paper-trading/trade", requireAuth, validateBody(TradeSchema), async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found. Please complete onboarding first." });
      return;
    }

    const { symbol, side, quantity } = req.body;
    const qty = Math.floor(Number(quantity));
    const upperSymbol = symbol.toUpperCase();

    const px = await getLivePrice(upperSymbol);
    if (!px || px <= 0) {
      res.status(503).json({
        error: `Market data temporarily unavailable — trading paused for ${upperSymbol}. Please try again shortly.`,
        marketDataUnavailable: true,
      });
      return;
    }

    const totalCost = qty * px;

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

      const lockedRows = await tx.execute<{ id: number; cash_balance: number; user_id: string }>(
        sql`SELECT id, cash_balance, user_id FROM paper_portfolios WHERE user_id = ${dbUserId} FOR UPDATE`
      );
      const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows as { rows: { id: number; cash_balance: number; user_id: string }[] }).rows ?? [];
      const lockedPortfolio = rows[0] ?? null;

      let currentCash: number;
      if (lockedPortfolio) {
        currentCash = Number(lockedPortfolio.cash_balance);
      } else {
        const [created] = await tx
          .insert(paperPortfoliosTable)
          .values({ userId: dbUserId, cashBalance: DEFAULT_STARTING_CASH })
          .returning();
        currentCash = created.cashBalance;
      }

      if (side === "buy") {
        if (currentCash < totalCost) {
          return { error: "> INSUFFICIENT FUNDS — ORDER REJECTED" };
        }

        const newCash = currentCash - totalCost;
        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance - ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'trade_buy',
          amount: -totalCost,
          balanceBefore: currentCash,
          balanceAfter: newCash,
          source: 'trade',
          referenceId: `buy_${upperSymbol}_${qty}_@${px.toFixed(2)}`,
        });

        const [existingPos] = await tx
          .select()
          .from(paperPositionsTable)
          .where(and(eq(paperPositionsTable.userId, dbUserId), eq(paperPositionsTable.symbol, upperSymbol)));

        if (existingPos) {
          const newQty = existingPos.quantity + qty;
          const newAvgCost = ((existingPos.quantity * existingPos.avgCost) + totalCost) / newQty;
          await tx
            .update(paperPositionsTable)
            .set({ quantity: newQty, avgCost: newAvgCost, updatedAt: new Date() })
            .where(eq(paperPositionsTable.id, existingPos.id));
        } else {
          await tx
            .insert(paperPositionsTable)
            .values({ userId: dbUserId, symbol: upperSymbol, quantity: qty, avgCost: px });
        }
      } else {
        const [existingPos] = await tx
          .select()
          .from(paperPositionsTable)
          .where(and(eq(paperPositionsTable.userId, dbUserId), eq(paperPositionsTable.symbol, upperSymbol)));

        if (!existingPos || existingPos.quantity < qty) {
          return { error: `> INSUFFICIENT SHARES — ORDER REJECTED` };
        }

        const newCash = currentCash + totalCost;
        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'trade_sell',
          amount: totalCost,
          balanceBefore: currentCash,
          balanceAfter: newCash,
          source: 'trade',
          referenceId: `sell_${upperSymbol}_${qty}_@${px.toFixed(2)}`,
        });

        const newQty = existingPos.quantity - qty;
        if (newQty === 0) {
          await tx.delete(paperPositionsTable).where(eq(paperPositionsTable.id, existingPos.id));
        } else {
          await tx
            .update(paperPositionsTable)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(paperPositionsTable.id, existingPos.id));
        }
      }

      await tx.insert(paperTradesTable).values({
        userId: dbUserId,
        symbol: upperSymbol,
        side,
        quantity: qty,
        price: px,
        totalCost,
      });

      return { success: true, message: `${side.toUpperCase()} ${qty} ${upperSymbol} @ $${px.toFixed(2)}` };
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Paper trading error");
    res.status(500).json({ error: "Trade execution failed" });
  }
});

router.post("/paper-trading/reset", requireAuth, validateBody(z.object({}).strict()), async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId} || '_paper_trade'))`);

      const [portfolio] = await tx
        .select({ cashBalance: paperPortfoliosTable.cashBalance })
        .from(paperPortfoliosTable)
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      const balanceBefore = portfolio?.cashBalance ?? DEFAULT_STARTING_CASH;

      await tx.delete(paperTradesTable).where(eq(paperTradesTable.userId, dbUserId));
      await tx.delete(paperPositionsTable).where(eq(paperPositionsTable.userId, dbUserId));
      await tx.delete(paperOptionsTradesTable).where(eq(paperOptionsTradesTable.userId, dbUserId));
      await tx.delete(paperOptionsPositionsTable).where(eq(paperOptionsPositionsTable.userId, dbUserId));
      await tx
        .update(paperPortfoliosTable)
        .set({ cashBalance: DEFAULT_STARTING_CASH, updatedAt: new Date() })
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      await tx.insert(balanceTransactionsTable).values({
        userId: dbUserId,
        transactionType: 'portfolio_reset',
        amount: DEFAULT_STARTING_CASH - balanceBefore,
        balanceBefore,
        balanceAfter: DEFAULT_STARTING_CASH,
        source: 'reset',
        referenceId: `reset_${Date.now()}`,
      });
    });

    const formattedBalance = DEFAULT_STARTING_CASH.toLocaleString("en-US");
    res.json({ success: true, message: `Portfolio reset to $${formattedBalance}` });
  } catch (err) {
    logger.error({ err }, "Paper trading reset error");
    res.status(500).json({ error: "Failed to reset portfolio" });
  }
});

const OptionsTradeSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]{1,10}$/, "Symbol must be 1-10 letters"),
  optionType: z.enum(["CALL", "PUT"]),
  strike: z.number().positive().max(100_000),
  expiration: z.string().min(1).max(20),
  side: z.enum(["buy", "sell"]),
  contracts: z.number().int().positive().max(10_000),
  premium: z.number().positive().max(100_000),
});

router.post("/paper-trading/options-trade", requireAuth, validateBody(OptionsTradeSchema), async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found. Please complete onboarding first." });
      return;
    }

    const { symbol, optionType, strike, expiration, side, contracts } = req.body;
    const upperSymbol = symbol.toUpperCase();

    const underlyingPrice = await getLivePrice(upperSymbol);
    if (!underlyingPrice || underlyingPrice <= 0) {
      res.status(503).json({
        error: `Market data temporarily unavailable — trading paused for ${upperSymbol}. Please try again shortly.`,
        marketDataUnavailable: true,
      });
      return;
    }

    const premium = Math.max(0.01, Math.abs(underlyingPrice - strike) * 0.05 + underlyingPrice * 0.005);
    const totalCost = contracts * premium * 100;

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

      const lockedRows = await tx.execute<{ id: number; cash_balance: number; user_id: string }>(
        sql`SELECT id, cash_balance, user_id FROM paper_portfolios WHERE user_id = ${dbUserId} FOR UPDATE`
      );
      const rows = Array.isArray(lockedRows) ? lockedRows : (lockedRows as { rows: { id: number; cash_balance: number; user_id: string }[] }).rows ?? [];
      const lockedPortfolio = rows[0] ?? null;

      let currentCash: number;
      if (lockedPortfolio) {
        currentCash = Number(lockedPortfolio.cash_balance);
      } else {
        const [created] = await tx
          .insert(paperPortfoliosTable)
          .values({ userId: dbUserId, cashBalance: DEFAULT_STARTING_CASH })
          .returning();
        currentCash = created.cashBalance;
      }

      if (side === "buy") {
        if (currentCash < totalCost) {
          return { error: "> INSUFFICIENT FUNDS — ORDER REJECTED" };
        }

        const newCash = currentCash - totalCost;
        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance - ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'options_buy',
          amount: -totalCost,
          balanceBefore: currentCash,
          balanceAfter: newCash,
          source: 'options_trade',
          referenceId: `buy_${upperSymbol}_${strike}_${optionType}_${contracts}contracts`,
        });

        const [existingPos] = await tx
          .select()
          .from(paperOptionsPositionsTable)
          .where(and(
            eq(paperOptionsPositionsTable.userId, dbUserId),
            eq(paperOptionsPositionsTable.symbol, upperSymbol),
            eq(paperOptionsPositionsTable.optionType, optionType),
            eq(paperOptionsPositionsTable.strike, strike),
            eq(paperOptionsPositionsTable.expiration, expiration)
          ));

        if (existingPos) {
          const newContracts = existingPos.contracts + contracts;
          const newAvgPremium = ((existingPos.contracts * existingPos.avgPremium) + (contracts * premium)) / newContracts;
          await tx
            .update(paperOptionsPositionsTable)
            .set({ contracts: newContracts, avgPremium: newAvgPremium, updatedAt: new Date() })
            .where(eq(paperOptionsPositionsTable.id, existingPos.id));
        } else {
          await tx
            .insert(paperOptionsPositionsTable)
            .values({ userId: dbUserId, symbol: upperSymbol, optionType, strike, expiration, contracts, avgPremium: premium });
        }
      } else {
        const [existingPos] = await tx
          .select()
          .from(paperOptionsPositionsTable)
          .where(and(
            eq(paperOptionsPositionsTable.userId, dbUserId),
            eq(paperOptionsPositionsTable.symbol, upperSymbol),
            eq(paperOptionsPositionsTable.optionType, optionType),
            eq(paperOptionsPositionsTable.strike, strike),
            eq(paperOptionsPositionsTable.expiration, expiration)
          ));

        if (!existingPos || existingPos.contracts < contracts) {
          return { error: "> INSUFFICIENT CONTRACTS — ORDER REJECTED" };
        }

        const newCash = currentCash + totalCost;
        await tx.execute(
          sql`UPDATE paper_portfolios SET cash_balance = cash_balance + ${totalCost}, updated_at = NOW() WHERE user_id = ${dbUserId}`
        );

        await tx.insert(balanceTransactionsTable).values({
          userId: dbUserId,
          transactionType: 'options_sell',
          amount: totalCost,
          balanceBefore: currentCash,
          balanceAfter: newCash,
          source: 'options_trade',
          referenceId: `sell_${upperSymbol}_${strike}_${optionType}_${contracts}contracts`,
        });

        const newContracts = existingPos.contracts - contracts;
        await tx
          .update(paperOptionsPositionsTable)
          .set({ contracts: newContracts, updatedAt: new Date() })
          .where(eq(paperOptionsPositionsTable.id, existingPos.id));
      }

      await tx.insert(paperOptionsTradesTable).values({
        userId: dbUserId,
        symbol: upperSymbol,
        optionType,
        strike,
        expiration,
        side,
        contracts,
        premium,
        totalCost,
      });

      return { success: true, message: `${side.toUpperCase()} ${contracts} ${upperSymbol} $${strike} ${optionType} @ $${premium.toFixed(2)}` };
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Options trade error");
    res.status(500).json({ error: "Options trade execution failed" });
  }
});

router.get("/paper-trading/options-positions", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ positions: [], trades: [] });
      return;
    }

    const positions = await db
      .select()
      .from(paperOptionsPositionsTable)
      .where(eq(paperOptionsPositionsTable.userId, dbUserId));

    const trades = await db
      .select()
      .from(paperOptionsTradesTable)
      .where(eq(paperOptionsTradesTable.userId, dbUserId))
      .orderBy(desc(paperOptionsTradesTable.createdAt))
      .limit(50);

    res.json({
      positions: positions.filter(p => p.contracts > 0),
      trades,
    });
  } catch (err) {
    logger.error({ err }, "Options positions error");
    res.status(500).json({ error: "Failed to load options positions" });
  }
});

router.get("/paper-trading/spin/status", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json({ canSpin: false, nextSpinAt: null, todaySpin: null });
      return;
    }

    const today = getTodayUTC();
    const [todaySpin] = await db
      .select()
      .from(dailySpinsTable)
      .where(and(eq(dailySpinsTable.userId, dbUserId), eq(dailySpinsTable.spinDate, today)));

    if (todaySpin) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      res.json({ canSpin: false, nextSpinAt: tomorrow.toISOString(), todaySpin });
      return;
    }

    res.json({ canSpin: true, nextSpinAt: null, todaySpin: null });
  } catch (err) {
    logger.error({ err }, "Spin status error");
    res.status(500).json({ error: "Failed to get spin status" });
  }
});

router.post("/paper-trading/spin", requireAuth, validateBody(z.object({}).strict()), (req, res) => {
  res.redirect(307, "/api/gamification/spin");
});

router.get("/paper-trading/spin/history", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.json([]);
      return;
    }

    const history = await db
      .select()
      .from(dailySpinsTable)
      .where(eq(dailySpinsTable.userId, dbUserId))
      .orderBy(desc(dailySpinsTable.createdAt))
      .limit(30);

    res.json(history);
  } catch (err) {
    logger.error({ err }, "Spin history error");
    res.status(500).json({ error: "Failed to fetch spin history" });
  }
});

export default router;
