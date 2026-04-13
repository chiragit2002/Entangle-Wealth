import { Router } from "express";
import { db } from "@workspace/db";
import { wealthProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { validateBody, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";

const router = Router();

interface LifeOutcomeParams {
  currentAge: number;
  annualIncome: number;
  monthlyInvestment: number;
  currentSavings: number;
  expectedReturnRate: number;
  inflationRate: number;
  monthlyExpenses: number;
}

interface LifeMilestone {
  id: string;
  label: string;
  description: string;
  targetAge: number;
  achievable: boolean;
  currentPathAge: number | null;
  optimizedPathAge: number | null;
  currentPathValue: number | null;
  optimizedPathValue: number | null;
  icon: string;
}

function calcTrajectory(
  params: LifeOutcomeParams,
  optimized: boolean,
): {
  yearlyNetWorth: Record<number, number>;
  retirementAge: number | null;
  emergencyFundAge: number | null;
  homePurchaseAge: number | null;
  finalNetWorth: number;
  annualPassiveIncome: number;
} {
  const {
    currentAge,
    annualIncome,
    monthlyExpenses,
    currentSavings,
    expectedReturnRate,
    inflationRate,
  } = params;

  let monthlyInvestment = params.monthlyInvestment;
  let returnRate = expectedReturnRate / 100;

  if (optimized) {
    monthlyInvestment = Math.min(monthlyInvestment * 1.5, (annualIncome / 12) * 0.3);
    returnRate = Math.min(returnRate + 0.01, 0.12);
  }

  const monthlyRate = returnRate / 12;
  let netWorth = currentSavings;
  const yearlyNetWorth: Record<number, number> = { [currentAge]: currentSavings };

  let retirementAge: number | null = null;
  let emergencyFundAge: number | null = null;
  let homePurchaseAge: number | null = null;

  const monthlyIncome = annualIncome / 12;
  const retirementThreshold = monthlyExpenses * 12 * 25;
  const emergencyFundTarget = monthlyExpenses * 6;
  const homePurchaseDown = 60000;

  for (let year = 1; year <= 50; year++) {
    const age = currentAge + year;
    const inflFactor = Math.pow(1 + inflationRate / 100, year);
    const realMonthlyExpenses = monthlyExpenses * inflFactor;

    for (let m = 0; m < 12; m++) {
      netWorth = netWorth * (1 + monthlyRate) + monthlyInvestment;
    }

    yearlyNetWorth[age] = Math.round(netWorth);

    if (!retirementAge && netWorth >= retirementThreshold * inflFactor) {
      retirementAge = age;
    }
    if (!emergencyFundAge && netWorth >= emergencyFundTarget) {
      emergencyFundAge = age;
    }
    if (!homePurchaseAge && netWorth >= homePurchaseDown) {
      homePurchaseAge = age;
    }
  }

  const passiveIncomeRate = 0.04;
  const finalNetWorth = netWorth;
  const annualPassiveIncome = finalNetWorth * passiveIncomeRate;

  return {
    yearlyNetWorth,
    retirementAge,
    emergencyFundAge,
    homePurchaseAge,
    finalNetWorth,
    annualPassiveIncome,
  };
}

function classifyLifestyle(annualPassiveIncome: number): string {
  if (annualPassiveIncome >= 150000) return "Affluent";
  if (annualPassiveIncome >= 80000) return "Comfortable";
  if (annualPassiveIncome >= 50000) return "Stable";
  if (annualPassiveIncome >= 30000) return "Modest";
  return "Basic";
}

const LifeOutcomesSchema = z.object({
  currentAge: z.number().int().min(18).max(70).optional(),
  annualIncome: z.number().nonnegative().max(100_000_000).optional(),
  monthlyInvestment: z.number().nonnegative().max(10_000_000).optional(),
  currentSavings: z.number().nonnegative().max(1_000_000_000).optional(),
  expectedReturnRate: z.number().min(0).max(30).optional(),
  inflationRate: z.number().min(0).max(15).optional(),
  monthlyExpenses: z.number().nonnegative().max(10_000_000).optional(),
});

router.post("/life-outcomes/project", requireAuth, validateBody(LifeOutcomesSchema), async (req, res) => {
  try {
    const {
      currentAge = 30,
      annualIncome = 60000,
      monthlyInvestment = 500,
      currentSavings = 5000,
      expectedReturnRate = 7,
      inflationRate = 3,
      monthlyExpenses = 3000,
    } = req.body;

    const params: LifeOutcomeParams = {
      currentAge: Math.max(18, Math.min(70, Number(currentAge))),
      annualIncome: Math.max(0, Number(annualIncome)),
      monthlyInvestment: Math.max(0, Number(monthlyInvestment)),
      currentSavings: Math.max(0, Number(currentSavings)),
      expectedReturnRate: Math.min(30, Math.max(0, Number(expectedReturnRate))),
      inflationRate: Math.min(15, Math.max(0, Number(inflationRate))),
      monthlyExpenses: Math.max(0, Number(monthlyExpenses)),
    };

    const current = calcTrajectory(params, false);
    const optimized = calcTrajectory(params, true);

    const milestones: LifeMilestone[] = [
      {
        id: "emergency-fund",
        label: "Emergency Fund Built",
        description: "6 months of expenses saved",
        targetAge: params.currentAge + 2,
        achievable: current.emergencyFundAge !== null,
        currentPathAge: current.emergencyFundAge,
        optimizedPathAge: optimized.emergencyFundAge,
        currentPathValue: params.monthlyExpenses * 6,
        optimizedPathValue: params.monthlyExpenses * 6,
        icon: "Shield",
      },
      {
        id: "home-purchase",
        label: "Home Purchase Ready",
        description: "$60K down payment saved",
        targetAge: params.currentAge + 10,
        achievable: current.homePurchaseAge !== null,
        currentPathAge: current.homePurchaseAge,
        optimizedPathAge: optimized.homePurchaseAge,
        currentPathValue: 60000,
        optimizedPathValue: 60000,
        icon: "Home",
      },
      {
        id: "retirement",
        label: "Financial Independence",
        description: "25x annual expenses in investments (4% rule)",
        targetAge: 65,
        achievable: current.retirementAge !== null,
        currentPathAge: current.retirementAge,
        optimizedPathAge: optimized.retirementAge,
        currentPathValue: params.monthlyExpenses * 12 * 25,
        optimizedPathValue: params.monthlyExpenses * 12 * 25,
        icon: "Sunrise",
      },
    ];

    const chartData: { age: number; currentPath: number; optimizedPath: number }[] = [];
    for (let age = params.currentAge; age <= Math.min(params.currentAge + 40, 80); age++) {
      chartData.push({
        age,
        currentPath: current.yearlyNetWorth[age] || 0,
        optimizedPath: optimized.yearlyNetWorth[age] || 0,
      });
    }

    res.json({
      params,
      milestones,
      chartData,
      currentPath: {
        finalNetWorth: current.finalNetWorth,
        annualPassiveIncome: current.annualPassiveIncome,
        lifestyleTier: classifyLifestyle(current.annualPassiveIncome),
        retirementAge: current.retirementAge,
        emergencyFundAge: current.emergencyFundAge,
        homePurchaseAge: current.homePurchaseAge,
      },
      optimizedPath: {
        finalNetWorth: optimized.finalNetWorth,
        annualPassiveIncome: optimized.annualPassiveIncome,
        lifestyleTier: classifyLifestyle(optimized.annualPassiveIncome),
        retirementAge: optimized.retirementAge,
        emergencyFundAge: optimized.emergencyFundAge,
        homePurchaseAge: optimized.homePurchaseAge,
      },
      improvement: {
        netWorthGain: optimized.finalNetWorth - current.finalNetWorth,
        passiveIncomeGain: optimized.annualPassiveIncome - current.annualPassiveIncome,
        retirementYearsEarlier:
          current.retirementAge && optimized.retirementAge
            ? current.retirementAge - optimized.retirementAge
            : null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error projecting life outcomes:");
    res.status(500).json({ error: "Failed to project life outcomes" });
  }
});

router.get("/life-outcomes/from-profile", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [profile] = await db
      .select()
      .from(wealthProfilesTable)
      .where(eq(wealthProfilesTable.userId, userId));

    if (!profile) {
      res.json({ hasProfile: false });
      return;
    }

    const profileData = {
      currentAge: 30,
      annualIncome: profile.annualIncome,
      monthlyInvestment: profile.monthlyInvestment,
      currentSavings: profile.currentSavings,
      expectedReturnRate: profile.expectedReturnRate,
      inflationRate: profile.inflationRate,
      monthlyExpenses: profile.monthlyExpenses,
    };

    res.json({ hasProfile: true, profile: profileData });
  } catch (error) {
    logger.error({ err: error }, "Error fetching profile for life outcomes:");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
