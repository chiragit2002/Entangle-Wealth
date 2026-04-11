import { Router, type Request } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getStockBySymbol } from "../data/nasdaq-stocks";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
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

router.post("/stocks/:symbol/analyze", requireAuth, async (req, res) => {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait before requesting another analysis." });
    return;
  }

  const stock = getStockBySymbol(req.params.symbol);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  try {
    const systemPrompt = `You are the Quantum Entanglement Analysis Engine — an elite multi-agent financial analysis system. You coordinate multiple specialized AI analysis agents that simultaneously analyze stocks from different perspectives and cross-check each other. A signal only fires when there is consensus across agents.

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
      res.status(500).json({ error: "No analysis generated" });
      return;
    }

    const analysis = JSON.parse(content);
    res.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("Analysis error:", message);
    console.error("Full analysis error details:", message);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

router.post("/stocks/:symbol/quick-analyze", requireAuth, async (req, res) => {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait before requesting another analysis." });
    return;
  }

  const stock = getStockBySymbol(req.params.symbol);
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
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
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No analysis generated" });
      return;
    }

    res.json(JSON.parse(content));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Quick analysis failed";
    console.error("Quick analysis error details:", message);
    res.status(500).json({ error: "Quick analysis failed. Please try again." });
  }
});

export default router;
