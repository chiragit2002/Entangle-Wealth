import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralConversionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import crypto from "crypto";
import { processReferralMilestones } from "../lib/referralRewards";

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).userId;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.post("/users/sync", requireAuth, async (req, res) => {
  const clerkId = (req as any).userId;
  const { email, firstName, lastName, photoUrl } = req.body;

  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

    if (existing) {
      const [updated] = await db.update(usersTable)
        .set({
          email: email || existing.email,
          firstName: firstName || existing.firstName,
          lastName: lastName || existing.lastName,
          photoUrl: photoUrl || existing.photoUrl,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.clerkId, clerkId))
        .returning();
      res.json(updated);
    } else {
      const referralCode = "EW-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      const [created] = await db.insert(usersTable).values({
        id: clerkId,
        clerkId,
        email: email || "",
        firstName,
        lastName,
        photoUrl,
        referralCode,
        referredBy: req.body.referredBy || null,
      }).returning();

      if (req.body.referredBy) {
        const [referrer] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.referralCode, req.body.referredBy));
        if (referrer) {
          try {
            await db.insert(referralConversionsTable).values({
              referrerId: referrer.clerkId,
              referredUserId: clerkId,
            });
            processReferralMilestones(referrer.clerkId).catch((err) =>
              console.error("[referral] milestone processing failed:", err)
            );
          } catch (_e) {}
        }
      }

      res.json(created);
    }
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

router.put("/users/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).userId;
  const { headline, bio, phone, location, isPublicProfile } = req.body;

  try {
    const [updated] = await db.update(usersTable)
      .set({
        headline,
        bio,
        phone,
        location,
        isPublicProfile,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/users/:userId/profile", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId));
    if (!user || !user.isPublicProfile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const { stripeCustomerId, stripeSubscriptionId, kycStatus, kycSubmittedAt, kycVerifiedAt, ...publicProfile } = user;
    res.json(publicProfile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
