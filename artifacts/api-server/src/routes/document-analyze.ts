import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { validateBody, z } from "../lib/validateRequest";
import { logger } from "../lib/logger";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { LRUMap } from "../lib/lruMap";

let openai: any = null;
try {
  const mod = await import("@workspace/integrations-openai-ai-server");
  openai = mod.openai;
} catch (err) {
  logger.warn({ err }, "OpenAI not available for document analysis");
}

const router = Router();

const MAX_BASE64_BYTES = 5 * 1024 * 1024;
const MAX_CONCURRENT_PER_USER = 2;

const userConcurrency = new LRUMap<string, number>(5_000);

function acquireSlot(userId: string): boolean {
  const current = userConcurrency.get(userId) ?? 0;
  if (current >= MAX_CONCURRENT_PER_USER) return false;
  userConcurrency.set(userId, current + 1);
  return true;
}

function releaseSlot(userId: string): void {
  const current = userConcurrency.get(userId) ?? 1;
  const next = Math.max(0, current - 1);
  if (next === 0) {
    userConcurrency.delete(userId);
  } else {
    userConcurrency.set(userId, next);
  }
}

const DocumentAnalyzeSchema = z.object({
  fileData: z.string().min(1).max(MAX_BASE64_BYTES),
  fileType: z.string().min(1).max(100).regex(/^(image\/|application\/pdf)/, "Only image or PDF file types allowed"),
  fileName: z.string().max(255).optional(),
});

router.post("/analyze-document", requireAuth, validateBody(DocumentAnalyzeSchema), async (req, res) => {
  const clerkId = (req as AuthenticatedRequest).userId;
  const { fileData, fileType, fileName } = req.body;

  if (!openai) {
    res.status(503).json({ error: "AI service not available" });
    return;
  }

  const rawBytes = Buffer.byteLength(fileData, "utf8");
  if (rawBytes > MAX_BASE64_BYTES) {
    res.status(413).json({ error: "File too large. Maximum size is 5 MB." });
    return;
  }

  if (!acquireSlot(clerkId)) {
    res.status(429).json({ error: "Too many concurrent document analysis requests. Please wait for your current upload to finish." });
    return;
  }

  try {
    const isImage = fileType.startsWith("image/");

    const messages: any[] = [
      {
        role: "system",
        content: `You are a CPA assistant helping analyze a business document for tax purposes. Analyze the document and respond ONLY with valid JSON (no markdown, no code fences):
{
  "docType": "receipt|invoice|bank_statement|contract|tax_form|other",
  "vendor": "vendor name",
  "date": "YYYY-MM-DD",
  "amount": 0.00,
  "items": ["item1", "item2"],
  "irsCategory": "Office Supplies|Meals|Travel|Vehicle|Software|Marketing|Professional|Education|Phone|Insurance|Equipment|Other",
  "ircSection": "IRC section reference",
  "deductiblePct": 100,
  "deductibleAmount": 0.00,
  "auditReady": true,
  "auditIssues": [],
  "suggestedPurpose": "suggested business purpose language",
  "notes": "any additional notes"
}`
      },
    ];

    if (isImage) {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${fileType};base64,${fileData}`,
            },
          },
          {
            type: "text",
            text: `Analyze this business document (${fileName || "uploaded file"}) for tax deduction purposes. Extract all relevant information and categorize it.`,
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Analyze this business document named "${fileName || "document"}" for tax deduction purposes. The document is a PDF. Based on the filename, provide your best analysis with reasonable estimates. Extract all relevant information and categorize it.`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1000,
      temperature: 0.2,
    });

    const content = completion.choices?.[0]?.message?.content || "";

    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const analysis = JSON.parse(cleaned);
      res.json(analysis);
    } catch {
      res.json({
        docType: "receipt",
        vendor: fileName?.split(".")[0]?.replace(/[-_]/g, " ") || "Unknown",
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        items: [],
        irsCategory: "Other",
        ircSection: "IRC §162",
        deductiblePct: 100,
        deductibleAmount: 0,
        auditReady: false,
        auditIssues: ["Could not parse document automatically"],
        suggestedPurpose: "Business expense — review and categorize manually",
        notes: content.slice(0, 500),
      });
    }
  } catch (error) {
    logger.error({ err: error }, "Document analysis error");
    res.status(500).json({ error: "Failed to analyze document" });
  } finally {
    releaseSlot(clerkId);
  }
});

export default router;
