import { Router } from "express";
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

const router = Router();

const TIER_THRESHOLDS = [
  { tier: "Diamond", minLevel: 40, minXp: 50000 },
  { tier: "Platinum", minLevel: 30, minXp: 25000 },
  { tier: "Gold", minLevel: 20, minXp: 10000 },
  { tier: "Silver", minLevel: 10, minXp: 3000 },
  { tier: "Bronze", minLevel: 1, minXp: 0 },
];

function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

function calculateTier(level: number, totalXp: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (level >= t.minLevel && totalXp >= t.minXp) return t.tier;
  }
  return "Bronze";
}

function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
}

function xpForNextLevel(level: number): number {
  return level * level * 100;
}

router.get("/gamification/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const earnedBadges = await db
      .select({ badge: badgesTable, earnedAt: userBadgesTable.earnedAt })
      .from(userBadgesTable)
      .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
      .where(eq(userBadgesTable.userId, userId));

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
    console.error("Error fetching gamification data:", error);
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

router.post("/gamification/xp", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { reason, category } = req.body;
  if (!reason || !category) {
    res.status(400).json({ error: "reason and category are required" });
    return;
  }

  const categoryRewards = XP_REWARDS[category];
  if (!categoryRewards || !(reason in categoryRewards)) {
    res.status(400).json({ error: "Invalid category or reason" });
    return;
  }

  const baseAmount = categoryRewards[reason];

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    const multiplier = streak?.multiplier || 1.0;
    const finalAmount = Math.min(Math.round(baseAmount * multiplier), MAX_XP_PER_ACTION);

    await db.insert(xpTransactionsTable).values({ userId, amount: finalAmount, reason, category });

    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    const newTotalXp = xpRow.totalXp + finalAmount;
    const newLevel = calculateLevel(newTotalXp);
    const newTier = calculateTier(newLevel, newTotalXp);

    const [updated] = await db.update(userXpTable)
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

    res.json({
      xp: updated,
      xpEarned: finalAmount,
      multiplier,
      leveledUp: newLevel > xpRow.level,
      tierChanged: newTier !== xpRow.tier,
    });
  } catch (error) {
    console.error("Error adding XP:", error);
    res.status(500).json({ error: "Failed to add XP" });
  }
});

router.post("/gamification/streak/checkin", requireAuth, async (req, res) => {
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

    const { newStreak, alreadyActive } = evaluateStreak(streak.lastActivityDate, streak.currentStreak, now);

    if (alreadyActive) {
      res.json({ ...streak, alreadyCheckedIn: true });
      return;
    }

    const newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
    const newLongest = Math.max(streak.longestStreak, newStreak);

    const [updated] = await db.update(streaksTable)
      .set({
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActivityDate: now,
        multiplier: newMultiplier,
        updatedAt: now,
      })
      .where(eq(streaksTable.userId, userId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error checking in streak:", error);
    res.status(500).json({ error: "Failed to check in" });
  }
});

router.get("/gamification/badges", async (_req, res) => {
  try {
    const badges = await db.select().from(badgesTable).orderBy(badgesTable.category, badgesTable.name);
    res.json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
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

    const allBadges = await db.select().from(badgesTable).orderBy(badgesTable.category, badgesTable.name);
    const earned = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
    const earnedIds = new Set(earned.map(e => e.badgeId));

    const result = allBadges.map(b => ({
      ...b,
      earned: earnedIds.has(b.id),
      earnedAt: earned.find(e => e.badgeId === b.id)?.earnedAt || null,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching user badges:", error);
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
    console.error("Error fetching challenges:", error);
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
    console.error("Error fetching user challenges:", error);
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

router.post("/gamification/challenges/:challengeId/progress", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const challengeId = parseInt(req.params.challengeId);
  const rawIncrement = parseInt(req.body.increment) || 1;
  const increment = Math.min(Math.max(rawIncrement, 1), 1);

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
    console.error("Error updating challenge progress:", error);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

router.get("/gamification/leaderboard", async (req, res) => {
  const period = (req.query.period as string) || "monthly";
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

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
        photoUrl: usersTable.photoUrl,
      })
      .from(userXpTable)
      .innerJoin(usersTable, eq(userXpTable.userId, usersTable.id))
      .orderBy(
        period === "weekly" ? desc(userXpTable.weeklyXp) :
        period === "monthly" ? desc(userXpTable.monthlyXp) :
        desc(userXpTable.totalXp)
      )
      .limit(limit);

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      gainPercent: parseFloat((Math.random() * 40 - 5).toFixed(2)),
    }));

    res.json(ranked);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/gamification/leaderboard/rank", requireAuth, async (req, res) => {
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

    const higherCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userXpTable)
      .where(sql`${xpField} > ${userXpValue}`);

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userXpTable);

    res.json({
      rank: Number(higherCount[0].count) + 1,
      totalUsers: Number(totalCount[0].count),
    });
  } catch (error) {
    console.error("Error fetching rank:", error);
    res.status(500).json({ error: "Failed to fetch rank" });
  }
});

router.get("/gamification/xp/history", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
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
    console.error("Error fetching XP history:", error);
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

    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const weeklyXpTxns = await db
      .select()
      .from(xpTransactionsTable)
      .where(and(
        eq(xpTransactionsTable.userId, userId),
        gte(xpTransactionsTable.createdAt, weekAgo)
      ));

    const weeklyXpEarned = weeklyXpTxns.reduce((sum, t) => sum + t.amount, 0);
    const signalsViewed = weeklyXpTxns.filter(t => t.reason === "signal_used" || t.reason === "analysis_run").length;

    const completedChallenges = await db
      .select()
      .from(userChallengesTable)
      .where(and(
        eq(userChallengesTable.userId, userId),
        eq(userChallengesTable.completed, true),
        gte(userChallengesTable.completedAt, weekAgo)
      ));

    const [rankRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userXpTable)
      .where(sql`${userXpTable.totalXp} > ${xpRow.totalXp}`);

    const [totalUsersRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userXpTable);

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
    console.error("Error fetching weekly summary:", error);
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

    const [lastSpin] = await db
      .select()
      .from(dailySpinsTable)
      .where(eq(dailySpinsTable.userId, userId))
      .orderBy(desc(dailySpinsTable.spunAt))
      .limit(1);

    const now = new Date();
    const canSpin = !lastSpin || (now.getTime() - new Date(lastSpin.spunAt!).getTime()) >= 24 * 60 * 60 * 1000;
    const nextSpinAt = lastSpin ? new Date(new Date(lastSpin.spunAt!).getTime() + 24 * 60 * 60 * 1000).toISOString() : null;

    const history = await db
      .select()
      .from(dailySpinsTable)
      .where(eq(dailySpinsTable.userId, userId))
      .orderBy(desc(dailySpinsTable.spunAt))
      .limit(7);

    const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));

    res.json({ canSpin, nextSpinAt, lastReward: lastSpin?.reward || null, history, isFounder: !!founder, rewards: SPIN_REWARDS.map(r => ({ reward: r.reward, rewardType: r.rewardType })) });
  } catch (error) {
    console.error("Error checking spin status:", error);
    res.status(500).json({ error: "Failed to check spin status" });
  }
});

router.post("/gamification/spin", requireAuth, async (req, res) => {
  if (!checkSpinRateLimit(req)) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return;
  }

  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId} || '_daily_spin'))`);

      const [lastSpin] = await tx
        .select()
        .from(dailySpinsTable)
        .where(eq(dailySpinsTable.userId, userId))
        .orderBy(desc(dailySpinsTable.spunAt))
        .limit(1);

      const now = new Date();
      if (lastSpin && (now.getTime() - new Date(lastSpin.spunAt!).getTime()) < 24 * 60 * 60 * 1000) {
        const nextSpinAt = new Date(new Date(lastSpin.spunAt!).getTime() + 24 * 60 * 60 * 1000).toISOString();
        return { alreadySpun: true, nextSpinAt };
      }

      const picked = pickWeightedReward();

      await tx.insert(dailySpinsTable).values({
        userId,
        reward: picked.reward,
        rewardType: picked.rewardType,
        rewardValue: picked.rewardValue,
      });

      return { alreadySpun: false, picked, now };
    });

    if (result.alreadySpun) {
      res.status(429).json({ error: "Already spun today", nextSpinAt: result.nextSpinAt });
      return;
    }

    const picked = result.picked!;
    const now = result.now!;

    const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
    const founderMultiplier = founder?.xpMultiplier || 1.0;

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const { newStreak: spinNewStreak, alreadyActive: spinAlreadyActive } = evaluateStreak(streak.lastActivityDate, streak.currentStreak, now);

    let newStreak = streak.currentStreak;
    if (!spinAlreadyActive) {
      newStreak = spinNewStreak;
      const newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
      const newLongest = Math.max(streak.longestStreak, newStreak);
      [streak] = await db.update(streaksTable)
        .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: now, multiplier: newMultiplier, updatedAt: now })
        .where(eq(streaksTable.userId, userId))
        .returning();
    }

    let streakBonus = 0;
    if (newStreak >= 7) streakBonus = 200;
    else if (newStreak >= 3) streakBonus = 50;

    if (picked.rewardType === "xp") {
      let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
      if (!xpRow) {
        [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
      }
      const baseXp = Math.round(picked.rewardValue * founderMultiplier) + streakBonus;
      const newTotalXp = xpRow.totalXp + baseXp;
      const newLevel = calculateLevel(newTotalXp);
      const newTier = calculateTier(newLevel, newTotalXp);
      await db.update(userXpTable).set({
        totalXp: newTotalXp, level: newLevel, tier: newTier,
        monthlyXp: xpRow.monthlyXp + baseXp,
        weeklyXp: xpRow.weeklyXp + baseXp,
        updatedAt: new Date(),
      }).where(eq(userXpTable.userId, userId));
      await db.insert(xpTransactionsTable).values({ userId, amount: baseXp, reason: "daily_spin", category: "engagement" });
    } else if (picked.rewardType === "multiplier") {
      await db.update(streaksTable).set({ multiplier: Math.min(3.0, picked.rewardValue), updatedAt: new Date() }).where(eq(streaksTable.userId, userId));
    } else if (picked.rewardType === "streak_protection") {
      await db.update(streaksTable).set({ longestStreak: Math.max(streak.longestStreak, newStreak + 1), updatedAt: new Date() }).where(eq(streaksTable.userId, userId));
    }

    const nextSpinAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    res.json({ reward: picked.reward, rewardType: picked.rewardType, rewardValue: picked.rewardValue, founderMultiplier, streakBonus, newStreak, nextSpinAt });
  } catch (error) {
    console.error("Error spinning wheel:", error);
    res.status(500).json({ error: "Failed to spin wheel" });
  }
});

router.get("/gamification/status", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    let [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streak) {
      [streak] = await db.insert(streaksTable).values({ userId, currentStreak: 0, longestStreak: 0, multiplier: 1.0 }).returning();
    }

    const [lastSpin] = await db
      .select()
      .from(dailySpinsTable)
      .where(eq(dailySpinsTable.userId, userId))
      .orderBy(desc(dailySpinsTable.spunAt))
      .limit(1);

    const now = new Date();
    const canSpin = !lastSpin || (now.getTime() - new Date(lastSpin.spunAt!).getTime()) >= 24 * 60 * 60 * 1000;
    const nextSpinAt = lastSpin ? new Date(new Date(lastSpin.spunAt!).getTime() + 24 * 60 * 60 * 1000).toISOString() : null;

    const recentXpTxns = await db
      .select()
      .from(xpTransactionsTable)
      .where(eq(xpTransactionsTable.userId, userId))
      .orderBy(desc(xpTransactionsTable.createdAt))
      .limit(15);

    const recentSpins = await db
      .select()
      .from(dailySpinsTable)
      .where(eq(dailySpinsTable.userId, userId))
      .orderBy(desc(dailySpinsTable.spunAt))
      .limit(10);

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

    const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));

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
      lastSpin: lastSpin || null,
      recentRewards: recentActivity,
      recentSpins,
      isFounder: !!founder,
      founderMultiplier: founder?.xpMultiplier || 1.0,
      alreadyClaimedDaily,
    });
  } catch (error) {
    console.error("Error fetching gamification status:", error);
    res.status(500).json({ error: "Failed to fetch gamification status" });
  }
});

router.post("/gamification/claim-daily", requireAuth, async (req, res) => {
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

    const newStreak = dailyNewStreak;
    const newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
    const newLongest = Math.max(streak.longestStreak, newStreak);

    const [updatedStreak] = await db.update(streaksTable)
      .set({ currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: now, multiplier: newMultiplier, updatedAt: now })
      .where(eq(streaksTable.userId, userId))
      .returning();

    let dailyXp = 25;
    if (newStreak >= 7) dailyXp += 200;
    else if (newStreak >= 3) dailyXp += 50;

    const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
    if (founder) dailyXp = Math.round(dailyXp * founder.xpMultiplier);

    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
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
  } catch (error) {
    console.error("Error claiming daily reward:", error);
    res.status(500).json({ error: "Failed to claim daily reward" });
  }
});

router.get("/gamification/founder/status", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(founderStatusTable);

    res.json({ isFounder: !!founder, founderCount: count, xpMultiplier: founder?.xpMultiplier || 1.0, grantedAt: founder?.grantedAt || null });
  } catch (error) {
    console.error("Error checking founder status:", error);
    res.status(500).json({ error: "Failed to check founder status" });
  }
});

export default router;
