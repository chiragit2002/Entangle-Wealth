import { useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";

export function TestimonialForm() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Name and message are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/viral/testimonials", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role: role.trim(), message: message.trim(), rating }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      toast({ title: "Submitted", description: "Your testimonial will be reviewed and published soon." });
    } catch {
      toast({ title: "Error", description: "Failed to submit testimonial.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [name, role, message, rating, getToken, toast]);

  if (!isSignedIn) return null;

  if (submitted) {
    return (
      <div className="glass-panel rounded-xl p-5 text-center">
        <p className="text-primary font-semibold">Thank you for your testimonial!</p>
        <p className="text-xs text-muted-foreground mt-1">It will be reviewed and published shortly.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-5">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
        <Star className="w-5 h-5 text-[#FFD700]" /> Share Your Experience
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            maxLength={100}
            className="bg-white/5 border-white/10"
          />
          <Input
            placeholder="Your role (optional)"
            value={role}
            onChange={(e) => setRole(e.target.value.slice(0, 100))}
            maxLength={100}
            className="bg-white/5 border-white/10"
          />
        </div>
        <textarea
          placeholder="Tell us about your experience with EntangleWealth..."
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-primary/50 placeholder:text-[#444]"
        />
        <p className="text-[10px] text-[#444] text-right">{message.length}/500</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Rating:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setRating(s)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-5 h-5 ${s <= rating ? "text-[#FFD700] fill-[#FFD700]" : "text-white/20"}`}
                />
              </button>
            ))}
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold"
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Send className="w-4 h-4 mr-1" />
          {submitting ? "Submitting..." : "Submit Testimonial"}
        </Button>
      </div>
    </div>
  );
}
