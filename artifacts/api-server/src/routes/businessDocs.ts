import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { isUploadOwnedBy } from "./storage";
import { validateBody, validateParams, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";

const BusinessDocUserIdParamsSchema = z.object({
  userId: z.string().min(1).max(100),
});

const router = Router();

router.get("/business-docs/status", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db.select({
      isBusinessOwner: usersTable.isBusinessOwner,
      businessDocPaths: usersTable.businessDocPaths,
      businessDocStatus: usersTable.businessDocStatus,
      businessDocRejectionReason: usersTable.businessDocRejectionReason,
      businessDocSubmittedAt: usersTable.businessDocSubmittedAt,
      businessDocVerifiedAt: usersTable.businessDocVerifiedAt,
    }).from(usersTable).where(eq(usersTable.clerkId, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    logger.error({ err: error }, "Error fetching business doc status:");
    res.status(500).json({ error: "Failed to fetch business doc status" });
  }
});

const BusinessDocSubmitSchema = z.object({
  docPaths: z.array(
    z.string().min(1).max(500).regex(/^\/objects\//, "Must start with /objects/")
  ).min(1).max(10),
});

const AdminRejectionSchema = z.object({
  reason: z.string().min(1).max(1000),
});

router.post("/business-docs/submit", requireAuth, validateBody(BusinessDocSubmitSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { docPaths } = req.body;

  for (const p of docPaths) {
    if (!(await isUploadOwnedBy(p, userId))) {
      res.status(403).json({ error: "You do not own one or more uploaded documents" });
      return;
    }
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.businessDocStatus === "verified") {
      res.json({ status: "verified", message: "Already verified" });
      return;
    }

    const [updated] = await db.update(usersTable).set({
      isBusinessOwner: true,
      businessDocPaths: docPaths,
      businessDocStatus: "pending_review",
      businessDocSubmittedAt: new Date(),
      businessDocRejectionReason: null,
      updatedAt: new Date(),
    }).where(eq(usersTable.clerkId, userId)).returning();

    res.json({
      status: updated.businessDocStatus,
      message: "Business documents submitted for review. You will be notified once verified.",
    });
  } catch (error) {
    logger.error({ err: error }, "Error submitting business docs:");
    res.status(500).json({ error: "Failed to submit business documents" });
  }
});

router.post("/business-docs/approve/:userId", requireAuth, requireAdmin, validateParams(BusinessDocUserIdParamsSchema), validateBody(z.object({}).strict()), async (req, res) => {
  const targetUserId = String(req.params.userId);

  try {
    const [updated] = await db.update(usersTable).set({
      businessDocStatus: "verified",
      businessDocVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, targetUserId)).returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ status: "verified", message: "Business documents approved" });
  } catch (error) {
    logger.error({ err: error }, "Error approving business docs:");
    res.status(500).json({ error: "Failed to approve business documents" });
  }
});

router.post("/business-docs/reject/:userId", requireAuth, requireAdmin, validateParams(BusinessDocUserIdParamsSchema), validateBody(AdminRejectionSchema), async (req, res) => {
  const targetUserId = String(req.params.userId);
  const { reason } = req.body;

  try {
    const [updated] = await db.update(usersTable).set({
      businessDocStatus: "rejected",
      businessDocRejectionReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, targetUserId)).returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ status: "rejected", message: "Business documents rejected" });
  } catch (error) {
    logger.error({ err: error }, "Error rejecting business docs:");
    res.status(500).json({ error: "Failed to reject business documents" });
  }
});

router.get("/business-docs/admin/submissions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const submissions = await db.select({
      id: usersTable.id,
      clerkId: usersTable.clerkId,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      isBusinessOwner: usersTable.isBusinessOwner,
      businessDocPaths: usersTable.businessDocPaths,
      businessDocStatus: usersTable.businessDocStatus,
      businessDocSubmittedAt: usersTable.businessDocSubmittedAt,
      businessDocVerifiedAt: usersTable.businessDocVerifiedAt,
    }).from(usersTable)
      .where(eq(usersTable.businessDocStatus, "pending_review"));

    const submissionsWithUrls = submissions.map(s => ({
      ...s,
      docUrls: Array.isArray(s.businessDocPaths)
        ? (s.businessDocPaths as string[]).map(p => `/api/storage${p}`)
        : [],
    }));

    res.json(submissionsWithUrls);
  } catch (error) {
    logger.error({ err: error }, "Error fetching business doc submissions:");
    res.status(500).json({ error: "Failed to fetch business document submissions" });
  }
});

export default router;
