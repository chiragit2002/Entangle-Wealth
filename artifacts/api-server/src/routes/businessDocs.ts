import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { isUploadOwnedBy } from "./storage";

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
    console.error("Error fetching business doc status:", error);
    res.status(500).json({ error: "Failed to fetch business doc status" });
  }
});

router.post("/business-docs/submit", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { docPaths } = req.body;

  if (!Array.isArray(docPaths) || docPaths.length === 0) {
    res.status(400).json({ error: "At least one document path is required" });
    return;
  }

  for (const p of docPaths) {
    if (typeof p !== "string" || !p.startsWith("/objects/")) {
      res.status(400).json({ error: "Invalid document path" });
      return;
    }
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
    console.error("Error submitting business docs:", error);
    res.status(500).json({ error: "Failed to submit business documents" });
  }
});

router.post("/business-docs/approve/:userId", requireAuth, requireAdmin, async (req, res) => {
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
    console.error("Error approving business docs:", error);
    res.status(500).json({ error: "Failed to approve business documents" });
  }
});

router.post("/business-docs/reject/:userId", requireAuth, requireAdmin, async (req, res) => {
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
    console.error("Error rejecting business docs:", error);
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
    console.error("Error fetching business doc submissions:", error);
    res.status(500).json({ error: "Failed to fetch business document submissions" });
  }
});

export default router;
