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
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { getAuth } from "@clerk/express";
import { calculateLevel, calculateTier } from "@workspace/xp";
import { validateBody, validateParams, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";

const TimelineIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number"),
});

const TimelineParamsBodySchema = z.object({
  monthlyIncome: z.coerce.number().min(0).max(1000000).default(0),
  savingsRate: z.coerce.number().min(0).max(1).default(0),
  monthlyDebt: z.coerce.number().min(0).default(0),
  investmentRate: z.coerce.number().min(0).max(0.5).default(0.07),
  currentNetWorth: z.coerce.number().default(0),
  emergencyFundMonths: z.coerce.number().min(0).default(0),
});

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

function parseTimelineParams(body: unknown): { params: TimelineParams; error?: string } {
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
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId} || '_xp'))`);

      const [streak] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId));
      const [founder] = await tx.select().from(founderStatusTable).where(eq(founderStatusTable.userId, userId));
      const multiplier = (streak?.multiplier || 1.0) * (founder?.xpMultiplier || 1.0);
      const finalAmount = Math.min(Math.round(amount * multiplier), 150);

      await tx.insert(xpTransactionsTable).values({ userId, amount: finalAmount, reason, category });

      let [xpRow] = await tx.select().from(userXpTable).where(eq(userXpTable.userId, userId));
      if (!xpRow) {
        [xpRow] = await tx.insert(userXpTable).values({ userId, totalXp: 0, level: 1, tier: "Bronze", monthlyXp: 0, weeklyXp: 0 }).returning();
      }

      const newTotal = xpRow.totalXp + finalAmount;
      const newLevel = calculateLevel(newTotal);
      const newTier = calculateTier(newLevel, newTotal);

      await tx.update(userXpTable).set({
        totalXp: sql`${userXpTable.totalXp} + ${finalAmount}`,
        level: newLevel,
        tier: newTier,
        monthlyXp: sql`${userXpTable.monthlyXp} + ${finalAmount}`,
        weeklyXp: sql`${userXpTable.weeklyXp} + ${finalAmount}`,
        updatedAt: new Date(),
      }).where(eq(userXpTable.userId, userId));
    });
  } catch (err) {
    logger.error({ err, userId, reason }, "Failed to award XP");
  }
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

    const updates: Partial<typeof userIdentityStagesTable.$inferInsert> = { updatedAt: new Date() };
    let sims = stage.simulationsRun;
    let snaps = stage.snapshotsSaved;
    let scens = stage.scenariosExplored;

    if (field === "simulationsRun") { updates.simulationsRun = sims + 1; sims++; }
    if (field === "snapshotsSaved") { updates.snapshotsSaved = snaps + 1; snaps++; }
    if (field === "scenariosExplored") { updates.scenariosExplored = scens + 1; scens++; }

    const newStage = getIdentityStageFromCounts(sims, snaps, scens);
    const oldStage = stage.stage;
    updates.stage = newStage;

    await db.update(userIdentityStagesTable).set(updates).where(eq(userIdentityStagesTable.userId, userId));

    if (newStage !== oldStage) {
      await awardXp(userId, 50, `stage_transition_${newStage.toLowerCase()}`, "timeline");
    }

    return newStage;
  } catch (err) {
    logger.debug({ error: err }, "Failed to determine identity stage, defaulting to Aware");
    return "Aware";
  }
}

router.post("/timeline/simulate", validateBody(TimelineParamsBodySchema), async (req, res) => {
  const { params, error } = parseTimelineParams(req.body);
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
    logger.error({ err }, "Simulation error");
    res.status(500).json({ error: "Simulation failed" });
  }
});

const TimelineSaveSchema = z.object({
  name: z.string().max(100).optional(),
  annotation: z.string().max(500).optional(),
  isBaseline: z.boolean().optional(),
  monthlyIncome: z.number().min(0).max(1000000).optional(),
  savingsRate: z.number().min(0).max(1).optional(),
  monthlyDebt: z.number().min(0).optional(),
  investmentRate: z.number().min(0).max(0.5).optional(),
  currentNetWorth: z.number().optional(),
  emergencyFundMonths: z.number().min(0).max(24).optional(),
});

const WhatIfModelSchema = z.object({
  baseParams: z.record(z.unknown()),
  decisionIds: z.array(z.string().max(100)).max(20),
});

router.post("/timeline/save", requireAuth, validateBody(TimelineSaveSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const { name, annotation, isBaseline, ...bodyParams } = req.body;
    const { params, error } = parseTimelineParams(bodyParams);
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
    logger.error({ err }, "Save timeline error");
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
    logger.error({ err }, "Get saved timelines error");
    res.status(500).json({ error: "Failed to fetch timelines" });
  }
});

router.get("/timeline/:id", requireAuth, validateParams(TimelineIdParamsSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const timelineId = req.params.id as unknown as number;

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const [timeline] = await db.select().from(timelinesTable)
      .where(and(eq(timelinesTable.id, timelineId), eq(timelinesTable.userId, userId)));

    if (!timeline) { res.status(404).json({ error: "Timeline not found" }); return; }

    const results = await db.select().from(timelineResultsTable).where(eq(timelineResultsTable.timelineId, timelineId));

    res.json({ ...timeline, results });
  } catch (err) {
    logger.error({ err }, "Get timeline error");
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

router.delete("/timeline/:id", requireAuth, validateParams(TimelineIdParamsSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const timelineId = req.params.id as unknown as number;

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const [timeline] = await db.select().from(timelinesTable)
      .where(and(eq(timelinesTable.id, timelineId), eq(timelinesTable.userId, userId)));

    if (!timeline) { res.status(404).json({ error: "Timeline not found" }); return; }

    await db.delete(timelinesTable).where(eq(timelinesTable.id, timelineId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete timeline error");
    res.status(500).json({ error: "Failed to delete timeline" });
  }
});

const TimelineCompareSchema = z.object({
  paramsA: z.record(z.unknown()),
  paramsB: z.record(z.unknown()),
});

router.post("/timeline/compare", validateBody(TimelineCompareSchema), async (req, res) => {
  try {
    const { paramsA, paramsB } = req.body as { paramsA: unknown; paramsB: unknown };

    const validA = parseTimelineParams(paramsA);
    const validB = parseTimelineParams(paramsB);

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
    logger.error({ err }, "Compare error");
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
    logger.error({ err }, "Identity stage error");
    res.status(500).json({ error: "Failed to fetch identity stage" });
  }
});

interface WhatIfDecision {
  id: string;
  label: string;
  description: string;
  monthlyIncomeChange: number;
  savingsRateChange: number;
  monthlyDebtChange: number;
  investmentRateChange: number;
}

const WHAT_IF_DECISIONS: WhatIfDecision[] = [
  {
    id: "max_401k",
    label: "Max Out 401(k)",
    description: "Contribute the maximum allowed to your 401(k) ($23,000/yr)",
    monthlyIncomeChange: 0,
    savingsRateChange: 0.12,
    monthlyDebtChange: 0,
    investmentRateChange: 0,
  },
  {
    id: "pay_off_debt",
    label: "Aggressively Pay Off Debt",
    description: "Double your debt payments to eliminate debt faster",
    monthlyIncomeChange: 0,
    savingsRateChange: 0,
    monthlyDebtChange: 500,
    investmentRateChange: 0,
  },
  {
    id: "career_change",
    label: "Career Change / Promotion",
    description: "Land a job paying 25% more annually",
    monthlyIncomeChange: 0.25,
    savingsRateChange: 0.05,
    monthlyDebtChange: 0,
    investmentRateChange: 0,
  },
  {
    id: "side_income",
    label: "Start Side Income",
    description: "Add $1,000/month in side income and invest 70% of it",
    monthlyIncomeChange: 1000,
    savingsRateChange: 0.04,
    monthlyDebtChange: 0,
    investmentRateChange: 0.005,
  },
  {
    id: "cut_expenses",
    label: "Cut Monthly Expenses 20%",
    description: "Reduce spending by 20% and redirect savings to investments",
    monthlyIncomeChange: 0,
    savingsRateChange: 0.08,
    monthlyDebtChange: 0,
    investmentRateChange: 0,
  },
  {
    id: "invest_aggressively",
    label: "Invest Aggressively",
    description: "Shift to a 100% equity portfolio (higher risk/reward)",
    monthlyIncomeChange: 0,
    savingsRateChange: 0,
    monthlyDebtChange: 0,
    investmentRateChange: 0.03,
  },
];

router.get("/timeline/what-if/decisions", (_req, res) => {
  res.json(WHAT_IF_DECISIONS);
});

router.post("/timeline/what-if/model", validateBody(WhatIfModelSchema), async (req, res) => {
  const { baseParams, decisionIds } = req.body as { baseParams: unknown; decisionIds: string[] };

  const { params: base, error } = parseTimelineParams(baseParams);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const selectedDecisions = WHAT_IF_DECISIONS.filter(d => Array.isArray(decisionIds) && decisionIds.includes(d.id));

  const modifiedParams: TimelineParams = { ...base };
  for (const decision of selectedDecisions) {
    if (decision.monthlyIncomeChange > 0 && decision.monthlyIncomeChange < 10) {
      modifiedParams.monthlyIncome = base.monthlyIncome * (1 + decision.monthlyIncomeChange);
    } else if (decision.monthlyIncomeChange >= 10) {
      modifiedParams.monthlyIncome = base.monthlyIncome + decision.monthlyIncomeChange;
    }

    if (decision.savingsRateChange !== 0) {
      modifiedParams.savingsRate = clamp(base.savingsRate + decision.savingsRateChange, 0, 0.9);
    }

    if (decision.monthlyDebtChange !== 0) {
      modifiedParams.monthlyDebt = Math.max(0, base.monthlyDebt - decision.monthlyDebtChange);
    }

    if (decision.investmentRateChange !== 0) {
      modifiedParams.investmentRate = clamp(base.investmentRate + decision.investmentRateChange, 0, 0.5);
    }
  }

  try {
    const baseResults = HORIZONS.map(h => simulateHorizon(base, h.months));
    const modifiedResults = HORIZONS.map(h => simulateHorizon(modifiedParams, h.months));

    const deltas = baseResults.map((b, i) => {
      const m = modifiedResults[i];
      return {
        horizon: b.horizon,
        deltaNetWorth: Math.round((m.projectedNetWorth - b.projectedNetWorth) * 100) / 100,
        deltaStress: Math.round((b.stressIndex - m.stressIndex) * 10) / 10,
        deltaOpportunity: Math.round((m.opportunityScore - b.opportunityScore) * 10) / 10,
        deltaStability: Math.round((m.stabilityScore - b.stabilityScore) * 10) / 10,
      };
    });

    const yr20Base = baseResults.find(r => r.horizon === "20yr");
    const yr20Modified = modifiedResults.find(r => r.horizon === "20yr");

    const { userId: clerkId } = getAuth(req);
    if (clerkId) {
      const userId = await resolveUserId(clerkId, req);
      if (userId) {
        await awardXp(userId, 20, "what_if_modeled", "timeline");
      }
    }

    res.json({
      baseParams: base,
      modifiedParams,
      appliedDecisions: selectedDecisions,
      baseResults,
      modifiedResults,
      deltas,
      summary: {
        netWorthGain20yr: (yr20Modified?.projectedNetWorth || 0) - (yr20Base?.projectedNetWorth || 0),
        stressReduction: (yr20Base?.stressIndex || 0) - (yr20Modified?.stressIndex || 0),
        opportunityGain: (yr20Modified?.opportunityScore || 0) - (yr20Base?.opportunityScore || 0),
      },
      modeledAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "What-if model error");
    res.status(500).json({ error: "What-if modeling failed" });
  }
});

const MonteCarloSchema = z.object({
  monthlyIncome: z.coerce.number().min(0).max(1000000).default(0),
  savingsRate: z.coerce.number().min(0).max(1).default(0),
  monthlyDebt: z.coerce.number().min(0).default(0),
  investmentRate: z.coerce.number().min(0).max(0.5).default(0.07),
  currentNetWorth: z.coerce.number().default(0),
  emergencyFundMonths: z.coerce.number().min(0).default(0),
  simulations: z.coerce.number().int().min(10).max(1000).default(500),
  horizonYears: z.coerce.number().int().min(1).max(30).default(20),
  lifeEvents: z.array(z.object({
    year: z.number().int().min(0).max(30),
    cost: z.number(),
    label: z.string().max(60),
  })).max(20).optional(),
});

function runMonteCarlo(
  params: TimelineParams,
  simulations: number,
  horizonYears: number,
  lifeEvents: { year: number; cost: number; label: string }[] = [],
): { p10: number[]; p50: number[]; p90: number[]; mean: number[]; years: number[] } {
  const monthlyRate = params.investmentRate / 12;
  const monthlySavings = params.monthlyIncome * params.savingsRate;
  const monthlyInvestment = monthlySavings * 0.6;
  const numMonths = horizonYears * 12;

  const lifeEventByYear = new Map<number, number>();
  for (const ev of lifeEvents) {
    lifeEventByYear.set(ev.year, (lifeEventByYear.get(ev.year) || 0) + ev.cost);
  }

  const yearlyResults: number[][] = Array.from({ length: horizonYears + 1 }, () => []);

  for (let sim = 0; sim < simulations; sim++) {
    let wealth = Math.max(0, params.currentNetWorth);
    let debt = params.monthlyDebt * 36;
    yearlyResults[0].push(wealth);

    for (let m = 1; m <= numMonths; m++) {
      const yearIdx = Math.floor(m / 12);
      const volatility = 0.15 / Math.sqrt(12);
      const randomReturn = (Math.random() - 0.5) * 2 * volatility;
      const actualRate = monthlyRate + randomReturn * monthlyRate * 5;

      wealth = wealth * (1 + actualRate) + monthlyInvestment;
      wealth += monthlySavings * 0.4;

      const debtPayment = Math.min(debt, params.monthlyDebt);
      debt = Math.max(0, debt - debtPayment);

      if (m % 12 === 0 && lifeEventByYear.has(yearIdx)) {
        wealth -= (lifeEventByYear.get(yearIdx) || 0);
      }

      if (m % 12 === 0 && yearIdx <= horizonYears) {
        yearlyResults[yearIdx].push(Math.max(0, wealth - debt));
      }
    }
  }

  const years = Array.from({ length: horizonYears + 1 }, (_, i) => i);
  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  const mean: number[] = [];

  for (const yr of years) {
    const vals = [...(yearlyResults[yr] || [])].sort((a, b) => a - b);
    if (vals.length === 0) { p10.push(0); p50.push(0); p90.push(0); mean.push(0); continue; }
    const idx10 = Math.floor(vals.length * 0.1);
    const idx50 = Math.floor(vals.length * 0.5);
    const idx90 = Math.floor(vals.length * 0.9);
    p10.push(Math.round(vals[idx10]));
    p50.push(Math.round(vals[idx50]));
    p90.push(Math.round(vals[idx90]));
    mean.push(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
  }

  return { p10, p50, p90, mean, years };
}

router.post("/timeline/monte-carlo", validateBody(MonteCarloSchema), async (req, res) => {
  const { params, error } = parseTimelineParams(req.body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const { simulations = 500, horizonYears = 20, lifeEvents = [] } = req.body as { simulations?: number; horizonYears?: number; lifeEvents?: { year: number; cost: number; label: string }[] };

  try {
    const result = runMonteCarlo(params, simulations, horizonYears, lifeEvents);
    const yr20_p50 = result.p50[result.p50.length - 1];
    const yr20_p10 = result.p10[result.p10.length - 1];
    const yr20_p90 = result.p90[result.p90.length - 1];

    const narrativeLines: string[] = [];
    if (yr20_p50 > 500000) {
      narrativeLines.push(`Your median projected net worth after ${horizonYears} years is $${(yr20_p50 / 1e6).toFixed(1)}M — driven primarily by your ${(params.savingsRate * 100).toFixed(0)}% savings rate and ${(params.investmentRate * 100).toFixed(0)}% investment return assumption.`);
    } else {
      narrativeLines.push(`Your median projected net worth after ${horizonYears} years is $${(yr20_p50 / 1000).toFixed(0)}k — increasing your savings rate by even 5% could significantly widen the gap over time.`);
    }
    const spread = yr20_p90 - yr20_p10;
    narrativeLines.push(`Market volatility creates a wide range of outcomes: the optimistic scenario (P90) reaches $${(yr20_p90 / 1000).toFixed(0)}k while the pessimistic scenario (P10) lands at $${(yr20_p10 / 1000).toFixed(0)}k — a $${(spread / 1000).toFixed(0)}k spread that underscores why consistent contributions matter more than timing the market.`);
    if (lifeEvents.length > 0) {
      const totalCost = lifeEvents.reduce((s, e) => s + e.cost, 0);
      narrativeLines.push(`Your ${lifeEvents.length} life event${lifeEvents.length > 1 ? "s" : ""} (total impact: $${(totalCost / 1000).toFixed(0)}k) are modeled as one-time shocks — the simulation shows wealth recovery is possible within 3–5 years of each event assuming consistent saving habits.`);
    }

    res.json({
      ...result,
      params,
      simulations,
      horizonYears,
      lifeEvents,
      narrative: narrativeLines.join(" "),
    });
  } catch (err) {
    logger.error({ err }, "Monte Carlo error");
    res.status(500).json({ error: "Monte Carlo simulation failed" });
  }
});

export default router;
