import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { isUploadOwnedBy } from "./storage";
import { validateBody, validateParams, z } from "../lib/validateRequest";

const AdminUserIdParamsSchema = z.object({
  userId: z.string().min(1).max(100),
});

const router = Router();

router.get("/kyc/status", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db.select({
      kycStatus: usersTable.kycStatus,
      kycSubmittedAt: usersTable.kycSubmittedAt,
      kycVerifiedAt: usersTable.kycVerifiedAt,
      kycIdPhotoPath: usersTable.kycIdPhotoPath,
      kycSelfiePath: usersTable.kycSelfiePath,
    }).from(usersTable).where(eq(usersTable.clerkId, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching KYC status:", error);
    res.status(500).json({ error: "Failed to fetch KYC status" });
  }
});

const KycSubmitSchema = z.object({
  fullLegalName: z.string().min(1).max(200),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  address: z.string().min(1).max(500),
  idType: z.enum(["passport", "drivers_license", "national_id", "other"]),
  idNumber: z.string().min(1).max(100),
  idPhotoPath: z.string().regex(/^\/objects\//, "Must start with /objects/").optional(),
  selfiePath: z.string().regex(/^\/objects\//, "Must start with /objects/").optional(),
});

router.post("/kyc/submit", requireAuth, validateBody(KycSubmitSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { fullLegalName, dateOfBirth, address, idType, idNumber, idPhotoPath, selfiePath } = req.body;

  if (idPhotoPath && typeof idPhotoPath === "string") {
    if (!idPhotoPath.startsWith("/objects/")) {
      res.status(400).json({ error: "Invalid idPhotoPath" });
      return;
    }
    if (!(await isUploadOwnedBy(idPhotoPath, userId))) {
      res.status(403).json({ error: "You do not own the uploaded ID photo" });
      return;
    }
  }

  if (selfiePath && typeof selfiePath === "string") {
    if (!selfiePath.startsWith("/objects/")) {
      res.status(400).json({ error: "Invalid selfiePath" });
      return;
    }
    if (!(await isUploadOwnedBy(selfiePath, userId))) {
      res.status(403).json({ error: "You do not own the uploaded selfie" });
      return;
    }
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.kycStatus === "verified") {
      res.json({ status: "verified", message: "Already verified" });
      return;
    }

    const [updated] = await db.update(usersTable).set({
      kycStatus: "pending_review",
      kycSubmittedAt: new Date(),
      kycIdPhotoPath: idPhotoPath ?? user.kycIdPhotoPath,
      kycSelfiePath: selfiePath ?? user.kycSelfiePath,
      kycFullLegalName: fullLegalName,
      kycDateOfBirth: dateOfBirth,
      kycAddress: address,
      kycIdType: idType,
      kycIdNumber: idNumber,
      updatedAt: new Date(),
    }).where(eq(usersTable.clerkId, userId)).returning();

    res.json({
      status: updated.kycStatus,
      message: "KYC submitted for review. You will be notified once verified.",
    });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: "Failed to submit KYC" });
  }
});

router.post("/kyc/approve/:userId", requireAuth, requireAdmin, validateParams(AdminUserIdParamsSchema), validateBody(z.object({}).strict()), async (req, res) => {
  const targetUserId = String(req.params.userId);

  try {
    const [updated] = await db.update(usersTable).set({
      kycStatus: "verified",
      kycVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, targetUserId)).returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ status: "verified", message: "KYC approved" });
  } catch (error) {
    console.error("Error approving KYC:", error);
    res.status(500).json({ error: "Failed to approve KYC" });
  }
});

router.post("/kyc/reject/:userId", requireAuth, requireAdmin, validateParams(AdminUserIdParamsSchema), validateBody(z.object({}).strict()), async (req, res) => {
  const targetUserId = String(req.params.userId);

  try {
    const [updated] = await db.update(usersTable).set({
      kycStatus: "rejected",
      updatedAt: new Date(),
    }).where(eq(usersTable.id, targetUserId)).returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ status: "rejected", message: "KYC rejected" });
  } catch (error) {
    console.error("Error rejecting KYC:", error);
    res.status(500).json({ error: "Failed to reject KYC" });
  }
});

router.get("/kyc/admin/submissions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const submissions = await db.select({
      id: usersTable.id,
      clerkId: usersTable.clerkId,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      kycStatus: usersTable.kycStatus,
      kycSubmittedAt: usersTable.kycSubmittedAt,
      kycVerifiedAt: usersTable.kycVerifiedAt,
      kycIdPhotoPath: usersTable.kycIdPhotoPath,
      kycSelfiePath: usersTable.kycSelfiePath,
      kycFullLegalName: usersTable.kycFullLegalName,
      kycDateOfBirth: usersTable.kycDateOfBirth,
      kycAddress: usersTable.kycAddress,
      kycIdType: usersTable.kycIdType,
      kycIdNumber: usersTable.kycIdNumber,
    }).from(usersTable)
      .where(eq(usersTable.kycStatus, "pending_review"));

    const submissionsWithUrls = submissions.map(s => ({
      ...s,
      idPhotoUrl: s.kycIdPhotoPath ? `/api/storage${s.kycIdPhotoPath}` : null,
      selfieUrl: s.kycSelfiePath ? `/api/storage${s.kycSelfiePath}` : null,
    }));

    res.json(submissionsWithUrls);
  } catch (error) {
    console.error("Error fetching KYC submissions:", error);
    res.status(500).json({ error: "Failed to fetch KYC submissions" });
  }
});

export default router;
