import { pgTable, text, timestamp, integer, serial, boolean, real, unique, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userXpTable = pgTable("user_xp", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  tier: text("tier").notNull().default("Bronze"),
  monthlyXp: integer("monthly_xp").notNull().default(0),
  weeklyXp: integer("weekly_xp").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const xpTransactionsTable = pgTable("xp_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  xpReward: integer("xp_reward").notNull().default(0),
  requirement: text("requirement").notNull(),
  threshold: integer("threshold").notNull().default(1),
  isSecret: boolean("is_secret").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userBadgesTable = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => badgesTable.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("user_badges_user_badge_unique").on(table.userId, table.badgeId),
]);

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  xpReward: integer("xp_reward").notNull(),
  target: integer("target").notNull().default(1),
  isActive: boolean("is_active").default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userChallengesTable = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  challengeId: integer("challenge_id").notNull().references(() => challengesTable.id, { onDelete: "cascade" }),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("user_challenges_user_challenge_unique").on(table.userId, table.challengeId),
]);

export const streaksTable = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date", { withTimezone: true }),
  multiplier: real("multiplier").notNull().default(1.0),
  streakProtectionActive: boolean("streak_protection_active").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const leaderboardSnapshotsTable = pgTable("leaderboard_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  rank: integer("rank").notNull(),
  gainPercent: real("gain_percent").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  tier: text("tier").notNull().default("Bronze"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const dailySpinsTable = pgTable("daily_spins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  spinDate: text("spin_date").notNull().default(""),
  prizeAmount: real("prize_amount").notNull().default(0),
  rewardType: text("reward_type").notNull().default("cash"),
  rewardLabel: text("reward_label").notNull().default(""),
  reward: text("reward").default(""),
  rewardValue: integer("reward_value").notNull().default(0),
  spunAt: timestamp("spun_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userSpinDateUniq: unique("daily_spins_user_spin_date_uniq").on(table.userId, table.spinDate),
  userIdIdx: index("idx_daily_spins_user_id").on(table.userId),
}));

export const founderStatusTable = pgTable("founder_status", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  xpMultiplier: real("xp_multiplier").notNull().default(1.5),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow(),
});

export const giveawayEntriesTable = pgTable("giveaway_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  totalEntries: integer("total_entries").notNull().default(0),
  tradeEntries: integer("trade_entries").notNull().default(0),
  streakEntries: integer("streak_entries").notNull().default(0),
  loginEntries: integer("login_entries").notNull().default(0),
  xpMilestoneEntries: integer("xp_milestone_entries").notNull().default(0),
  referralEntries: integer("referral_entries").notNull().default(0),
  referralBonusShare: real("referral_bonus_share").notNull().default(0),
  convertedReferrals: integer("converted_referrals").notNull().default(0),
  drawingWon: boolean("drawing_won").default(false),
  drawnAt: timestamp("drawn_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type DailySpin = typeof dailySpinsTable.$inferSelect;
export type FounderStatus = typeof founderStatusTable.$inferSelect;
export type UserXp = typeof userXpTable.$inferSelect;
export type InsertUserXp = typeof userXpTable.$inferInsert;
export type XpTransaction = typeof xpTransactionsTable.$inferSelect;
export type Badge = typeof badgesTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
export type Challenge = typeof challengesTable.$inferSelect;
export type UserChallenge = typeof userChallengesTable.$inferSelect;
export type Streak = typeof streaksTable.$inferSelect;
export type LeaderboardSnapshot = typeof leaderboardSnapshotsTable.$inferSelect;
export type GiveawayEntry = typeof giveawayEntriesTable.$inferSelect;
