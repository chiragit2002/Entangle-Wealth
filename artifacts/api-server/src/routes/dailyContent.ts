import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { pool } from "@workspace/db";
import { aiQueue } from "../lib/aiQueue";
import { anthropicCircuit } from "../lib/circuitBreaker";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import { logger } from "../lib/logger";

const router = Router();

let _anthropic: Awaited<typeof import("@workspace/integrations-anthropic-ai")>["anthropic"] | null = null;

async function getAnthropicClient() {
  if (_anthropic) return _anthropic;
  try {
    const mod = await import("@workspace/integrations-anthropic-ai");
    _anthropic = mod.anthropic;
    return _anthropic;
  } catch {
    return null;
  }
}

const CONTENT_THEMES = [
  "Building EntangleWealth",
  "Financial insights",
  "Lessons learned",
  "User feedback",
  "Financial insights",
];

function getTodayTheme(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return CONTENT_THEMES[dayOfYear % CONTENT_THEMES.length];
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

const BRAND_VOICE_SYSTEM = `
You are the founder of EntangleWealth — a Bloomberg Terminal-parity financial platform built for everyday families. Brand mission: "Everyday families deserve Wall Street tools."

Brand voice rules:
- Simple, clear, emotionally real — no fluff, no corporate tone
- Honest, not dramatic; purpose-driven, not sympathy-seeking
- Use the founder story layer sparingly (roughly 1 in 5 posts) and only when it adds genuine context
- Never start with "I" — use a strong hook, insight, or observation instead
- No hype, no buzzwords, no "game-changer" or "revolutionary"
- Write like a real person who happens to know a lot about finance and built something meaningful

Banned openers (never use these as first words):
"I think", "I believe", "I feel", "Have you ever", "Did you know", "In today's world", "In the world of", "Let's talk about", "Buckle up", "Picture this", "Imagine", "Game changer", "Revolutionary"
`;

const TWITTER_RULES = `
Platform: Twitter/X viral post

Rules:
- Strong hook on the first line — this is the only line visible before "Show more" on mobile
- Max 8-12 lines total
- No more than 1-2 hashtags, placed at the end if used
- Soft CTA at the end (e.g., "Follow for more", "Reply with your take", "Save this")
- No em dashes (—) in the hook line — they feel corporate
- Use short, punchy sentences and line breaks for rhythm
- Aim for insight or counterintuitive truth that makes people stop scrolling
- Do NOT include "Twitter" or "tweet" in the output
- Output only the post text, nothing else
`;

const LINKEDIN_RULES = `
Platform: LinkedIn insight post

Rules:
- Structured format: hook → 3-5 insight paragraphs → single question CTA
- 800-1000 characters total
- Use short paragraphs with line breaks between (1-2 sentences each)
- Deeper insight than Twitter — teach something specific and actionable
- End with one genuine question that invites thoughtful replies
- Do NOT include 3-5 hashtags — maximum 2 specific hashtags at the end if used
- Professional but human, not stiff or corporate
- Do NOT include "LinkedIn" in the output
- Output only the post text, nothing else
`;

const ENGAGEMENT_RULES = `
Platform: Engagement question

Rules:
- Short post designed purely to invite interaction (60-120 words max)
- Ask one specific question that's easy to answer in 1-2 sentences
- Make it feel conversational and genuine — not a survey
- The question should relate to personal finance, investing, or building wealth
- No hashtags
- Do NOT include "engagement" or platform names in the output
- Output only the post text, nothing else
`;

function validatePost(content: string, platform: string): { valid: boolean; reason?: string } {
  const banned = [
    "I think", "I believe", "I feel", "Have you ever", "Did you know",
    "In today's world", "In the world of", "Let's talk about", "Buckle up",
    "Picture this", "Imagine if", "Game changer", "Revolutionary"
  ];

  const firstLine = content.split("\n")[0].trim();

  for (const phrase of banned) {
    if (firstLine.toLowerCase().startsWith(phrase.toLowerCase())) {
      return { valid: false, reason: `Banned opener: "${phrase}"` };
    }
  }

  if (firstLine.startsWith("I ")) {
    return { valid: false, reason: "First line starts with 'I'" };
  }

  if (platform === "twitter" && content.length > 1400) {
    return { valid: false, reason: "Twitter post too long (thread limit exceeded)" };
  }

  if (platform === "linkedin" && (content.length < 300 || content.length > 1600)) {
    return { valid: false, reason: `LinkedIn post length out of range: ${content.length} chars` };
  }

  if (platform === "engagement" && content.length > 800) {
    return { valid: false, reason: "Engagement post too long" };
  }

  return { valid: true };
}

async function generateBatchForDate(batchDate: string, theme: string): Promise<void> {
  const client = await getAnthropicClient();
  if (!client) {
    throw new Error("Anthropic client unavailable");
  }

  const platforms = [
    { id: "twitter", rules: TWITTER_RULES, label: "Twitter/X viral post" },
    { id: "linkedin", rules: LINKEDIN_RULES, label: "LinkedIn insight post" },
    { id: "engagement", rules: ENGAGEMENT_RULES, label: "Engagement question" },
  ];

  const db = await pool.connect();
  try {
    const existingResult = await db.query(
      "SELECT platform FROM daily_content_posts WHERE batch_date = $1",
      [batchDate]
    );
    const alreadySaved = new Set(existingResult.rows.map((r: { platform: string }) => r.platform));
    const platformsToGenerate = platforms.filter((p) => !alreadySaved.has(p.id));

    if (platformsToGenerate.length === 0) {
      logger.info({ batchDate }, "Batch already complete");
      return;
    }

    for (const platform of platformsToGenerate) {
      let content = "";
      let valid = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!valid && attempts < maxAttempts) {
        attempts++;
        const systemPrompt = `${BRAND_VOICE_SYSTEM}\n\n${platform.rules}`;
        const userMessage = `Today's content theme: ${theme}\n\nGenerate a ${platform.label} for EntangleWealth. The content should authentically reflect this theme while following all brand voice and platform rules above.`;

        const message = await aiQueue.enqueue(() =>
          anthropicCircuit.execute(() =>
            retryWithBackoff(
              () =>
                client.messages.create({
                  model: "claude-sonnet-4-6",
                  max_tokens: 1024,
                  system: systemPrompt,
                  messages: [{ role: "user", content: userMessage }],
                }),
              { label: `daily-content-${platform.id}`, maxRetries: 2 }
            )
          )
        );

        const block = message.content?.[0];
        const text = block && block.type === "text" ? block.text.trim() : "";

        if (!text) {
          logger.warn({ platform: platform.id, attempt: attempts }, "Empty content from AI");
          continue;
        }

        const validation = validatePost(text, platform.id);
        if (validation.valid) {
          content = text;
          valid = true;
        } else {
          logger.warn(
            { platform: platform.id, attempt: attempts, reason: validation.reason },
            "Post failed quality gate, retrying"
          );
        }
      }

      if (!content) {
        logger.error({ platform: platform.id, batchDate }, "Failed to generate valid post after max attempts");
        continue;
      }

      await db.query(
        `INSERT INTO daily_content_posts (batch_date, platform, content, theme, status)
         VALUES ($1, $2, $3, $4, 'draft')`,
        [batchDate, platform.id, content, theme]
      );

      logger.info({ platform: platform.id, batchDate, theme }, "Daily content post saved");
    }
  } finally {
    db.release();
  }
}

const EXPECTED_PLATFORMS = ["twitter", "linkedin", "engagement"];

async function hasBatchForDate(batchDate: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT platform FROM daily_content_posts WHERE batch_date = $1",
      [batchDate]
    );
    const savedPlatforms = result.rows.map((r: { platform: string }) => r.platform);
    return EXPECTED_PLATFORMS.every((p) => savedPlatforms.includes(p));
  } finally {
    client.release();
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startDailyContentScheduler(): void {
  logger.info("Daily content scheduler starting");

  async function checkAndGenerate() {
    try {
      const today = getTodayDateString();
      const exists = await hasBatchForDate(today);
      if (!exists) {
        logger.info({ date: today }, "No batch for today, generating...");
        const theme = getTodayTheme();
        await generateBatchForDate(today, theme);
        logger.info({ date: today, theme }, "Daily batch generated successfully");
      }
    } catch (err) {
      logger.warn({ error: err }, "Daily content scheduler check failed (non-fatal)");
    }
  }

  checkAndGenerate();

  schedulerInterval = setInterval(checkAndGenerate, 60 * 60 * 1000);
}

router.get("/daily-content/today", requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = getTodayDateString();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, batch_date, platform, content, theme, status, created_at, updated_at
         FROM daily_content_posts
         WHERE batch_date = $1
         ORDER BY CASE platform WHEN 'twitter' THEN 1 WHEN 'linkedin' THEN 2 WHEN 'engagement' THEN 3 ELSE 4 END`,
        [today]
      );

      const batchExists = result.rows.length > 0;

      res.json({
        batchDate: today,
        posts: result.rows,
        batchExists,
        theme: batchExists ? result.rows[0].theme : getTodayTheme(),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ error: err }, "Failed to fetch today's daily content");
    res.status(500).json({ error: "Failed to fetch daily content" });
  }
});

router.get("/daily-content/history", requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "30", 10), 90);
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, batch_date, platform, content, theme, status, created_at, updated_at
         FROM daily_content_posts
         ORDER BY batch_date DESC, CASE platform WHEN 'twitter' THEN 1 WHEN 'linkedin' THEN 2 WHEN 'engagement' THEN 3 ELSE 4 END
         LIMIT $1`,
        [limit * 3]
      );

      const grouped: Record<string, { date: string; theme: string; posts: typeof result.rows }> = {};
      for (const row of result.rows) {
        const date = row.batch_date instanceof Date
          ? row.batch_date.toISOString().split("T")[0]
          : String(row.batch_date).split("T")[0];
        if (!grouped[date]) {
          grouped[date] = { date, theme: row.theme, posts: [] };
        }
        grouped[date].posts.push(row);
      }

      const batches = Object.values(grouped).slice(0, limit);

      res.json({ batches });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ error: err }, "Failed to fetch daily content history");
    res.status(500).json({ error: "Failed to fetch content history" });
  }
});

router.post("/daily-content/regenerate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = getTodayDateString();
    const theme = getTodayTheme();

    const client = await pool.connect();
    try {
      await client.query(
        "DELETE FROM daily_content_posts WHERE batch_date = $1",
        [today]
      );
    } finally {
      client.release();
    }

    res.json({ message: "Regeneration started", batchDate: today, theme });

    generateBatchForDate(today, theme).then(() => {
      logger.info({ date: today }, "Batch regenerated successfully");
    }).catch((err) => {
      logger.error({ error: err, date: today }, "Batch regeneration failed");
    });
  } catch (err) {
    logger.error({ error: err }, "Failed to start regeneration");
    res.status(500).json({ error: "Failed to start regeneration" });
  }
});

router.patch("/daily-content/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, content } = req.body;

  const validStatuses = ["draft", "approved", "posted", "archived"];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` });
    return;
  }

  try {
    const updates: string[] = ["updated_at = now()"];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (status) {
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIdx++}`);
      params.push(content);
    }

    params.push(parseInt(id, 10));

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE daily_content_posts SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      res.json({ post: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ error: err, id }, "Failed to update daily content post");
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/daily-content/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "DELETE FROM daily_content_posts WHERE id = $1 RETURNING id",
        [parseInt(id, 10)]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Post not found" });
        return;
      }

      res.json({ deleted: true });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ error: err, id }, "Failed to delete daily content post");
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
