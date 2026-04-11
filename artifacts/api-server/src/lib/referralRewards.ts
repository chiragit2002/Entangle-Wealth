import { db } from "@workspace/db";
import {
  referralsTable,
  badgesTable,
  userBadgesTable,
  userXpTable,
  xpTransactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, count, and } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";
import { resolveUserId } from "./resolveUserId";

const REFERRAL_BADGES = [
  { slug: "referral-bronze", name: "Referral Bronze", icon: "bronze", description: "Referred 3 users who signed up", category: "referral", xpReward: 100, threshold: 3 },
  { slug: "referral-silver", name: "Referral Silver", icon: "silver", description: "Referred 10 users who signed up", category: "referral", xpReward: 250, threshold: 10 },
  { slug: "referral-gold", name: "Referral Gold", icon: "gold", description: "Referred 25 users who signed up", category: "referral", xpReward: 500, threshold: 25 },
  { slug: "referral-platinum", name: "Referral Platinum", icon: "platinum", description: "Referred 50 users who signed up", category: "referral", xpReward: 1000, threshold: 50 },
];

const AMBASSADOR_BADGE = {
  slug: "referral-ambassador",
  name: "Ambassador",
  icon: "ambassador",
  description: "Referred 25+ users — permanent Ambassador status",
  category: "referral",
  xpReward: 750,
  threshold: 25,
};

export const REFERRAL_MILESTONES = [
  {
    threshold: 3,
    key: "extra_signals",
    title: "5 Extra Daily Signals",
    description: "You've unlocked 5 bonus trading signals per day for the next 30 days!",
    icon: "⚡",
  },
  {
    threshold: 5,
    key: "pro_trial",
    title: "1 Month Pro Trial",
    description: "You've unlocked a free month of Pro access!",
    icon: "🚀",
  },
  {
    threshold: 10,
    key: "taxgpt_unlimited",
    title: "Unlimited TaxGPT for a Month",
    description: "You've unlocked unlimited TaxGPT access for 30 days!",
    icon: "🧾",
  },
  {
    threshold: 25,
    key: "ambassador",
    title: "Ambassador Badge",
    description: "You've earned the permanent Ambassador badge — displayed on your profile and community posts!",
    icon: "🏆",
  },
];

const STRIPE_REWARD_THRESHOLD = 5;

export async function ensureReferralBadgesExist(): Promise<void> {
  for (const badge of [...REFERRAL_BADGES, AMBASSADOR_BADGE]) {
    const [existing] = await db
      .select()
      .from(badgesTable)
      .where(eq(badgesTable.slug, badge.slug));
    if (!existing) {
      await db.insert(badgesTable).values({
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        xpReward: badge.xpReward,
        requirement: `Refer ${badge.threshold} users`,
        threshold: badge.threshold,
      });
    }
  }
}

export async function processReferralMilestones(referrerId: string): Promise<{ newMilestones: string[] }> {
  const userId = await resolveUserId(referrerId);
  if (!userId) {
    console.warn(`[referral] Could not resolve DB user ID for Clerk ID ${referrerId}`);
    return { newMilestones: [] };
  }

  const [stats] = await db
    .select({ converted: count() })
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerId, referrerId), eq(referralsTable.converted, true)));

  const referralCount = Number(stats?.converted || 0);

  for (const badgeDef of REFERRAL_BADGES) {
    if (referralCount >= badgeDef.threshold) {
      const [badge] = await db
        .select()
        .from(badgesTable)
        .where(eq(badgesTable.slug, badgeDef.slug));
      if (!badge) continue;

      const [existing] = await db
        .select()
        .from(userBadgesTable)
        .where(
          and(
            eq(userBadgesTable.userId, userId),
            eq(userBadgesTable.badgeId, badge.id)
          )
        );

      if (!existing) {
        await db.insert(userBadgesTable).values({
          userId,
          badgeId: badge.id,
        });

        if (badge.xpReward > 0) {
          await db.insert(xpTransactionsTable).values({
            userId,
            amount: badge.xpReward,
            reason: `Earned ${badge.name} badge`,
            category: "referral",
          });

          const [xp] = await db
            .select()
            .from(userXpTable)
            .where(eq(userXpTable.userId, userId));

          if (xp) {
            await db
              .update(userXpTable)
              .set({
                totalXp: xp.totalXp + badge.xpReward,
                monthlyXp: xp.monthlyXp + badge.xpReward,
                weeklyXp: xp.weeklyXp + badge.xpReward,
                updatedAt: new Date(),
              })
              .where(eq(userXpTable.userId, userId));
          } else {
            await db.insert(userXpTable).values({
              userId,
              totalXp: badge.xpReward,
              monthlyXp: badge.xpReward,
              weeklyXp: badge.xpReward,
            });
          }
        }
      }
    }
  }

  await applyFeatureUnlocks(referrerId, userId, referralCount);

  if (referralCount >= STRIPE_REWARD_THRESHOLD) {
    await applyStripeCouponIfEligible(referrerId, referralCount);
  }

  return { newMilestones: [] };
}

async function applyFeatureUnlocks(referrerId: string, userId: string, referralCount: number): Promise<void> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, referrerId));

  if (!user) return;

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (referralCount >= 3) {
    const current = user.referralExtraSignalsUntil;
    if (!current || current < now) {
      updates.referralExtraSignalsUntil = thirtyDaysFromNow;
    }
  }

  if (referralCount >= 10) {
    const current = user.referralTaxGptUntil;
    if (!current || current < now) {
      updates.referralTaxGptUntil = thirtyDaysFromNow;
    }
  }

  if (referralCount >= 25 && !user.referralAmbassador) {
    updates.referralAmbassador = true;

    const [ambBadge] = await db
      .select()
      .from(badgesTable)
      .where(eq(badgesTable.slug, AMBASSADOR_BADGE.slug));

    if (ambBadge) {
      const [existingAmbBadge] = await db
        .select()
        .from(userBadgesTable)
        .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, ambBadge.id)));

      if (!existingAmbBadge) {
        await db.insert(userBadgesTable).values({ userId, badgeId: ambBadge.id });

        if (AMBASSADOR_BADGE.xpReward > 0) {
          await db.insert(xpTransactionsTable).values({
            userId,
            amount: AMBASSADOR_BADGE.xpReward,
            reason: `Earned ${AMBASSADOR_BADGE.name} badge`,
            category: "referral",
          });

          const [xp] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
          if (xp) {
            await db.update(userXpTable).set({
              totalXp: xp.totalXp + AMBASSADOR_BADGE.xpReward,
              monthlyXp: xp.monthlyXp + AMBASSADOR_BADGE.xpReward,
              weeklyXp: xp.weeklyXp + AMBASSADOR_BADGE.xpReward,
              updatedAt: new Date(),
            }).where(eq(userXpTable.userId, userId));
          } else {
            await db.insert(userXpTable).values({
              userId,
              totalXp: AMBASSADOR_BADGE.xpReward,
              monthlyXp: AMBASSADOR_BADGE.xpReward,
              weeklyXp: AMBASSADOR_BADGE.xpReward,
            });
          }
        }
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = now;
    await db.update(usersTable).set(updates).where(eq(usersTable.clerkId, referrerId));
  }
}

async function applyStripeCouponIfEligible(referrerId: string, referralCount: number): Promise<void> {
  if (referralCount < STRIPE_REWARD_THRESHOLD) return;

  const couponId = process.env.STRIPE_REFERRAL_COUPON;
  if (!couponId) {
    console.log(`[referral] User ${referrerId} hit ${referralCount} referrals but STRIPE_REFERRAL_COUPON not configured`);
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, referrerId));

    if (!user?.stripeSubscriptionId) {
      console.log(`[referral] User ${referrerId} has no active subscription to apply coupon to`);
      return;
    }

    if (user.referralCouponApplied) {
      console.log(`[referral] Coupon already applied for user ${referrerId}`);
      return;
    }

    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      coupon: couponId,
    });
    await db
      .update(usersTable)
      .set({ referralCouponApplied: true, updatedAt: new Date() })
      .where(eq(usersTable.clerkId, referrerId));
    console.log(`[referral] Applied coupon ${couponId} to subscription for user ${referrerId}`);
  } catch (error) {
    console.error(`[referral] Failed to apply Stripe coupon for user ${referrerId}:`, error);
  }
}
