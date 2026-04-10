import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { MessageCircle, Send, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

interface AuditRisk {
  title: string;
  level: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  pct: number;
}

const AUDIT_RISKS: AuditRisk[] = [
  { title: "Excessive Meal Deductions", level: "HIGH", description: "Meals over 50% of gross income are a major audit trigger. Always document who attended and the business purpose discussed.", pct: 85 },
  { title: "100% Vehicle Business Use", level: "HIGH", description: "Claiming a vehicle is used 100% for business is heavily scrutinized. IRS expects some personal use. Keep a detailed contemporaneous log.", pct: 80 },
  { title: "Large Cash Transactions", level: "MEDIUM", description: "Cash transactions over $10,000 require Form 8300. Pattern of just-under-$10K transactions is called structuring and is illegal.", pct: 55 },
  { title: "Home Office Deduction", level: "MEDIUM", description: "Must be used regularly and exclusively for business. The simplified method ($5/sq ft) is easier to defend in an audit.", pct: 45 },
];

const COMMON_QUESTIONS = [
  { emoji: "🔍", text: "What deductions am I probably missing as a freelancer?" },
  { emoji: "💰", text: "Should I do a backdoor Roth?" },
  { emoji: "📋", text: "Review my tax situation" },
  { emoji: "🏠", text: "Home office deduction rules?" },
  { emoji: "🚗", text: "How to document vehicle mileage?" },
  { emoji: "⚠️", text: "What triggers an IRS audit?" },
  { emoji: "📊", text: "What is the QBI deduction and do I qualify?" },
  { emoji: "🏦", text: "Best order to fund retirement accounts?" },
];

const MOCK_ANSWERS: Record<string, string> = {
  "meals": "Per IRS Publication 463, business meals are 50% deductible if:\n\n1. The meal is not lavish or extravagant\n2. You or your employee is present\n3. The meal has a clear business purpose\n\nYou MUST document: date, place, amount, business purpose, and who attended. Without this documentation, the deduction is disallowed entirely.\n\nTip: Use a receipt-tracking app (like our Receipt Scanner) to log meals as you go.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "home office": "Per IRS Publication 587, you can deduct home office expenses if the space is used:\n\n1. Regularly (not occasionally)\n2. Exclusively for business (no personal use)\n\nTwo methods:\n• Simplified: $5 per sq ft, max 300 sq ft = $1,500\n• Regular: Actual expenses x business use percentage\n\nThe simplified method is easier to defend during an audit and requires less recordkeeping.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "vehicle": "Per IRS Publication 463, you can deduct vehicle expenses using:\n\n1. Standard mileage rate: 70 cents/mile (2026)\n2. Actual expenses: gas, insurance, repairs, depreciation x business use %\n\nYou MUST keep a contemporaneous mileage log with:\n• Date of each trip\n• Destination and business purpose\n• Miles driven\n\nAt 3,000 business miles, the standard rate yields a $2,100 deduction.\n\nClaiming 100% business use is a major audit red flag.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "audit": "Common IRS audit triggers for small businesses:\n\n1. High deductions relative to income\n2. Large cash transactions or unreported income\n3. Claiming 100% business use of a vehicle\n4. Excessive meal/entertainment deductions\n5. Home office deduction with no dedicated space\n6. Round numbers on tax returns\n7. Consistent losses year after year (hobby loss rules)\n\nBest defense: meticulous documentation and reasonable claims.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "travel": "Per IRS Publication 463, for a trip to be deductible:\n\n1. The PRIMARY purpose must be business\n2. You must be away from your 'tax home' overnight\n3. Each day should have documented business activities\n\nFor mixed trips: transportation is 100% deductible if business is the primary purpose. Lodging is deductible only for business days. Meals are 50% deductible on business days.\n\nPersonal days in the middle of a business trip are NOT deductible.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "depreciation": "Per IRS Publication 946, depreciation allows you to deduct the cost of business assets over their useful life.\n\nKey methods (2026):\n1. Section 179: Deduct the full cost in year 1 (up to $1,250,000; phase-out begins at $3,130,000)\n2. Bonus depreciation: 40% first-year deduction (2026 schedule)\n3. MACRS: Standard depreciation schedule over 3-39 years\n\nCommon asset classes:\n• Computers/electronics: 5 years\n• Office furniture: 7 years\n• Vehicles: 5 years (with limits)\n• Buildings: 27.5-39 years\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "self-employment": "Self-employment tax is 15.3% of net earnings (2026):\n• 12.4% Social Security (on first $176,100)\n• 2.9% Medicare (no cap)\n• Additional 0.9% Medicare over $200K single / $250K married\n\nYou can deduct 50% of SE tax on Form 1040 (above-the-line).\n\nDon't forget the QBI deduction — 20% of qualified business income (Form 8995) if taxable income is below $200,000 single / $400,000 MFJ.\n\nEstimated taxes are due quarterly:\n• April 15, June 15, Sept 15, Jan 15\n\nPenalty for underpayment if you owe >$1,000.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "retirement": "Per IRS guidelines, self-employed retirement plan options for 2026:\n\n1. SEP-IRA: Up to 25% of net SE income (max $71,000)\n2. Solo 401(k): Up to $24,000 employee + 25% employer (max $71,000; catch-up 50+: +$7,500)\n3. SIMPLE IRA: Up to $16,500 employee + 3% employer match (catch-up 50+: +$3,500)\n4. Traditional/Roth IRA: $7,500 (catch-up 50+: +$1,000)\n\nRecommended priority: HSA ($4,400/$8,750) → 401(k) match → Roth IRA → Max 401(k) → 529 Plan\n\nAll Traditional contributions reduce taxable income. Roth contributions are after-tax but grow and withdraw tax-free.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "health": "Self-employed health insurance deduction (IRS Publication 535):\n\n1. Deduct 100% of premiums for yourself, spouse, and dependents\n2. Must have net profit from self-employment\n3. Cannot exceed your net SE income\n4. Cannot be eligible for employer-sponsored plan\n\nThis is an above-the-line deduction (reduces AGI), which can increase eligibility for other credits.\n\nHSA contributions are also deductible (2026): $4,400 individual / $8,750 family (catch-up 55+: +$1,000).\n\nHSA tip: HSAs offer a triple tax advantage — contributions are deductible, growth is tax-free, and withdrawals for qualified medical expenses are tax-free.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "quarterly": "Estimated tax payments for self-employed individuals:\n\nDue dates:\n• Q1: April 15\n• Q2: June 15\n• Q3: September 15\n• Q4: January 15 (next year)\n\nUse Form 1040-ES to calculate and pay.\n\nSafe harbor: Pay 100% of last year's tax (110% if AGI > $150K) to avoid penalties.\n\nPenalty for underpayment if you owe more than $1,000 at filing.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "qbi": "The Qualified Business Income (QBI) deduction under IRC Section 199A (Form 8995) allows a 20% deduction on qualified business income from pass-through entities and sole proprietorships.\n\n2026 thresholds:\n• Full deduction: taxable income below $200,000 (single) / $400,000 (MFJ)\n• Phase-out range: $200,000-$250,000 (single) / $400,000-$500,000 (MFJ)\n• Above phase-out: W-2 wage / property limits apply\n\nExample: $60,000 Schedule C net profit at 22% bracket\n→ QBI deduction = $12,000 → tax savings ≈ $2,640\n\nSpecified service trades (law, medicine, consulting, etc.) are limited in the phase-out range.\n\nThis is one of the most frequently missed deductions for freelancers and small business owners.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "roth": "Backdoor Roth IRA strategy (2026):\n\nRoth IRA direct contribution phase-out:\n• Single: $160,000-$175,000 MAGI\n• MFJ: $240,000-$250,000 MAGI\n\nIf your income exceeds these limits, the Backdoor Roth works like this:\n1. Contribute to a Traditional IRA (non-deductible) — $7,500 limit ($8,500 if 50+)\n2. Convert to Roth IRA shortly after\n3. Pay tax only on any gains between contribution and conversion\n\n⚠️ Pro-rata rule: If you have existing pre-tax IRA balances, the conversion is partially taxable. Consider rolling pre-tax IRA money into a 401(k) first to avoid this.\n\nMega Backdoor Roth: If your 401(k) plan allows after-tax contributions, you can contribute up to $71,000 total (2026) and convert the after-tax portion to Roth.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
  "freelancer": "**Commonly missed deductions for freelancers (2026):**\n\n🟢 **High-Confidence Savings:**\n• QBI deduction (Form 8995) — 20% of qualified business income → could save thousands\n• Self-employed health insurance — 100% deductible above-the-line (Pub 535)\n• 50% of SE tax — automatic above-the-line deduction\n• Home office — $1,500 simplified or actual method (Pub 587)\n• Vehicle — 70¢/mile standard rate (Pub 463)\n• Retirement contributions — SEP-IRA up to $71,000, Solo 401(k) up to $71,000\n• HSA contributions — $4,400 individual / $8,750 family (triple tax advantage)\n\n🟡 **Worth Investigating:**\n• Business insurance premiums\n• Professional subscriptions and software\n• Continuing education and training\n• Section 179 expensing on equipment (up to $1,250,000)\n• State/local business licenses\n• Business use of phone and internet (business % only)\n\n**Recommended priority:** HSA → 401(k) match → Roth IRA → Max 401(k)\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.",
};

function getAIResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("meal") || q.includes("food") || q.includes("dinner") || q.includes("lunch")) return MOCK_ANSWERS["meals"];
  if (q.includes("home") || q.includes("office")) return MOCK_ANSWERS["home office"];
  if (q.includes("vehicle") || q.includes("mileage") || q.includes("car") || q.includes("drive")) return MOCK_ANSWERS["vehicle"];
  if (q.includes("audit") || q.includes("trigger") || q.includes("risk")) return MOCK_ANSWERS["audit"];
  if (q.includes("travel") || q.includes("trip") || q.includes("flight") || q.includes("conference")) return MOCK_ANSWERS["travel"];
  if (q.includes("depreci") || q.includes("section 179") || q.includes("asset")) return MOCK_ANSWERS["depreciation"];
  if (q.includes("freelanc") || q.includes("missing") || q.includes("missed")) return MOCK_ANSWERS["freelancer"];
  if (q.includes("self-employ") || q.includes("self employ") || q.includes("1099")) return MOCK_ANSWERS["self-employment"];
  if (q.includes("qbi") || q.includes("199a") || q.includes("qualified business income") || q.includes("form 8995")) return MOCK_ANSWERS["qbi"];
  if (q.includes("backdoor") || q.includes("roth") || q.includes("conversion")) return MOCK_ANSWERS["roth"];
  if (q.includes("retire") || q.includes("401k") || q.includes("ira") || q.includes("sep")) return MOCK_ANSWERS["retirement"];
  if (q.includes("health") || q.includes("insurance") || q.includes("medical") || q.includes("hsa")) return MOCK_ANSWERS["health"];
  if (q.includes("quarter") || q.includes("estimated") || q.includes("1040-es")) return MOCK_ANSWERS["quarterly"];
  if (q.includes("order") || q.includes("priority") || q.includes("fund")) return MOCK_ANSWERS["retirement"];
  if (q.includes("review") || q.includes("situation")) return MOCK_ANSWERS["freelancer"];
  return "That's a great question! Based on IRS publications, this topic involves several factors specific to your situation. I'd recommend:\n\n1. Reviewing the relevant IRS publication for your specific case\n2. Keeping detailed documentation of all related expenses\n3. Consulting with a licensed CPA for personalized advice\n\nWould you like to ask about a specific deduction type? I can help with meals, home office, vehicle use, travel, depreciation, self-employment tax, retirement plans, health insurance, QBI deduction, backdoor Roth, or estimated quarterly payments.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.";
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000;

export default function TaxGPT() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Hello! I'm TaxGPT, trained on IRS publications including Pub 463, 535, 587, 946, and thousands of tax court cases. Ask me about business deductions, travel rules, meal deductions, home office, vehicle use, or audit risk factors. What can I help you with?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rateLimitRef = useRef<number[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const isRateLimited = useCallback((): boolean => {
    const now = Date.now();
    rateLimitRef.current = rateLimitRef.current.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (rateLimitRef.current.length >= RATE_LIMIT_MAX) return true;
    rateLimitRef.current.push(now);
    return false;
  }, []);

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim().slice(0, 1000);
    if (!question || loading) return;

    if (isRateLimited()) {
      setMessages(prev => [...prev, { role: "ai", text: "You're sending questions too quickly. Please wait a moment before asking another question." }]);
      return;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${baseUrl}/api/taxgpt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "ai", text: data.answer }]);
      } else {
        const fallback = getAIResponse(question);
        setMessages(prev => [...prev, { role: "ai", text: fallback }]);
      }
    } catch {
      const fallback = getAIResponse(question);
      setMessages(prev => [...prev, { role: "ai", text: fallback }]);
    }
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH": return "#ff3366";
      case "MEDIUM": return "#ffd700";
      default: return "#00ff88";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-8 h-8 text-[#00ff88]" />
          <h1 className="text-3xl md:text-4xl font-bold">TaxGPT</h1>
          <span className="text-xs text-muted-foreground mt-2">IRS Knowledge Engine</span>
        </div>
        <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.03)]">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            TaxGPT answers based on IRS publications and tax code. This is educational information only — not professional tax advice. Consult a licensed CPA for your specific situation.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 mb-6">
          <p className="text-[13px] text-muted-foreground mb-3">Ask about deductions, compliance, audit risks, or IRS rules</p>
          <div ref={scrollRef} className="max-h-[400px] overflow-y-auto space-y-3 mb-4 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`rounded-xl p-3 text-[14px] leading-relaxed max-w-[90%] whitespace-pre-line ${
                msg.role === "user"
                  ? "ml-auto bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.15)] text-right"
                  : "bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.15)]"
              }`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.15)] rounded-xl p-3 max-w-[90%] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                <span className="text-[14px] text-muted-foreground">Researching IRS publications...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ask about any deduction..."
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 1000))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              maxLength={1000}
              className="bg-white/5 border-white/10 flex-1"
              aria-label="Type your tax question"
            />
            <Button
              className="bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold px-4 min-h-[44px] min-w-[44px]"
              onClick={() => sendMessage()}
              disabled={loading}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
          <MessageCircle className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-semibold">Common Questions</h2>
        </div>
        <div className="glass-panel rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-2">
            {COMMON_QUESTIONS.map((q, i) => (
              <button key={i}
                onClick={() => sendMessage(q.text)}
                className="text-left text-[13px] p-3 rounded-lg border border-white/10 bg-transparent hover:bg-white/5 text-muted-foreground transition-colors min-h-[44px]"
                disabled={loading}
              >
                {q.emoji} {q.text}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
          <AlertTriangle className="w-5 h-5 text-[#ff3366]" />
          <h2 className="text-lg font-semibold">Audit Risk Factors</h2>
        </div>
        <div className="space-y-3 mb-6">
          {AUDIT_RISKS.map((risk, i) => (
            <div key={i} className="glass-panel rounded-xl p-4 border-l-[3px]" style={{ borderLeftColor: getRiskColor(risk.level) }}>
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-[14px]">{risk.title}</p>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{
                  background: `${getRiskColor(risk.level)}20`,
                  color: getRiskColor(risk.level),
                }}>
                  {risk.level} RISK
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mb-2">{risk.description}</p>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${risk.pct}%`,
                  backgroundColor: getRiskColor(risk.level),
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
