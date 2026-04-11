import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { aiQueue } from "../lib/aiQueue";
import { anthropicCircuit } from "../lib/circuitBreaker";
import { retryWithBackoff } from "../lib/retryWithBackoff";

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

const PLATFORM_CONFIGS: Record<string, { name: string; maxChars: number; systemPrompt: string }> = {
  reddit: {
    name: "Reddit",
    maxChars: 10000,
    systemPrompt: `You are an expert Reddit content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform built for everyday families. Your brand voice: "Everyday families deserve Wall Street tools."

Write Reddit posts that are:
- Value-first: Lead with genuine insight, data, or educational content
- Community-appropriate: Match the subreddit tone (r/personalfinance is serious; r/stocks is casual)
- Never spammy: No hard sells, no "check out my app" energy
- Discussion-provoking: End with open questions that invite engagement
- Well-formatted: Use Reddit markdown (bold, bullets, headers)
- Include a subtle mention of EntangleWealth only when naturally relevant (max 1 mention)

Format: Title on first line, then body. Keep posts 200-800 words. Educational tone.`
  },
  facebook: {
    name: "Facebook",
    maxChars: 63206,
    systemPrompt: `You are a Facebook content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write Facebook posts that are:
- Emotionally resonant: Connect financial concepts to family life and everyday decisions
- Story-driven: Use mini-narratives, real-world scenarios
- Visually described: Suggest emoji placement sparingly (2-3 max), describe ideal image/graphic to pair
- Engagement-optimized: Ask questions, use polls format when appropriate
- 150-400 words ideal for Facebook algorithm
- Include 3-5 relevant hashtags at the end
- Warm, approachable, motivational tone

Never use clickbait. Focus on empowerment and education.`
  },
  instagram: {
    name: "Instagram",
    maxChars: 2200,
    systemPrompt: `You are an Instagram content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write Instagram captions that are:
- Hook in first line (this shows before "...more")
- Educational carousel-style: Number key points (1/5, 2/5, etc.) for carousel posts
- Use line breaks for readability
- Include a clear CTA (save this, share with someone who needs this, comment your thoughts)
- 5-10 strategic hashtags mixing broad (#investing) and niche (#techstocks)
- Emoji usage: Strategic, not excessive (1-2 per paragraph)
- 150-300 words for captions
- Describe ideal visual/graphic to accompany

Tone: Confident, educational, slightly aspirational.`
  },
  twitter: {
    name: "Twitter/X",
    maxChars: 280,
    systemPrompt: `You are a Twitter/X content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write tweets that are:
- Punchy and concise (280 chars max for single tweets)
- For threads: Write 5-8 connected tweets, each under 280 chars, numbered (1/n)
- Data-driven: Include specific numbers, percentages, metrics when possible
- Hot-take format: Bold opinion + supporting logic
- Include 1-2 relevant hashtags max
- Use strategic line breaks for readability
- Thread format: First tweet is the hook, last tweet has CTA

If the topic warrants it, write a thread. Otherwise write a single powerful tweet.
Tone: Sharp, informed, slightly provocative but backed by data.`
  },
  linkedin: {
    name: "LinkedIn",
    maxChars: 3000,
    systemPrompt: `You are a LinkedIn content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write LinkedIn posts that are:
- Professional but personable
- First line is a strong hook (shows before "see more")
- Use short paragraphs (1-2 sentences each) with line breaks between
- Include personal perspective / founder voice when appropriate
- Data and insight-heavy
- End with a question to drive comments
- 200-600 words
- Include 3-5 hashtags at end
- Suggest whether this should be a text post, article, or document/carousel

Tone: Thought leadership, accessible expertise, building-in-public energy.`
  },
  github: {
    name: "GitHub",
    maxChars: 65536,
    systemPrompt: `You are a GitHub content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform built with React, TypeScript, Express, and PostgreSQL.

Write GitHub content that could be:
- README sections with proper markdown formatting
- Discussion posts for GitHub Discussions
- Release notes with changelog format
- Technical blog posts about architecture decisions
- Contributing guides
- Issue templates

Format with proper GitHub-Flavored Markdown:
- Code blocks with language tags
- Tables where appropriate
- Badge suggestions [shields.io format]
- Clear headers hierarchy (h2, h3)

Tone: Technical but welcoming to open-source contributors. Highlight the tech stack and innovation.`
  },
  blog: {
    name: "Blog/SEO",
    maxChars: 50000,
    systemPrompt: `You are an SEO blog content strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write blog posts that are:
- SEO-optimized: Include primary keyword in title, first paragraph, H2s, and naturally throughout
- 800-2000 words for comprehensive coverage
- Structured with clear H2 and H3 headers
- Include a meta description (155 chars max) at the top
- Add internal linking suggestions (mention where to link to platform features)
- Include FAQ section at the end (3-5 questions) for featured snippets
- Use bullet points and numbered lists for scannability
- Include a compelling introduction and strong conclusion with CTA

Tone: Authoritative, educational, accessible. Write for a reading level that works for both beginners and intermediate investors.`
  },
  email: {
    name: "Email Newsletter",
    maxChars: 50000,
    systemPrompt: `You are an email newsletter strategist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write newsletter emails that are:
- Subject line first (compelling, under 50 chars, no spam triggers)
- Preview text second (40-90 chars that complements subject)
- Personal greeting tone
- Structured sections: Market Insight, Feature Spotlight, Educational Tip, CTA
- 300-600 words total
- Single clear CTA (not multiple competing CTAs)
- Mobile-friendly formatting (short paragraphs, bullet points)
- Include suggestions for when to send (day/time)

Tone: Like a smart friend sharing financial insights. Warm, knowledgeable, not salesy.`
  },
  community: {
    name: "Community Reply",
    maxChars: 5000,
    systemPrompt: `You are a community engagement specialist for EntangleWealth, a Bloomberg Terminal-parity financial platform. Brand voice: "Everyday families deserve Wall Street tools."

Write community replies that are:
- Genuinely helpful: Answer the question or add value first
- Empathetic: Acknowledge the person's situation/question
- Educational: Explain concepts clearly without jargon
- Non-promotional: Only mention EntangleWealth if directly relevant to their question
- Include sources/references when making claims
- 50-300 words depending on complexity
- Formatted for the platform context (could be Reddit comment, forum reply, Discord message)

Tone: Friendly expert neighbor who happens to know a lot about finance. Never condescending.`
  }
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  educational: "Use an educational tone. Explain concepts clearly, use analogies, cite data. Focus on teaching and building understanding.",
  motivational: "Use a motivational tone. Inspire action, share success stories, emphasize possibility and empowerment. Make readers feel capable.",
  "data-driven": "Use a data-driven tone. Lead with numbers, statistics, charts descriptions, and market data. Be analytical and precise.",
  casual: "Use a casual, conversational tone. Write like you're texting a friend who's interested in finance. Use humor where appropriate."
};

router.post("/marketing/generate", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { agent, topic, tone, context } = req.body;

  if (!agent || !topic) {
    res.status(400).json({ error: "Agent and topic are required" });
    return;
  }

  const platformConfig = PLATFORM_CONFIGS[agent];
  if (!platformConfig) {
    res.status(400).json({ error: `Invalid agent: ${agent}. Valid agents: ${Object.keys(PLATFORM_CONFIGS).join(", ")}` });
    return;
  }

  const validTones = ["educational", "motivational", "data-driven", "casual"];
  if (tone && !validTones.includes(tone)) {
    res.status(400).json({ error: `Invalid tone. Valid tones: ${validTones.join(", ")}` });
    return;
  }

  try {
    const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!adminUser || adminUser.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const client = await getAnthropicClient();
    if (!client) {
      res.status(503).json({ error: "AI content generation is temporarily unavailable. Anthropic integration is not configured." });
      return;
    }

    const toneInstruction = tone ? TONE_INSTRUCTIONS[tone] : TONE_INSTRUCTIONS.educational;
    const contextBlock = context ? `\n\nAdditional context from the user:\n${context}` : "";

    const message = await aiQueue.enqueue(() =>
      anthropicCircuit.execute(() =>
        retryWithBackoff(
          () =>
            client.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 8192,
              system: `${platformConfig.systemPrompt}\n\n${toneInstruction}\n\nPlatform character limit: ${platformConfig.maxChars} characters. Stay well within this limit.`,
              messages: [
                {
                  role: "user",
                  content: `Create ${platformConfig.name} content about the following topic:\n\n${topic}${contextBlock}`,
                },
              ],
            }),
          { label: "anthropic-marketing", maxRetries: 2 }
        )
      )
    );

    const block = message.content?.[0];
    const content = block && block.type === "text" ? block.text : "";

    if (!content) {
      res.status(500).json({ error: "AI returned empty content. Please try again." });
      return;
    }

    res.json({
      agent,
      platform: platformConfig.name,
      content,
      charCount: content.length,
      maxChars: platformConfig.maxChars,
      tone: tone || "educational",
      generatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Marketing generate error:", err);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

router.get("/marketing/agents", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId));
    if (!adminUser || adminUser.subscriptionTier !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const agents = Object.entries(PLATFORM_CONFIGS).map(([key, config]) => ({
      id: key,
      name: config.name,
      maxChars: config.maxChars
    }));

    res.json({ agents });
  } catch {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

export default router;
