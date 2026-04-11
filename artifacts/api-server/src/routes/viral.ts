import { Router } from "express";
import { db } from "@workspace/db";
import { referralsTable, testimonialsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import crypto from "crypto";

const router = Router();

function generateReferralCode(): string {
  return "EW-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

router.get("/viral/referral/code", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    let [existing] = await db
      .select()
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.referredUserId, sql`NULL`)));

    if (!existing) {
      const code = generateReferralCode();
      [existing] = await db
        .insert(referralsTable)
        .values({ referrerId: userId, referralCode: code })
        .returning();
    }

    const [stats] = await db
      .select({
        total: count(),
        converted: sql<number>`count(*) filter (where ${referralsTable.converted} = true)`,
      })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), sql`${referralsTable.referredUserId} is not null`));

    res.json({
      code: existing.referralCode,
      totalReferred: Number(stats?.total || 0),
      totalConverted: Number(stats?.converted || 0),
    });
  } catch (error) {
    console.error("Error getting referral code:", error);
    res.status(500).json({ error: "Failed to get referral code" });
  }
});

router.post("/viral/referral/track", async (req, res) => {
  const { referralCode, userId } = req.body;
  if (!referralCode || !userId) {
    res.status(400).json({ error: "referralCode and userId are required" });
    return;
  }

  try {
    const [referrer] = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referralCode, referralCode));

    if (!referrer) {
      res.status(404).json({ error: "Invalid referral code" });
      return;
    }

    if (referrer.referrerId === userId) {
      res.status(400).json({ error: "Cannot refer yourself" });
      return;
    }

    await db.insert(referralsTable).values({
      referrerId: referrer.referrerId,
      referredUserId: userId,
      referralCode: generateReferralCode(),
      converted: true,
      convertedAt: new Date(),
    });

    res.json({ success: true, referrerId: referrer.referrerId });
  } catch (error) {
    console.error("Error tracking referral:", error);
    res.status(500).json({ error: "Failed to track referral" });
  }
});

router.get("/viral/referral/badges", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const [stats] = await db
      .select({ converted: sql<number>`count(*)` })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.converted, true)));

    const referralCount = Number(stats?.converted || 0);
    const badges = [];
    if (referralCount >= 3) badges.push({ tier: "Bronze", icon: "🥉", threshold: 3 });
    if (referralCount >= 10) badges.push({ tier: "Silver", icon: "🥈", threshold: 10 });
    if (referralCount >= 25) badges.push({ tier: "Gold", icon: "🥇", threshold: 25 });
    if (referralCount >= 50) badges.push({ tier: "Platinum", icon: "💎", threshold: 50 });

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

router.get("/stats/recent-signups", async (_req, res) => {
  try {
    const recent = await db
      .select({
        firstName: usersTable.firstName,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(10);

    const anonymized = recent.map((u) => {
      const name = u.firstName || "User";
      const initial = name.charAt(0).toUpperCase();
      const ago = u.createdAt
        ? Math.round((Date.now() - new Date(u.createdAt).getTime()) / 60000)
        : 0;
      const timeLabel =
        ago < 1 ? "just now" : ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago / 60)}h ago` : `${Math.floor(ago / 1440)}d ago`;
      return { name: `${initial}.`, timeLabel };
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

router.get("/viral/testimonials", async (_req, res) => {
  try {
    const testimonials = await db
      .select()
      .from(testimonialsTable)
      .where(eq(testimonialsTable.approved, true))
      .orderBy(desc(testimonialsTable.createdAt))
      .limit(20);

    res.json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

export default router;
