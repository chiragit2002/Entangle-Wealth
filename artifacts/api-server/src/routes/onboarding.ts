import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";

const router = Router();

router.get("/onboarding", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  try {
    const rows = await db
      .select({
        onboardingCompleted: usersTable.onboardingCompleted,
        onboardingInterests: usersTable.onboardingInterests,
        onboardingChecklist: usersTable.onboardingChecklist,
        createdAt: usersTable.createdAt,
        firstName: usersTable.firstName,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    if (rows.length === 0) {
      res.json({
        onboardingCompleted: false,
        interests: [],
        checklist: {},
        firstName: null,
        daysSinceSignup: 0,
      });
      return;
    }

    const user = rows[0];
    const daysSinceSignup = user.createdAt
      ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      onboardingCompleted: user.onboardingCompleted ?? false,
      interests: (user.onboardingInterests as string[]) ?? [],
      checklist: (user.onboardingChecklist as Record<string, boolean>) ?? {},
      firstName: user.firstName,
      daysSinceSignup,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch onboarding state");
    res.status(500).json({ error: "Internal server error" });
  }
});

const OnboardingWelcomeSchema = z.object({
  interests: z.array(z.string().max(100)).max(50).optional(),
});

const OnboardingChecklistSchema = z.object({
  item: z.string().min(1).max(100),
  completed: z.boolean(),
});

router.post("/onboarding/complete-welcome", requireAuth, validateBody(OnboardingWelcomeSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { interests } = req.body as { interests?: string[] };

  try {
    await db
      .update(usersTable)
      .set({
        onboardingCompleted: true,
        onboardingInterests: interests ?? [],
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkId, userId));

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to complete welcome onboarding");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/onboarding/checklist", requireAuth, validateBody(OnboardingChecklistSchema), async (req: Request, res: Response) => {
  const { userId } = req as AuthenticatedRequest;
  const { item, completed } = req.body as { item: string; completed: boolean };

  try {
    const rows = await db
      .select({ onboardingChecklist: usersTable.onboardingChecklist })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId))
      .limit(1);

    const existing = (rows[0]?.onboardingChecklist as Record<string, boolean>) ?? {};
    const updated = { ...existing, [item]: completed };

    const CHECKLIST_ITEMS = ["view_signal", "run_tax_scan", "set_alert", "join_community", "enable_notifications"];
    const allDone = CHECKLIST_ITEMS.every((key) => updated[key]);

    const setFields: Record<string, unknown> = {
      onboardingChecklist: updated,
      updatedAt: new Date(),
    };
    if (allDone) {
      setFields.checklistCompletedAt = new Date();
    }

    await db
      .update(usersTable)
      .set(setFields)
      .where(eq(usersTable.clerkId, userId));

    res.json({ ok: true, checklist: updated, allCompleted: allDone });
  } catch (err) {
    logger.error({ err }, "Failed to update checklist");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
