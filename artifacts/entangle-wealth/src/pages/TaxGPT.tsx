import { useState, useRef, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { MessageCircle, Send, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import type { ChatMessage, UserProfile } from "@/lib/taxflow-types";
import { ENTITY_SHORT_LABELS } from "@/lib/taxflow-types";
import { getActiveProfile, getChatHistory, saveChatHistory } from "@/lib/taxflow-profile";
import { trackEvent } from "@/lib/trackEvent";
import { UpgradePrompt, useUpgradePrompt } from "@/components/UpgradePrompt";

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

function getEntityChips(profile: UserProfile | null): { emoji: string; text: string }[] {
  if (!profile) return DEFAULT_CHIPS;
  const base = [
    { emoji: "🔍", text: "What deductions am I probably missing?" },
    { emoji: "📋", text: "Review my tax situation" },
    { emoji: "💰", text: "How much can I save with TaxFlow strategies?" },
  ];
  switch (profile.entityType) {
    case "contractor":
    case "sole_prop":
      return [...base,
        { emoji: "📊", text: "Do I qualify for the QBI deduction?" },
        { emoji: "🏠", text: "Home office deduction rules?" },
        { emoji: "🚗", text: "How to document vehicle mileage?" },
        { emoji: "💼", text: "SEP-IRA vs Solo 401(k) — which is better?" },
        { emoji: "🏦", text: "Best order to fund retirement accounts?" },
      ];
    case "llc":
    case "multi_llc":
      return [...base,
        { emoji: "🏢", text: "Should I elect S-Corp status for my LLC?" },
        { emoji: "🏠", text: "What is the Augusta Rule?" },
        { emoji: "👨‍👧", text: "Can I hire my children in my business?" },
        { emoji: "📊", text: "How does the QBI deduction work for LLCs?" },
        { emoji: "💼", text: "How to set up an Accountable Plan?" },
      ];
    case "scorp":
      return [...base,
        { emoji: "💵", text: "What is reasonable compensation for S-Corp?" },
        { emoji: "📋", text: "S-Corp Accountable Plan for expenses?" },
        { emoji: "💼", text: "Best retirement strategy as S-Corp owner?" },
        { emoji: "🏠", text: "Augusta Rule for S-Corp meetings?" },
        { emoji: "📊", text: "How does QBI work with S-Corp income?" },
      ];
    case "ccorp":
      return [...base,
        { emoji: "📊", text: "C-Corp 21% flat rate vs pass-through?" },
        { emoji: "🎁", text: "What fringe benefits can my C-Corp offer?" },
        { emoji: "🚀", text: "Do I qualify for QSBS exclusion?" },
        { emoji: "💼", text: "Defined Benefit Plan for C-Corp owners?" },
        { emoji: "⚠️", text: "How to avoid Accumulated Earnings Tax?" },
      ];
    default:
      return DEFAULT_CHIPS;
  }
}

const DEFAULT_CHIPS = [
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
  "meals": "Per IRS Publication 463, business meals are 50% deductible if:\n\n1. The meal is not lavish or extravagant\n2. You or your employee is present\n3. The meal has a clear business purpose\n\nYou MUST document: date, place, amount, business purpose, and who attended.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.",
  "home office": "Per IRS Publication 587, you can deduct home office expenses if the space is used:\n\n1. Regularly (not occasionally)\n2. Exclusively for business (no personal use)\n\nTwo methods:\n• Simplified: $5 per sq ft, max 300 sq ft = $1,500\n• Regular: Actual expenses x business use percentage\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.",
  "vehicle": "Per IRS Publication 463, you can deduct vehicle expenses using:\n\n1. Standard mileage rate: 70 cents/mile (2026)\n2. Actual expenses: gas, insurance, repairs, depreciation x business use %\n\nYou MUST keep a contemporaneous mileage log.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.",
  "default": "That's a great question! Based on IRS publications, this topic involves several factors specific to your situation. I'd recommend:\n\n1. Reviewing the relevant IRS publication\n2. Keeping detailed documentation\n3. Consulting with a licensed CPA\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.",
};

function getLocalResponse(q: string): string {
  const lower = q.toLowerCase();
  if (lower.includes("meal") || lower.includes("food")) return MOCK_ANSWERS["meals"];
  if (lower.includes("home") || lower.includes("office")) return MOCK_ANSWERS["home office"];
  if (lower.includes("vehicle") || lower.includes("mileage") || lower.includes("car")) return MOCK_ANSWERS["vehicle"];
  return MOCK_ANSWERS["default"];
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60_000;

export default function TaxGPT() {
  const [, setLocation] = useLocation();
  const { promptConfig, showUpgradePrompt, closePrompt } = useUpgradePrompt();
  const profile = getActiveProfile();
  const profileId = profile?.id || "default";

  useEffect(() => { trackEvent("taxflow_scan"); }, []);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = getChatHistory(profileId);
    if (saved.length > 0) return saved;
    return [{ role: "ai" as const, text: `Hello! I'm TaxGPT, your tax intelligence assistant.${profile ? ` I see you're a ${ENTITY_SHORT_LABELS[profile.entityType]} with ${profile.businessName ? `${profile.businessName} in ` : ""}${profile.industry || "your business"}.` : ""} Ask me about deductions, strategies, audit risks, or IRS rules.\n\n**⚠️ Disclaimer:** This is educational information only — not professional tax advice. Consult a licensed CPA for your specific situation.`, timestamp: Date.now() }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rateLimitRef = useRef<number[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setInput(q);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length > 1) saveChatHistory(profileId, messages);
  }, [messages, profileId]);

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
      setMessages(prev => [...prev, { role: "ai", text: "You're sending questions too quickly. Please wait a moment.", timestamp: Date.now() }]);
      return;
    }
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: question, timestamp: Date.now() }]);
    setLoading(true);

    try {
      const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const body: any = { question };
      if (profile) {
        body.profileContext = {
          entityType: ENTITY_SHORT_LABELS[profile.entityType],
          businessName: profile.businessName,
          industry: profile.industry,
          grossRevenue: profile.grossRevenue,
          state: profile.homeState,
          hasHomeOffice: profile.hasHomeOffice,
          usesVehicle: profile.usesVehicle,
        };
      }
      const res = await fetch(`${baseUrl}/api/taxgpt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.answer + (data.answer.includes("Disclaimer") ? "" : "\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice. Consult a licensed CPA for your specific situation.");
        setMessages(prev => [...prev, { role: "ai", text: answer, timestamp: Date.now(), source: "ai" as const }]);
      } else if (res.status === 429) {
        setMessages(prev => [...prev, { role: "ai", text: "You've reached the TaxGPT rate limit. Upgrade to Pro for unlimited queries.\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.", timestamp: Date.now(), source: "ai" as const }]);
        showUpgradePrompt({
          limitType: "taxgpt",
          limitLabel: "TaxGPT queries",
          unlocks: [
            "Unlimited TaxGPT queries",
            "Advanced tax profile context",
            "Full AI agent suite",
            "Unlimited signals & indicators",
          ],
        });
      } else {
        const fallback = getLocalResponse(question);
        setMessages(prev => [...prev, { role: "ai", text: fallback, timestamp: Date.now(), source: "cached" as const }]);
      }
    } catch {
      const fallback = getLocalResponse(question);
      setMessages(prev => [...prev, { role: "ai", text: fallback, timestamp: Date.now(), source: "cached" as const }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    const initial: ChatMessage[] = [{ role: "ai", text: "Chat cleared. How can I help you with your tax questions?\n\n**⚠️ Disclaimer:** This is educational information only, not professional tax advice.", timestamp: Date.now() }];
    setMessages(initial);
    saveChatHistory(profileId, initial);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH": return "#ff4757";
      case "MEDIUM": return "#ffb800";
      default: return "#00e676";
    }
  };

  const chips = getEntityChips(profile);

  return (
    <Layout>
      {promptConfig && <UpgradePrompt config={promptConfig} onClose={closePrompt} />}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9c27b0] to-[#6a1b9a] flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">TaxGPT</h1>
            <p className="text-[12px] text-muted-foreground">IRS Knowledge Engine{profile ? ` · ${ENTITY_SHORT_LABELS[profile.entityType]}` : ""}</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearChat} className="border-white/10 text-white/40 gap-1 text-[11px]">
            <Trash2 className="w-3 h-3" /> Clear
          </Button>
        </div>

        <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(156,39,176,0.2)] bg-[rgba(156,39,176,0.03)]">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            TaxGPT answers based on IRS publications and tax code. This is educational information only — not professional tax advice. Consult a licensed CPA for your specific situation.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 mb-6">
          <div ref={scrollRef} className="max-h-[400px] overflow-y-auto space-y-3 mb-4 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={`rounded-xl p-3 text-[14px] leading-relaxed max-w-[90%] whitespace-pre-line ${
                msg.role === "user"
                  ? "ml-auto bg-[rgba(0,200,248,0.1)] border border-[rgba(0,200,248,0.15)] text-right"
                  : msg.source === "cached"
                  ? "bg-[rgba(255,183,0,0.04)] border border-[rgba(255,183,0,0.2)]"
                  : "bg-[rgba(156,39,176,0.06)] border border-[rgba(156,39,176,0.15)]"
              }`}>
                {msg.source === "cached" && (
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[rgba(255,183,0,0.15)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ffb800]" />
                    <span className="text-[10px] font-bold text-[#ffb800] uppercase tracking-wider">Cached Response · AI Unavailable</span>
                  </div>
                )}
                {msg.source === "ai" && msg.role === "ai" && (
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[rgba(156,39,176,0.15)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e676] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e676]" />
                    </span>
                    <span className="text-[10px] font-bold text-[#00e676] uppercase tracking-wider">AI Response</span>
                  </div>
                )}
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-[rgba(156,39,176,0.06)] border border-[rgba(156,39,176,0.15)] rounded-xl p-3 max-w-[90%] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#9c27b0]" />
                <span className="text-[14px] text-muted-foreground">Researching IRS publications...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ask about any deduction or strategy..."
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 1000))}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              maxLength={1000}
              className="bg-white/5 border-white/10 flex-1"
            />
            <Button
              className="bg-gradient-to-r from-[#9c27b0] to-[#6a1b9a] text-white font-bold px-4 min-h-[44px] min-w-[44px]"
              onClick={() => sendMessage()}
              disabled={loading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
          <MessageCircle className="w-5 h-5 text-[#9c27b0]" />
          <h2 className="text-lg font-semibold">Quick Questions{profile ? ` for ${ENTITY_SHORT_LABELS[profile.entityType]}` : ""}</h2>
        </div>
        <div className="glass-panel rounded-xl p-4 mb-6">
          <div className="flex flex-col gap-2">
            {chips.map((q, i) => (
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
          <AlertTriangle className="w-5 h-5 text-[#ff4757]" />
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
                <div className="h-full rounded-full" style={{ width: `${risk.pct}%`, backgroundColor: getRiskColor(risk.level) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
