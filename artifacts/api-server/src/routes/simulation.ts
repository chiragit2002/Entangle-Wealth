import { Router } from "express";
import { db } from "@workspace/db";
import {
  wealthProfilesTable,
  wealthSnapshotsTable,
  wealthMilestoneAchievementsTable,
  simulationRunsTable,
  userXpTable,
  xpTransactionsTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { calculateLevel, calculateTier } from "@workspace/xp";

const router = Router();

const MILESTONES = [
  { threshold: 10000, key: "net_worth_10k", label: "$10K Net Worth" },
  { threshold: 50000, key: "net_worth_50k", label: "$50K Net Worth" },
  { threshold: 100000, key: "net_worth_100k", label: "$100K Net Worth" },
  { threshold: 250000, key: "net_worth_250k", label: "$250K Net Worth" },
  { threshold: 500000, key: "net_worth_500k", label: "$500K Net Worth" },
  { threshold: 1000000, key: "net_worth_1m", label: "$1M Net Worth" },
];

function calculateProjections(params: {
  currentSavings: number;
  monthlyInvestment: number;
  savingsRate: number;
  annualIncome: number;
  expectedReturnRate: number;
  inflationRate: number;
  timeHorizonYears: number;
}): { year: number; netWorth: number; contributions: number; investmentGrowth: number; realValue: number }[] {
  const { currentSavings, monthlyInvestment, expectedReturnRate, inflationRate, timeHorizonYears } = params;
  const monthlyRate = expectedReturnRate / 100 / 12;
  const annualInflationRate = inflationRate / 100;

  const results = [];
  let currentValue = currentSavings;
  let totalContributions = currentSavings;

  for (let year = 1; year <= timeHorizonYears; year++) {
    const monthsInYear = 12;
    for (let m = 0; m < monthsInYear; m++) {
      currentValue = currentValue * (1 + monthlyRate) + monthlyInvestment;
      totalContributions += monthlyInvestment;
    }
    const investmentGrowth = currentValue - totalContributions;
    const inflationFactor = Math.pow(1 + annualInflationRate, year);
    const realValue = currentValue / inflationFactor;

    results.push({
      year,
      netWorth: Math.round(currentValue),
      contributions: Math.round(totalContributions),
      investmentGrowth: Math.round(Math.max(investmentGrowth, 0)),
      realValue: Math.round(realValue),
    });
  }

  return results;
}

async function awardXpIfEligible(userId: string, isFirstRun: boolean) {
  if (isFirstRun) {
    const amount = 100;
    await db.insert(xpTransactionsTable).values({
      userId,
      amount,
      reason: "first_simulation",
      category: "simulation",
    });
    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }
    const newTotalXp = xpRow.totalXp + amount;
    const newLevel = calculateLevel(newTotalXp);
    const newTier = calculateTier(newLevel, newTotalXp);
    await db.update(userXpTable)
      .set({
        totalXp: newTotalXp,
        level: newLevel,
        tier: newTier,
        monthlyXp: xpRow.monthlyXp + amount,
        weeklyXp: xpRow.weeklyXp + amount,
        updatedAt: new Date(),
      })
      .where(eq(userXpTable.userId, userId));
    return amount;
  }
  return 0;
}

router.get("/simulation/profile", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    let [profile] = await db.select().from(wealthProfilesTable).where(eq(wealthProfilesTable.userId, userId));
    if (!profile) {
      [profile] = await db.insert(wealthProfilesTable).values({ userId }).returning();
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching simulation profile:", error);
    res.status(500).json({ error: "Failed to fetch simulation profile" });
  }
});

router.post("/simulation/profile", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const {
    annualIncome,
    monthlyExpenses,
    savingsRate,
    currentSavings,
    monthlyInvestment,
    expectedReturnRate,
    inflationRate,
    timeHorizonYears,
    riskTolerance,
  } = req.body;

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (annualIncome !== undefined) updateData.annualIncome = Number(annualIncome);
    if (monthlyExpenses !== undefined) updateData.monthlyExpenses = Number(monthlyExpenses);
    if (savingsRate !== undefined) updateData.savingsRate = Math.min(Math.max(Number(savingsRate), 0), 100);
    if (currentSavings !== undefined) updateData.currentSavings = Number(currentSavings);
    if (monthlyInvestment !== undefined) updateData.monthlyInvestment = Number(monthlyInvestment);
    if (expectedReturnRate !== undefined) updateData.expectedReturnRate = Math.min(Math.max(Number(expectedReturnRate), 0), 30);
    if (inflationRate !== undefined) updateData.inflationRate = Math.min(Math.max(Number(inflationRate), 0), 15);
    if (timeHorizonYears !== undefined) updateData.timeHorizonYears = Math.min(Math.max(Number(timeHorizonYears), 1), 50);
    if (riskTolerance !== undefined) updateData.riskTolerance = String(riskTolerance);

    const existing = await db.select().from(wealthProfilesTable).where(eq(wealthProfilesTable.userId, userId));

    let profile;
    if (existing.length === 0) {
      [profile] = await db.insert(wealthProfilesTable).values({ userId, ...updateData }).returning();
    } else {
      [profile] = await db.update(wealthProfilesTable)
        .set(updateData)
        .where(eq(wealthProfilesTable.userId, userId))
        .returning();
    }

    res.json(profile);
  } catch (error) {
    console.error("Error saving simulation profile:", error);
    res.status(500).json({ error: "Failed to save simulation profile" });
  }
});

router.post("/simulation/project", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const {
    currentSavings = 0,
    monthlyInvestment = 500,
    savingsRate = 10,
    annualIncome = 60000,
    expectedReturnRate = 7,
    inflationRate = 3,
    timeHorizonYears = 30,
    saveSnapshot = false,
    snapshotLabel = "Simulation",
  } = req.body;

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const projections = calculateProjections({
      currentSavings: Number(currentSavings),
      monthlyInvestment: Number(monthlyInvestment),
      savingsRate: Number(savingsRate),
      annualIncome: Number(annualIncome),
      expectedReturnRate: Number(expectedReturnRate),
      inflationRate: Number(inflationRate),
      timeHorizonYears: Math.min(Math.max(Number(timeHorizonYears), 1), 50),
    });

    const finalNetWorth = projections[projections.length - 1]?.netWorth ?? 0;

    const existingRuns = await db.select().from(simulationRunsTable)
      .where(eq(simulationRunsTable.userId, userId))
      .limit(1);

    const isFirstRun = existingRuns.length === 0;

    await db.insert(simulationRunsTable).values({
      userId,
      isFirstRun,
      xpAwarded: isFirstRun,
    });

    let xpAwarded = 0;
    if (isFirstRun) {
      xpAwarded = await awardXpIfEligible(userId, true);
    }

    const crossedMilestones = MILESTONES.filter(m => finalNetWorth >= m.threshold);
    const newlyUnlocked: typeof MILESTONES = [];

    for (const milestone of crossedMilestones) {
      const existing = await db.select().from(wealthMilestoneAchievementsTable)
        .where(and(
          eq(wealthMilestoneAchievementsTable.userId, userId),
          eq(wealthMilestoneAchievementsTable.milestoneKey, milestone.key)
        ));

      if (existing.length === 0) {
        const projectionYear = projections.find(p => p.netWorth >= milestone.threshold)?.year;
        await db.insert(wealthMilestoneAchievementsTable).values({
          userId,
          milestoneThreshold: milestone.threshold,
          milestoneKey: milestone.key,
          projectedYear: projectionYear ?? null,
          celebrated: false,
        });

        const xpForMilestone = Math.min(50 + Math.floor(Math.log10(milestone.threshold)) * 10, 100);
        await db.insert(xpTransactionsTable).values({
          userId,
          amount: xpForMilestone,
          reason: `milestone_${milestone.key}`,
          category: "simulation",
        });
        let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
        if (!xpRow) {
          [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
        }
        const newTotalXp = xpRow.totalXp + xpForMilestone;
        const newLevel = calculateLevel(newTotalXp);
        const newTier = calculateTier(newLevel, newTotalXp);
        await db.update(userXpTable)
          .set({ totalXp: newTotalXp, level: newLevel, tier: newTier, monthlyXp: xpRow.monthlyXp + xpForMilestone, weeklyXp: xpRow.weeklyXp + xpForMilestone, updatedAt: new Date() })
          .where(eq(userXpTable.userId, userId));

        xpAwarded += xpForMilestone;
        newlyUnlocked.push(milestone);
      }
    }

    if (saveSnapshot) {
      await db.insert(wealthSnapshotsTable).values({
        userId,
        snapshotLabel: String(snapshotLabel).slice(0, 100),
        savingsRate: Number(savingsRate),
        monthlyInvestment: Number(monthlyInvestment),
        expectedReturnRate: Number(expectedReturnRate),
        timeHorizonYears: Number(timeHorizonYears),
        projectedNetWorth: finalNetWorth,
        projectionData: projections,
      });
    }

    res.json({
      projections,
      finalNetWorth,
      isFirstRun,
      xpAwarded,
      newMilestones: newlyUnlocked,
    });
  } catch (error) {
    console.error("Error running projection:", error);
    res.status(500).json({ error: "Failed to run projection" });
  }
});

router.get("/simulation/milestones", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const achieved = await db.select().from(wealthMilestoneAchievementsTable)
      .where(eq(wealthMilestoneAchievementsTable.userId, userId));

    const achievedKeys = new Set(achieved.map(a => a.milestoneKey));

    const result = MILESTONES.map(m => ({
      ...m,
      achieved: achievedKeys.has(m.key),
      achievedAt: achieved.find(a => a.milestoneKey === m.key)?.achievedAt ?? null,
      projectedYear: achieved.find(a => a.milestoneKey === m.key)?.projectedYear ?? null,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    res.status(500).json({ error: "Failed to fetch milestones" });
  }
});

router.get("/simulation/snapshots", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.json([]);
      return;
    }
    const snapshots = await db.select().from(wealthSnapshotsTable)
      .where(eq(wealthSnapshotsTable.userId, userId))
      .orderBy(desc(wealthSnapshotsTable.createdAt))
      .limit(10);
    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

export default router;
