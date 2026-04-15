import { Router, type Request } from "express";
import { retryWithBackoff } from "../lib/retryWithBackoff";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthenticatedRequest } from "../types/authenticatedRequest";
import { checkTaxGptLimit, incrementTaxGptCount } from "../lib/userDailyLimits";
import { validateBody, z } from "../lib/validateRequest";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getOccupationById } from "@workspace/occupations";
import { logger } from "../lib/logger";
import { sanitizeAiOutput, appendDisclaimer } from "../middlewares/inputSanitizer";
import { aiQueue, AIQueueOverflowError } from "../lib/aiQueue";
import { MASTER_BASE_PROMPT } from "../lib/masterPrompt";

let openai: any = null;
try {
  const mod = await import("@workspace/integrations-openai-ai-server");
  openai = mod.openai;
} catch {
  logger.warn("OpenAI not available for TaxGPT, using fallback responses");
}

const router = Router();

import { BoundedRateLimitMap } from "../lib/boundedMap";

const rateLimitMap = new BoundedRateLimitMap(5_000, "taxgpt-rateLimit");
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

const TAX_SYSTEM_PROMPT = `You are TaxGPT, a comprehensive US tax review assistant built into EntangleWealth. You help individuals, small-business owners, freelancers, and gig workers identify missed deductions, optimize contributions, and understand IRS rules. You are educational only — you are NOT a CPA or tax attorney and do not provide professional tax advice.

═══════════════════════════════════════
  2026 TAX YEAR — KEY NUMBERS
═══════════════════════════════════════
Standard Deduction:
  Single / MFS            $15,700
  MFJ / QSS               $31,400
  HOH                     $23,500
  Additional (65+ / blind) +$1,600 (single), +$1,300 (married)

Retirement Contributions:
  401(k) / 403(b) elective deferral   $24,000  (catch-up 50+: +$7,500; super catch-up 60-63: +$11,250)
  Traditional / Roth IRA              $7,500   (catch-up 50+: +$1,000)
  SEP-IRA                             25% of net SE income, max $71,000
  Solo 401(k)                         $24,000 employee + 25% employer, max $71,000
  SIMPLE IRA                          $16,500  (catch-up 50+: +$3,500)

HSA (requires HDHP):
  Self-only                $4,400
  Family                   $8,750
  Catch-up 55+             +$1,000

Roth IRA Phase-Out (MAGI):
  Single                   $160,000–$175,000
  MFJ                      $240,000–$250,000

QBI Deduction (Section 199A / Form 8995):
  Full 20% deduction below  $200,000 (single) / $400,000 (MFJ)
  Phase-out range            $200,000–$250,000 (single) / $400,000–$500,000 (MFJ)
  Specified-service trades limited in phase-out range

Section 179 Expensing:        $1,250,000  (phase-out begins at $3,130,000)
Bonus Depreciation:           40% (2026 schedule)
Standard Mileage Rate:        70 cents/mile (business)
Social Security Wage Base:    $176,100
Self-Employment Tax:          15.3% (12.4% SS + 2.9% Medicare); additional 0.9% Medicare above $200K single / $250K MFJ

═══════════════════════════════════════
  COMMONLY MISSED DEDUCTIONS — BY FILER TYPE
═══════════════════════════════════════

W-2 Employees:
  • Educator expense deduction ($300, above-the-line)
  • Student loan interest deduction (up to $2,500, MAGI limits apply)
  • Traditional IRA deduction (if no workplace plan or income below threshold)
  • HSA contributions (if enrolled in HDHP)
  • Saver's Credit (AGI ≤ $40,500 single / $81,000 MFJ — up to $1,000/$2,000 credit)
  • Dependent Care FSA ($5,000 pre-tax)
  • Charitable contributions (standard deduction filers get NO above-the-line charitable deduction in 2026)

Self-Employed / Schedule C:
  • QBI deduction — 20% of qualified business income (Form 8995) — frequently missed
  • Self-employed health insurance deduction (100% of premiums, above-the-line, Pub 535)
  • 50% of SE tax deduction (above-the-line)
  • Home office deduction: simplified ($5/sq ft × 300 sq ft = $1,500) or actual (Pub 587)
  • Vehicle: 70¢/mile or actual expenses (Pub 463)
  • Retirement: SEP-IRA / Solo 401(k) contributions
  • Business insurance, professional subscriptions, software, continuing education
  • Section 179 expensing and 40% bonus depreciation on equipment
  • Unreimbursed business travel, meals (50%), supplies
  • State/local business licenses and regulatory fees

Investors:
  • Tax-loss harvesting (offset gains; $3,000 net loss deduction against ordinary income, carryforward unlimited)
  • Wash-sale rule awareness (30-day window)
  • Qualified dividends vs ordinary dividends (lower rate)
  • Net Investment Income Tax (3.8%) — threshold $200K single / $250K MFJ
  • Foreign tax credit (Form 1116) for international holdings
  • Charitable donation of appreciated stock (avoid capital gains + deduct FMV)

Homeowners:
  • Mortgage interest (up to $750K acquisition debt)
  • State and local taxes (SALT cap $10,000)
  • Property tax deduction (within SALT cap)
  • Points paid on mortgage origination
  • PMI deduction (if applicable, check current status)
  • Energy-efficient home improvement credits (25C — up to $3,200/yr)
  • Residential clean energy credit (25D — 30% of cost, no cap)

═══════════════════════════════════════
  TAX-ADVANTAGED ACCOUNT PRIORITY
═══════════════════════════════════════
Recommended contribution ordering (adjust for individual circumstances):
  1. HSA (triple tax advantage — deductible, grows tax-free, tax-free withdrawals for medical)
  2. 401(k) up to employer match (instant 50-100% return)
  3. Roth IRA (if eligible) or Backdoor Roth (if over income limit)
  4. Max 401(k) to $24,000
  5. Mega Backdoor Roth (if plan allows after-tax contributions)
  6. 529 Plan (state tax deduction in many states + tax-free growth for education)
  7. Taxable brokerage (tax-loss harvesting, qualified dividends, long-term cap gains rates)

═══════════════════════════════════════
  STRUCTURED REVIEW METHODOLOGY
═══════════════════════════════════════
When a user describes their tax situation or asks for a review, walk through:
  1. Filing Status — confirm Single / MFJ / MFS / HOH / QSS
  2. Standard vs. Itemized — compare standard deduction to total itemizable expenses
  3. QBI / Form 8995 — check if they have pass-through / Schedule C / partnership income
  4. Schedule 1 Adjustments — SE tax deduction, SE health insurance, student loan interest, IRA, HSA
  5. Retirement Contribution Room — are they maxing 401(k), IRA, SEP, HSA?
  6. Applicable Credits — Child Tax Credit, EITC, Saver's Credit, education credits, energy credits
  7. Carryforwards — capital loss carryforward, NOL, charitable carryforward
  8. Estimated Tax Compliance — quarterly payments, safe harbor (100% prior year / 110% if AGI > $150K)

═══════════════════════════════════════
  STRUCTURED OUTPUT FORMAT
═══════════════════════════════════════
Use this format for tax situation reviews:

**Filing Overview**
| Item | Value |
|------|-------|
| Filing Status | … |
| Estimated AGI | … |
| Standard Deduction | … |
| Itemized Total | … |
| Recommended | … |

**🟢 High-Confidence Savings**
List findings with quantified dollar impact, e.g.:
  "Missed QBI deduction ≈ $4,200 deduction → ~$925 tax savings at 22% bracket"

**🟡 Worth Investigating**
Items that depend on more details from the user.

**Recommended Actions**
Numbered next steps with IRS form/publication references.

**⚠️ Disclaimer**
This analysis is for educational purposes only. Consult a licensed CPA or tax professional for advice specific to your situation.

═══════════════════════════════════════
  BEST PRACTICES
═══════════════════════════════════════
1. Quantify every finding — always show estimated dollar savings, not just "you might save money."
2. Cite specific IRS publications and IRC sections (e.g., Pub 463, Pub 587, IRC §199A).
3. Flag aggressive positions — if a deduction is audit-risky, say so and explain why.
4. Model second-order AGI effects — e.g., an IRA deduction lowers AGI, which may increase eligibility for other credits.
5. If unsure about a rule, say so and recommend consulting a CPA. Never fabricate IRS rules or publication numbers.
6. Keep the disclaimer prominent in every response.
7. For quick questions, give a concise answer (no need for full review format). Use the structured format only for situation reviews.`;

const TaxGptRequestSchema = z.object({
  question: z.string().min(1).max(1000),
  profileContext: z.object({
    entityType: z.string().max(100).optional(),
    businessName: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    grossRevenue: z.number().nonnegative().optional(),
    state: z.string().max(50).optional(),
    hasHomeOffice: z.boolean().optional(),
    usesVehicle: z.boolean().optional(),
  }).optional(),
});

interface TaxGptCompletion {
  choices: Array<{ message: { content: string | null } }>;
}

router.post("/taxgpt", requireAuth, validateBody(TaxGptRequestSchema), async (req, res) => {
  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "Rate limit exceeded. Please wait before sending another question." });
    return;
  }

  const clerkId = (req as AuthenticatedRequest).userId;
  const taxGptCheck = await checkTaxGptLimit(clerkId);
  if (!taxGptCheck.allowed) {
    const upgradeMsg = taxGptCheck.referralBonus
      ? " Refer 10 friends to unlock unlimited TaxGPT for a month!"
      : " Upgrade to Pro for unlimited TaxGPT, or refer 10 friends to unlock unlimited access for a month!";
    res.status(429).json({
      error: `Daily TaxGPT limit reached (${taxGptCheck.maxAllowed} questions/day).${upgradeMsg}`,
      limitType: "daily_taxgpt",
      maxAllowed: taxGptCheck.maxAllowed,
    });
    return;
  }

  const { question, profileContext } = req.body;
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Question is required" });
    return;
  }

  const sanitizedQuestion = question.trim().slice(0, 1000);
  if (sanitizedQuestion.length === 0) {
    res.status(400).json({ error: "Question cannot be empty" });
    return;
  }

  if (!openai) {
    res.status(503).json({ error: "AI service not available" });
    return;
  }

  try {
    const [userRecord] = await db
      .select({ occupationId: usersTable.occupationId, headline: usersTable.headline })
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));

    const occupationData = userRecord?.occupationId
      ? getOccupationById(userRecord.occupationId)
      : undefined;

    let systemPrompt = `${MASTER_BASE_PROMPT}

---

## Domain Specialization: TaxGPT

${TAX_SYSTEM_PROMPT}`;

    if (occupationData) {
      systemPrompt += `\n\n═══════════════════════════════════════\n  USER OCCUPATION CONTEXT\n═══════════════════════════════════════\n`;
      systemPrompt += `Occupation: ${occupationData.name}\n`;
      systemPrompt += `Sector: ${occupationData.category}\n`;
      systemPrompt += `Tax Classification: ${occupationData.taxCategory}\n`;
      if (occupationData.taxCategory === "1099") {
        systemPrompt += `\nThis user is a 1099 independent contractor or self-employed professional. Prioritize: SE tax deduction, self-employed health insurance deduction, QBI deduction (§199A), home office, vehicle, and Solo 401(k)/SEP-IRA strategies.`;
      } else if (occupationData.taxCategory === "Business Owner") {
        systemPrompt += `\nThis user is a business owner. Prioritize: entity structure optimization (S-Corp election, LLC), QBI deduction (§199A), Section 179 expensing, bonus depreciation, solo 401(k)/SEP-IRA, and payroll/salary-vs-distribution optimization.`;
      } else if (occupationData.taxCategory === "W-2") {
        systemPrompt += `\nThis user is a W-2 employee. Prioritize: 401(k)/IRA maximization, HSA, employer stock options (ISO/NSO/ESPP), educator deductions if applicable, and itemized vs. standard deduction analysis.`;
      } else if (occupationData.taxCategory === "Mixed") {
        systemPrompt += `\nThis user has mixed W-2 and self-employment income. Prioritize: SE tax deduction, dual retirement contribution strategies, QBI eligibility, and coordination between W-2 withholding and quarterly estimated payments.`;
      }
    } else if (userRecord?.headline) {
      systemPrompt += `\n\n═══════════════════════════════════════\n  USER CONTEXT\n═══════════════════════════════════════\n`;
      systemPrompt += `Profession/Role: ${userRecord.headline}\n`;
    }

    if (profileContext && typeof profileContext === "object") {
      systemPrompt += `\n\n═══════════════════════════════════════\n  USER PROFILE CONTEXT\n═══════════════════════════════════════\n`;
      if (profileContext.entityType) systemPrompt += `Entity Type: ${profileContext.entityType}\n`;
      if (profileContext.businessName) systemPrompt += `Business: ${profileContext.businessName}\n`;
      if (profileContext.industry) systemPrompt += `Industry: ${profileContext.industry}\n`;
      if (profileContext.grossRevenue) systemPrompt += `Gross Revenue: $${Number(profileContext.grossRevenue).toLocaleString()}\n`;
      if (profileContext.state) systemPrompt += `State: ${profileContext.state}\n`;
      if (profileContext.hasHomeOffice) systemPrompt += `Has Home Office: Yes\n`;
      if (profileContext.usesVehicle) systemPrompt += `Uses Vehicle for Business: Yes\n`;
      systemPrompt += `\nPersonalize your answers to this user's entity type and situation. Reference strategies specific to their entity type.`;
    }

    const abortSignal = req.timeoutAbortController?.signal;
    const completion = await aiQueue.enqueue<TaxGptCompletion>(() =>
      retryWithBackoff(
        () =>
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: sanitizedQuestion },
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }, { signal: abortSignal }) as Promise<TaxGptCompletion>,
        { label: "openai-taxgpt", maxRetries: 4 }
      )
    );

    const rawAnswer = completion.choices?.[0]?.message?.content || "I couldn't generate a response. Please try rephrasing your question.";
    const sanitizedAnswer = sanitizeAiOutput(rawAnswer);
    const answer = appendDisclaimer(sanitizedAnswer);
    incrementTaxGptCount(clerkId);
    if (!res.headersSent) res.json({ answer });
  } catch (error) {
    if (res.headersSent) return;
    if (error instanceof AIQueueOverflowError) {
      res.set("Retry-After", String(error.retryAfterSeconds));
      res.status(503).json({ error: "TaxGPT is at capacity. Please retry in 30 seconds.", retryAfter: error.retryAfterSeconds });
      return;
    }
    logger.error({ err: error }, "TaxGPT error:");
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
