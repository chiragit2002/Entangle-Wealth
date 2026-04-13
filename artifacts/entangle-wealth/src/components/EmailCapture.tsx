import { useState } from "react";
import { Mail, Check, Zap } from "lucide-react";
import { fetchWithRetry } from "@/lib/api";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

type Preference = "tips" | "updates";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [preference, setPreference] = useState<Preference>("tips");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetchWithRetry(`${API_BASE}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), preference }),
      });

      const data = await res.json();

      if (res.ok || res.status === 200) {
        setStatus("success");
        setMessage(data.message || "You're in.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <section className="py-12 lg:py-16 border-t border-white/[0.06]">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="relative bg-[#0d0d1a] border border-[rgba(0,212,255,0.15)] rounded-2xl p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,212,255,0.03)] to-transparent rounded-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-[11px] font-mono text-[#00D4FF] uppercase tracking-widest">
                Financial Clarity Updates
              </span>
            </div>

            {status === "success" ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00e676]/10 border border-[#00e676]/20 mb-4">
                  <Check className="w-6 h-6 text-[#00e676]" />
                </div>
                <p className="text-white font-semibold text-lg mb-1">You're subscribed.</p>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-2">
                  Stay ahead of the noise
                </h3>
                <p className="text-muted-foreground text-sm text-center mb-6 max-w-lg mx-auto">
                  No spam. No daily emails. Just useful financial thinking, delivered a few times a month.
                </p>

                <div className="flex gap-3 justify-center mb-6">
                  <button
                    type="button"
                    onClick={() => setPreference("tips")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      preference === "tips"
                        ? "border-[#00D4FF] bg-[#00D4FF]/10 text-[#00D4FF]"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Financial thinking tips
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreference("updates")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                      preference === "updates"
                        ? "border-[#00D4FF] bg-[#00D4FF]/10 text-[#00D4FF]"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Product updates
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={status === "loading"}
                    className="flex-1 bg-[#020204] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40 transition-colors font-mono disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading" || !email.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#00D4FF] to-[#0099cc] text-black font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {status === "loading" ? "Subscribing..." : "Subscribe →"}
                  </button>
                </form>

                {status === "error" && message && (
                  <p className="text-[#ff4466] text-xs mt-3 text-center font-mono">{message}</p>
                )}

                <p className="text-[10px] text-muted-foreground/50 text-center mt-4 font-mono">
                  Unsubscribe anytime with one click · No credit card · No spam
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
