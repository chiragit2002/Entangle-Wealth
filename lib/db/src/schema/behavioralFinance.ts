import { pgTable, text, timestamp, integer, serial, boolean, real, jsonb, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const habitDefinitionsTable = pgTable("habit_definitions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  xpReward: integer("xp_reward").notNull().default(25),
  icon: text("icon").notNull().default("Target"),
  difficulty: text("difficulty").notNull().default("easy"),
  linkedHabit: text("linked_habit"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const userHabitsTable = pgTable("user_habits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  habitId: integer("habit_id").notNull().references(() => habitDefinitionsTable.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("user_habits_user_habit_unique").on(table.userId, table.habitId),
]);

export const dailyActionCompletionsTable = pgTable("daily_action_completions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  habitId: integer("habit_id").notNull().references(() => habitDefinitionsTable.id, { onDelete: "cascade" }),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
});

export const coachingSessionsTable = pgTable("coaching_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sessionType: text("session_type").notNull().default("nudge"),
  userMessage: text("user_message"),
  coachResponse: text("coach_response").notNull(),
  contextSnapshot: jsonb("context_snapshot").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const weeklyCoachingSummariesTable = pgTable("weekly_coaching_summaries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
  summary: text("summary").notNull(),
  topWins: jsonb("top_wins").default([]),
  suggestedActions: jsonb("suggested_actions").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type HabitDefinition = typeof habitDefinitionsTable.$inferSelect;
export type UserHabit = typeof userHabitsTable.$inferSelect;
export type DailyActionCompletion = typeof dailyActionCompletionsTable.$inferSelect;
export type CoachingSession = typeof coachingSessionsTable.$inferSelect;
export type WeeklyCoachingSummary = typeof weeklyCoachingSummariesTable.$inferSelect;
