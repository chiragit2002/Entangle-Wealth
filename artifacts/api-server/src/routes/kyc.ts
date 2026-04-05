import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/kyc/status", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const [user] = await db.select({
      kycStatus: usersTable.kycStatus,
      kycSubmittedAt: usersTable.kycSubmittedAt,
      kycVerifiedAt: usersTable.kycVerifiedAt,
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

router.post("/kyc/submit", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { fullLegalName, dateOfBirth, address, idType, idNumber } = req.body;

  if (!fullLegalName || !dateOfBirth || !address || !idType || !idNumber) {
    res.status(400).json({ error: "All fields are required" });
    return;
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

router.post("/kyc/approve/:userId", requireAuth, async (req, res) => {
  const targetUserId = req.params.userId;

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

export default router;
