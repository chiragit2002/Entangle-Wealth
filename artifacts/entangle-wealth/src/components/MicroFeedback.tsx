import { useState } from "react";
import { ThumbsUp, ThumbsDown, X, Send } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

interface MicroFeedbackProps {
  context: string;
  label?: string;
  className?: string;
}

let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return sessionId;
}

export function MicroFeedback({ context, label = "Was this helpful?", className = "" }: MicroFeedbackProps) {
  const [state, setState] = useState<"idle" | "comment" | "done">("idle");
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVote = (value: boolean) => {
    setHelpful(value);
    setState("comment");
  };

  const handleSubmit = async (withComment = true) => {
    if (helpful === null) return;
    setSubmitting(true);
    try {
      await fetch("/api/micro-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          helpful,
          comment: withComment ? comment.trim() || undefined : undefined,
          sessionId: getSessionId(),
        }),
      });
      trackEvent("micro_feedback_submitted", { context, helpful });
    } catch {
      // non-blocking
    } finally {
      setSubmitting(false);
      setState("done");
    }
  };

  const handleDismiss = () => {
    setState("done");
  };

  if (state === "done") {
    return (
      <div className={`flex items-center gap-2 text-xs text-muted-foreground/50 ${className}`}>
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  if (state === "comment") {
    return (
      <div
        className={`rounded-xl border p-4 ${className}`}
        style={{ background: "hsl(var(--muted) / 0.3)", borderColor: "hsl(var(--border))" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            {helpful ? (
              <ThumbsUp className="w-4 h-4 text-[#00B4D8]" />
            ) : (
              <ThumbsDown className="w-4 h-4 text-[#ff3366]" />
            )}
            <span>{helpful ? "Glad it helped!" : "Sorry to hear that."} Any details?</span>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          placeholder="Optional: tell us more..."
          rows={2}
          className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-white/30 resize-none focus:outline-none focus:border-border mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.3)", color: "#00B4D8" }}
          >
            <Send className="w-3 h-3" />
            {submitting ? "Sending..." : "Submit"}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        onClick={() => handleVote(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-[#00B4D8] hover:bg-[#00B4D8]/10 border border-border hover:border-[#00B4D8]/30 transition-all"
        aria-label="Helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        Yes
      </button>
      <button
        onClick={() => handleVote(false)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-[#ff3366] hover:bg-[#ff3366]/10 border border-border hover:border-[#ff3366]/30 transition-all"
        aria-label="Not helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        No
      </button>
    </div>
  );
}
