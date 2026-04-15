import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { usersTable, userXpTable, xpTransactionsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";

const CHECKLIST_TO_MILESTONE: Record<string, { phaseId: string; milestoneId: string }> = {
  view_signal: { phaseId: "discover", milestoneId: "view_signal" },
  run_tax_scan: { phaseId: "discover", milestoneId: "run_tax_scan" },
  set_alert: { phaseId: "discover", milestoneId: "set_alert" },
  join_community: { phaseId: "discover", milestoneId: "join_community" },
};

const router = Router();

const JOURNEY_PHASES = [
  { id: "discover", index: 0, xpReward: 100, milestones: ["view_signal", "run_tax_scan", "set_alert", "join_community"] },
  { id: "analyze", index: 1, xpReward: 200, milestones: ["run_simulation", "save_snapshot", "run_backtest"] },
  { id: "optimize", index: 2, xpReward: 300, milestones: ["setup_taxflow", "explore_alternate", "set_financial_focus"] },
  { id: "grow", index: 3, xpReward: 500, milestones: ["execute_trade", "complete_habits", "view_ai_coach"] },
];

interface JourneyState {
  completedMilestones: Record<string, boolean>;
  completedPhases: string[];
  phaseCompletedAt: Record<string, string>;
  currentPhaseId: string;
  updatedAt?: string;
}

function getDefaultJourneyState(): JourneyState {
  return {
    completedMilestones: {},
    completedPhases: [],
    phaseCompletedAt: {},
    currentPhaseId: "discover",
  };
}

function seedStateFromChecklist(state: JourneyState, checklist: Record<string, boolean>): JourneyState {
  const merged: JourneyState = {
    ...state,
    completedMilestones: { ...state.completedMilestones },
  };

  for (const [checklistKey, mapping] of Object.entries(CHECKLIST_TO_MILESTONE)) {
    if (checklist[checklistKey]) {
      merged.completedMilestones[mapping.milestoneId] = true;
    }
  }

  const discoverPhase = JOURNEY_PHASES[0];
  const discoverDone = discoverPhase.milestones.every(m => merged.completedMilestones[m]);
  if (discoverDone && !merged.completedPhases.includes("discover")) {
    merged.completedPhases = [...merged.completedPhases, "discover"];
    if (merged.currentPhaseId === "discover") {
      merged.currentPhaseId = "analyze";
    }
  }

  return merged;
}

router.get("/journey", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const rows = await db
      .select({
        journeyState: usersTable.journeyState,
        onboardingChecklist: usersTable.onboardingChecklist,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    if (rows.length === 0) {
      res.json(getDefaultJourneyState());
      return;
    }

    const raw = (rows[0].journeyState as JourneyState) ?? getDefaultJourneyState();
    const checklist = (rows[0].onboardingChecklist as Record<string, boolean>) ?? {};
    const state = seedStateFromChecklist(raw, checklist);
    res.json(state);
  } catch (err) {
    logger.error({ err }, "Failed to fetch journey state");
    res.status(500).json({ error: "Internal server error" });
  }
});

const MilestoneSchema = z.object({
  milestoneId: z.string().min(1).max(100),
  phaseId: z.string().min(1).max(100),
});

router.post("/journey/milestone", requireAuth, validateBody(MilestoneSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { milestoneId, phaseId } = req.body as { milestoneId: string; phaseId: string };

  try {
    const rows = await db
      .select({ id: usersTable.id, journeyState: usersTable.journeyState })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userDbId = rows[0].id;
    const current = (rows[0].journeyState as JourneyState) ?? getDefaultJourneyState();

    if (current.completedMilestones[milestoneId]) {
      res.json({ ok: true, xpEarned: 0, alreadyCompleted: true });
      return;
    }

    const now = new Date().toISOString();
    const updated: JourneyState = {
      ...current,
      completedMilestones: { ...current.completedMilestones, [milestoneId]: true },
      phaseCompletedAt: current.phaseCompletedAt ?? {},
      updatedAt: now,
    };

    const phase = JOURNEY_PHASES.find(p => p.id === phaseId);
    let xpEarned = 0;
    let phaseCompleted: string | undefined;

    if (phase) {
      const phaseDone = phase.milestones.every(m => updated.completedMilestones[m]);
      if (phaseDone && !current.completedPhases.includes(phaseId)) {
        updated.completedPhases = [...current.completedPhases, phaseId];
        updated.phaseCompletedAt = { ...updated.phaseCompletedAt, [phaseId]: now };
        const nextIdx = phase.index + 1;
        if (nextIdx < JOURNEY_PHASES.length) {
          updated.currentPhaseId = JOURNEY_PHASES[nextIdx].id;
        }
        xpEarned = phase.xpReward;
        phaseCompleted = phaseId;
      }
    }

    await db.update(usersTable)
      .set({ journeyState: updated as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(usersTable.clerkId, userId));

    if (xpEarned > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(xpTransactionsTable).values({
            userId: userDbId,
            amount: xpEarned,
            reason: `journey_phase_complete_${phaseId}`,
            category: "journey",
          });
          await tx
            .insert(userXpTable)
            .values({ userId: userDbId, totalXp: xpEarned, level: 1, tier: "Bronze" })
            .onConflictDoUpdate({
              target: userXpTable.userId,
              set: {
                totalXp: sql`${userXpTable.totalXp} + ${xpEarned}`,
                monthlyXp: sql`${userXpTable.monthlyXp} + ${xpEarned}`,
                weeklyXp: sql`${userXpTable.weeklyXp} + ${xpEarned}`,
                updatedAt: new Date(),
              },
            });
        });
      } catch (xpErr) {
        logger.error({ xpErr }, "Failed to award journey XP");
      }
    }

    res.json({ ok: true, xpEarned, phaseCompleted, updatedState: updated });
  } catch (err) {
    logger.error({ err }, "Failed to update journey milestone");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
