import { Router } from "express";
import { validateBody, validateQuery, PaginationQuerySchema, z } from "../lib/validateRequest";
import { db } from "@workspace/db";
import {
  usersTable,
  tokenTransactionsTable,
  rewardDistributionsTable,
  travelBookingsTable,
  tokenConfigTable,
  userXpTable,
} from "@workspace/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { logger } from "../lib/logger";

const router = Router();

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const TRAVEL_CATALOG: Record<string, { type: string; name: string; tokenPrice: number }> = {
  h1: { type: "hotel", name: "The Ritz-Carlton", tokenPrice: 1200 },
  h2: { type: "hotel", name: "Four Seasons Resort", tokenPrice: 2500 },
  h3: { type: "hotel", name: "Mandarin Oriental", tokenPrice: 1800 },
  h4: { type: "hotel", name: "Burj Al Arab", tokenPrice: 3500 },
  h5: { type: "hotel", name: "Aman Venice", tokenPrice: 2200 },
  h6: { type: "hotel", name: "Soneva Fushi", tokenPrice: 4000 },
  f1: { type: "flight", name: "JFK → LHR", tokenPrice: 800 },
  f2: { type: "flight", name: "LAX → NRT", tokenPrice: 1500 },
  f3: { type: "flight", name: "SFO → CDG", tokenPrice: 950 },
  f4: { type: "flight", name: "MIA → SIN", tokenPrice: 1800 },
  f5: { type: "flight", name: "ORD → DXB", tokenPrice: 1200 },
  f6: { type: "flight", name: "JFK → SYD", tokenPrice: 2000 },
};

const REWARD_TIERS = [
  { rankEnd: 1, tokens: 5000 },
  { rankEnd: 3, tokens: 3000 },
  { rankEnd: 10, tokens: 1500 },
  { rankEnd: 25, tokens: 750 },
  { rankEnd: 50, tokens: 400 },
  { rankEnd: 100, tokens: 200 },
];

function getRewardAmount(rank: number): number {
  for (const tier of REWARD_TIERS) {
    if (rank <= tier.rankEnd) return tier.tokens;
  }
  return 0;
}

const WalletSchema = z.object({
  walletAddress: z.string().regex(ETH_ADDRESS_REGEX, "Valid Ethereum wallet address required (0x...)"),
});

const BookingSchema = z.object({
  listingId: z.string().min(1).max(20),
  destination: z.string().max(200).optional(),
  checkIn: z.string().max(50).optional(),
  checkOut: z.string().max(50).optional(),
  details: z.string().max(500).optional(),
});

const AdminDistributeSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in format YYYY-MM"),
});

const AdminConfigSchema = z.object({
  sharePrice: z.number().positive("Valid share price required"),
});

router.put("/token/wallet", requireAuth, validateBody(WalletSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { walletAddress } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.walletAddress, walletAddress)));

    if (existing && existing.clerkId !== userId) {
      res.status(409).json({ error: "This wallet address is already linked to another account" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ walletAddress, updatedAt: new Date() })
      .where(eq(usersTable.clerkId, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ walletAddress: updated.walletAddress, tokenBalance: updated.tokenBalance });
  } catch (error) {
    logger.error({ err: error }, "Wallet link error");
    res.status(500).json({ error: "Failed to link wallet" });
  }
});

router.get("/token/balance", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    const [user] = await db
      .select({
        walletAddress: usersTable.walletAddress,
        tokenBalance: usersTable.tokenBalance,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    const [config] = await db
      .select()
      .from(tokenConfigTable)
      .where(eq(tokenConfigTable.key, "share_price"));
    const sharePrice = config ? parseFloat(config.value) : 40.0;
    const tokenValue = sharePrice * 0.25;

    if (!user) {
      res.json({
        balance: 0,
        walletAddress: null,
        tokenValue,
        totalValue: 0,
        sharePrice,
      });
      return;
    }

    res.json({
      balance: user.tokenBalance || 0,
      walletAddress: user.walletAddress,
      tokenValue,
      totalValue: (user.tokenBalance || 0) * tokenValue,
      sharePrice,
    });
  } catch (error) {
    logger.error({ err: error }, "Balance error");
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

router.get("/token/transactions", requireAuth, validateQuery(PaginationQuerySchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [totalResult] = await db.select({ c: count() }).from(tokenTransactionsTable).where(eq(tokenTransactionsTable.userId, user.id));
    const transactions = await db
      .select()
      .from(tokenTransactionsTable)
      .where(eq(tokenTransactionsTable.userId, user.id))
      .orderBy(desc(tokenTransactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ items: transactions, total: totalResult?.c || 0, limit, offset });
  } catch (error) {
    logger.error({ err: error }, "Transactions error");
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.get("/token/rewards", requireAuth, validateQuery(PaginationQuerySchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [totalResult] = await db.select({ c: count() }).from(rewardDistributionsTable).where(eq(rewardDistributionsTable.userId, user.id));
    const rewards = await db
      .select()
      .from(rewardDistributionsTable)
      .where(eq(rewardDistributionsTable.userId, user.id))
      .orderBy(desc(rewardDistributionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ items: rewards, total: totalResult?.c || 0, limit, offset });
  } catch (error) {
    logger.error({ err: error }, "Rewards error");
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

router.get("/token/rewards/history", validateQuery(PaginationQuerySchema), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const distributions = await db
      .select({
        month: rewardDistributionsTable.month,
        rank: rewardDistributionsTable.rank,
        tokensAwarded: rewardDistributionsTable.tokensAwarded,
        portfolioGain: rewardDistributionsTable.portfolioGain,
        userId: rewardDistributionsTable.userId,
        createdAt: rewardDistributionsTable.createdAt,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(rewardDistributionsTable)
      .leftJoin(usersTable, eq(rewardDistributionsTable.userId, usersTable.id))
      .orderBy(desc(rewardDistributionsTable.createdAt), rewardDistributionsTable.rank)
      .limit(limit)
      .offset(offset);

    const grouped: Record<string, any[]> = {};
    for (const d of distributions) {
      if (!grouped[d.month]) grouped[d.month] = [];
      grouped[d.month].push({
        rank: d.rank,
        tokens: d.tokensAwarded,
        gain: d.portfolioGain,
        name: d.firstName && d.lastName
          ? `${d.firstName} ${d.lastName.charAt(0)}.`
          : `User ${d.userId.slice(0, 6)}`,
        date: d.createdAt,
      });
    }

    res.json(grouped);
  } catch (error) {
    logger.error({ err: error }, "Reward history error");
    res.status(500).json({ error: "Failed to fetch reward history" });
  }
});

router.get("/token/bookings", requireAuth, validateQuery(PaginationQuerySchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 50);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [totalResult] = await db.select({ c: count() }).from(travelBookingsTable).where(eq(travelBookingsTable.userId, user.id));
    const bookings = await db
      .select()
      .from(travelBookingsTable)
      .where(eq(travelBookingsTable.userId, user.id))
      .orderBy(desc(travelBookingsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ items: bookings, total: totalResult?.c || 0, limit, offset });
  } catch (error) {
    logger.error({ err: error }, "Bookings error");
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/token/catalog", (_req, res) => {
  res.json(TRAVEL_CATALOG);
});

router.post("/token/book", requireAuth, validateBody(BookingSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { listingId, destination, checkIn, checkOut, details } = req.body;

  const catalogItem = TRAVEL_CATALOG[listingId];
  if (!catalogItem) {
    res.status(400).json({ error: "Invalid listing ID" });
    return;
  }

  const tokenAmount = catalogItem.tokenPrice;

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if ((user.tokenBalance || 0) < tokenAmount) {
      res.status(400).json({ error: "Insufficient EntangleCoin balance" });
      return;
    }

    const txHash = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx.update(usersTable).set({
        tokenBalance: sql`GREATEST(${usersTable.tokenBalance} - ${tokenAmount}, 0)`,
        updatedAt: new Date(),
      }).where(and(eq(usersTable.id, user.id), sql`${usersTable.tokenBalance} >= ${tokenAmount}`)).returning();

      if (!updated) throw new Error("Insufficient balance (concurrent modification)");

      const [booking] = await tx.insert(travelBookingsTable).values({
        userId: user.id,
        type: catalogItem.type,
        name: catalogItem.name,
        destination,
        checkIn,
        checkOut,
        tokenAmount,
        txHash,
        details,
        status: "confirmed",
      }).returning();

      await tx.insert(tokenTransactionsTable).values({
        userId: user.id,
        type: "booking",
        amount: -tokenAmount,
        description: `Travel booking: ${catalogItem.name} — ${destination || ""}`,
        txHash,
        status: "completed",
      });

      return { booking, newBalance: updated.tokenBalance };
    });

    res.json({ booking: result.booking, txHash, newBalance: result.newBalance });
  } catch (error) {
    logger.error({ err: error }, "Booking error");
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Insufficient balance")) {
      res.status(400).json({ error: "Insufficient EntangleCoin balance" });
    } else {
      res.status(500).json({ error: "Failed to process booking" });
    }
  }
});

router.post("/token/admin/distribute", requireAuth, requireAdmin, validateBody(AdminDistributeSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { month } = req.body;

  try {

    const existingDist = await db
      .select()
      .from(rewardDistributionsTable)
      .where(eq(rewardDistributionsTable.month, month))
      .limit(1);

    if (existingDist.length > 0) {
      res.status(409).json({ error: `Distribution for ${month} already completed` });
      return;
    }

    const topUsers = await db
      .select({
        id: usersTable.id,
        walletAddress: usersTable.walletAddress,
        tokenBalance: usersTable.tokenBalance,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        monthlyXp: userXpTable.monthlyXp,
        totalXp: userXpTable.totalXp,
      })
      .from(usersTable)
      .leftJoin(userXpTable, eq(usersTable.id, userXpTable.userId))
      .orderBy(desc(userXpTable.monthlyXp), desc(userXpTable.totalXp))
      .limit(100);

    const distributions = [];
    for (let i = 0; i < topUsers.length; i++) {
      const rank = i + 1;
      const tokens = getRewardAmount(rank);
      if (tokens <= 0) continue;

      const user = topUsers[i];
      const txHash = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      await db.update(usersTable).set({
        tokenBalance: sql`COALESCE(${usersTable.tokenBalance}, 0) + ${tokens}`,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, user.id));

      const [dist] = await db.insert(rewardDistributionsTable).values({
        month,
        userId: user.id,
        rank,
        tokensAwarded: tokens,
        portfolioGain: user.monthlyXp || 0,
        txHash,
      }).returning();

      await db.insert(tokenTransactionsTable).values({
        userId: user.id,
        type: "reward",
        amount: tokens,
        description: `Monthly reward — Rank #${rank} (${month}) — ${user.monthlyXp || 0} XP`,
        txHash,
        status: "completed",
      });

      distributions.push(dist);
    }

    res.json({ distributed: distributions.length, month, distributions });
  } catch (error) {
    logger.error({ err: error }, "Distribution error");
    res.status(500).json({ error: "Failed to distribute rewards" });
  }
});

router.get("/token/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const walletsLinked = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(sql`${usersTable.walletAddress} IS NOT NULL`);

    const totalBalance = await db
      .select({ total: sql<number>`COALESCE(SUM(${usersTable.tokenBalance}), 0)` })
      .from(usersTable);

    const totalDistributions = await db
      .select({ count: sql<number>`count(DISTINCT ${rewardDistributionsTable.month})` })
      .from(rewardDistributionsTable);

    const totalBookings = await db
      .select({
        count: sql<number>`count(*)`,
        volume: sql<number>`COALESCE(SUM(${travelBookingsTable.tokenAmount}), 0)`,
      })
      .from(travelBookingsTable);

    const [config] = await db.select().from(tokenConfigTable).where(eq(tokenConfigTable.key, "share_price"));

    res.json({
      totalUsers: totalUsers[0]?.count || 0,
      walletsLinked: walletsLinked[0]?.count || 0,
      totalCirculating: totalBalance[0]?.total || 0,
      totalSupply: 100_000_000,
      founderAllocation: 75_000_000,
      rewardsPool: 25_000_000,
      distributionMonths: totalDistributions[0]?.count || 0,
      bookings: totalBookings[0]?.count || 0,
      bookingVolume: totalBookings[0]?.volume || 0,
      sharePrice: config ? parseFloat(config.value) : 40.0,
      tokenValue: (config ? parseFloat(config.value) : 40.0) * 0.25,
    });
  } catch (error) {
    logger.error({ err: error }, "Admin stats error");
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.put("/token/admin/config", requireAuth, requireAdmin, validateBody(AdminConfigSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { sharePrice } = req.body;

  try {

    const existing = await db.select().from(tokenConfigTable).where(eq(tokenConfigTable.key, "share_price"));

    if (existing.length > 0) {
      await db.update(tokenConfigTable)
        .set({ value: sharePrice.toString(), updatedAt: new Date() })
        .where(eq(tokenConfigTable.key, "share_price"));
    } else {
      await db.insert(tokenConfigTable).values({
        key: "share_price",
        value: sharePrice.toString(),
      });
    }

    res.json({ sharePrice, tokenValue: sharePrice * 0.25 });
  } catch (error) {
    logger.error({ err: error }, "Config update error");
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

export default router;
