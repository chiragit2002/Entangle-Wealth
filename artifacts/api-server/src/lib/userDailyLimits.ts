import { db } from "@workspace/db";
import { usersTable, referralsTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";

export const PROMO_END_ISO = "2026-05-13T23:59:59Z";
const PROMO_END_DATE = new Date(PROMO_END_ISO);

export function isPromoActive(): boolean {
  return Date.now() < PROMO_END_DATE.getTime();
}

const FREE_DAILY_SIGNALS = 3;
const REFERRAL_BONUS_SIGNALS = 5;
const FREE_DAILY_TAXGPT = 5;

const signalUsageMap = new Map<string, { count: number; resetAt: number }>();
const taxgptUsageMap = new Map<string, { count: number; resetAt: number }>();
const DAY_MS = 24 * 60 * 60 * 1000;

function getDayKey(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime() + DAY_MS;
}

export async function checkSignalLimit(clerkId: string): Promise<{ allowed: boolean; remaining: number; maxAllowed: number; referralBonus: boolean }> {
  if (isPromoActive()) {
    return { allowed: true, remaining: 999, maxAllowed: 999, referralBonus: false };
  }

  const [user] = await db
    .select({ subscriptionTier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (user?.subscriptionTier === "pro" || user?.subscriptionTier === "business") {
    return { allowed: true, remaining: 999, maxAllowed: 999, referralBonus: false };
  }

  const [stats] = await db
    .select({ converted: count() })
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerId, clerkId), eq(referralsTable.converted, true)));
  const referralCount = Number(stats?.converted || 0);

  const hasReferralBonus = referralCount >= 3;
  const maxAllowed = FREE_DAILY_SIGNALS + (hasReferralBonus ? REFERRAL_BONUS_SIGNALS : 0);

  const resetAt = getDayKey();
  const entry = signalUsageMap.get(clerkId);

  if (!entry || Date.now() > entry.resetAt) {
    signalUsageMap.set(clerkId, { count: 0, resetAt });
    return { allowed: true, remaining: maxAllowed, maxAllowed, referralBonus: hasReferralBonus };
  }

  const remaining = maxAllowed - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining), maxAllowed, referralBonus: hasReferralBonus };
}

export function incrementSignalCount(clerkId: string): void {
  const resetAt = getDayKey();
  const entry = signalUsageMap.get(clerkId);
  if (!entry || Date.now() > entry.resetAt) {
    signalUsageMap.set(clerkId, { count: 1, resetAt });
  } else {
    entry.count++;
  }
}

export async function checkTaxGptLimit(clerkId: string): Promise<{ allowed: boolean; remaining: number; maxAllowed: number; referralBonus: boolean }> {
  if (isPromoActive()) {
    return { allowed: true, remaining: 999, maxAllowed: 999, referralBonus: false };
  }

  const [user] = await db
    .select({ subscriptionTier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (user?.subscriptionTier === "pro" || user?.subscriptionTier === "business") {
    return { allowed: true, remaining: 999, maxAllowed: 999, referralBonus: false };
  }

  const [stats] = await db
    .select({ converted: count() })
    .from(referralsTable)
    .where(and(eq(referralsTable.referrerId, clerkId), eq(referralsTable.converted, true)));
  const referralCount = Number(stats?.converted || 0);

  const hasReferralBonus = referralCount >= 10;

  if (hasReferralBonus) {
    return { allowed: true, remaining: 999, maxAllowed: 999, referralBonus: true };
  }

  const resetAt = getDayKey();
  const entry = taxgptUsageMap.get(clerkId);

  if (!entry || Date.now() > entry.resetAt) {
    taxgptUsageMap.set(clerkId, { count: 0, resetAt });
    return { allowed: true, remaining: FREE_DAILY_TAXGPT, maxAllowed: FREE_DAILY_TAXGPT, referralBonus: false };
  }

  const remaining = FREE_DAILY_TAXGPT - entry.count;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining), maxAllowed: FREE_DAILY_TAXGPT, referralBonus: false };
}

export function incrementTaxGptCount(clerkId: string): void {
  const resetAt = getDayKey();
  const entry = taxgptUsageMap.get(clerkId);
  if (!entry || Date.now() > entry.resetAt) {
    taxgptUsageMap.set(clerkId, { count: 1, resetAt });
  } else {
    entry.count++;
  }
}
