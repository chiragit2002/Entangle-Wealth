import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  tokenTransactionsTable,
  rewardDistributionsTable,
  travelBookingsTable,
  tokenConfigTable,
  userXpTable,
} from "@workspace/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

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

router.put("/token/wallet", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { walletAddress } = req.body;

  if (!walletAddress || !ETH_ADDRESS_REGEX.test(walletAddress)) {
    res.status(400).json({ error: "Valid Ethereum wallet address required (0x...)" });
    return;
  }

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
    console.error("Wallet link error:", error);
    res.status(500).json({ error: "Failed to link wallet" });
  }
});

router.get("/token/balance", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  try {
    const [user] = await db
      .select({
        walletAddress: usersTable.walletAddress,
        tokenBalance: usersTable.tokenBalance,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [config] = await db
      .select()
      .from(tokenConfigTable)
      .where(eq(tokenConfigTable.key, "share_price"));
    const sharePrice = config ? parseFloat(config.value) : 40.0;
    const tokenValue = sharePrice * 0.25;

    res.json({
      balance: user.tokenBalance || 0,
      walletAddress: user.walletAddress,
      tokenValue,
      totalValue: (user.tokenBalance || 0) * tokenValue,
      sharePrice,
    });
  } catch (error) {
    console.error("Balance error:", error);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

router.get("/token/transactions", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const transactions = await db
      .select()
      .from(tokenTransactionsTable)
      .where(eq(tokenTransactionsTable.userId, user.id))
      .orderBy(desc(tokenTransactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(transactions);
  } catch (error) {
    console.error("Transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.get("/token/rewards", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const rewards = await db
      .select()
      .from(rewardDistributionsTable)
      .where(eq(rewardDistributionsTable.userId, user.id))
      .orderBy(desc(rewardDistributionsTable.createdAt));

    res.json(rewards);
  } catch (error) {
    console.error("Rewards error:", error);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

router.get("/token/rewards/history", async (_req, res) => {
  try {
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
      .limit(500);

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
    console.error("Reward history error:", error);
    res.status(500).json({ error: "Failed to fetch reward history" });
  }
});

router.get("/token/bookings", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const bookings = await db
      .select()
      .from(travelBookingsTable)
      .where(eq(travelBookingsTable.userId, user.id))
      .orderBy(desc(travelBookingsTable.createdAt));

    res.json(bookings);
  } catch (error) {
    console.error("Bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.get("/token/catalog", (_req, res) => {
  res.json(TRAVEL_CATALOG);
});

router.post("/token/book", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { listingId, destination, checkIn, checkOut, details } = req.body;

  if (!listingId) {
    res.status(400).json({ error: "listingId is required" });
    return;
  }

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

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

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
  } catch (error: any) {
    console.error("Booking error:", error);
    if (error.message?.includes("Insufficient balance")) {
      res.status(400).json({ error: "Insufficient EntangleCoin balance" });
    } else {
      res.status(500).json({ error: "Failed to process booking" });
    }
  }
});

router.post("/token/admin/distribute", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { month } = req.body;

  if (!month) {
    res.status(400).json({ error: "Month is required (e.g., '2026-04')" });
    return;
  }

  try {
    const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!adminUser || adminUser.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

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
      const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

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
    console.error("Distribution error:", error);
    res.status(500).json({ error: "Failed to distribute rewards" });
  }
});

router.get("/token/admin/stats", requireAuth, async (req, res) => {
  const userId = (req as any).userId;

  try {
    const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!adminUser || adminUser.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

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
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.put("/token/admin/config", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { sharePrice } = req.body;

  if (!sharePrice || sharePrice <= 0) {
    res.status(400).json({ error: "Valid share price required" });
    return;
  }

  try {
    const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!adminUser || adminUser.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

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
    console.error("Config update error:", error);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

export default router;
