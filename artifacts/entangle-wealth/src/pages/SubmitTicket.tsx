import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

const CATEGORIES = [
  { value: "general", label: "General Question" },
  { value: "trading", label: "Trading & Analysis" },
  { value: "taxflow", label: "TaxFlow & Tax Tools" },
  { value: "billing", label: "Billing & Subscription" },
  { value: "account", label: "Account & Profile" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
];

export default function SubmitTicket() {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticketId: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Please fill in subject and description." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch("/support/tickets", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), category, description: description.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted({ ticketId: data.ticketId });
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit ticket" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
          <CheckCircle2 className="w-16 h-16 text-[#00ff88] mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Ticket Submitted</h1>
          <p className="text-white/40 mb-2">Your ticket ID is <span className="text-[#00D4FF] font-mono font-bold">#{submitted.ticketId}</span></p>
          <p className="text-white/30 text-sm mb-8">We'll review your request and get back to you within 1–2 business days.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate("/help")} className="px-5 py-2 text-sm font-semibold bg-white/[0.06] border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-white/60">
              Back to Help
            </button>
            <button onClick={() => { setSubmitted(null); setSubject(""); setDescription(""); }} className="px-5 py-2 text-sm font-semibold bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl hover:bg-[#00D4FF]/20 transition-colors text-[#00D4FF]">
              Submit Another
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Link href="/help" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-[#00D4FF] transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Help Center
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Submit a <span className="electric-text">Support Ticket</span>
        </h1>
        <p className="text-white/40 text-sm mb-8">Describe your issue or question and we'll get back to you promptly.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              maxLength={200}
              className="w-full h-11 px-4 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-4 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00D4FF]/40 transition-colors appearance-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-black text-white">{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your issue in detail. Include steps to reproduce if applicable."
              rows={6}
              maxLength={5000}
              className="w-full px-4 py-3 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/40 transition-colors resize-none"
            />
            <p className="text-[10px] text-white/15 mt-1 text-right">{description.length}/5000</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold bg-[#00D4FF] text-black rounded-xl hover:bg-[#00D4FF]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : <>Submit Ticket <Send className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </Layout>
  );
}
