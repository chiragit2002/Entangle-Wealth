import { Router } from "express";
import { PUBLIC_ENDPOINT_POLICY } from "../lib/publicEndpointPolicy";
import { db } from "@workspace/db";
import {
  usersTable,
  referralsTable,
  analyticsEventsTable,
  emailSubscribersTable,
  giveawayEntriesTable,
  userXpTable,
  streaksTable,
} from "@workspace/db/schema";
import { eq, count, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { getAuth } from "@clerk/express";
import crypto from "crypto";
import { processReferralMilestones } from "../lib/referralRewards";
import { sendZapierWebhook } from "../lib/zapierWebhook";
import { validateBody, validateParams, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";
import { getOccupationById } from "@workspace/occupations";

async function autoEnrollInGiveaway(userId: string, clerkId: string) {
  await db
    .insert(giveawayEntriesTable)
    .values({ userId })
    .onConflictDoNothing({ target: giveawayEntriesTable.userId });

  const [xpRow] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
  const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
  const [refStats] = await db
    .select({ converted: count() })
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerId, clerkId), eq(referralsTable.converted, true)));

  const xpLevel = xpRow?.level || 1;
  const totalXp = xpRow?.totalXp || 0;
  const currentStreak = streak?.currentStreak || 0;
  const convertedReferrals = Number(refStats?.converted || 0);

  const tradeEntries = Math.min(Math.floor(totalXp / 500), 50);
  const streakEntries = Math.min(currentStreak, 30);
  const xpMilestoneEntries = Math.floor(xpLevel / 5);
  const loginEntries = Math.min(Math.floor(totalXp / 100), 30);
  const referralEntries = convertedReferrals * 5;
  const totalEntries = tradeEntries + streakEntries + xpMilestoneEntries + loginEntries + referralEntries;

  await db
    .update(giveawayEntriesTable)
    .set({
      totalEntries,
      tradeEntries,
      streakEntries,
      loginEntries,
      xpMilestoneEntries,
      referralEntries,
      convertedReferrals,
      updatedAt: new Date(),
    })
    .where(eq(giveawayEntriesTable.userId, userId));
}

const UserIdParamsSchema = z.object({
  userId: z.string().min(1).max(100),
});

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      res.status(200).json({ needsSync: true });
      return;
    }
    const occupation = user.occupationId ? getOccupationById(user.occupationId) : null;
    res.json({ ...user, occupation: occupation ?? null });
  } catch (error) {
    logger.error({ err: error }, "Error fetching user");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

const UserSyncSchema = z.object({
  email: z.string().email().max(254).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  photoUrl: z.string().url().max(500).optional().or(z.literal("")),
  referredBy: z.string().max(100).optional(),
});

const UserUpdateSchema = z.object({
  headline: z.string().max(200).optional(),
  occupationId: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  isPublicProfile: z.boolean().optional(),
  isBusinessOwner: z.boolean().optional(),
});

router.post("/users/sync", requireAuth, validateBody(UserSyncSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
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

      const resolvedEmail = (email || existing.email || "").toLowerCase();
      if (resolvedEmail) {
        db.update(emailSubscribersTable)
          .set({ converted: true, nextSendAt: null, updatedAt: new Date() })
          .where(eq(emailSubscribersTable.email, resolvedEmail))
          .catch(err => logger.warn({ err, email: resolvedEmail }, 'Failed to mark existing user email subscriber as converted'));
      }

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
      }).catch(err => logger.warn({ err, email: created.email }, 'Failed to send user_signup Zapier webhook'));

      if (created.email) {
        db.update(emailSubscribersTable)
          .set({ converted: true, nextSendAt: null, updatedAt: new Date() })
          .where(eq(emailSubscribersTable.email, created.email.toLowerCase()))
          .catch(err => logger.warn({ err, email: created.email }, 'Failed to mark email subscriber as converted'));
      }

      if (req.body.referredBy) {
        db.insert(analyticsEventsTable)
          .values({
            userId: clerkId,
            event: "referral_signup",
            properties: { referralCode: req.body.referredBy },
          })
          .catch(err => logger.warn({ err, userId: clerkId, referralCode: req.body.referredBy }, 'Failed to insert referral_signup analytics event'));
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
            }).catch(err => logger.warn({ err, referrerId: referrer.clerkId, referredUserEmail: created.email }, 'Failed to send referral_conversion Zapier webhook'));

            processReferralMilestones(referrer.clerkId).catch((err) =>
              logger.error({ err }, "[referral] milestone processing failed"),
            );
          } catch (refErr) {
            logger.error({ err: refErr }, "[referral] Failed to create referral record");
          }
        }
      }

      try {
        await autoEnrollInGiveaway(clerkId, clerkId);
      } catch (err) {
        logger.warn({ err, userId: clerkId }, "[giveaway] Auto-enrollment failed (non-fatal)");
      }

      res.json(created);
    }
  } catch (error) {
    logger.error({ err: error }, "Error syncing user");
    res.status(500).json({ error: "Failed to sync user" });
  }
});

router.put("/users/me", requireAuth, validateBody(UserUpdateSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { headline, occupationId, bio, phone, location, isPublicProfile, isBusinessOwner } = req.body;

  try {
    const updateData: Record<string, unknown> = {
      bio,
      phone,
      location,
      isPublicProfile,
      updatedAt: new Date(),
    };

    if (occupationId !== undefined) {
      if (occupationId) {
        const occ = getOccupationById(occupationId);
        if (!occ) {
          res.status(400).json({ error: "Invalid occupation ID. Please select a valid occupation from the list." });
          return;
        }
        updateData.occupationId = occupationId;
        updateData.headline = occ.name;
      } else {
        updateData.occupationId = null;
      }
    } else if (headline !== undefined) {
      updateData.headline = headline;
    }

    if (typeof isBusinessOwner === "boolean") {
      updateData.isBusinessOwner = isBusinessOwner;
    }
    const [updated] = await db
      .update(usersTable)
      .set(updateData as any)
      .where(eq(usersTable.clerkId, clerkId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(updated);
  } catch (error) {
    logger.error({ err: error }, "Error updating user");
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Public endpoint — approved in publicEndpointPolicy.ts (PUBLIC_ENDPOINT_POLICY[2]).
// Returns only fields users have explicitly chosen to make public (isPublicProfile opt-in).
// Returns 404 for both private and non-existent profiles to prevent enumeration.
void PUBLIC_ENDPOINT_POLICY[2];
router.get("/users/:userId/profile", validateParams(UserIdParamsSchema), async (req, res) => {
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
    logger.error({ err: error }, "Error fetching profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
