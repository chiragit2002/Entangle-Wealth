import { Router } from "express";

let openai: any = null;
try {
  const mod = await import("@workspace/integrations-openai-ai-server");
  openai = mod.openai;
} catch {
  console.log("OpenAI not available for TaxGPT, using fallback responses");
}

const router = Router();

const TAX_SYSTEM_PROMPT = `You are TaxGPT, an IRS tax knowledge assistant built into EntangleWealth. You answer questions about US business tax deductions, compliance, audit risk factors, and IRS rules.

Rules:
1. Always cite specific IRS publications (e.g., Pub 463, Pub 587, IRC Section 162) when relevant.
2. Be specific about deduction percentages and requirements.
3. Always remind users this is educational information, not professional tax advice.
4. Keep answers concise but thorough — use numbered lists and clear formatting.
5. Focus on small business and gig worker tax situations.
6. If unsure, say so and recommend consulting a CPA.
7. Never make up IRS rules or publication numbers.`;

router.post("/taxgpt", async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== "string" || question.length > 1000) {
    res.status(400).json({ error: "Question is required (max 1000 chars)" });
    return;
  }

  if (!openai) {
    res.status(503).json({ error: "AI service not available" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: TAX_SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const answer = completion.choices?.[0]?.message?.content || "I couldn't generate a response. Please try rephrasing your question.";
    res.json({ answer });
  } catch (error) {
    console.error("TaxGPT error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
