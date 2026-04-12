import { Router } from "express";
import { PUBLIC_ENDPOINT_POLICY } from "../lib/publicEndpointPolicy";
import { validateBody, validateQuery, z } from "../lib/validateRequest";
import { db } from "@workspace/db";
import {
  giveawayEntriesTable,
  userXpTable,
  streaksTable,
  usersTable,
  referralsTable,
} from "@workspace/db/schema";
import { eq, desc, count, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { logger } from "../lib/logger";

const router = Router();

const ANNIVERSARY_DATE = new Date("2026-04-11T00:00:00Z");
const PRIZE_POOL = 50000;
const REFERRAL_BONUS_POOL = 36000;

function getCountdown() {
  const now = Date.now();
  const target = ANNIVERSARY_DATE.getTime();
  const diff = Math.max(target - now, 0);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, targetDate: ANNIVERSARY_DATE.toISOString(), passed: diff === 0 };
}

async function getOrCreateEntry(userId: string) {
  let [entry] = await db.select().from(giveawayEntriesTable).where(eq(giveawayEntriesTable.userId, userId));
  if (!entry) {
    [entry] = await db.insert(giveawayEntriesTable).values({ userId }).returning();
  }
  return entry;
}

async function syncEntries(userId: string, clerkId: string) {
  const [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
  const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));

  const xpLevel = xpRow?.level || 1;
  const totalXp = xpRow?.totalXp || 0;
  const currentStreak = streak?.currentStreak || 0;

  const tradeEntries = Math.min(Math.floor(totalXp / 500), 50);
  const streakEntries = Math.min(currentStreak, 30);
  const xpMilestoneEntries = Math.floor(xpLevel / 5);
  const loginEntries = Math.min(Math.floor(totalXp / 100), 30);

  const [refStats] = await db
    .select({ converted: count() })
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerId, clerkId), eq(referralsTable.converted, true)));
  const convertedReferrals = Number(refStats?.converted || 0);
  const referralEntries = convertedReferrals * 5;

  const totalEntries = tradeEntries + streakEntries + xpMilestoneEntries + loginEntries + referralEntries;

  const [entry] = await db
    .update(giveawayEntriesTable)
    .set({
      totalEntries,
      tradeEntries,
      streakEntries,
      loginEntries,
      xpMilestoneEntries,
      referralEntries,
      convertedReferrals,
      updatedAt: new Date(),
    })
    .where(eq(giveawayEntriesTable.userId, userId))
    .returning();

  return entry;
}

async function syncReferralBonusShares() {
  const allEntries = await db
    .select({ userId: giveawayEntriesTable.userId, convertedReferrals: giveawayEntriesTable.convertedReferrals })
    .from(giveawayEntriesTable);

  const totalReferrals = allEntries.reduce((s, e) => s + e.convertedReferrals, 0);
  if (totalReferrals === 0) return;

  for (const entry of allEntries) {
    const share = entry.convertedReferrals > 0 ? (entry.convertedReferrals / totalReferrals) * REFERRAL_BONUS_POOL : 0;
    await db.update(giveawayEntriesTable).set({ referralBonusShare: share }).where(eq(giveawayEntriesTable.userId, entry.userId));
  }
}

async function recalcUserBonusShare(userId: string, userConvertedReferrals: number) {
  const [sumRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(converted_referrals), 0)` })
    .from(giveawayEntriesTable);
  const totalReferrals = Number(sumRow?.total || 0);
  if (totalReferrals === 0) return;
  const share = userConvertedReferrals > 0 ? (userConvertedReferrals / totalReferrals) * REFERRAL_BONUS_POOL : 0;
  await db.update(giveawayEntriesTable).set({ referralBonusShare: share }).where(eq(giveawayEntriesTable.userId, userId));
}

router.get("/giveaway/info", async (_req, res) => {
  try {
    const countdown = getCountdown();
    const [totalRow] = await db.select({ count: count() }).from(giveawayEntriesTable);
    const [entriesRow] = await db.select({ total: sql<number>`COALESCE(SUM(total_entries), 0)` }).from(giveawayEntriesTable);

    res.json({
      prizePool: PRIZE_POOL,
      referralBonusPool: REFERRAL_BONUS_POOL,
      anniversaryDate: ANNIVERSARY_DATE.toISOString(),
      countdown,
      totalParticipants: Number(totalRow?.count || 0),
      totalEntries: Number(entriesRow?.total || 0),
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching giveaway info:");
    res.status(500).json({ error: "Failed to fetch giveaway info" });
  }
});

router.get("/giveaway/my-entries", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await getOrCreateEntry(userId);
    const entry = await syncEntries(userId, clerkId);

    const [totalRow] = await db.select({ total: sql<number>`COALESCE(SUM(total_entries), 0)` }).from(giveawayEntriesTable);
    const [refSumRow] = await db.select({ total: sql<number>`COALESCE(SUM(converted_referrals), 0)` }).from(giveawayEntriesTable);
    const totalEntries = Number(totalRow?.total || 1);
    const totalReferrals = Number(refSumRow?.total || 0);
    const referralBonusShare = totalReferrals > 0 && entry.convertedReferrals > 0
      ? (entry.convertedReferrals / totalReferrals) * REFERRAL_BONUS_POOL
      : 0;

    const odds = totalEntries > 0 ? ((entry.totalEntries / totalEntries) * 100).toFixed(3) : "0.000";
    const countdown = getCountdown();

    res.json({
      entries: { ...entry, referralBonusShare },
      odds: `${odds}%`,
      totalPoolEntries: totalEntries,
      countdown,
      prizePool: PRIZE_POOL,
      referralBonusPool: REFERRAL_BONUS_POOL,
      anniversaryDate: ANNIVERSARY_DATE.toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching user giveaway entries:");
    res.status(500).json({ error: "Failed to fetch giveaway entries" });
  }
});

// Public endpoint — approved in publicEndpointPolicy.ts (PUBLIC_ENDPOINT_POLICY[4]).
// User names are anonymized to "FirstName L." server-side; no full lastName, email, or photoUrl returned.
void PUBLIC_ENDPOINT_POLICY[4];
router.get("/giveaway/leaderboard", validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(50).optional().default(20) })), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  try {
    const leaderboard = await db
      .select({
        userId: giveawayEntriesTable.userId,
        totalEntries: giveawayEntriesTable.totalEntries,
        convertedReferrals: giveawayEntriesTable.convertedReferrals,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(giveawayEntriesTable)
      .innerJoin(usersTable, eq(giveawayEntriesTable.userId, usersTable.id))
      .orderBy(desc(giveawayEntriesTable.totalEntries))
      .limit(limit);

    const [totalRow] = await db.select({ total: sql<number>`COALESCE(SUM(total_entries), 0)` }).from(giveawayEntriesTable);
    const [refSumRow] = await db.select({ total: sql<number>`COALESCE(SUM(converted_referrals), 0)` }).from(giveawayEntriesTable);
    const totalEntries = Number(totalRow?.total || 1);
    const totalReferrals = Number(refSumRow?.total || 0);

    const ranked = leaderboard.map((entry, index) => {
      const first = entry.firstName || "User";
      const lastInitial = entry.lastName ? entry.lastName.charAt(0).toUpperCase() + "." : "";
      const referralBonusShare = totalReferrals > 0 && entry.convertedReferrals > 0
        ? (entry.convertedReferrals / totalReferrals) * REFERRAL_BONUS_POOL
        : 0;
      return {
        rank: index + 1,
        name: `${first} ${lastInitial}`.trim(),
        totalEntries: entry.totalEntries,
        convertedReferrals: entry.convertedReferrals,
        referralBonusShare,
        odds: totalEntries > 0 ? ((entry.totalEntries / totalEntries) * 100).toFixed(3) + "%" : "0.000%",
      };
    });

    res.json({ leaderboard: ranked, totalEntries });
  } catch (error) {
    logger.error({ err: error }, "Error fetching giveaway leaderboard:");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.post("/giveaway/admin/sync-all", requireAuth, requireAdmin, validateBody(z.object({}).strict()), async (req, res) => {
  try {
    const allUsers = await db.select({ id: usersTable.id, clerkId: usersTable.clerkId }).from(usersTable);
    let synced = 0;
    for (const user of allUsers) {
      await getOrCreateEntry(user.id);
      await syncEntries(user.id, user.clerkId);
      synced++;
    }
    await syncReferralBonusShares();

    res.json({ ok: true, synced });
  } catch (error) {
    logger.error({ err: error }, "Error syncing giveaway entries:");
    res.status(500).json({ error: "Failed to sync entries" });
  }
});

router.post("/giveaway/admin/draw-winner", requireAuth, requireAdmin, validateQuery(z.object({ force: z.enum(["true", "false"]).optional() })), validateBody(z.object({}).strict()), async (req, res) => {
  try {
    const countdown = getCountdown();
    if (!countdown.passed) {
      res.status(400).json({ error: "Anniversary date has not yet arrived", countdown });
      return;
    }

    const forceRedraw = req.query.force === "true";

    const existingWinner = await db
      .select({ userId: giveawayEntriesTable.userId, drawnAt: giveawayEntriesTable.drawnAt })
      .from(giveawayEntriesTable)
      .where(eq(giveawayEntriesTable.drawingWon, true))
      .limit(1);

    if (existingWinner.length > 0 && !forceRedraw) {
      const [winnerUser] = await db
        .select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, existingWinner[0].userId));
      res.status(409).json({
        error: "A winner has already been drawn. Pass ?force=true to override.",
        winner: {
          userId: existingWinner[0].userId,
          drawnAt: existingWinner[0].drawnAt,
          name: `${winnerUser?.firstName || "User"} ${winnerUser?.lastName || ""}`.trim(),
          email: winnerUser?.email,
        },
      });
      return;
    }

    if (forceRedraw && existingWinner.length > 0) {
      await db.update(giveawayEntriesTable).set({ drawingWon: false, drawnAt: null }).where(eq(giveawayEntriesTable.drawingWon, true));
    }

    const allEntries = await db
      .select({ userId: giveawayEntriesTable.userId, totalEntries: giveawayEntriesTable.totalEntries })
      .from(giveawayEntriesTable)
      .where(sql`total_entries > 0`);

    if (allEntries.length === 0) {
      res.status(400).json({ error: "No entries found" });
      return;
    }

    const pool: string[] = [];
    for (const entry of allEntries) {
      for (let i = 0; i < entry.totalEntries; i++) {
        pool.push(entry.userId);
      }
    }

    const winnerUserId = pool[Math.floor(Math.random() * pool.length)];

    await db.update(giveawayEntriesTable).set({ drawingWon: true, drawnAt: new Date() }).where(eq(giveawayEntriesTable.userId, winnerUserId));

    const [winnerUser] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, winnerUserId));

    res.json({
      ok: true,
      winner: {
        userId: winnerUserId,
        name: `${winnerUser?.firstName || "User"} ${winnerUser?.lastName || ""}`.trim(),
        email: winnerUser?.email,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error drawing giveaway winner:");
    res.status(500).json({ error: "Failed to draw winner" });
  }
});

export default router;
