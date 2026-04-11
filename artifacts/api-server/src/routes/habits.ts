import { Router } from "express";
import { db } from "@workspace/db";
import {
  habitDefinitionsTable,
  userHabitsTable,
  dailyActionCompletionsTable,
  userXpTable,
  xpTransactionsTable,
  streaksTable,
  founderStatusTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { validateBody, validateParams, validateQuery, z } from "../lib/validateRequest";

const router = Router();

async function awardHabitXp(userId: string, amount: number, habitSlug: string): Promise<number> {
  const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
  const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
  const multiplier = (streak?.multiplier || 1.0) * (founder?.xpMultiplier || 1.0);
  const finalAmount = Math.min(Math.round(amount * multiplier), 150);

  await db.insert(xpTransactionsTable).values({
    userId,
    amount: finalAmount,
    reason: `habit_${habitSlug}`,
    category: "habits",
  });

  let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
  if (!xpRow) {
    [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
  }

  const newTotal = xpRow.totalXp + finalAmount;
  const newLevel = Math.floor(Math.sqrt(newTotal / 100)) + 1;
  let newTier = "Bronze";
  if (newLevel >= 40 && newTotal >= 50000) newTier = "Diamond";
  else if (newLevel >= 30 && newTotal >= 25000) newTier = "Platinum";
  else if (newLevel >= 20 && newTotal >= 10000) newTier = "Gold";
  else if (newLevel >= 10 && newTotal >= 3000) newTier = "Silver";

  await db.update(userXpTable).set({
    totalXp: newTotal,
    level: newLevel,
    tier: newTier,
    monthlyXp: xpRow.monthlyXp + finalAmount,
    weeklyXp: xpRow.weeklyXp + finalAmount,
    updatedAt: new Date(),
  }).where(eq(userXpTable.userId, userId));

  return finalAmount;
}

router.get("/habits", async (_req, res) => {
  try {
    const habits = await db
      .select()
      .from(habitDefinitionsTable)
      .where(eq(habitDefinitionsTable.isActive, true))
      .orderBy(habitDefinitionsTable.category, habitDefinitionsTable.title);
    res.json(habits);
  } catch (error) {
    console.error("Error fetching habits:", error);
    res.status(500).json({ error: "Failed to fetch habits" });
  }
});

router.get("/habits/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const allHabits = await db
      .select()
      .from(habitDefinitionsTable)
      .where(eq(habitDefinitionsTable.isActive, true))
      .orderBy(habitDefinitionsTable.category, habitDefinitionsTable.title);

    const userHabits = await db
      .select()
      .from(userHabitsTable)
      .where(eq(userHabitsTable.userId, userId));

    const userHabitMap = new Map(userHabits.map(h => [h.habitId, h]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompletions = await db
      .select()
      .from(dailyActionCompletionsTable)
      .where(
        and(
          eq(dailyActionCompletionsTable.userId, userId),
          gte(dailyActionCompletionsTable.completedAt, today),
        )
      );

    const completedTodayIds = new Set(todayCompletions.map(c => c.habitId));

    const result = allHabits.map(h => {
      const userHabit = userHabitMap.get(h.id);
      return {
        ...h,
        currentStreak: userHabit?.currentStreak || 0,
        longestStreak: userHabit?.longestStreak || 0,
        totalCompletions: userHabit?.totalCompletions || 0,
        lastCompletedAt: userHabit?.lastCompletedAt || null,
        completedToday: completedTodayIds.has(h.id),
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching user habits:", error);
    res.status(500).json({ error: "Failed to fetch user habits" });
  }
});

const HabitCompleteParamsSchema = z.object({
  habitId: z.coerce.number().int().positive(),
});

router.post("/habits/:habitId/complete", requireAuth, validateParams(HabitCompleteParamsSchema), validateBody(z.object({}).strict()), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const habitId = parseInt(req.params.habitId);

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [habit] = await db
      .select()
      .from(habitDefinitionsTable)
      .where(eq(habitDefinitionsTable.id, habitId));

    if (!habit) {
      res.status(404).json({ error: "Habit not found" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingToday] = await db
      .select()
      .from(dailyActionCompletionsTable)
      .where(
        and(
          eq(dailyActionCompletionsTable.userId, userId),
          eq(dailyActionCompletionsTable.habitId, habitId),
          gte(dailyActionCompletionsTable.completedAt, today),
        )
      );

    if (existingToday) {
      res.json({ alreadyCompletedToday: true, xpAwarded: 0 });
      return;
    }

    const now = new Date();
    let [userHabit] = await db
      .select()
      .from(userHabitsTable)
      .where(and(eq(userHabitsTable.userId, userId), eq(userHabitsTable.habitId, habitId)));

    let newStreak = 1;
    if (userHabit?.lastCompletedAt) {
      const lastDate = new Date(userHabit.lastCompletedAt);
      lastDate.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate.getTime() === yesterday.getTime()) {
        newStreak = (userHabit.currentStreak || 0) + 1;
      } else if (lastDate.getTime() === today.getTime()) {
        newStreak = userHabit.currentStreak || 1;
      }
    }

    const newLongest = Math.max(newStreak, userHabit?.longestStreak || 0);
    const newTotal = (userHabit?.totalCompletions || 0) + 1;

    if (!userHabit) {
      [userHabit] = await db.insert(userHabitsTable).values({
        userId,
        habitId,
        currentStreak: newStreak,
        longestStreak: newLongest,
        totalCompletions: newTotal,
        lastCompletedAt: now,
      }).returning();
    } else {
      [userHabit] = await db.update(userHabitsTable)
        .set({
          currentStreak: newStreak,
          longestStreak: newLongest,
          totalCompletions: newTotal,
          lastCompletedAt: now,
          updatedAt: now,
        })
        .where(and(eq(userHabitsTable.userId, userId), eq(userHabitsTable.habitId, habitId)))
        .returning();
    }

    const streakBonus = newStreak >= 7 ? 1.5 : newStreak >= 3 ? 1.2 : 1.0;
    const baseXp = habit.xpReward;
    const xpBefore = Math.round(baseXp * streakBonus);

    const xpAwarded = await awardHabitXp(userId, xpBefore, habit.slug);

    await db.insert(dailyActionCompletionsTable).values({
      userId,
      habitId,
      xpAwarded,
    });

    res.json({
      success: true,
      xpAwarded,
      streak: newStreak,
      longestStreak: newLongest,
      totalCompletions: newTotal,
      streakBonus: streakBonus > 1 ? streakBonus : null,
    });
  } catch (error) {
    console.error("Error completing habit:", error);
    res.status(500).json({ error: "Failed to complete habit" });
  }
});

router.get("/habits/summary", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyActionCompletionsTable)
      .where(
        and(
          eq(dailyActionCompletionsTable.userId, userId),
          gte(dailyActionCompletionsTable.completedAt, today),
        )
      );

    const [weekCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyActionCompletionsTable)
      .where(
        and(
          eq(dailyActionCompletionsTable.userId, userId),
          gte(dailyActionCompletionsTable.completedAt, weekAgo),
        )
      );

    const allUserHabits = await db
      .select()
      .from(userHabitsTable)
      .where(eq(userHabitsTable.userId, userId));

    const maxStreak = allUserHabits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
    const totalCompletions = allUserHabits.reduce((sum, h) => sum + h.totalCompletions, 0);

    const totalHabits = await db
      .select({ count: sql<number>`count(*)` })
      .from(habitDefinitionsTable)
      .where(eq(habitDefinitionsTable.isActive, true));

    res.json({
      completedToday: Number(todayCount.count),
      completedThisWeek: Number(weekCount.count),
      totalHabits: Number(totalHabits[0].count),
      maxCurrentStreak: maxStreak,
      totalLifetimeCompletions: totalCompletions,
    });
  } catch (error) {
    console.error("Error fetching habit summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

router.get("/habits/history", requireAuth, validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(50).optional().default(20) })), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.json([]);
      return;
    }

    const history = await db
      .select({
        completion: dailyActionCompletionsTable,
        habit: habitDefinitionsTable,
      })
      .from(dailyActionCompletionsTable)
      .innerJoin(habitDefinitionsTable, eq(dailyActionCompletionsTable.habitId, habitDefinitionsTable.id))
      .where(eq(dailyActionCompletionsTable.userId, userId))
      .orderBy(desc(dailyActionCompletionsTable.completedAt))
      .limit(limit);

    res.json(history.map(h => ({
      ...h.completion,
      habit: h.habit,
    })));
  } catch (error) {
    console.error("Error fetching habit history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
