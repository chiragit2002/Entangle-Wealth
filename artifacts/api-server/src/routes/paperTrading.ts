import { Router } from "express";
import { db } from "@workspace/db";
import { paperPortfoliosTable, paperTradesTable, paperPositionsTable, dailySpinTable, userXpTable, xpTransactionsTable, streaksTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { resolveUserId } from "../lib/resolveUserId";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { calculateLevel, calculateTier } from "@workspace/xp";

const router = Router();

const STARTING_CASH = 100_000;

type SpinRewardType = "cash" | "xp" | "multiplier" | "streak_protection";

interface SpinReward {
  rewardType: SpinRewardType;
  label: string;
  cashAmount: number;
  xpAmount: number;
  weight: number;
}

const SPIN_PRIZES: SpinReward[] = [
  { rewardType: "cash", label: "$1K", cashAmount: 1_000, xpAmount: 0, weight: 603.4 },
  { rewardType: "cash", label: "$2K", cashAmount: 2_000, xpAmount: 0, weight: 142.9 },
  { rewardType: "cash", label: "$3K", cashAmount: 3_000, xpAmount: 0, weight: 100 },
  { rewardType: "cash", label: "$4K", cashAmount: 4_000, xpAmount: 0, weight: 66.7 },
  { rewardType: "cash", label: "$5K", cashAmount: 5_000, xpAmount: 0, weight: 50 },
  { rewardType: "cash", label: "$7.5K", cashAmount: 7_500, xpAmount: 0, weight: 20 },
  { rewardType: "cash", label: "$10K", cashAmount: 10_000, xpAmount: 0, weight: 10 },
  { rewardType: "cash", label: "$25K", cashAmount: 25_000, xpAmount: 0, weight: 5 },
  { rewardType: "cash", label: "$50K", cashAmount: 50_000, xpAmount: 0, weight: 2 },
  { rewardType: "cash", label: "$100K", cashAmount: 100_000, xpAmount: 0, weight: 1 },
  { rewardType: "xp", label: "+50 XP", cashAmount: 0, xpAmount: 50, weight: 50 },
  { rewardType: "xp", label: "+100 XP", cashAmount: 0, xpAmount: 100, weight: 30 },
  { rewardType: "xp", label: "+250 XP", cashAmount: 0, xpAmount: 250, weight: 15 },
  { rewardType: "multiplier", label: "2x Boost", cashAmount: 0, xpAmount: 0, weight: 4 },
  { rewardType: "streak_protection", label: "Streak Boost", cashAmount: 0, xpAmount: 0, weight: 1 },
];

const TOTAL_WEIGHT = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);

function pickPrize(): SpinReward {
  const rand = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;
  for (const prize of SPIN_PRIZES) {
    cumulative += prize.weight;
    if (rand < cumulative) return prize;
  }
  return SPIN_PRIZES[0];
}


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
    .values({ userId, cashBalance: STARTING_CASH })
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
      res.json({ cashBalance: STARTING_CASH, positions: [], trades: [], portfolioValue: 0, totalValue: STARTING_CASH });
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

    res.json({
      cashBalance: portfolio.cashBalance,
      positions: activePositions,
      trades,
      portfolioValue: positionValue,
      totalValue: portfolio.cashBalance + positionValue,
    });
  } catch (err) {
    logger.error("Paper trading portfolio error:", err);
    res.status(500).json({ error: "Failed to load portfolio" });
  }
});

router.post("/paper-trading/trade", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found. Please complete onboarding first." });
      return;
    }

    const { symbol, side, quantity, price } = req.body;

    if (!symbol || !side || !quantity || !price) {
      res.status(400).json({ error: "Missing required fields: symbol, side, quantity, price" });
      return;
    }

    if (!["buy", "sell"].includes(side)) {
      res.status(400).json({ error: "Side must be 'buy' or 'sell'" });
      return;
    }

    const qty = Math.floor(Number(quantity));
    const px = Number(price);
    if (qty <= 0 || px <= 0) {
      res.status(400).json({ error: "Quantity and price must be positive" });
      return;
    }

    const totalCost = qty * px;
    const upperSymbol = symbol.toUpperCase();

    const result = await db.transaction(async (tx) => {
      const [portfolio] = await tx
        .select()
        .from(paperPortfoliosTable)
        .where(eq(paperPortfoliosTable.userId, dbUserId));

      const currentPortfolio = portfolio || (await tx
        .insert(paperPortfoliosTable)
        .values({ userId: dbUserId, cashBalance: STARTING_CASH })
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

router.post("/paper-trading/reset", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    await db.delete(paperTradesTable).where(eq(paperTradesTable.userId, dbUserId));
    await db.delete(paperPositionsTable).where(eq(paperPositionsTable.userId, dbUserId));
    await db
      .update(paperPortfoliosTable)
      .set({ cashBalance: STARTING_CASH, updatedAt: new Date() })
      .where(eq(paperPortfoliosTable.userId, dbUserId));

    res.json({ success: true, message: "Portfolio reset to $100,000" });
  } catch (err) {
    logger.error("Paper trading reset error:", err);
    res.status(500).json({ error: "Failed to reset portfolio" });
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
      .from(dailySpinTable)
      .where(and(eq(dailySpinTable.userId, dbUserId), eq(dailySpinTable.spinDate, today)));

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

router.post("/paper-trading/spin", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as AuthenticatedRequest).userId;
    const dbUserId = await resolveUserId(clerkId, req);
    if (!dbUserId) {
      res.status(400).json({ error: "User not found. Please complete onboarding first." });
      return;
    }

    const today = getTodayUTC();
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const picked = pickPrize();

    const txResult = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(dailySpinTable)
        .values({ userId: dbUserId, prizeAmount: picked.cashAmount, spinDate: today, rewardType: picked.rewardType, rewardLabel: picked.label })
        .onConflictDoNothing({ target: [dailySpinTable.userId, dailySpinTable.spinDate] })
        .returning({ id: dailySpinTable.id });

      if (inserted.length === 0) {
        return { alreadySpun: true };
      }

      if (picked.rewardType === "cash" && picked.cashAmount > 0) {
        const [portfolio] = await tx
          .select()
          .from(paperPortfoliosTable)
          .where(eq(paperPortfoliosTable.userId, dbUserId));

        if (portfolio) {
          await tx
            .update(paperPortfoliosTable)
            .set({ cashBalance: portfolio.cashBalance + picked.cashAmount, updatedAt: new Date() })
            .where(eq(paperPortfoliosTable.userId, dbUserId));
        } else {
          await tx
            .insert(paperPortfoliosTable)
            .values({ userId: dbUserId, cashBalance: STARTING_CASH + picked.cashAmount });
        }
      } else if (picked.rewardType === "xp" && picked.xpAmount > 0) {
        let [xpRow] = await tx.select().from(userXpTable).where(eq(userXpTable.userId, dbUserId));
        if (!xpRow) {
          [xpRow] = await tx.insert(userXpTable).values({ userId: dbUserId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
        }
        const newTotalXp = xpRow.totalXp + picked.xpAmount;
        const newLevel = calculateLevel(newTotalXp);
        const newTier = calculateTier(newLevel, newTotalXp);
        await tx.update(userXpTable).set({
          totalXp: newTotalXp, level: newLevel, tier: newTier,
          monthlyXp: xpRow.monthlyXp + picked.xpAmount,
          weeklyXp: xpRow.weeklyXp + picked.xpAmount,
          updatedAt: new Date(),
        }).where(eq(userXpTable.userId, dbUserId));
        await tx.insert(xpTransactionsTable).values({ userId: dbUserId, amount: picked.xpAmount, reason: "paper_trading_spin", category: "engagement" });
      } else if (picked.rewardType === "multiplier") {
        let [streak] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, dbUserId));
        if (!streak) {
          [streak] = await tx.insert(streaksTable).values({ userId: dbUserId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
        }
        await tx.update(streaksTable).set({
          multiplier: Math.min(3.0, Math.max(streak.multiplier, 2.0)),
          updatedAt: new Date(),
        }).where(eq(streaksTable.userId, dbUserId));
      } else if (picked.rewardType === "streak_protection") {
        const [streakRow] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, dbUserId));
        if (!streakRow) {
          await tx.insert(streaksTable).values({ userId: dbUserId, currentStreak: 0, longestStreak: 0, multiplier: 1.0, streakProtectionActive: true });
        } else {
          await tx.update(streaksTable).set({ streakProtectionActive: true, updatedAt: new Date() }).where(eq(streaksTable.userId, dbUserId));
        }
      }

      return { alreadySpun: false };
    });

    if (txResult.alreadySpun) {
      res.json({ alreadySpun: true, nextSpinAt: tomorrow.toISOString() });
      return;
    }

    res.json({
      success: true,
      rewardType: picked.rewardType,
      label: picked.label,
      prize: picked.cashAmount,
      xpAmount: picked.xpAmount,
      nextSpinAt: tomorrow.toISOString(),
    });
  } catch (err) {
    logger.error("Spin error:", err);
    res.status(500).json({ error: "Spin failed" });
  }
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
      .from(dailySpinTable)
      .where(eq(dailySpinTable.userId, dbUserId))
      .orderBy(desc(dailySpinTable.createdAt))
      .limit(30);

    res.json(history);
  } catch (err) {
    logger.error("Spin history error:", err);
    res.status(500).json({ error: "Failed to fetch spin history" });
  }
});

export default router;
