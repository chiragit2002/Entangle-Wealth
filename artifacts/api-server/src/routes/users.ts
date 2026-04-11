import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  referralsTable,
  analyticsEventsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";
import crypto from "crypto";
import { processReferralMilestones } from "../lib/referralRewards";
import { sendZapierWebhook } from "../lib/zapierWebhook";

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).userId;
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      res.status(200).json({ needsSync: true });
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
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));

    if (existing) {
      const [updated] = await db
        .update(usersTable)
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
      let referralCode =
        "EW-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      for (let i = 0; i < 4; i++) {
        const [dup] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.referralCode, referralCode));
        if (!dup) break;
        referralCode =
          "EW-" +
          crypto
            .randomBytes(4 + i)
            .toString("hex")
            .toUpperCase();
      }
      const [created] = await db
        .insert(usersTable)
        .values({
          id: clerkId,
          clerkId,
          email: email || "",
          firstName,
          lastName,
          photoUrl,
          referralCode,
          referredBy: req.body.referredBy || null,
        })
        .returning();

      sendZapierWebhook("user_signup", {
        email: created.email,
        name: `${created.firstName || ""} ${created.lastName || ""}`.trim(),
        referralCode: created.referralCode,
        signupTimestamp:
          created.createdAt?.toISOString() || new Date().toISOString(),
      }).catch(() => {});

      if (req.body.referredBy) {
        db.insert(analyticsEventsTable)
          .values({
            userId: clerkId,
            event: "referral_signup",
            properties: { referralCode: req.body.referredBy },
          })
          .catch(() => {});
        const [referrer] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.referralCode, req.body.referredBy));
        if (referrer) {
          try {
            await db.insert(referralsTable).values({
              referrerId: referrer.clerkId,
              referredUserId: clerkId,
              converted: true,
              convertedAt: new Date(),
            });

            sendZapierWebhook("referral_conversion", {
              referrerId: referrer.clerkId,
              referredUserEmail: created.email,
              referralCode: req.body.referredBy,
            }).catch(() => {});

            processReferralMilestones(referrer.clerkId).catch((err) =>
              console.error("[referral] milestone processing failed:", err),
            );
          } catch (refErr) {
            console.error(
              "[referral] Failed to create referral record:",
              refErr,
            );
          }
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
    const [updated] = await db
      .update(usersTable)
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
    const [user] = await db
      .select({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        photoUrl: usersTable.photoUrl,
        headline: usersTable.headline,
        bio: usersTable.bio,
        location: usersTable.location,
        subscriptionTier: usersTable.subscriptionTier,
        createdAt: usersTable.createdAt,
        isPublicProfile: usersTable.isPublicProfile,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.params.userId));
    if (!user || !user.isPublicProfile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const { isPublicProfile, ...publicProfile } = user;
    res.json(publicProfile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
