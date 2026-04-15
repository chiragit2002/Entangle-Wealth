import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { db } from "@workspace/db";
import { usersTable, dashboardModuleEventsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateBody, z } from "../lib/validateRequest";
import { getOccupationById, getModulesForOccupation } from "@workspace/occupations";
import type { AssignedModule } from "@workspace/occupations";

const router = Router();

async function writeAuditEvent(
  clerkId: string,
  occupationId: string,
  isBusinessOwner: boolean,
  newModuleIds: string[],
  previousModuleIds: string[],
  changed: boolean,
  trigger: "auto" | "profile-save" | "first-fetch"
) {
  try {
    await db.insert(dashboardModuleEventsTable).values({
      clerkId,
      occupationId,
      isBusinessOwner,
      moduleIds: newModuleIds,
      previousModuleIds: previousModuleIds.length > 0 ? previousModuleIds : null,
      changed,
      trigger,
    });
  } catch (err) {
    logger.warn({ err, clerkId }, "[dashboard-modules] Failed to write audit event");
  }
}

router.get("/dashboard-modules/my-modules", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select({
        occupationId: usersTable.occupationId,
        isBusinessOwner: usersTable.isBusinessOwner,
        dashboardModules: usersTable.dashboardModules,
        dashboardModulesAssignedAt: usersTable.dashboardModulesAssignedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.occupationId) {
      res.json({ modules: [], profileIncomplete: true, message: "Complete your profile to unlock personalized modules." });
      return;
    }

    const modules = (user.dashboardModules as AssignedModule[] | null) ?? [];

    if (modules.length === 0) {
      const result = getModulesForOccupation(user.occupationId, user.isBusinessOwner ?? false);
      if (result.modules.length > 0) {
        await db
          .update(usersTable)
          .set({
            dashboardModules: result.modules as unknown as typeof usersTable.dashboardModules,
            dashboardModulesAssignedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(usersTable.clerkId, clerkId));

        const newIds = result.modules.map(m => m.id);
        await writeAuditEvent(clerkId, user.occupationId, user.isBusinessOwner ?? false, newIds, [], true, "first-fetch");

        logger.info({ clerkId, moduleIds: newIds }, "[dashboard-modules] Auto-assigned modules on first fetch");
        res.json({ modules: result.modules, profileIncomplete: false, assignedAt: result.evaluatedAt });
        return;
      }
    }

    res.json({
      modules,
      profileIncomplete: false,
      assignedAt: user.dashboardModulesAssignedAt?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error({ err: error }, "[dashboard-modules] Error fetching modules");
    res.status(500).json({ error: "Failed to fetch dashboard modules" });
  }
});

const EvaluateModulesSchema = z.object({
  occupationId: z.string().min(1).max(100),
  isBusinessOwner: z.boolean(),
});

router.post("/dashboard-modules/evaluate", requireAuth, validateBody(EvaluateModulesSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { occupationId, isBusinessOwner } = req.body as { occupationId: string; isBusinessOwner: boolean };

  try {
    const occupation = getOccupationById(occupationId);
    if (!occupation) {
      res.status(400).json({ error: "Invalid occupation ID" });
      return;
    }

    const [user] = await db
      .select({ dashboardModules: usersTable.dashboardModules })
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const previousModules = (user.dashboardModules as AssignedModule[] | null) ?? [];
    const previousModuleIds = previousModules.map(m => m.id).sort();
    const previousKey = previousModuleIds.join(",");

    const result = getModulesForOccupation(occupationId, isBusinessOwner);
    const newModuleIds = result.modules.map(m => m.id).sort();
    const newKey = newModuleIds.join(",");
    const changed = previousKey !== newKey;

    await db
      .update(usersTable)
      .set({
        dashboardModules: result.modules as unknown as typeof usersTable.dashboardModules,
        dashboardModulesAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkId, clerkId));

    await writeAuditEvent(clerkId, occupationId, isBusinessOwner, newModuleIds, previousModuleIds, changed, "profile-save");

    if (changed) {
      logger.info(
        { clerkId, occupationId, isBusinessOwner, from: previousKey, to: newKey },
        "[dashboard-modules] Module assignment changed"
      );
    } else {
      logger.info(
        { clerkId, occupationId, isBusinessOwner, modules: newKey },
        "[dashboard-modules] Module assignment re-evaluated (no change)"
      );
    }

    res.json({
      modules: result.modules,
      changed,
      evaluatedAt: result.evaluatedAt,
    });
  } catch (error) {
    logger.error({ err: error }, "[dashboard-modules] Error evaluating modules");
    res.status(500).json({ error: "Failed to evaluate dashboard modules" });
  }
});

export default router;
