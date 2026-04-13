import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { authFetch } from "@/lib/authFetch";
import {
  Brain, Send, RefreshCw, Zap, Star, Target, TrendingUp,
  Sparkles, Calendar, Trophy, CheckCircle,
  ChevronUp, Info, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface WeeklySummary {
  summary: string;
  topWins: string[];
  suggestedActions: string[];
  weekStart: string;
}

interface NudgeData {
  nudge: string;
  context: {
    level: number;
    weeklyXp: number;
    habitsToday: number;
  };
}

const SUGGESTED_PROMPTS = [
  "What financial habit should I focus on this week?",
  "How can I improve my savings rate?",
  "What's the best way to start investing with my income?",
  "Help me create a debt payoff strategy.",
  "What does my current XP level say about my financial engagement?",
  "How can I maximize my emergency fund?",
];

export default function AICoach() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [nudge, setNudge] = useState<NudgeData | null>(null);
  const [nudgeError, setNudgeError] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loadingNudge, setLoadingNudge] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchNudge = useCallback(async () => {
    if (!isSignedIn) return;
    setLoadingNudge(true);
    setNudgeError(false);
    try {
      const res = await authFetch("/coaching/nudge", getToken, {});
      if (!res.ok) {
        setNudgeError(true);
        return;
      }
      const data = await res.json();
      setNudge(data);
    } catch {
      setNudgeError(true);
    } finally {
      setLoadingNudge(false);
    }
  }, [getToken, isSignedIn]);

  const fetchWeeklySummary = useCallback(async () => {
    if (!isSignedIn) return;
    setLoadingSummary(true);
    try {
      const res = await authFetch("/coaching/weekly-summary", getToken, {});
      const data = await res.json();
      setWeeklySummary(data);
      setShowSummary(true);
    } catch {
      toast({ title: "Error", description: "Failed to generate weekly summary.", variant: "destructive" });
    } finally {
      setLoadingSummary(false);
    }
  }, [getToken, isSignedIn, toast]);

  useEffect(() => {
    if (isSignedIn) {
      fetchNudge();

      const greeting: ChatMessage = {
        id: "greeting",
        role: "assistant",
        content: "Hello! I'm your EntangleWealth Behavioral Finance Coach. I'm here to help you build lasting financial habits, interpret your simulation results, and guide you toward your financial goals. What's on your mind today?",
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [isSignedIn, fetchNudge]);

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || sending) return;

    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Sign in to chat with your AI coach." });
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await authFetch("/coaching/chat", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response || "I'm here to help with your financial journey!",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      toast({ title: "Error", description: "Failed to get coaching response.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }, [input, sending, isSignedIn, getToken, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a14] text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-purple-500/20 border border-[#00D4FF]/30 flex items-center justify-center">
                <Brain className="w-6 h-6 text-[#00D4FF]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Financial Coach</h1>
                <p className="text-white/50 text-xs">Personalized behavioral finance guidance</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchWeeklySummary}
                disabled={!isSignedIn || loadingSummary}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/[0.10] transition-all disabled:opacity-40"
              >
                {loadingSummary ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Weekly Summary
              </button>
            </div>
          </div>

          {loadingNudge ? (
            <div className="border border-white/10 rounded-xl p-4 animate-pulse h-16 bg-white/[0.02]" aria-label="Loading daily nudge" />
          ) : nudgeError ? (
            <div className="border border-white/10 rounded-xl p-3 flex items-center gap-2 text-xs text-white/30">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Daily nudge unavailable — couldn't reach the server.</span>
              <button onClick={fetchNudge} className="ml-auto text-primary/60 hover:text-primary shrink-0">Retry</button>
            </div>
          ) : nudge ? (
            <div className="border border-[#00D4FF]/20 bg-[#00D4FF]/5 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#00D4FF] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-[#00D4FF] font-semibold mb-1">Daily Nudge</p>
                <p className="text-sm text-white/80">{nudge.nudge}</p>
                {nudge.context && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />Level {nudge.context.level}</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{nudge.context.weeklyXp} XP this week</span>
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{nudge.context.habitsToday} habits today</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {showSummary && weeklySummary && (
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-amber-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white text-sm">Weekly Coaching Summary</span>
                </div>
                <button onClick={() => setShowSummary(false)} className="text-white/50 hover:text-white transition-colors">
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-white/70 text-sm">{weeklySummary.summary}</p>

                {Array.isArray(weeklySummary.topWins) && weeklySummary.topWins.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1">
                      <Star className="w-3 h-3" /> Top Wins This Week
                    </p>
                    <ul className="space-y-1.5">
                      {weeklySummary.topWins.map((win, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          {win}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(weeklySummary.suggestedActions) && weeklySummary.suggestedActions.length > 0 && (
                  <div>
                    <p className="text-xs text-[#00D4FF] font-semibold mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Next Week's Focus
                    </p>
                    <ul className="space-y-1.5">
                      {weeklySummary.suggestedActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <TrendingUp className="w-4 h-4 text-[#00D4FF] mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden flex flex-col" style={{ height: "500px" }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isSignedIn && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                  <Brain className="w-12 h-12 text-[#00D4FF]/50" />
                  <p className="text-white/50 text-sm">Sign in to chat with your personalized AI coach</p>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${
                      msg.role === "assistant"
                        ? "bg-gradient-to-br from-[#00D4FF]/20 to-purple-500/20 border border-[#00D4FF]/30"
                        : "bg-white/10"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Brain className="w-4 h-4 text-[#00D4FF]" />
                    ) : (
                      <span className="text-white/60 text-xs">You</span>
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-white/[0.06] text-white/80 border border-white/[0.08] rounded-tl-sm"
                        : "bg-[#00D4FF]/15 text-white border border-[#00D4FF]/20 rounded-tr-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-purple-500/20 border border-[#00D4FF]/30 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-[#00D4FF]" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/60 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {messages.length > 0 && messages.length < 4 && (
              <div className="px-4 py-2 border-t border-white/[0.06] flex gap-2 flex-wrap">
                {SUGGESTED_PROMPTS.slice(0, 3).map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 border-t border-white/[0.08]">
              <div className="flex gap-3 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isSignedIn ? "Ask your coach anything..." : "Sign in to chat with your AI coach"}
                  disabled={!isSignedIn || sending}
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[#00D4FF]/40 transition-colors disabled:opacity-40"
                  rows={1}
                  style={{ minHeight: "44px", maxHeight: "120px" }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!isSignedIn || !input.trim() || sending}
                  className="w-11 h-11 rounded-xl bg-[#00D4FF] text-black flex items-center justify-center hover:bg-[#00D4FF]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-white/50 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Educational guidance only, not financial advice. Press Enter to send.
              </p>
            </div>
          </div>

          {messages.length === 0 && isSignedIn && (
            <div>
              <p className="text-xs text-white/50 mb-3">Try asking:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left text-sm px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
