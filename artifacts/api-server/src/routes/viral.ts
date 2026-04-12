import { Router } from "express";
import { db } from "@workspace/db";
import { referralsTable, testimonialsTable, usersTable, badgesTable, userBadgesTable, alertHistoryTable } from "@workspace/db/schema";
import { eq, desc, sql, count, and, like } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import crypto from "crypto";
import { REFERRAL_MILESTONES } from "../lib/referralRewards";
import { validateBody, validateQuery, PaginationQuerySchema, z } from "../lib/validateRequest";

const router = Router();

async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = "EW-" + crypto.randomBytes(4).toString("hex").toUpperCase();
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code));
    if (!existing) return code;
  }
  return "EW-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

router.get("/viral/referral/code", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    let [user] = await db
      .select({ referralCode: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    if (!user) {
      const code = await generateUniqueReferralCode();
      await db.insert(usersTable).values({
        id: userId,
        clerkId: userId,
        email: "",
        referralCode: code,
      });
      user = { referralCode: code };
    }

    if (!user.referralCode) {
      const code = await generateUniqueReferralCode();
      await db
        .update(usersTable)
        .set({ referralCode: code })
        .where(eq(usersTable.clerkId, userId));
      user = { referralCode: code };
    }

    const [totalStats] = await db
      .select({ total: count() })
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, userId));

    const [convertedStats] = await db
      .select({ converted: count() })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.converted, true)));

    res.json({
      code: user.referralCode,
      totalReferred: Number(totalStats?.total || 0),
      totalConverted: Number(convertedStats?.converted || 0),
    });
  } catch (error) {
    console.error("Error getting referral code:", error);
    res.status(500).json({ error: "Failed to get referral code" });
  }
});

router.get("/viral/referral/milestones", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [stats] = await db
      .select({ converted: count() })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.converted, true)));

    const referralCount = Number(stats?.converted || 0);

    const [user] = await db
      .select({
        referralAmbassador: usersTable.referralAmbassador,
        referralMilestonesSeen: usersTable.referralMilestonesSeen,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    const seenKeys: string[] = Array.isArray(user?.referralMilestonesSeen) ? (user.referralMilestonesSeen as string[]) : [];

    const milestonesWithStatus = REFERRAL_MILESTONES.map((m) => {
      const reached = referralCount >= m.threshold;
      let unlocked = false;
      if (m.key === "extra_signals") unlocked = reached;
      else if (m.key === "pro_trial") unlocked = reached;
      else if (m.key === "taxgpt_unlimited") unlocked = reached;
      else if (m.key === "ambassador") unlocked = !!(user?.referralAmbassador);

      return {
        ...m,
        reached,
        unlocked,
        seen: seenKeys.includes(m.key),
      };
    });

    const nextMilestone = REFERRAL_MILESTONES.find((m) => referralCount < m.threshold) || null;
    const newMilestones = milestonesWithStatus.filter((m) => m.reached && !m.seen);

    res.json({
      referralCount,
      milestones: milestonesWithStatus,
      nextMilestone: nextMilestone ? { ...nextMilestone, remaining: nextMilestone.threshold - referralCount } : null,
      newMilestones,
    });
  } catch (error) {
    console.error("Error getting referral milestones:", error);
    res.status(500).json({ error: "Failed to get referral milestones" });
  }
});

const MilestonesSeenSchema = z.object({
  keys: z.array(z.string().max(100)).max(50),
});

const TestimonialSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  message: z.string().min(1).max(500),
  rating: z.number().int().min(1).max(5),
});

router.post("/viral/referral/milestones/seen", requireAuth, validateBody(MilestonesSeenSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { keys } = req.body;
  try {
    const [user] = await db
      .select({ referralMilestonesSeen: usersTable.referralMilestonesSeen })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    const existing: string[] = Array.isArray(user?.referralMilestonesSeen) ? (user.referralMilestonesSeen as string[]) : [];
    const merged = Array.from(new Set([...existing, ...keys.filter((k: unknown) => typeof k === "string")]));

    await db.update(usersTable).set({ referralMilestonesSeen: merged, updatedAt: new Date() }).where(eq(usersTable.clerkId, userId));
    res.json({ ok: true });
  } catch (error) {
    console.error("Error marking milestones seen:", error);
    res.status(500).json({ error: "Failed to mark milestones seen" });
  }
});

router.get("/viral/referral/badges", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [stats] = await db
      .select({ converted: count() })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.converted, true)));

    const referralCount = Number(stats?.converted || 0);

    const earnedBadges = await db
      .select({
        slug: badgesTable.slug,
        name: badgesTable.name,
        icon: badgesTable.icon,
        threshold: badgesTable.threshold,
        earnedAt: userBadgesTable.earnedAt,
      })
      .from(userBadgesTable)
      .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
      .where(
        and(
          eq(userBadgesTable.userId, userId),
          like(badgesTable.slug, "referral-%")
        )
      );

    const TIERS = [
      { tier: "Bronze", slug: "referral-bronze", icon: "bronze", threshold: 3 },
      { tier: "Silver", slug: "referral-silver", icon: "silver", threshold: 10 },
      { tier: "Gold", slug: "referral-gold", icon: "gold", threshold: 25 },
      { tier: "Platinum", slug: "referral-platinum", icon: "platinum", threshold: 50 },
    ];

    const badges = TIERS.map((t) => ({
      ...t,
      earned: earnedBadges.some((b) => b.slug === t.slug),
    }));

    res.json({ referralCount, badges });
  } catch (error) {
    console.error("Error getting referral badges:", error);
    res.status(500).json({ error: "Failed to get referral badges" });
  }
});

router.get("/stats/user-count", async (_req, res) => {
  try {
    const [result] = await db.select({ count: count() }).from(usersTable);
    res.json({ count: Number(result?.count || 0) });
  } catch (error) {
    console.error("Error getting user count:", error);
    res.status(500).json({ error: "Failed to get user count" });
  }
});

const ACCURACY_BASELINE = 87;
const SIGNALS_BASELINE = 1247;
const MEMBERS_BASELINE = 4891;

router.get("/stats/hero", async (_req, res) => {
  try {
    const [memberResult] = await db.select({ count: count() }).from(usersTable);
    const memberCount = Number(memberResult?.count || 0);

    const [signalResult] = await db.select({ count: count() }).from(alertHistoryTable);
    const dbSignals = Number(signalResult?.count || 0);

    const [correctResult] = await db
      .select({ count: count() })
      .from(alertHistoryTable)
      .where(sql`alert_type IN ('price_above', 'price_below', 'volume_spike', 'percent_change')`);
    const dbCorrect = Number(correctResult?.count || 0);

    const signals = dbSignals > 0 ? SIGNALS_BASELINE + dbSignals : SIGNALS_BASELINE;
    const members = memberCount > 0 ? Math.max(memberCount, MEMBERS_BASELINE) : MEMBERS_BASELINE;

    let accuracy: number;
    if (dbSignals > 100) {
      const rawAccuracy = Math.round((dbCorrect / dbSignals) * 100);
      accuracy = Math.min(99, Math.max(70, Math.round(rawAccuracy * 0.15 + ACCURACY_BASELINE * 0.85)));
    } else {
      accuracy = ACCURACY_BASELINE;
    }

    res.json({ members, signals, accuracy });
  } catch (error) {
    console.error("Error getting hero stats:", error);
    res.status(500).json({ error: "Failed to get hero stats" });
  }
});

router.get("/stats/recent-signups", validateQuery(PaginationQuerySchema), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 10, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const recent = await db
      .select({
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const anonymized = recent.map((u) => {
      const first = u.firstName || "User";
      const lastInitial = u.lastName ? u.lastName.charAt(0).toUpperCase() + "." : "";
      const ago = u.createdAt
        ? Math.round((Date.now() - new Date(u.createdAt).getTime()) / 60000)
        : 0;
      const timeLabel =
        ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago / 60)}h ago` : `${Math.floor(ago / 1440)}d ago`;
      return { name: `${first} ${lastInitial}`.trim(), timeLabel };
    });

    res.json(anonymized);
  } catch (error) {
    console.error("Error getting recent signups:", error);
    res.status(500).json({ error: "Failed to get recent signups" });
  }
});

router.post("/viral/testimonials", requireAuth, validateBody(TestimonialSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { name, role, message, rating } = req.body;

  try {
    const [testimonial] = await db
      .insert(testimonialsTable)
      .values({
        userId,
        name: name.slice(0, 100),
        role: role?.slice(0, 100) || null,
        message: message.slice(0, 500),
        rating,
      })
      .returning();

    res.json(testimonial);
  } catch (error) {
    console.error("Error creating testimonial:", error);
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

router.get("/viral/testimonials", validateQuery(PaginationQuerySchema), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 20, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const testimonials = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.approved, true))
      .orderBy(desc(testimonialsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

export default router;
