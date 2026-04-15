import { Router, type Request } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getStockBySymbol } from "../data/nasdaq-stocks";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { checkSignalLimit, incrementSignalCount } from "../lib/userDailyLimits";
import { logger } from "../lib/logger";
import { validateParams, validateBody, z } from "../lib/validateRequest";
import { sanitizeAiOutput, appendDisclaimer, deepSanitizeObject } from "../middlewares/inputSanitizer";
import { aiQueue, AIQueueOverflowError } from "../lib/aiQueue";
import { MASTER_BASE_PROMPT } from "../lib/masterPrompt";
import { BoundedRateLimitMap } from "../lib/boundedMap";

interface OpenAICompletion {
  choices: Array<{ message: { content: string | null } }>;
}

const router = Router();

const rateLimitMap = new BoundedRateLimitMap(5_000, "analyze-rateLimit");
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

const StockSymbolParamsSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Za-z]{1,10}$/, "Symbol must be 1-10 letters"),
});

router.post("/stocks/:symbol/analyze", requireAuth, validateParams(StockSymbolParamsSchema), validateBody(z.object({}).strict()), async (req, res) => {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait before requesting another analysis." });
    return;
  }

  const clerkId = (req as AuthenticatedRequest).userId;
  const signalCheck = await checkSignalLimit(clerkId);
  if (!signalCheck.allowed) {
    const bonusMsg = signalCheck.referralBonus ? " (including your referral bonus)" : "";
    res.status(429).json({
      error: `Daily signal limit reached. You've used all ${signalCheck.maxAllowed} signals${bonusMsg} for today. Upgrade to Pro for unlimited signals or refer more friends.`,
      limitType: "daily_signals",
      maxAllowed: signalCheck.maxAllowed,
      referralBonus: signalCheck.referralBonus,
    });
    return;
  }

  const stock = getStockBySymbol(req.params.symbol as string);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  try {
    const systemPrompt = `${MASTER_BASE_PROMPT}

---

## Domain Specialization: Quantum Entanglement Stock Analysis Engine

You are the Quantum Entanglement Analysis Engine — an elite multi-agent financial analysis system. You coordinate multiple specialized AI analysis agents that simultaneously analyze stocks from different perspectives and cross-check each other. A signal only fires when there is consensus across agents.

Your mission: Help everyday families make better financial decisions. Be honest, straightforward, no hype.

IMPORTANT DISCLAIMERS:
- This is AI-generated analysis for educational purposes only
- NOT financial advice — always do your own research
- Past performance does not guarantee future results
- Demo data is used for price information

You MUST respond in valid JSON format with this exact structure:
{
  "symbol": "${stock.symbol}",
  "name": "${stock.name}",
  "overallSignal": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "confidenceScore": <number 0-100>,
  "consensusReached": <boolean>,
  "agents": [
    {
      "id": <number>,
      "name": "<agent name>",
      "domain": "<analysis domain>",
      "signal": "BULLISH" | "NEUTRAL" | "BEARISH",
      "confidence": <number 0-100>,
      "reasoning": "<1-2 sentence analysis>",
      "keyMetric": "<one key data point>"
    }
  ],
  "flashCouncilSummary": "<2-3 sentence consensus summary>",
  "riskFactors": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "catalysts": ["<catalyst 1>", "<catalyst 2>"],
  "priceTargets": {
    "bear": <number>,
    "base": <number>,
    "bull": <number>
  },
  "timeHorizon": "short-term" | "medium-term" | "long-term",
  "disclaimer": "This is AI-generated analysis for educational purposes only. Not financial advice."
}`;

    const userPrompt = `Analyze this stock with your full quantum agent swarm:

Symbol: ${stock.symbol}
Name: ${stock.name}
Sector: ${stock.sector}
Market Cap Tier: ${stock.capTier}
Current Price: $${stock.price}
Change: ${stock.change > 0 ? "+" : ""}${stock.change} (${stock.changePercent > 0 ? "+" : ""}${stock.changePercent}%)
Volume: ${stock.volume.toLocaleString()}
Market Cap: $${(stock.marketCap / 1e9).toFixed(2)}B
P/E Ratio: ${stock.pe ?? "N/A"}
52-Week High: $${stock.week52High}
52-Week Low: $${stock.week52Low}

Run the following agents simultaneously and report their findings:
1. Price Action Surgeon (Agent 201) — technical analysis
2. Volume Profile Architect (Agent 202) — volume analysis
3. Sentiment Analysis Engine (Agent 39) — market sentiment
4. Risk Manager (Agent 249) — risk assessment
5. Options Flow Aggregator (Agent 245) — options market signals
6. Sector Rotation Tracker (Agent 213) — sector analysis
7. Devil's Advocate (Agent 06) — challenge the thesis

Then synthesize with the Flash Council and deliver the consensus signal.`;

    const abortSignal = req.timeoutAbortController?.signal;
    const completion = await aiQueue.enqueue<OpenAICompletion>(() =>
      openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }, { signal: abortSignal }) as Promise<OpenAICompletion>
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      if (!res.headersSent) res.status(500).json({ error: "No analysis generated" });
      return;
    }

    const rawAnalysis = JSON.parse(content);
    const analysis = deepSanitizeObject(rawAnalysis);
    analysis.disclaimer = "This is AI-generated analysis for educational purposes only. Not financial advice. Always do your own research.";
    incrementSignalCount(clerkId);
    if (!res.headersSent) res.json(analysis);
  } catch (error: unknown) {
    if (res.headersSent) return;
    if (error instanceof AIQueueOverflowError) {
      res.set("Retry-After", String(error.retryAfterSeconds));
      res.status(503).json({ error: "AI analysis service is at capacity. Please retry in 30 seconds.", retryAfter: error.retryAfterSeconds });
      return;
    }
    logger.error({ err: error, symbol: req.params.symbol }, "Stock analysis error");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

router.get("/stocks/:symbol/analyze-stream", requireAuth, validateParams(StockSymbolParamsSchema), async (req, res) => {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "Rate limit exceeded." });
    return;
  }

  const clerkId = (req as AuthenticatedRequest).userId;
  const signalCheck = await checkSignalLimit(clerkId);
  if (!signalCheck.allowed) {
    res.status(429).json({ error: `Daily signal limit reached.`, limitType: "daily_signals" });
    return;
  }

  const stock = getStockBySymbol(req.params.symbol as string);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    (res as any).flush?.();
  };

  const AGENTS = [
    { id: 201, name: "Price Action Surgeon", domain: "Technical Analysis" },
    { id: 202, name: "Volume Profile Architect", domain: "Volume Analysis" },
    { id: 39, name: "Sentiment Analysis Engine", domain: "Market Sentiment" },
    { id: 249, name: "Risk Manager", domain: "Risk Assessment" },
    { id: 245, name: "Options Flow Aggregator", domain: "Options Flow" },
    { id: 213, name: "Sector Rotation Tracker", domain: "Sector Analysis" },
    { id: 6, name: "Devil's Advocate", domain: "Contrarian Analysis" },
  ];

  try {
    sendEvent("start", { symbol: stock.symbol, name: stock.name, totalAgents: AGENTS.length });

    const systemPrompt = `You are the Quantum Entanglement Analysis Engine. Analyze stocks with specialized AI agents and provide results in JSON format.

IMPORTANT: Respond with valid JSON only:
{
  "symbol": "${stock.symbol}",
  "name": "${stock.name}",
  "overallSignal": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "confidenceScore": <number 0-100>,
  "consensusReached": <boolean>,
  "agents": [
    {
      "id": <number>,
      "name": "<agent name>",
      "domain": "<analysis domain>",
      "signal": "BULLISH" | "NEUTRAL" | "BEARISH",
      "confidence": <number 0-100>,
      "reasoning": "<1-2 sentence analysis>",
      "keyMetric": "<one key data point>"
    }
  ],
  "flashCouncilSummary": "<2-3 sentence consensus summary>",
  "riskFactors": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "catalysts": ["<catalyst 1>", "<catalyst 2>"],
  "priceTargets": { "bear": <number>, "base": <number>, "bull": <number> },
  "timeHorizon": "short-term" | "medium-term" | "long-term",
  "disclaimer": "AI-generated analysis for educational purposes only. Not financial advice."
}`;

    const userPrompt = `Analyze ${stock.symbol} (${stock.name}) at $${stock.price} (${stock.changePercent > 0 ? "+" : ""}${stock.changePercent}%). Sector: ${stock.sector}. Market Cap: $${(stock.marketCap / 1e9).toFixed(2)}B. P/E: ${stock.pe ?? "N/A"}. 52w: $${stock.week52Low}-$${stock.week52High}. Run 7 specialized agents.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      sendEvent("error", { message: "No analysis generated" });
      res.end();
      return;
    }

    const analysis = JSON.parse(content);

    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i];
      const agentData = analysis.agents?.find((a: any) => a.id === agent.id) || {
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        signal: "NEUTRAL",
        confidence: 50,
        reasoning: "Analysis complete.",
        keyMetric: "N/A",
      };
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      sendEvent("agent", { agent: agentData, index: i, total: AGENTS.length });
    }

    await new Promise(r => setTimeout(r, 200));
    sendEvent("complete", analysis);
    incrementSignalCount(clerkId);
    res.end();
  } catch (error: unknown) {
    logger.error({ err: error, symbol: req.params.symbol }, "Stream analysis error");
    sendEvent("error", { message: "Analysis failed" });
    res.end();
  }
});

router.post("/stocks/:symbol/quick-analyze", requireAuth, validateParams(StockSymbolParamsSchema), validateBody(z.object({}).strict()), async (req, res) => {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait before requesting another analysis." });
    return;
  }

  const stock = getStockBySymbol(req.params.symbol as string);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  try {
    const abortSignal = req.timeoutAbortController?.signal;
    const completion = await aiQueue.enqueue<OpenAICompletion>(() =>
      openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are a financial analysis AI. Provide a brief stock analysis. Respond in JSON: {"signal": "BUY"|"SELL"|"NEUTRAL", "confidence": <0-100>, "summary": "<2 sentences>", "keyLevel": <price number>, "risk": "LOW"|"MEDIUM"|"HIGH", "disclaimer": "AI-generated analysis. Not financial advice."}`,
          },
          {
            role: "user",
            content: `Quick analysis: ${stock.symbol} (${stock.name}) at $${stock.price}, ${stock.changePercent > 0 ? "+" : ""}${stock.changePercent}%, sector: ${stock.sector}, P/E: ${stock.pe ?? "N/A"}, 52w range: $${stock.week52Low}-$${stock.week52High}`,
          },
        ],
        response_format: { type: "json_object" },
      }, { signal: abortSignal }) as Promise<OpenAICompletion>
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      if (!res.headersSent) res.status(500).json({ error: "No analysis generated" });
      return;
    }

    const rawQuickAnalysis = JSON.parse(content);
    const quickAnalysis = deepSanitizeObject(rawQuickAnalysis);
    quickAnalysis.disclaimer = "AI-generated analysis for educational purposes only. Not financial advice. Always do your own research.";
    if (!res.headersSent) res.json(quickAnalysis);
  } catch (error: unknown) {
    if (res.headersSent) return;
    if (error instanceof AIQueueOverflowError) {
      res.set("Retry-After", String(error.retryAfterSeconds));
      res.status(503).json({ error: "AI analysis service is at capacity. Please retry in 30 seconds.", retryAfter: error.retryAfterSeconds });
      return;
    }
    logger.error({ err: error, symbol: req.params.symbol }, "Quick stock analysis error");
    res.status(500).json({ error: "Quick analysis failed. Please try again." });
  }
});

export default router;
