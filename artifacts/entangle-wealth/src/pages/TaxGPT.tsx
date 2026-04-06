import { useState, useRef, useEffect } from "react";
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
  { emoji: "🍽️", text: "Can I deduct meals when traveling?" },
  { emoji: "🏠", text: "Home office deduction rules?" },
  { emoji: "🚗", text: "How to document vehicle mileage?" },
  { emoji: "⚠️", text: "What triggers an IRS audit?" },
  { emoji: "✈️", text: "Deducting mixed business and personal travel?" },
];

const MOCK_ANSWERS: Record<string, string> = {
  "meals": "Per IRS Publication 463, business meals are 50% deductible if:\n\n1. The meal is not lavish or extravagant\n2. You or your employee is present\n3. The meal has a clear business purpose\n\nYou MUST document: date, place, amount, business purpose, and who attended. Without this documentation, the deduction is disallowed entirely.\n\nTip: Use a receipt-tracking app (like our Receipt Scanner) to log meals as you go.",
  "home office": "Per IRS Publication 587, you can deduct home office expenses if the space is used:\n\n1. Regularly (not occasionally)\n2. Exclusively for business (no personal use)\n\nTwo methods:\n• Simplified: $5 per sq ft, max 300 sq ft = $1,500\n• Regular: Actual expenses × business use percentage\n\nThe simplified method is easier to defend during an audit and requires less recordkeeping.",
  "vehicle": "Per IRS Publication 463, you can deduct vehicle expenses using:\n\n1. Standard mileage rate: 67 cents/mile (2024)\n2. Actual expenses: gas, insurance, repairs, depreciation × business use %\n\nYou MUST keep a contemporaneous mileage log with:\n• Date of each trip\n• Destination and business purpose\n• Miles driven\n\nClaiming 100% business use is a major audit red flag.",
  "audit": "Common IRS audit triggers for small businesses:\n\n1. High deductions relative to income\n2. Large cash transactions or unreported income\n3. Claiming 100% business use of a vehicle\n4. Excessive meal/entertainment deductions\n5. Home office deduction with no dedicated space\n6. Round numbers on tax returns\n7. Consistent losses year after year (hobby loss rules)\n\nBest defense: meticulous documentation and reasonable claims.",
  "travel": "Per IRS Publication 463, for a trip to be deductible:\n\n1. The PRIMARY purpose must be business\n2. You must be away from your 'tax home' overnight\n3. Each day should have documented business activities\n\nFor mixed trips: transportation is 100% deductible if business is the primary purpose. Lodging is deductible only for business days. Meals are 50% deductible on business days.\n\nPersonal days in the middle of a business trip are NOT deductible.",
};

function getAIResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("meal") || q.includes("food") || q.includes("dinner") || q.includes("lunch")) return MOCK_ANSWERS["meals"];
  if (q.includes("home") || q.includes("office")) return MOCK_ANSWERS["home office"];
  if (q.includes("vehicle") || q.includes("mileage") || q.includes("car") || q.includes("drive")) return MOCK_ANSWERS["vehicle"];
  if (q.includes("audit") || q.includes("trigger") || q.includes("risk")) return MOCK_ANSWERS["audit"];
  if (q.includes("travel") || q.includes("trip") || q.includes("flight") || q.includes("conference")) return MOCK_ANSWERS["travel"];
  return "That's a great question! Based on IRS publications, this topic involves several factors specific to your situation. I'd recommend:\n\n1. Reviewing the relevant IRS publication for your specific case\n2. Keeping detailed documentation of all related expenses\n3. Consulting with a licensed CPA for personalized advice\n\nWould you like to ask about a specific deduction type? I can help with meals, home office, vehicle use, travel, or audit risk factors.";
}

export default function TaxGPT() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Hello! I'm TaxGPT, trained on IRS publications including Pub 463, 535, 587, 946, and thousands of tax court cases. Ask me about business deductions, travel rules, meal deductions, home office, vehicle use, or audit risk factors. What can I help you with?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const question = text || input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/taxgpt", {
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
          <div ref={scrollRef} className="max-h-[400px] overflow-y-auto space-y-3 mb-4">
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
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
              className="bg-white/5 border-white/10 flex-1"
            />
            <Button
              className="bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold px-4"
              onClick={() => sendMessage()}
              disabled={loading}
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
                className="text-left text-[13px] p-3 rounded-lg border border-white/10 bg-transparent hover:bg-white/5 text-muted-foreground transition-colors"
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
                <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{
                  background: `${getRiskColor(risk.level)}20`,
                  color: getRiskColor(risk.level),
                }}>
                  {risk.level} RISK
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mb-2">{risk.description}</p>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{
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
