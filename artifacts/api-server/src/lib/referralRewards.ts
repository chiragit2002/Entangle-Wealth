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

const REFERRAL_BADGES = [
  { slug: "referral-bronze", name: "Referral Bronze", icon: "bronze", description: "Referred 3 users who signed up", category: "referral", xpReward: 100, threshold: 3 },
  { slug: "referral-silver", name: "Referral Silver", icon: "silver", description: "Referred 10 users who signed up", category: "referral", xpReward: 250, threshold: 10 },
  { slug: "referral-gold", name: "Referral Gold", icon: "gold", description: "Referred 25 users who signed up", category: "referral", xpReward: 500, threshold: 25 },
  { slug: "referral-platinum", name: "Referral Platinum", icon: "platinum", description: "Referred 50 users who signed up", category: "referral", xpReward: 1000, threshold: 50 },
];

const STRIPE_REWARD_THRESHOLD = 5;

export async function ensureReferralBadgesExist(): Promise<void> {
  for (const badge of REFERRAL_BADGES) {
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

export async function processReferralMilestones(referrerId: string): Promise<void> {
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
            eq(userBadgesTable.userId, referrerId),
            eq(userBadgesTable.badgeId, badge.id)
          )
        );

      if (!existing) {
        await db.insert(userBadgesTable).values({
          userId: referrerId,
          badgeId: badge.id,
        });

        if (badge.xpReward > 0) {
          await db.insert(xpTransactionsTable).values({
            userId: referrerId,
            amount: badge.xpReward,
            reason: `Earned ${badge.name} badge`,
            category: "referral",
          });

          const [xp] = await db
            .select()
            .from(userXpTable)
            .where(eq(userXpTable.userId, referrerId));

          if (xp) {
            await db
              .update(userXpTable)
              .set({
                totalXp: xp.totalXp + badge.xpReward,
                monthlyXp: xp.monthlyXp + badge.xpReward,
                weeklyXp: xp.weeklyXp + badge.xpReward,
                updatedAt: new Date(),
              })
              .where(eq(userXpTable.userId, referrerId));
          } else {
            await db.insert(userXpTable).values({
              userId: referrerId,
              totalXp: badge.xpReward,
              monthlyXp: badge.xpReward,
              weeklyXp: badge.xpReward,
            });
          }
        }
      }
    }
  }

  if (referralCount >= STRIPE_REWARD_THRESHOLD) {
    await applyStripeCouponIfEligible(referrerId, referralCount);
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
