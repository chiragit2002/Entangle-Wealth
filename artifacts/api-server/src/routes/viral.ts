import { Router } from "express";
import { db } from "@workspace/db";
import { referralsTable, testimonialsTable, usersTable, badgesTable, userBadgesTable } from "@workspace/db/schema";
import { eq, desc, sql, count, and, like } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import crypto from "crypto";

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
  const userId = (req as any).userId;
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

router.get("/viral/referral/badges", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
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

router.get("/stats/recent-signups", async (req, res) => {
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

router.post("/viral/testimonials", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { name, role, message, rating } = req.body;

  if (!name || !message || !rating) {
    res.status(400).json({ error: "name, message, and rating are required" });
    return;
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be between 1 and 5" });
    return;
  }

  if (message.length > 500) {
    res.status(400).json({ error: "message must be 500 characters or fewer" });
    return;
  }

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

router.get("/viral/testimonials", async (req, res) => {
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
