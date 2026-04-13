import { db } from "@workspace/db";
import {
  giveawayEntriesTable,
  userXpTable,
  streaksTable,
  referralsTable,
} from "@workspace/db/schema";
import { eq, count, and } from "drizzle-orm";
import { logger } from "./logger";

export async function syncGiveawayEntries(userId: string, clerkId: string): Promise<void> {
  const [[xpRow], [streak], [refStats]] = await Promise.all([
    db.select().from(userXpTable).where(eq(userXpTable.userId, userId)),
    db.select().from(streaksTable).where(eq(streaksTable.userId, userId)),
    db.select({ converted: count() })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, clerkId), eq(referralsTable.converted, true))),
  ]);

  const xpLevel = xpRow?.level || 1;
  const totalXp = xpRow?.totalXp || 0;
  const currentStreak = streak?.currentStreak || 0;

  const tradeEntries = Math.min(Math.floor(totalXp / 500), 50);
  const streakEntries = Math.min(currentStreak, 30);
  const xpMilestoneEntries = Math.floor(xpLevel / 5);
  const loginEntries = Math.min(Math.floor(totalXp / 100), 30);
  const convertedReferrals = Number(refStats?.converted || 0);
  const referralEntries = convertedReferrals * 5;

  const totalEntries = tradeEntries + streakEntries + xpMilestoneEntries + loginEntries + referralEntries;

  await db
    .insert(giveawayEntriesTable)
    .values({
      userId,
      totalEntries,
      tradeEntries,
      streakEntries,
      loginEntries,
      xpMilestoneEntries,
      referralEntries,
      convertedReferrals,
    })
    .onConflictDoUpdate({
      target: giveawayEntriesTable.userId,
      set: {
        totalEntries,
        tradeEntries,
        streakEntries,
        loginEntries,
        xpMilestoneEntries,
        referralEntries,
        convertedReferrals,
        updatedAt: new Date(),
      },
    });
}

export function triggerGiveawaySync(userId: string, clerkId: string): void {
  syncGiveawayEntries(userId, clerkId).catch((err) =>
    logger.error({ err }, "Background giveaway sync failed for user %s", userId)
  );
}
