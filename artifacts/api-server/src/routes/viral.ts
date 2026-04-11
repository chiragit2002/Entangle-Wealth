import { Router } from "express";
import { db } from "@workspace/db";
import { referralConversionsTable, testimonialsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import crypto from "crypto";

const router = Router();

router.get("/viral/referral/code", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    let [user] = await db
      .select({ referralCode: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.clerkId, userId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.referralCode) {
      const code = "EW-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      await db
        .update(usersTable)
        .set({ referralCode: code })
        .where(eq(usersTable.clerkId, userId));
      user = { referralCode: code };
    }

    const [stats] = await db
      .select({ converted: count() })
      .from(referralConversionsTable)
      .where(eq(referralConversionsTable.referrerId, userId));

    res.json({
      code: user.referralCode,
      totalConverted: Number(stats?.converted || 0),
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
      .from(referralConversionsTable)
      .where(eq(referralConversionsTable.referrerId, userId));

    const referralCount = Number(stats?.converted || 0);
    const badges = [];
    if (referralCount >= 3) badges.push({ tier: "Bronze", icon: "bronze", threshold: 3 });
    if (referralCount >= 10) badges.push({ tier: "Silver", icon: "silver", threshold: 10 });
    if (referralCount >= 25) badges.push({ tier: "Gold", icon: "gold", threshold: 25 });
    if (referralCount >= 50) badges.push({ tier: "Platinum", icon: "platinum", threshold: 50 });

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
        lastName: usersTable.lastName,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(10);

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
