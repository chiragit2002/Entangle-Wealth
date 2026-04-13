import { useState, useMemo } from "react";
import { Link } from "wouter";
import { HelpCircle, X, Search, MessageSquarePlus, ExternalLink, ChevronRight } from "lucide-react";
import { FAQ_DATA } from "@/lib/faq-data";

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return FAQ_DATA.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [search]);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[90] w-80 max-h-[70vh] bg-[#0a0a14] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-bold text-white">Help</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white/50 transition-colors" aria-label="Close help">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FAQ..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-[#00D4FF]/40 transition-colors"
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
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                  >
                    <p className="text-xs font-medium text-white/70 group-hover:text-white/90 leading-snug">{faq.question}</p>
                    <p className="text-[10px] text-white/25 mt-0.5 line-clamp-2">{faq.answer}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Link href="/help" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-[#00D4FF]" />
                    <span className="text-xs font-medium text-white/60 group-hover:text-white/80">Help Center</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </Link>
                <Link href="/submit-ticket" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span className="text-xs font-medium text-white/60 group-hover:text-white/80">Submit a Ticket</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </Link>
                <Link href="/status" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
                    </span>
                    <span className="text-xs font-medium text-white/60 group-hover:text-white/80">System Status</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[89] w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
          open
            ? "bg-white/10 border border-white/20 scale-0 opacity-0"
            : "bg-[#00D4FF] hover:bg-[#00D4FF]/90 shadow-[0_0_30px_rgba(0,212,255,0.3)] scale-100 opacity-100"
        }`}
        aria-label="Open help"
      >
        <HelpCircle className="w-5 h-5 text-black" />
      </button>
    </>
  );
}
