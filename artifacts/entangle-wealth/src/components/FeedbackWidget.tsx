import { useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { MessageSquarePlus, X, Star, Send, Check } from "lucide-react";
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

export function FeedbackWidget() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOpen = useCallback(() => {
    setOpen(true);
    trackEvent("feedback_widget_opened");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (!submitted) {
      setRating(5);
      setHoverRating(0);
      setComment("");
      setCategory("general");
    }
  }, [submitted]);

  const handleSubmit = useCallback(async () => {
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

  if (!isSignedIn) return null;

  const effectiveRating = hoverRating || rating;

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2.5 rounded-full text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 md:bottom-8"
        style={{
          background: "linear-gradient(135deg, #00B4D8, #0099cc)",
          color: "#000",
          boxShadow: "0 4px 20px rgba(0,180,216,0.4)",
        }}
        aria-label="Give feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/60 " />
          <div
            className="relative w-full max-w-sm rounded-sm p-6 shadow-2xl"
            style={{
              background: "rgba(10,10,20,0.98)",
              border: "1px solid rgba(0,180,216,0.2)",
              boxShadow: "0 0 60px rgba(0,180,216,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-[#00B4D8]" />
                Quick Feedback
              </h3>
              <button onClick={handleClose} className="text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                  <p className="text-xs text-white/60 mb-2 uppercase tracking-wider">How would you rate your experience?</p>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            s <= effectiveRating ? "text-[#FFB800] fill-[#FFB800]" : "text-white/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs text-white/40 mt-1">
                    {effectiveRating === 1 ? "Poor" : effectiveRating === 2 ? "Fair" : effectiveRating === 3 ? "Good" : effectiveRating === 4 ? "Very Good" : "Excellent"}
                  </p>
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
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                  <p className="text-right text-[10px] text-white/30">{comment.length}/500</p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #00B4D8, #0099cc)",
                    color: "#000",
                  }}
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
