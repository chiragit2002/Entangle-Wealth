import { Router } from "express";
import { PUBLIC_ENDPOINT_POLICY } from "../lib/publicEndpointPolicy";
import { validateBody, validateQuery, validateParams, PaginationQuerySchema, z } from "../lib/validateRequest";
import { db } from "@workspace/db";
import {
  userXpTable,
  xpTransactionsTable,
  badgesTable,
  userBadgesTable,
  challengesTable,
  userChallengesTable,
  streaksTable,
  leaderboardSnapshotsTable,
  dailySpinsTable,
  founderStatusTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { evaluateStreak } from "../lib/streakUtils";
import { calculateLevel, calculateTier, xpForLevel, xpForNextLevel, applyMultiplier, TIER_THRESHOLDS } from "@workspace/xp";
import { logger } from "../lib/logger";
import { triggerGiveawaySync } from "../lib/giveawaySync";

const ChallengeIdParamsSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
});

const LeaderboardQuerySchema = z.object({
  period: z.enum(["all", "monthly", "weekly"]).optional().default("monthly"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

const PeriodQuerySchema = z.object({
  period: z.enum(["all", "monthly", "weekly"]).optional().default("monthly"),
});

const XpHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const router = Router();

const PUBLIC_LEADERBOARD_RATE_LIMIT_WINDOW_MS = 60_000;
const PUBLIC_LEADERBOARD_RATE_LIMIT_MAX = 30;
const leaderboardRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkLeaderboardRateLimit(req: import("express").Request): boolean {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  const now = Date.now();
  let entry = leaderboardRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + PUBLIC_LEADERBOARD_RATE_LIMIT_WINDOW_MS };
    leaderboardRateLimitMap.set(ip, entry);
    return true;
  }
  entry.count++;
  return entry.count <= PUBLIC_LEADERBOARD_RATE_LIMIT_MAX;
}

async function loadUserGameState(userId: string) {
  const [xpRows, streakRows, founderRows] = await Promise.all([
    db.select().from(userXpTable).where(eq(userXpTable.userId, userId)),
    db.select().from(streaksTable).where(eq(streaksTable.userId, userId)),
    db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId)),
  ]);
  return {
    xpRow: xpRows[0] ?? null,
    streak: streakRows[0] ?? null,
    founder: founderRows[0] ?? null,
  };
}

router.get("/gamification/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let [gameState, earnedBadges] = await Promise.all([
      loadUserGameState(userId),
      db.select({ badge: badgesTable, earnedAt: userBadgesTable.earnedAt })
        .from(userBadgesTable)
        .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
        .where(eq(userBadgesTable.userId, userId)),
    ]);

    let { xpRow, streak } = gameState;

    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const currentLevelXp = xpForLevel(xpRow.level);
    const nextLevelXp = xpForNextLevel(xpRow.level);
    const progress = nextLevelXp > currentLevelXp ? ((xpRow.totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 100;

    res.json({
      xp: xpRow,
      streak,
      badges: earnedBadges,
      levelProgress: Math.min(Math.max(progress, 0), 100),
      xpToNextLevel: Math.max(nextLevelXp - xpRow.totalXp, 0),
      currentLevelXp,
      nextLevelXp,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching gamification data:");
    res.status(500).json({ error: "Failed to fetch gamification data" });
  }
});

const XP_REWARDS: Record<string, Record<string, number>> = {
  trading: { signal_used: 25, analysis_run: 15, screener_search: 10 },
  gig: { gig_completed: 50, gig_posted: 20 },
  community: { post_created: 15, comment_added: 10 },
  engagement: { daily_checkin: 25, profile_updated: 10 },
};

const MAX_XP_PER_ACTION = 100;

const XpSchema = z.object({
  reason: z.string().min(1).max(100),
  category: z.enum(["trading", "gig", "community", "engagement"]),
});

const XP_COOLDOWN_MS = 60_000;
const xpCooldownMap = new Map<string, Map<string, number>>();

function checkXpCooldown(clerkId: string, reason: string): boolean {
  const now = Date.now();
  let userMap = xpCooldownMap.get(clerkId);
  if (!userMap) {
    userMap = new Map();
    xpCooldownMap.set(clerkId, userMap);
  }
  const lastAt = userMap.get(reason) ?? 0;
  if (now - lastAt < XP_COOLDOWN_MS) return false;
  userMap.set(reason, now);
  return true;
}

router.post("/gamification/xp", requireAuth, validateBody(XpSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { reason, category } = req.body;

  const categoryRewards = XP_REWARDS[category];
  if (!categoryRewards || !(reason in categoryRewards)) {
    res.status(400).json({ error: "Invalid category or reason" });
    return;
  }

  if (!checkXpCooldown(clerkId, reason)) {
    res.status(429).json({ error: "XP award cooldown active. Please wait before awarding XP for the same action." });
    return;
  }

  const baseAmount = categoryRewards[reason];

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);

      let [streak] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId));
      const multiplier = streak?.multiplier || 1.0;
      const finalAmount = Math.min(applyMultiplier(baseAmount, multiplier), MAX_XP_PER_ACTION);

      await tx.insert(xpTransactionsTable).values({ userId, amount: finalAmount, reason, category });

      let [xpRow] = await tx.select().from(userXpTable).where(eq(userXpTable.userId, userId));
      if (!xpRow) {
        [xpRow] = await tx.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
      }

      const newTotalXp = xpRow.totalXp + finalAmount;
      const newLevel = calculateLevel(newTotalXp);
      const newTier = calculateTier(newLevel, newTotalXp);

      const [updated] = await tx.update(userXpTable)
        .set({
          totalXp: newTotalXp,
          level: newLevel,
          tier: newTier,
          monthlyXp: xpRow.monthlyXp + finalAmount,
          weeklyXp: xpRow.weeklyXp + finalAmount,
          updatedAt: new Date(),
        })
        .where(eq(userXpTable.userId, userId))
        .returning();

      return { updated, xpEarned: finalAmount, multiplier, prevLevel: xpRow.level, prevTier: xpRow.tier };
    });

    res.json({
      xp: result.updated,
      xpEarned: result.xpEarned,
      multiplier: result.multiplier,
      leveledUp: result.updated.level > result.prevLevel,
      tierChanged: result.updated.tier !== result.prevTier,
    });
    triggerGiveawaySync(userId, clerkId);
  } catch (error) {
    logger.error({ err: error }, "Error adding XP:");
    res.status(500).json({ error: "Failed to add XP" });
  }
});

router.post("/gamification/streak/checkin", requireAuth, validateBody(z.object({}).strict()), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const now = new Date();

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 1, longestStreak: 1, lastActivityDate: now, multiplier: 1.0 }).returning();
      res.json(streak);
      return;
    }

    const { newStreak: evalNewStreak, alreadyActive } = evaluateStreak(streak.lastActivityDate, streak.currentStreak, now);

    if (alreadyActive) {
      res.json({ ...streak, alreadyCheckedIn: true });
      return;
    }

    let consumedProtection = false;
    let newStreak = evalNewStreak;
    if (newStreak < streak.currentStreak && streak.streakProtectionActive) {
      newStreak = streak.currentStreak;
      consumedProtection = true;
    }

    const newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
    const newLongest = Math.max(streak.longestStreak, newStreak);

    const [updated] = await db.update(streaksTable)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: now,
        multiplier: newMultiplier,
        streakProtectionActive: consumedProtection ? false : streak.streakProtectionActive,
        updatedAt: now,
      })
      .where(eq(streaksTable.userId, userId))
      .returning();

    res.json({ ...updated, protectionUsed: consumedProtection });
    triggerGiveawaySync(userId, clerkId);
  } catch (error) {
    logger.error({ err: error }, "Error checking in streak:");
    res.status(500).json({ error: "Failed to check in" });
  }
});

router.get("/gamification/badges", async (_req, res) => {
  try {
    const badges = await db.select().from(badgesTable).orderBy(badgesTable.category, badgesTable.name);
    res.json(badges);
  } catch (error) {
    logger.error({ err: error }, "Error fetching badges:");
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

router.get("/gamification/badges/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [allBadges, earned] = await Promise.all([
      db.select().from(badgesTable).orderBy(badgesTable.category, badgesTable.name),
      db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)),
    ]);
    const earnedIds = new Set(earned.map(e => e.badgeId));

    const result = allBadges.map(b => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: earned.find(e => e.badgeId === b.id)?.earnedAt || null,
    }));

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Error fetching user badges:");
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

router.get("/gamification/challenges", async (_req, res) => {
  try {
    const challenges = await db.select().from(challengesTable)
      .where(eq(challengesTable.isActive, true))
      .orderBy(challengesTable.type, challengesTable.title);
    res.json(challenges);
  } catch (error) {
    logger.error({ err: error }, "Error fetching challenges:");
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

router.get("/gamification/challenges/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const challenges = await db.select().from(challengesTable)
      .where(eq(challengesTable.isActive, true));

    const userProgress = await db.select().from(userChallengesTable)
      .where(eq(userChallengesTable.userId, userId));

    const progressMap = new Map(userProgress.map(p => [p.challengeId, p]));

    const result = challenges.map(c => ({
      ...c,
      progress: progressMap.get(c.id)?.progress || 0,
      completed: progressMap.get(c.id)?.completed || false,
      completedAt: progressMap.get(c.id)?.completedAt || null,
    }));

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Error fetching user challenges:");
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

const CHALLENGE_PROGRESS_COOLDOWN_MS = 5_000;
const challengeProgressCooldownMap = new Map<string, number>();

function checkChallengeProgressCooldown(clerkId: string, challengeId: number): boolean {
  const key = `${clerkId}:${challengeId}`;
  const now = Date.now();
  const lastAt = challengeProgressCooldownMap.get(key) ?? 0;
  if (now - lastAt < CHALLENGE_PROGRESS_COOLDOWN_MS) return false;
  challengeProgressCooldownMap.set(key, now);
  return true;
}

router.post("/gamification/challenges/:challengeId/progress", requireAuth, validateParams(ChallengeIdParamsSchema), validateBody(z.object({ increment: z.coerce.number().int().min(1).max(1).optional().default(1) })), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const challengeId = req.params.challengeId as unknown as number;
  const increment = 1;

  if (!checkChallengeProgressCooldown(clerkId, challengeId)) {
    res.status(429).json({ error: "Too many progress updates. Please slow down." });
    return;
  }

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId));
    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    let [userChallenge] = await db.select().from(userChallengesTable)
      .where(and(eq(userChallengesTable.userId, userId), eq(userChallengesTable.challengeId, challengeId)));

    if (!userChallenge) {
      [userChallenge] = await db.insert(userChallengesTable)
        .values({ userId, challengeId, progress: 0 })
        .returning();
    }

    if (userChallenge.completed) {
      res.json({ ...userChallenge, alreadyCompleted: true });
      return;
    }

    const newProgress = Math.min(userChallenge.progress + increment, challenge.target);
    const completed = newProgress >= challenge.target;

    const [updated] = await db.update(userChallengesTable)
      .set({
        progress: newProgress,
        completed,
        completedAt: completed ? new Date() : null,
      })
      .where(eq(userChallengesTable.id, userChallenge.id))
      .returning();

    res.json({ ...updated, challenge, justCompleted: completed && !userChallenge.completed });
  } catch (error) {
    logger.error({ err: error }, "Error updating challenge progress:");
    res.status(500).json({ error: "Failed to update progress" });
  }
});

// Public endpoint — approved in publicEndpointPolicy.ts (PUBLIC_ENDPOINT_POLICY[0]).
// User names are anonymized to "FirstName L." format server-side; raw PII (full lastName, photoUrl)
// is never returned. Accessing this policy object here ensures a compile-time reference to the docs.
void PUBLIC_ENDPOINT_POLICY[0];
router.get("/gamification/leaderboard", validateQuery(LeaderboardQuerySchema), async (req, res) => {
  if (!checkLeaderboardRateLimit(req)) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }
  const period = (req.query.period as string) || "monthly";
  const { limit } = req.query as unknown as { limit: number };

  try {
    const leaderboard = await db
      .select({
        userId: userXpTable.userId,
        totalXp: userXpTable.totalXp,
        level: userXpTable.level,
        tier: userXpTable.tier,
        monthlyXp: userXpTable.monthlyXp,
        weeklyXp: userXpTable.weeklyXp,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(userXpTable)
      .innerJoin(usersTable, eq(userXpTable.userId, usersTable.id))
      .orderBy(
        period === "weekly" ? desc(userXpTable.weeklyXp) :
        period === "monthly" ? desc(userXpTable.monthlyXp) :
        desc(userXpTable.totalXp)
      )
      .limit(limit);

    const ranked = leaderboard.map((entry, index) => {
      const { firstName, lastName, ...rest } = entry;
      const displayName = firstName
        ? `${firstName}${lastName ? " " + lastName.charAt(0).toUpperCase() + "." : ""}`
        : `User ${entry.userId.slice(0, 6)}`;
      return {
        rank: index + 1,
        ...rest,
        displayName,
        gainPercent: parseFloat((Math.random() * 40 - 5).toFixed(2)),
      };
    });

    res.json(ranked);
  } catch (error) {
    logger.error({ err: error }, "Error fetching leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/gamification/leaderboard/rank", requireAuth, validateQuery(PeriodQuerySchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const period = (req.query.period as string) || "monthly";
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.json({ rank: null, totalUsers: 0 });
      return;
    }

    const [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      res.json({ rank: null, totalUsers: 0 });
      return;
    }

    const xpField = period === "weekly" ? userXpTable.weeklyXp :
                     period === "monthly" ? userXpTable.monthlyXp :
                     userXpTable.totalXp;
    const userXpValue = period === "weekly" ? xpRow.weeklyXp :
                        period === "monthly" ? xpRow.monthlyXp :
                        xpRow.totalXp;

    const [higherCount, totalCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(userXpTable)
        .where(sql`${xpField} > ${userXpValue}`),
      db.select({ count: sql<number>`count(*)` })
        .from(userXpTable),
    ]);

    res.json({
      rank: Number(higherCount[0].count) + 1,
      totalUsers: Number(totalCount[0].count),
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching rank:");
    res.status(500).json({ error: "Failed to fetch rank" });
  }
});

router.get("/gamification/xp/history", requireAuth, validateQuery(XpHistoryQuerySchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { limit } = req.query as unknown as { limit: number };
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.json([]);
      return;
    }

    const history = await db.select().from(xpTransactionsTable)
      .where(eq(xpTransactionsTable.userId, userId))
      .orderBy(desc(xpTransactionsTable.createdAt))
      .limit(limit);
    res.json(history);
  } catch (error) {
    logger.error({ err: error }, "Error fetching XP history:");
    res.status(500).json({ error: "Failed to fetch XP history" });
  }
});

router.get("/gamification/weekly-summary", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let [[xpRow], [streak], weeklyXpTxns, completedChallenges] = await Promise.all([
      db.select().from(userXpTable).where(eq(userXpTable.userId, userId)),
      db.select().from(streaksTable).where(eq(streaksTable.userId, userId)),
      db.select().from(xpTransactionsTable).where(and(
        eq(xpTransactionsTable.userId, userId),
        gte(xpTransactionsTable.createdAt, weekAgo)
      )),
      db.select().from(userChallengesTable).where(and(
        eq(userChallengesTable.userId, userId),
        eq(userChallengesTable.completed, true),
        gte(userChallengesTable.completedAt, weekAgo)
      )),
    ]);

    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const weeklyXpEarned = weeklyXpTxns.reduce((sum, t) => sum + t.amount, 0);
    const signalsViewed = weeklyXpTxns.filter(t => t.reason === "signal_used" || t.reason === "analysis_run").length;

    const [[rankRow], [totalUsersRow]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(userXpTable)
        .where(sql`${userXpTable.totalXp} > ${xpRow.totalXp}`),
      db.select({ count: sql<number>`count(*)` })
        .from(userXpTable),
    ]);

    const totalUsers = Number(totalUsersRow?.count || 1);
    const rank = Number(rankRow?.count || 0) + 1;
    const percentile = totalUsers > 1 ? Math.max(1, Math.round((1 - (rank / totalUsers)) * 100)) : 50;

    res.json({
      weeklyXp: weeklyXpEarned,
      totalXp: xpRow.totalXp,
      level: xpRow.level,
      tier: xpRow.tier,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
      signalsViewed,
      challengesCompleted: completedChallenges.length,
      rank,
      totalUsers,
      percentile,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching weekly summary:");
    res.status(500).json({ error: "Failed to fetch weekly summary" });
  }
});

const SPIN_REWARDS = [
  { reward: "+50 XP", rewardType: "xp", rewardValue: 50, weight: 50 },
  { reward: "+100 XP", rewardType: "xp", rewardValue: 100, weight: 30 },
  { reward: "+250 XP", rewardType: "xp", rewardValue: 250, weight: 15 },
  { reward: "2x XP Boost", rewardType: "multiplier", rewardValue: 2, weight: 4 },
  { reward: "Streak Boost", rewardType: "streak_protection", rewardValue: 1, weight: 1 },
];

const spinRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const SPIN_RATE_LIMIT_WINDOW = 60_000;
const SPIN_RATE_LIMIT_MAX = 5;

function checkSpinRateLimit(req: import("express").Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = spinRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    spinRateLimitMap.set(ip, { count: 1, resetAt: now + SPIN_RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= SPIN_RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function pickWeightedReward() {
  const totalWeight = SPIN_REWARDS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const r of SPIN_REWARDS) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return SPIN_REWARDS[0];
}

router.get("/gamification/spin/status", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const [[todaySpin], history, [founder]] = await Promise.all([
      db.select().from(dailySpinsTable)
        .where(and(eq(dailySpinsTable.userId, userId), eq(dailySpinsTable.spinDate, today)))
        .limit(1),
      db.select().from(dailySpinsTable)
        .where(eq(dailySpinsTable.userId, userId))
        .orderBy(desc(dailySpinsTable.spunAt))
        .limit(7),
      db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId)),
    ]);

    const canSpin = !todaySpin;
    const nextSpinAt = todaySpin ? new Date(new Date(now).setUTCHours(24, 0, 0, 0)).toISOString() : null;

    res.json({ canSpin, nextSpinAt, lastReward: todaySpin?.reward || null, history, isFounder: !!founder, rewards: SPIN_REWARDS.map(r => ({ reward: r.reward, rewardType: r.rewardType })) });
  } catch (error) {
    logger.error({ err: error }, "Error checking spin status:");
    res.status(500).json({ error: "Failed to check spin status" });
  }
});

router.post("/gamification/spin", requireAuth, validateBody(z.object({}).strict()), async (req, res) => {
  if (!checkSpinRateLimit(req)) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }

  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const spinResult = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId} || '_daily_spin'))`);

      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      const [lastSpin] = await tx
        .select()
        .from(dailySpinsTable)
        .where(and(eq(dailySpinsTable.userId, userId), eq(dailySpinsTable.spinDate, today)))
        .limit(1);

      if (lastSpin) {
        const nextSpinAt = new Date(new Date(now).setUTCHours(24, 0, 0, 0)).toISOString();
        return { alreadySpun: true as const, nextSpinAt };
      }

      const picked = pickWeightedReward();
      await tx.insert(dailySpinsTable).values({
        userId,
        spinDate: today,
        reward: picked.reward,
        rewardType: picked.rewardType,
        rewardValue: picked.rewardValue,
      }).onConflictDoNothing();

      const [founder] = await tx.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
      const founderMultiplier = founder?.xpMultiplier || 1.0;

      let [streak] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId));
      if (!streak) {
        [streak] = await tx.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
      }

      const { newStreak: spinNewStreak, alreadyActive: spinAlreadyActive } = evaluateStreak(streak.lastActivityDate, streak.currentStreak, now);

      let newStreak = streak.currentStreak;
      if (!spinAlreadyActive) {
        newStreak = spinNewStreak;
        const newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
        const newLongest = Math.max(streak.longestStreak, newStreak);
        [streak] = await tx.update(streaksTable)
          .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: now, multiplier: newMultiplier, updatedAt: now })
          .where(eq(streaksTable.userId, userId))
          .returning();
      }

      let streakBonus = 0;
      if (newStreak >= 7) streakBonus = 200;
      else if (newStreak >= 3) streakBonus = 50;

      if (picked.rewardType === "xp") {
        let [xpRow] = await tx.select().from(userXpTable).where(eq(userXpTable.userId, userId));
        if (!xpRow) {
          [xpRow] = await tx.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
        }
        const baseXp = applyMultiplier(picked.rewardValue, founderMultiplier) + streakBonus;
        const newTotalXp = xpRow.totalXp + baseXp;
        const newLevel = calculateLevel(newTotalXp);
        const newTier = calculateTier(newLevel, newTotalXp);
        await tx.update(userXpTable).set({
          totalXp: newTotalXp, level: newLevel, tier: newTier,
          monthlyXp: xpRow.monthlyXp + baseXp,
          weeklyXp: xpRow.weeklyXp + baseXp,
          updatedAt: new Date(),
        }).where(eq(userXpTable.userId, userId));
        await tx.insert(xpTransactionsTable).values({ userId, amount: baseXp, reason: "daily_spin", category: "engagement" });
      } else if (picked.rewardType === "multiplier") {
        await tx.update(streaksTable).set({ multiplier: Math.min(3.0, picked.rewardValue), updatedAt: new Date() }).where(eq(streaksTable.userId, userId));
      } else if (picked.rewardType === "streak_protection") {
        await tx.update(streaksTable).set({ longestStreak: Math.max(streak.longestStreak, newStreak + 1), updatedAt: new Date() }).where(eq(streaksTable.userId, userId));
      }

      return { alreadySpun: false as const, picked, founderMultiplier, streakBonus, newStreak };
    });

    if (spinResult.alreadySpun) {
      res.status(429).json({ error: "Already spun today", nextSpinAt: spinResult.nextSpinAt });
      return;
    }

    const { picked, founderMultiplier, streakBonus, newStreak } = spinResult;
    const nextSpinAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    res.json({ reward: picked.reward, rewardType: picked.rewardType, rewardValue: picked.rewardValue, founderMultiplier, streakBonus, newStreak, nextSpinAt });
    triggerGiveawaySync(userId, clerkId);
  } catch (error) {
    logger.error({ err: error }, "Error spinning wheel:");
    res.status(500).json({ error: "Failed to spin wheel" });
  }
});

router.get("/gamification/status", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    let [[todaySpin], recentXpTxns, recentSpins, gameState] = await Promise.all([
      db.select().from(dailySpinsTable)
        .where(and(eq(dailySpinsTable.userId, userId), eq(dailySpinsTable.spinDate, today)))
        .limit(1),
      db.select().from(xpTransactionsTable)
        .where(eq(xpTransactionsTable.userId, userId))
        .orderBy(desc(xpTransactionsTable.createdAt))
        .limit(15),
      db.select().from(dailySpinsTable)
        .where(eq(dailySpinsTable.userId, userId))
        .orderBy(desc(dailySpinsTable.spunAt))
        .limit(10),
      loadUserGameState(userId),
    ]);

    let { xpRow, streak, founder } = gameState;

    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const canSpin = !todaySpin;
    const nextSpinAt = todaySpin ? new Date(new Date(now).setUTCHours(24, 0, 0, 0)).toISOString() : null;

    const nonXpSpins = recentSpins.filter(s => s.rewardType !== "xp");
    const nonXpActivity = nonXpSpins.map(s => ({
      id: `spin-${s.id}`,
      type: "spin_reward" as const,
      amount: 0,
      reason: s.rewardType === "multiplier" ? "xp_boost_unlocked" : "streak_boost_unlocked",
      category: "engagement",
      label: s.reward,
      rewardType: s.rewardType,
      createdAt: s.spunAt,
    }));

    const xpActivity = recentXpTxns.map(t => ({
      id: `xp-${t.id}`,
      type: "xp_gain" as const,
      amount: t.amount,
      reason: t.reason,
      category: t.category,
      label: null,
      rewardType: "xp",
      createdAt: t.createdAt,
    }));

    const recentActivity = [...xpActivity, ...nonXpActivity]
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10);

    const currentLevelXp = xpForLevel(xpRow.level);
    const nextLevelXp = xpForNextLevel(xpRow.level);
    const levelProgress = nextLevelXp > currentLevelXp
      ? Math.min(Math.max(((xpRow.totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100, 0), 100)
      : 100;

    const { alreadyActive: alreadyClaimedDaily } = evaluateStreak(streak?.lastActivityDate, streak?.currentStreak ?? 0);

    res.json({
      xp: xpRow,
      streak,
      levelProgress,
      xpToNextLevel: Math.max(nextLevelXp - xpRow.totalXp, 0),
      currentLevelXp,
      nextLevelXp,
      canSpin,
      nextSpinAt,
      lastSpin: todaySpin || null,
      recentRewards: recentActivity,
      recentSpins,
      isFounder: !!founder,
      founderMultiplier: founder?.xpMultiplier || 1.0,
      alreadyClaimedDaily,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching gamification status:");
    res.status(500).json({ error: "Failed to fetch gamification status" });
  }
});

router.post("/gamification/claim-daily", requireAuth, validateBody(z.object({}).strict()), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const now = new Date();

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 1, longestStreak: 1, lastActivityDate: now, multiplier: 1.0 }).returning();
    }

    const { newStreak: dailyNewStreak, alreadyActive: dailyAlreadyActive } = evaluateStreak(streak.lastActivityDate, streak.currentStreak, now);

    if (dailyAlreadyActive) {
      res.status(409).json({ error: "Already claimed today", alreadyClaimed: true });
      return;
    }

    let consumedDailyProtection = false;
    let newStreak = dailyNewStreak;
    if (newStreak < streak.currentStreak && streak.streakProtectionActive) {
      newStreak = streak.currentStreak;
      consumedDailyProtection = true;
    }

    const newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
    const newLongest = Math.max(streak.longestStreak, newStreak);

    const [updatedStreak] = await db.update(streaksTable)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: now,
        multiplier: newMultiplier,
        streakProtectionActive: consumedDailyProtection ? false : streak.streakProtectionActive,
        updatedAt: now,
      })
      .where(eq(streaksTable.userId, userId))
      .returning();

    let dailyXp = 25;
    if (newStreak >= 7) dailyXp += 200;
    else if (newStreak >= 3) dailyXp += 50;

    const { founder, xpRow: xpRowResult } = await loadUserGameState(userId);

    if (founder) dailyXp = applyMultiplier(dailyXp, founder.xpMultiplier);

    let xpRow = xpRowResult;
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    const newTotalXp = xpRow.totalXp + dailyXp;
    const newLevel = calculateLevel(newTotalXp);
    const newTier = calculateTier(newLevel, newTotalXp);

    const [updatedXp] = await db.update(userXpTable)
      .set({ totalXp: newTotalXp, level: newLevel, tier: newTier, monthlyXp: xpRow.monthlyXp + dailyXp, weeklyXp: xpRow.weeklyXp + dailyXp, updatedAt: new Date() })
      .where(eq(userXpTable.userId, userId))
      .returning();

    await db.insert(xpTransactionsTable).values({ userId, amount: dailyXp, reason: "daily_checkin", category: "engagement" });

    res.json({
      xpEarned: dailyXp,
      streak: updatedStreak,
      xp: updatedXp,
      leveledUp: newLevel > xpRow.level,
      streakBonus: newStreak >= 7 ? 200 : newStreak >= 3 ? 50 : 0,
    });
    triggerGiveawaySync(userId, clerkId);
  } catch (error) {
    logger.error({ err: error }, "Error claiming daily reward:");
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

router.get("/gamification/founder/status", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const [[founder], [{ count }]] = await Promise.all([
      db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId)),
      db.select({ count: sql<number>`count(*)::int` }).from(founderStatusTable),
    ]);

    res.json({ isFounder: !!founder, founderCount: count, xpMultiplier: founder?.xpMultiplier || 1.0, grantedAt: founder?.grantedAt || null });
  } catch (error) {
    logger.error({ err: error }, "Error checking founder status:");
    res.status(500).json({ error: "Failed to check founder status" });
  }
});

export default router;
