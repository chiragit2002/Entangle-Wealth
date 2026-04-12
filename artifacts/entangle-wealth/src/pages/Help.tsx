import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Search, ChevronDown, ChevronUp, HelpCircle, BookOpen, TrendingUp, Calculator, CreditCard, UserCog, Wrench, MessageSquarePlus } from "lucide-react";
import { FAQ_DATA, FAQ_CATEGORIES, type FaqCategory } from "@/lib/faq-data";

const CATEGORY_ICONS: Record<FaqCategory, typeof HelpCircle> = {
  "getting-started": BookOpen,
  trading: TrendingUp,
  taxflow: Calculator,
  billing: CreditCard,
  account: UserCog,
  technical: Wrench,
};

export default function Help() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FaqCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let items = FAQ_DATA;
    if (activeCategory !== "all") {
      items = items.filter((f) => f.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    return items;
  }, [search, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of FAQ_CATEGORIES) {
      counts[cat.key] = FAQ_DATA.filter((f) => f.category === cat.key).length;
    }
    return counts;
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Help <span className="electric-text">Center</span>
          </h1>
          <p className="text-white/40 max-w-lg mx-auto">
            Find answers to common questions or submit a support ticket for
            personalized assistance.
          </p>
        </div>

        <div className="relative mb-8 max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for help..."
            className="w-full h-12 pl-12 pr-4 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/40 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              activeCategory === "all"
                ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30"
                : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06]"
            }`}
          >
            All ({FAQ_DATA.length})
          </button>
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key];
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                  activeCategory === cat.key
                    ? "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30"
                    : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label} ({categoryCounts[cat.key]})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/50 font-semibold mb-1">No results found</p>
            <p className="text-white/25 text-sm max-w-xs mx-auto leading-relaxed">
              Try a different search term or category, or scroll down to{" "}
              <Link
                href="/help#submit-ticket"
                className="text-[#00D4FF] hover:underline"
              >
                submit a support ticket
              </Link>{" "}
              and we'll get back to you.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((faq) => {
              const isOpen = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border rounded-xl overflow-hidden transition-colors ${
                    isOpen
                      ? "border-[#00D4FF]/20 bg-[#00D4FF]/[0.02]"
                      : "border-white/[0.06] bg-white/[0.01] hover:border-white/10"
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider shrink-0 w-20">
                        {
                          FAQ_CATEGORIES.find((c) => c.key === faq.category)
                            ?.label
                        }
                      </span>
                      <span className="text-sm font-medium text-white/80 truncate">
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#00D4FF] shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/20 shrink-0 ml-2" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-0">
                      <div className="pl-[92px]">
                        <p className="text-sm text-white/50 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          id="submit-ticket"
          className="mt-16 text-center bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8"
        >
          <MessageSquarePlus className="w-10 h-10 text-[#00D4FF] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Still need help?
          </h2>
          <p className="text-white/40 text-sm mb-6 max-w-md mx-auto">
            Can't find what you're looking for? Submit a support ticket and our
            team will get back to you within 1–2 business days.
          </p>
          <Link href="/submit-ticket">
            <button className="px-6 py-2.5 text-sm font-semibold bg-[#00D4FF] text-black rounded-xl hover:bg-[#00D4FF]/90 transition-colors">
              Submit a Ticket
            </button>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/status"
            className="text-xs text-white/20 hover:text-[#00D4FF] transition-colors"
          >
            Check system status
          </Link>
        </div>
      </div>
    </Layout>
  );
}
