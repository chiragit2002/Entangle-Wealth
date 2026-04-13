import { Router } from "express";
import { db } from "@workspace/db";
import { paperPortfoliosTable, paperTradesTable, paperPositionsTable, paperOptionsTradesTable, paperOptionsPositionsTable, dailySpinsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveUserId } from "../lib/resolveUserId";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { validateBody, z } from "../lib/validateRequest";
import { getStockBySymbol } from "../data/nasdaq-stocks";

const router = Router();

const DEFAULT_STARTING_CASH = 100_000;
const EARLY_ADOPTER_STARTING_CASH = 1_000_000;

function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

async function getStartingCash(userId: string): Promise<number> {
  const [user] = await db
    .select({ isEarlyAdopter: usersTable.isEarlyAdopter })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user?.isEarlyAdopter ? EARLY_ADOPTER_STARTING_CASH : DEFAULT_STARTING_CASH;
}

async function ensurePortfolio(userId: string) {
  const [existing] = await db
    .select()
    .from(paperPortfoliosTable)
    .where(eq(paperPortfoliosTable.userId, userId));

  if (existing) return existing;

  const startingCash = await getStartingCash(userId);
  const [created] = await db
    .insert(paperPortfoliosTable)
    .values({ userId, cashBalance: startingCash })
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
      res.json({ cashBalance: DEFAULT_STARTING_CASH, positions: [], trades: [], portfolioValue: 0, totalValue: DEFAULT_STARTING_CASH, startingCash: DEFAULT_STARTING_CASH });
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
    const positionValue = activePositions.reduce((sum, p) => sum + (p.quantity * p.avgCost), 0);

    const optionsPositions = await db
      .select()
      .from(paperOptionsPositionsTable)
      .where(eq(paperOptionsPositionsTable.userId, dbUserId));
    const activeOptionsPositions = optionsPositions.filter(p => p.contracts > 0);
    const optionsValue = activeOptionsPositions.reduce((sum, p) => sum + (p.contracts * p.avgPremium * 100), 0);

    const optionsTrades = await db
      .select()
      .from(paperOptionsTradesTable)
      .where(eq(paperOptionsTradesTable.userId, dbUserId))
      .orderBy(desc(paperOptionsTradesTable.createdAt))
      .limit(20);

    const [userRow] = await db
      .select({ isEarlyAdopter: usersTable.isEarlyAdopter })
      .from(usersTable)
      .where(eq(usersTable.id, dbUserId));
    const startingCash = userRow?.isEarlyAdopter ? EARLY_ADOPTER_STARTING_CASH : DEFAULT_STARTING_CASH;

    res.json({
      cashBalance: portfolio.cashBalance,
      positions: activePositions,
      trades,
      portfolioValue: positionValue + optionsValue,
      totalValue: portfolio.cashBalance + positionValue + optionsValue,
      startingCash,
      optionsPositions: activeOptionsPositions,
      optionsTrades,
    });
  } catch (err) {
    logger.error("Paper trading portfolio error:", err);
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

    const stockData = getStockBySymbol(upperSymbol);
    if (!stockData || typeof stockData.price !== "number" || stockData.price <= 0) {
      res.status(422).json({ error: `Cannot execute trade: market price unavailable for ${upperSymbol}` });
      return;
    }
    const px = stockData.price;
    const totalCost = qty * px;
    const startingCash = await getStartingCash(dbUserId);

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

      const [portfolio] = await tx
        .select()
        .from(paperPortfoliosTable)
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      const currentPortfolio = portfolio || (await tx
        .insert(paperPortfoliosTable)
        .values({ userId: dbUserId, cashBalance: startingCash })
        .returning())[0];

      if (side === "buy") {
        if (currentPortfolio.cashBalance < totalCost) {
          return { error: `Insufficient funds. Available: $${currentPortfolio.cashBalance.toFixed(2)}, Required: $${totalCost.toFixed(2)}` };
        }

        await tx
          .update(paperPortfoliosTable)
          .set({ cashBalance: currentPortfolio.cashBalance - totalCost, updatedAt: new Date() })
          .where(eq(paperPortfoliosTable.userId, dbUserId));

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
          return { error: `Insufficient shares. You own ${existingPos?.quantity ?? 0} shares of ${upperSymbol}` };
        }

        await tx
          .update(paperPortfoliosTable)
          .set({ cashBalance: currentPortfolio.cashBalance + totalCost, updatedAt: new Date() })
          .where(eq(paperPortfoliosTable.userId, dbUserId));

        const newQty = existingPos.quantity - qty;
        await tx
          .update(paperPositionsTable)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(paperPositionsTable.id, existingPos.id));
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
    logger.error("Paper trading error:", err);
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

    const startingCash = await getStartingCash(dbUserId);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId} || '_paper_trade'))`);
      await tx.delete(paperTradesTable).where(eq(paperTradesTable.userId, dbUserId));
      await tx.delete(paperPositionsTable).where(eq(paperPositionsTable.userId, dbUserId));
      await tx.delete(paperOptionsTradesTable).where(eq(paperOptionsTradesTable.userId, dbUserId));
      await tx.delete(paperOptionsPositionsTable).where(eq(paperOptionsPositionsTable.userId, dbUserId));
      await tx
        .update(paperPortfoliosTable)
        .set({ cashBalance: startingCash, updatedAt: new Date() })
        .where(eq(paperPortfoliosTable.userId, dbUserId));
    });

    const formattedBalance = startingCash.toLocaleString("en-US");
    res.json({ success: true, message: `Portfolio reset to $${formattedBalance}` });
  } catch (err) {
    logger.error("Paper trading reset error:", err);
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

    const stockData = getStockBySymbol(upperSymbol);
    if (!stockData || typeof stockData.price !== "number" || stockData.price <= 0) {
      res.status(422).json({ error: `Cannot execute options trade: market price unavailable for ${upperSymbol}` });
      return;
    }
    const underlyingPrice = stockData.price;
    const premium = Math.max(0.01, Math.abs(underlyingPrice - strike) * 0.05 + underlyingPrice * 0.005);
    const totalCost = contracts * premium * 100;
    const startingCash = await getStartingCash(dbUserId);

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${dbUserId.toString()} || '_paper_trade'))`);

      const [portfolio] = await tx
        .select()
        .from(paperPortfoliosTable)
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      const currentPortfolio = portfolio || (await tx
        .insert(paperPortfoliosTable)
        .values({ userId: dbUserId, cashBalance: startingCash })
        .returning())[0];

      if (side === "buy") {
        if (currentPortfolio.cashBalance < totalCost) {
          return { error: `Insufficient funds. Available: $${currentPortfolio.cashBalance.toFixed(2)}, Required: $${totalCost.toFixed(2)}` };
        }

        await tx
          .update(paperPortfoliosTable)
          .set({ cashBalance: currentPortfolio.cashBalance - totalCost, updatedAt: new Date() })
          .where(eq(paperPortfoliosTable.userId, dbUserId));

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
          return { error: `Insufficient contracts. You own ${existingPos?.contracts ?? 0} ${upperSymbol} ${strike} ${optionType} contracts` };
        }

        await tx
          .update(paperPortfoliosTable)
          .set({ cashBalance: currentPortfolio.cashBalance + totalCost, updatedAt: new Date() })
          .where(eq(paperPortfoliosTable.userId, dbUserId));

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
    logger.error("Options trade error:", err);
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
    logger.error("Options positions error:", err);
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
    logger.error("Spin status error:", err);
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
    logger.error("Spin history error:", err);
    res.status(500).json({ error: "Failed to fetch spin history" });
  }
});

export default router;
