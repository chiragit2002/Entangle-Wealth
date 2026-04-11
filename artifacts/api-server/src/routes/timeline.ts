import { Router } from "express";
import { db } from "@workspace/db";
import {
  timelinesTable,
  timelineResultsTable,
  timelineComparisonsTable,
  userIdentityStagesTable,
  userXpTable,
  xpTransactionsTable,
  streaksTable,
  founderStatusTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { getAuth } from "@clerk/express";
import { calculateLevel, calculateTier } from "@workspace/xp";

const router = Router();

interface TimelineParams {
  monthlyIncome: number;
  savingsRate: number;
  monthlyDebt: number;
  investmentRate: number;
  currentNetWorth: number;
  emergencyFundMonths: number;
}

interface HorizonResult {
  horizon: string;
  months: number;
  projectedNetWorth: number;
  savingsAccumulated: number;
  debtRemaining: number;
  investmentValue: number;
  stabilityScore: number;
  stressIndex: number;
  opportunityScore: number;
  milestones: string[];
}

const HORIZONS = [
  { label: "30d", months: 1 },
  { label: "90d", months: 3 },
  { label: "180d", months: 6 },
  { label: "1yr", months: 12 },
  { label: "5yr", months: 60 },
  { label: "10yr", months: 120 },
  { label: "20yr", months: 240 },
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function simulateHorizon(params: TimelineParams, months: number): HorizonResult {
  const {
    monthlyIncome,
    savingsRate,
    monthlyDebt,
    investmentRate,
    currentNetWorth,
    emergencyFundMonths,
  } = params;

  const monthlySavings = monthlyIncome * savingsRate;
  const monthlyExpenses = monthlyIncome * (1 - savingsRate) - monthlyDebt;
  const monthlyInvestment = monthlySavings * 0.6;
  const monthlyLiquidSavings = monthlySavings * 0.4;

  const monthlyRate = investmentRate / 12;

  let savingsAccumulated = 0;
  let debtRemaining = monthlyDebt * 36;
  let investmentValue = Math.max(0, currentNetWorth * 0.5);
  let liquidSavings = monthlyIncome * emergencyFundMonths;

  for (let m = 1; m <= months; m++) {
    const debtPayment = Math.min(debtRemaining, monthlyDebt);
    debtRemaining = Math.max(0, debtRemaining - debtPayment);

    savingsAccumulated += monthlyLiquidSavings;
    liquidSavings += monthlyLiquidSavings;

    investmentValue = investmentValue * (1 + monthlyRate) + monthlyInvestment;
  }

  const projectedNetWorth = currentNetWorth + savingsAccumulated + investmentValue - debtRemaining;

  const debtToIncomeRatio = (debtRemaining / Math.max(1, monthlyIncome * 12));
  const emergencyFundCoverage = liquidSavings / Math.max(1, monthlyExpenses * 3);

  const stabilityScore = clamp(
    40 +
      (savingsRate > 0.2 ? 20 : savingsRate * 100) +
      (debtToIncomeRatio < 0.3 ? 20 : Math.max(0, 20 - debtToIncomeRatio * 30)) +
      Math.min(20, emergencyFundCoverage * 10),
    0,
    100
  );

  const stressIndex = clamp(
    100 -
      (savingsRate * 80) -
      (debtRemaining < 1000 ? 15 : 0) -
      Math.min(20, (monthlyIncome - monthlyDebt * 2) / 100),
    5,
    95
  );

  const opportunityScore = clamp(
    (savingsRate * 100 * 0.4) +
      (investmentValue / Math.max(1, monthlyIncome * months) * 30) +
      (debtRemaining < 1 ? 30 : Math.max(0, 30 - debtToIncomeRatio * 40)),
    0,
    100
  );

  const milestones: string[] = [];
  const efTarget = monthlyExpenses * 6;
  if (liquidSavings >= efTarget && emergencyFundMonths < 6) {
    milestones.push("Emergency Fund Built");
  }
  if (debtRemaining < 1) {
    milestones.push("Debt-Free");
  }
  if (months >= 24 && investmentValue > monthlyIncome * 6) {
    milestones.push("Investment Compounding Phase");
  }
  if (stabilityScore >= 75 && savingsRate >= 0.2) {
    milestones.push("Financial Flexibility Achieved");
  }

  const horizonLabel = HORIZONS.find(h => h.months === months)?.label || `${months}mo`;

  return {
    horizon: horizonLabel,
    months,
    projectedNetWorth: Math.round(projectedNetWorth * 100) / 100,
    savingsAccumulated: Math.round(savingsAccumulated * 100) / 100,
    debtRemaining: Math.round(debtRemaining * 100) / 100,
    investmentValue: Math.round(investmentValue * 100) / 100,
    stabilityScore: Math.round(stabilityScore * 10) / 10,
    stressIndex: Math.round(stressIndex * 10) / 10,
    opportunityScore: Math.round(opportunityScore * 10) / 10,
    milestones,
  };
}

function validateParams(body: unknown): { params: TimelineParams; error?: string } {
  const b = body as Record<string, unknown>;
  const monthlyIncome = Number(b.monthlyIncome) || 0;
  const savingsRate = Number(b.savingsRate) || 0;
  const monthlyDebt = Number(b.monthlyDebt) || 0;
  const investmentRate = Number(b.investmentRate) || 0.07;
  const currentNetWorth = Number(b.currentNetWorth) || 0;
  const emergencyFundMonths = Number(b.emergencyFundMonths) || 0;

  if (monthlyIncome < 0 || monthlyIncome > 1000000) return { params: {} as TimelineParams, error: "Invalid income" };
  if (savingsRate < 0 || savingsRate > 1) return { params: {} as TimelineParams, error: "Savings rate must be 0-1" };
  if (monthlyDebt < 0 || monthlyDebt > monthlyIncome * 2) return { params: {} as TimelineParams, error: "Invalid debt amount" };
  if (investmentRate < 0 || investmentRate > 0.5) return { params: {} as TimelineParams, error: "Invalid investment rate (0-50%)" };

  return {
    params: {
      monthlyIncome: clamp(monthlyIncome, 0, 1000000),
      savingsRate: clamp(savingsRate, 0, 1),
      monthlyDebt: clamp(monthlyDebt, 0, monthlyIncome),
      investmentRate: clamp(investmentRate, 0, 0.5),
      currentNetWorth: clamp(currentNetWorth, -5000000, 50000000),
      emergencyFundMonths: clamp(emergencyFundMonths, 0, 24),
    },
  };
}

async function awardXp(userId: string, amount: number, reason: string, category: string) {
  try {
    const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    const [founder] = await db.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
    const multiplier = (streak?.multiplier || 1.0) * (founder?.xpMultiplier || 1.0);
    const finalAmount = Math.min(Math.round(amount * multiplier), 150);

    await db.insert(xpTransactionsTable).values({ userId, amount: finalAmount, reason, category });

    let [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
    if (!xpRow) {
      [xpRow] = await db.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
    }

    const newTotal = xpRow.totalXp + finalAmount;
    const newLevel = calculateLevel(newTotal);
    const newTier = calculateTier(newLevel, newTotal);

    await db.update(userXpTable).set({
      totalXp: newTotal,
      level: newLevel,
      tier: newTier,
      monthlyXp: xpRow.monthlyXp + finalAmount,
      weeklyXp: xpRow.weeklyXp + finalAmount,
      updatedAt: new Date(),
    }).where(eq(userXpTable.userId, userId));
  } catch {}
}

function getIdentityStageFromCounts(simulations: number, snapshots: number, scenarios: number): string {
  const total = simulations + snapshots * 2 + scenarios;
  if (total >= 30) return "Strategic";
  if (total >= 15) return "Building";
  if (total >= 5) return "Experimenting";
  return "Aware";
}

async function updateIdentityStage(userId: string, field: "simulationsRun" | "snapshotsSaved" | "scenariosExplored") {
  try {
    let [stage] = await db.select().from(userIdentityStagesTable).where(eq(userIdentityStagesTable.userId, userId));
    if (!stage) {
      [stage] = await db.insert(userIdentityStagesTable).values({ userId }).returning();
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    let sims = stage.simulationsRun;
    let snaps = stage.snapshotsSaved;
    let scens = stage.scenariosExplored;

    if (field === "simulationsRun") { updates.simulationsRun = sims + 1; sims++; }
    if (field === "snapshotsSaved") { updates.snapshotsSaved = snaps + 1; snaps++; }
    if (field === "scenariosExplored") { updates.scenariosExplored = scens + 1; scens++; }

    const newStage = getIdentityStageFromCounts(sims, snaps, scens);
    const oldStage = stage.stage;
    updates.stage = newStage;

    await db.update(userIdentityStagesTable).set(updates as Parameters<typeof db.update>[0]).where(eq(userIdentityStagesTable.userId, userId));

    if (newStage !== oldStage) {
      await awardXp(userId, 50, `stage_transition_${newStage.toLowerCase()}`, "timeline");
    }

    return newStage;
  } catch {
    return "Aware";
  }
}

router.post("/timeline/simulate", async (req, res) => {
  const { params, error } = validateParams(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  try {
    const results = HORIZONS.map(h => simulateHorizon(params, h.months));

    const { userId: clerkId } = getAuth(req);
    if (clerkId) {
      const userId = await resolveUserId(clerkId, req);
      if (userId) {
        await Promise.all([
          awardXp(userId, 15, "timeline_simulated", "timeline"),
          updateIdentityStage(userId, "simulationsRun"),
        ]);
      }
    }

    res.json({ params, results, simulatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Simulation error:", err);
    res.status(500).json({ error: "Simulation failed" });
  }
});

router.post("/timeline/save", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const { name, annotation, isBaseline, ...bodyParams } = req.body;
    const { params, error } = validateParams(bodyParams);
    if (error) { res.status(400).json({ error }); return; }

    const [timeline] = await db.insert(timelinesTable).values({
      userId,
      name: String(name || "My Timeline").slice(0, 100),
      annotation: annotation ? String(annotation).slice(0, 500) : null,
      isBaseline: Boolean(isBaseline),
      ...params,
    }).returning();

    const results = HORIZONS.map(h => simulateHorizon(params, h.months));
    const resultRows = results.map(r => ({
      timelineId: timeline.id,
      horizon: r.horizon,
      projectedNetWorth: r.projectedNetWorth,
      savingsAccumulated: r.savingsAccumulated,
      debtRemaining: r.debtRemaining,
      investmentValue: r.investmentValue,
      stabilityScore: r.stabilityScore,
      stressIndex: r.stressIndex,
      opportunityScore: r.opportunityScore,
      milestones: r.milestones,
    }));

    await db.insert(timelineResultsTable).values(resultRows);

    await Promise.all([
      awardXp(userId, 25, "timeline_saved", "timeline"),
      updateIdentityStage(userId, "snapshotsSaved"),
    ]);

    res.json({ timeline, results });
  } catch (err) {
    console.error("Save timeline error:", err);
    res.status(500).json({ error: "Failed to save timeline" });
  }
});

router.get("/timeline/saved", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.json([]); return; }

    const timelines = await db.select().from(timelinesTable)
      .where(eq(timelinesTable.userId, userId))
      .orderBy(desc(timelinesTable.createdAt))
      .limit(20);

    const results: Record<number, unknown[]> = {};
    for (const t of timelines) {
      const rows = await db.select().from(timelineResultsTable).where(eq(timelineResultsTable.timelineId, t.id));
      results[t.id] = rows;
    }

    res.json(timelines.map(t => ({ ...t, results: results[t.id] || [] })));
  } catch (err) {
    console.error("Get saved timelines error:", err);
    res.status(500).json({ error: "Failed to fetch timelines" });
  }
});

router.get("/timeline/:id", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const timelineId = parseInt(req.params.id);
  if (isNaN(timelineId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const [timeline] = await db.select().from(timelinesTable)
      .where(and(eq(timelinesTable.id, timelineId), eq(timelinesTable.userId, userId)));

    if (!timeline) { res.status(404).json({ error: "Timeline not found" }); return; }

    const results = await db.select().from(timelineResultsTable).where(eq(timelineResultsTable.timelineId, timelineId));

    res.json({ ...timeline, results });
  } catch (err) {
    console.error("Get timeline error:", err);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

router.delete("/timeline/:id", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const timelineId = parseInt(req.params.id);
  if (isNaN(timelineId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const [timeline] = await db.select().from(timelinesTable)
      .where(and(eq(timelinesTable.id, timelineId), eq(timelinesTable.userId, userId)));

    if (!timeline) { res.status(404).json({ error: "Timeline not found" }); return; }

    await db.delete(timelinesTable).where(eq(timelinesTable.id, timelineId));
    res.json({ success: true });
  } catch (err) {
    console.error("Delete timeline error:", err);
    res.status(500).json({ error: "Failed to delete timeline" });
  }
});

router.post("/timeline/compare", async (req, res) => {
  try {
    const { paramsA, paramsB } = req.body as { paramsA: unknown; paramsB: unknown };

    const validA = validateParams(paramsA);
    const validB = validateParams(paramsB);

    if (validA.error) { res.status(400).json({ error: `Timeline A: ${validA.error}` }); return; }
    if (validB.error) { res.status(400).json({ error: `Timeline B: ${validB.error}` }); return; }

    const resultsA = HORIZONS.map(h => simulateHorizon(validA.params, h.months));
    const resultsB = HORIZONS.map(h => simulateHorizon(validB.params, h.months));

    const deltas = resultsA.map((a, i) => {
      const b = resultsB[i];
      return {
        horizon: a.horizon,
        deltaNetWorth: Math.round((b.projectedNetWorth - a.projectedNetWorth) * 100) / 100,
        deltaStress: Math.round((a.stressIndex - b.stressIndex) * 10) / 10,
        deltaOpportunity: Math.round((b.opportunityScore - a.opportunityScore) * 10) / 10,
        deltaStability: Math.round((b.stabilityScore - a.stabilityScore) * 10) / 10,
        deltaSavings: Math.round((b.savingsAccumulated - a.savingsAccumulated) * 100) / 100,
        deltaDebt: Math.round((a.debtRemaining - b.debtRemaining) * 100) / 100,
      };
    });

    const yr5A = resultsA.find(r => r.horizon === "5yr");
    const yr5B = resultsB.find(r => r.horizon === "5yr");
    const yr10A = resultsA.find(r => r.horizon === "10yr");
    const yr10B = resultsB.find(r => r.horizon === "10yr");
    const yr20A = resultsA.find(r => r.horizon === "20yr");
    const yr20B = resultsB.find(r => r.horizon === "20yr");

    const nwDelta5 = (yr5B?.projectedNetWorth || 0) - (yr5A?.projectedNetWorth || 0);
    const nwDelta10 = (yr10B?.projectedNetWorth || 0) - (yr10A?.projectedNetWorth || 0);
    const nwDelta20 = (yr20B?.projectedNetWorth || 0) - (yr20A?.projectedNetWorth || 0);

    const { userId: clerkIdCompare } = getAuth(req);
    if (clerkIdCompare) {
      const userId = await resolveUserId(clerkIdCompare, req);
      if (userId) {
        await Promise.all([
          awardXp(userId, 10, "timeline_compared", "timeline"),
          updateIdentityStage(userId, "scenariosExplored"),
        ]);
      }
    }

    res.json({
      paramsA: validA.params,
      paramsB: validB.params,
      resultsA,
      resultsB,
      deltas,
      summary: {
        deltaNetWorth5yr: nwDelta5,
        deltaNetWorth10yr: nwDelta10,
        deltaNetWorth20yr: nwDelta20,
        deltaStress: (yr10A?.stressIndex || 0) - (yr10B?.stressIndex || 0),
        deltaOpportunity: (yr10B?.opportunityScore || 0) - (yr10A?.opportunityScore || 0),
      },
      comparedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Compare error:", err);
    res.status(500).json({ error: "Comparison failed" });
  }
});

router.get("/timeline/identity/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    let [stage] = await db.select().from(userIdentityStagesTable).where(eq(userIdentityStagesTable.userId, userId));
    if (!stage) {
      [stage] = await db.insert(userIdentityStagesTable).values({ userId }).returning();
    }

    res.json(stage);
  } catch (err) {
    console.error("Identity stage error:", err);
    res.status(500).json({ error: "Failed to fetch identity stage" });
  }
});

export default router;
