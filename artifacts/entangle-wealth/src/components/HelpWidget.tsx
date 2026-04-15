import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import { HelpCircle, X, Search, MessageSquarePlus, ExternalLink, ChevronRight, Star, Send, Check } from "lucide-react";
import { FAQ_DATA } from "@/lib/faq-data";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "performance", label: "Performance" },
  { value: "ui", label: "UI/UX" },
  { value: "content", label: "Content" },
  { value: "support", label: "Support" },
];

type Panel = "main" | "feedback";

export function HelpWidget() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const [search, setSearch] = useState("");

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return FAQ_DATA.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [search]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setPanel("main");
    setSearch("");
    if (!submitted) {
      setRating(5);
      setHoverRating(0);
      setComment("");
      setCategory("general");
    }
  }, [submitted]);

  const handleSubmitFeedback = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await authFetch("/feedback", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined, category }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      trackEvent("feedback_submitted", { rating, category });
      setTimeout(() => {
        setOpen(false);
        setPanel("main");
        setSubmitted(false);
        setRating(5);
        setHoverRating(0);
        setComment("");
        setCategory("general");
      }, 2000);
    } catch {
      toast({ title: "Error", description: "Failed to submit feedback. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [rating, comment, category, getToken, toast]);

  const effectiveRating = hoverRating || rating;

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[90] w-80 max-h-[80vh] bg-[#0a0a14] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              {panel === "feedback" ? (
                <button onClick={() => setPanel("main")} className="text-white/50 hover:text-white/80 transition-colors text-xs mr-1">←</button>
              ) : null}
              <HelpCircle className="w-4 h-4 text-[#00B4D8]" />
              <span className="text-sm font-bold text-white">{panel === "feedback" ? "Feedback" : "Support"}</span>
            </div>
            <button onClick={handleClose} className="text-white/50 hover:text-white/50 transition-colors" aria-label="Close support">
              <X className="w-4 h-4" />
            </button>
          </div>

          {panel === "main" && (
            <>
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search FAQ..."
                    className="w-full h-9 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/40 transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
                {search.trim() && results.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-6">No results found</p>
                ) : search.trim() ? (
                  <div className="space-y-1.5">
                    {results.map((faq) => (
                      <Link
                        key={faq.id}
                        href="/help"
                        onClick={handleClose}
                        className="block px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                      >
                        <p className="text-xs font-medium text-white/70 group-hover:text-white/90 leading-snug">{faq.question}</p>
                        <p className="text-[10px] text-white/25 mt-0.5 line-clamp-2">{faq.answer}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Link href="/help" onClick={handleClose} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5 text-[#00B4D8]" />
                        <span className="text-xs font-medium text-white/60 group-hover:text-white/80">Help Center</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    </Link>
                    <Link href="/submit-ticket" onClick={handleClose} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                      <div className="flex items-center gap-2">
                        <MessageSquarePlus className="w-3.5 h-3.5 text-[#FFD700]" />
                        <span className="text-xs font-medium text-white/60 group-hover:text-white/80">Submit a Ticket</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    </Link>
                    <Link href="/status" onClick={handleClose} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B4D8] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B4D8]" />
                        </span>
                        <span className="text-xs font-medium text-white/60 group-hover:text-white/80">System Status</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    </Link>
                    {isSignedIn && (
                      <button onClick={() => { setPanel("feedback"); trackEvent("feedback_widget_opened"); }} className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                        <div className="flex items-center gap-2">
                          <Star className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span className="text-xs font-medium text-white/60 group-hover:text-white/80">Leave Feedback</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {panel === "feedback" && (
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
              {submitted ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-[#00B4D8]/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-[#00B4D8]" />
                  </div>
                  <p className="text-white font-semibold">Thank you!</p>
                  <p className="text-white/50 text-sm mt-1">Your feedback helps us improve.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider">Rating</p>
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onClick={() => setRating(s)}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-125"
                        >
                          <Star className={`w-7 h-7 transition-colors ${s <= effectiveRating ? "text-[#FFD700] fill-[#FFD700]" : "text-white/40"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider">Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setCategory(cat.value)}
                          className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: category === cat.value ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${category === cat.value ? "rgba(0,180,216,0.5)" : "rgba(255,255,255,0.08)"}`,
                            color: category === cat.value ? "#00B4D8" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-white/60 mb-2 uppercase tracking-wider">Comment (optional)</p>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 500))}
                      placeholder="Tell us more..."
                      rows={3}
                      className="w-full rounded-lg p-3 text-sm text-white resize-none focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <p className="text-right text-[10px] text-white/30">{comment.length}/500</p>
                  </div>

                  <button
                    onClick={handleSubmitFeedback}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #00B4D8, #FF6600)", color: "#000" }}
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[89] w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
          open
            ? "bg-white/10 border border-white/20 scale-0 opacity-0"
            : "bg-[#00B4D8] hover:bg-[#00B4D8]/90 shadow-[0_0_30px_rgba(0,180,216,0.3)] scale-100 opacity-100"
        }`}
        aria-label="Open support"
      >
        <HelpCircle className="w-5 h-5 text-black" />
      </button>
    </>
  );
}
