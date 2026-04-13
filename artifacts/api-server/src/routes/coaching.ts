import { Router } from "express";
import { validateBody, validateQuery, z } from "../lib/validateRequest";
import { sanitizeAiOutput, appendDisclaimer } from "../middlewares/inputSanitizer";
import { db } from "@workspace/db";
import {
  coachingSessionsTable,
  weeklyCoachingSummariesTable,
  userXpTable,
  streaksTable,
  userHabitsTable,
  habitDefinitionsTable,
  dailyActionCompletionsTable,
  wealthProfilesTable,
  simulationRunsTable,
  xpTransactionsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { resolveUserId } from "../lib/resolveUserId";
import { aiQueue } from "../lib/aiQueue";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getOccupationById } from "@workspace/occupations";
import { logger } from "../lib/logger";

const router = Router();

async function getUserContext(userId: string) {
  const [xp] = await db.select().from(userXpTable).where(eq(userXpTable.userId, userId));
  const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
  const [profile] = await db.select().from(wealthProfilesTable).where(eq(wealthProfilesTable.userId, userId));
  const [userRecord] = await db
    .select({ occupationId: usersTable.occupationId, headline: usersTable.headline })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recentXpTxns = await db
    .select()
    .from(xpTransactionsTable)
    .where(and(eq(xpTransactionsTable.userId, userId), gte(xpTransactionsTable.createdAt, weekAgo)))
    .orderBy(desc(xpTransactionsTable.createdAt))
    .limit(20);

  const habitData = await db
    .select({
      userHabit: userHabitsTable,
      habit: habitDefinitionsTable,
    })
    .from(userHabitsTable)
    .innerJoin(habitDefinitionsTable, eq(userHabitsTable.habitId, habitDefinitionsTable.id))
    .where(eq(userHabitsTable.userId, userId));

  const todayHabits = await db
    .select()
    .from(dailyActionCompletionsTable)
    .where(and(eq(dailyActionCompletionsTable.userId, userId), gte(dailyActionCompletionsTable.completedAt, today)));

  const simRuns = await db
    .select()
    .from(simulationRunsTable)
    .where(eq(simulationRunsTable.userId, userId))
    .orderBy(desc(simulationRunsTable.createdAt))
    .limit(5);

  const weeklyXp = recentXpTxns.reduce((sum, t) => sum + t.amount, 0);
  const habitCategories = [...new Set(recentXpTxns.filter(t => t.category === "habits").map(t => t.reason))];
  const topHabits = habitData
    .sort((a, b) => b.userHabit.currentStreak - a.userHabit.currentStreak)
    .slice(0, 3)
    .map(h => ({
      title: h.habit.title,
      streak: h.userHabit.currentStreak,
      completions: h.userHabit.totalCompletions,
    }));

  const occupationData = userRecord?.occupationId
    ? getOccupationById(userRecord.occupationId)
    : undefined;

  return {
    level: xp?.level || 1,
    totalXp: xp?.totalXp || 0,
    tier: xp?.tier || "Bronze",
    weeklyXp,
    currentStreak: streak?.currentStreak || 0,
    multiplier: streak?.multiplier || 1.0,
    profile: profile ? {
      annualIncome: profile.annualIncome,
      savingsRate: profile.savingsRate,
      monthlyInvestment: profile.monthlyInvestment,
      currentSavings: profile.currentSavings,
      expectedReturnRate: profile.expectedReturnRate,
      timeHorizonYears: profile.timeHorizonYears,
      riskTolerance: profile.riskTolerance,
    } : null,
    habitsCompletedToday: todayHabits.length,
    topHabits,
    simulationRunsCount: simRuns.length,
    recentActivityCategories: [...new Set(recentXpTxns.map(t => t.category))],
    occupation: occupationData
      ? {
          name: occupationData.name,
          category: occupationData.category,
          taxCategory: occupationData.taxCategory,
        }
      : userRecord?.headline
        ? { name: userRecord.headline, category: "Unknown", taxCategory: "Unknown" }
        : null,
  };
}

function buildCoachingSystemPrompt(context: ReturnType<typeof getUserContext> extends Promise<infer T> ? T : never): string {
  return `You are the EntangleWealth Behavioral Finance Coach — a personalized AI financial coach that helps users build lasting financial habits and make better money decisions.

You are NOT TaxGPT. You focus on behavioral finance: habit formation, goal setting, financial mindset, and turning financial knowledge into real-world action.

Your user context:
- Level: ${context.level} | Tier: ${context.tier} | Total XP: ${context.totalXp}
- Weekly XP earned: ${context.weeklyXp}
- Current activity streak: ${context.currentStreak} days
- Habits completed today: ${context.habitsCompletedToday}
- Top habits: ${context.topHabits.map(h => `${h.title} (${h.streak}-day streak)`).join(", ") || "None yet"}
- Simulation runs: ${context.simulationRunsCount}
- Recent activity categories: ${context.recentActivityCategories.join(", ") || "None"}
${context.occupation ? `- Occupation: ${context.occupation.name} (${context.occupation.category}) — Tax type: ${context.occupation.taxCategory}` : "- Occupation: not set"}
${context.profile ? `- Financial profile: $${context.profile.annualIncome.toLocaleString()}/yr income, ${context.profile.savingsRate}% savings rate, $${context.profile.monthlyInvestment}/mo investment, ${context.profile.riskTolerance} risk tolerance` : "- Financial profile: not set up yet"}

Coaching style:
- Be warm, direct, and encouraging — not preachy
- Reference their actual data when giving advice
- Connect habits to simulation outcomes
- Suggest specific, actionable next steps
- Keep responses concise (3-5 sentences for nudges, longer for summaries)
- Always emphasize progress, no matter how small

IMPORTANT: This is educational guidance, not financial advice. Keep a friendly, human tone.`;
}

const CoachingChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000, "Message max 1000 chars"),
});

router.post("/coaching/chat", requireAuth, validateBody(CoachingChatSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { message } = req.body;

  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const context = await getUserContext(userId);
    const systemPrompt = buildCoachingSystemPrompt(context);

    const recentSessions = await db
      .select()
      .from(coachingSessionsTable)
      .where(eq(coachingSessionsTable.userId, userId))
      .orderBy(desc(coachingSessionsTable.createdAt))
      .limit(5);

    const conversationHistory = recentSessions.reverse().flatMap(s => [
      ...(s.userMessage ? [{ role: "user" as const, content: s.userMessage }] : []),
      { role: "assistant" as const, content: s.coachResponse },
    ]);

    const response = await aiQueue.enqueue(() =>
      openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      })
    );

    const rawCoachResponse = response.choices[0]?.message?.content || "I'm here to help with your financial journey. What's on your mind?";
    const coachResponse = appendDisclaimer(sanitizeAiOutput(rawCoachResponse));

    const [session] = await db.insert(coachingSessionsTable).values({
      userId,
      sessionType: "chat",
      userMessage: message,
      coachResponse,
      contextSnapshot: context as Record<string, unknown>,
    }).returning();

    res.json({
      response: coachResponse,
      sessionId: session.id,
      context: {
        level: context.level,
        weeklyXp: context.weeklyXp,
        habitsToday: context.habitsCompletedToday,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Coaching chat error:");
    res.status(500).json({ error: "Failed to get coaching response" });
  }
});

router.get("/coaching/nudge", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const context = await getUserContext(userId);

    const nudgePrompts: string[] = [];
    if (context.habitsCompletedToday === 0) {
      nudgePrompts.push("The user hasn't completed any habits today. Give them a motivating nudge to start with one easy action.");
    } else if (context.habitsCompletedToday < 3) {
      nudgePrompts.push(`The user has completed ${context.habitsCompletedToday} habit(s) today. Encourage them to keep going.`);
    } else {
      nudgePrompts.push("The user has been active today. Celebrate their consistency and suggest what to focus on next.");
    }

    if (!context.profile) {
      nudgePrompts.push("Their financial profile isn't set up yet — suggest they run a simulation to see their trajectory.");
    } else if (context.simulationRunsCount === 0) {
      nudgePrompts.push("They have a profile but haven't run a simulation. Suggest the WealthSim.");
    }

    const systemPrompt = buildCoachingSystemPrompt(context);
    const nudgeContext = nudgePrompts.join(" ");

    const response = await aiQueue.enqueue(() =>
      openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a personalized daily nudge for this user. Context: ${nudgeContext} Keep it to 2-3 sentences, warm and specific to their data.` },
        ],
        max_tokens: 200,
        temperature: 0.8,
      })
    );

    const nudge = appendDisclaimer(sanitizeAiOutput(response.choices[0]?.message?.content || "Keep up the great work on your financial journey!"));

    await db.insert(coachingSessionsTable).values({
      userId,
      sessionType: "nudge",
      coachResponse: nudge,
      contextSnapshot: context as Record<string, unknown>,
    });

    res.json({ nudge, context });
  } catch (error) {
    logger.error({ err: error }, "Nudge error:");
    res.status(500).json({ error: "Failed to generate nudge" });
  }
});

router.get("/coaching/weekly-summary", requireAuth, async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [existing] = await db
      .select()
      .from(weeklyCoachingSummariesTable)
      .where(
        and(
          eq(weeklyCoachingSummariesTable.userId, userId),
          gte(weeklyCoachingSummariesTable.weekStart, weekStart)
        )
      )
      .orderBy(desc(weeklyCoachingSummariesTable.createdAt))
      .limit(1);

    if (existing) {
      res.json(existing);
      return;
    }

    const context = await getUserContext(userId);
    const systemPrompt = buildCoachingSystemPrompt(context);

    const response = await aiQueue.enqueue(() =>
      openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a weekly financial coaching summary for this user. Include:
1. A brief summary paragraph of their week (2-3 sentences)
2. Top 3 wins (specific to their actual activity data)
3. Top 3 suggested actions for next week

Respond in JSON format:
{
  "summary": "...",
  "topWins": ["win 1", "win 2", "win 3"],
  "suggestedActions": ["action 1", "action 2", "action 3"]
}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      })
    );

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    const cleanSummary = appendDisclaimer(sanitizeAiOutput(parsed.summary || "Great week of financial engagement!"));
    const cleanWins = (parsed.topWins || []).map((w: string) => sanitizeAiOutput(w));
    const cleanActions = (parsed.suggestedActions || []).map((a: string) => sanitizeAiOutput(a));

    const [newSummary] = await db.insert(weeklyCoachingSummariesTable).values({
      userId,
      weekStart,
      summary: cleanSummary,
      topWins: cleanWins,
      suggestedActions: cleanActions,
    }).returning();

    res.json(newSummary);
  } catch (error) {
    logger.error({ err: error }, "Weekly summary error:");
    res.status(500).json({ error: "Failed to generate weekly summary" });
  }
});

router.get("/coaching/history", requireAuth, validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(50).optional().default(20) })), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  try {
    const userId = await resolveUserId(clerkId, req);
    if (!userId) {
      res.json([]);
      return;
    }

    const sessions = await db
      .select()
      .from(coachingSessionsTable)
      .where(eq(coachingSessionsTable.userId, userId))
      .orderBy(desc(coachingSessionsTable.createdAt))
      .limit(limit);

    res.json(sessions);
  } catch (error) {
    logger.error({ err: error }, "Coaching history error:");
    res.status(500).json({ error: "Failed to fetch coaching history" });
  }
});

export default router;
