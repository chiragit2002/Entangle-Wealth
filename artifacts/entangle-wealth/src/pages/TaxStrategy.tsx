import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb, Search, ChevronDown, ChevronUp, Shield, Plus, Check,
  MessageCircle, AlertTriangle, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile, TaxStrategy } from "@/lib/taxflow-types";
import { ENTITY_SHORT_LABELS } from "@/lib/taxflow-types";
import { ALL_STRATEGIES, getStrategiesForEntity, getStrategyCategories } from "@/lib/taxflow-strategies";
import { getActiveProfile, getPlanStrategies, savePlanStrategies, getTaxYear } from "@/lib/taxflow-profile";

function formatDollar(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const RISK_COLORS = { low: "#00e676", medium: "#ffb800", high: "#ff4757" };
const RISK_LABELS = { low: "LOW RISK", medium: "MEDIUM RISK", high: "HIGH RISK" };

const ENTITY_FILTERS = [
  { value: "all", label: "All" },
  { value: "contractor", label: "Contractor" },
  { value: "llc", label: "LLC" },
  { value: "scorp", label: "S-Corp" },
  { value: "ccorp", label: "C-Corp" },
];

export default function TaxStrategy() {
  const { toast } = useToast();
  const [profile] = useState<UserProfile | null>(getActiveProfile());
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [planIds, setPlanIds] = useState<string[]>(getPlanStrategies());
  const taxYear = getTaxYear();

  const categories = getStrategyCategories();

  const filtered = useMemo(() => {
    let result = ALL_STRATEGIES;
    if (entityFilter !== "all") {
      result = result.filter(s => s.entityTypes.includes(entityFilter as any));
    }
    if (categoryFilter !== "all") {
      result = result.filter(s => s.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.how.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entityFilter, categoryFilter, search]);

  const togglePlan = (id: string) => {
    const updated = planIds.includes(id)
      ? planIds.filter(x => x !== id)
      : [...planIds, id];
    setPlanIds(updated);
    savePlanStrategies(updated);
    const strat = ALL_STRATEGIES.find(s => s.id === id);
    if (strat) {
      toast({
        title: planIds.includes(id) ? "Removed from plan" : "Added to plan",
        description: strat.title,
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5C842] to-[#ff8f00] flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Tax Strategies</h1>
            <p className="text-[12px] text-muted-foreground">{filtered.length} legal strategies · {planIds.length} added to your plan</p>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-3 mb-6 border border-white/[0.06]">
          <p className="text-[11px] text-white/30 leading-relaxed">
            Based on IRS publications and tax code. Educational only — not professional tax advice. Consult a CPA.
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search strategies..."
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {ENTITY_FILTERS.map(f => (
            <button key={f.value} onClick={() => setEntityFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all min-h-[32px] ${
                entityFilter === f.value
                  ? "bg-[#00c8f8]/15 text-[#00c8f8] border border-[#00c8f8]/30"
                  : "text-white/40 hover:text-white/60 border border-transparent"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap ${
              categoryFilter === "all" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
            }`}>
            All Categories
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap ${
                categoryFilter === c ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}>
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          {filtered.map(strategy => {
            const isExpanded = expanded === strategy.id;
            const inPlan = planIds.includes(strategy.id);
            const riskColor = RISK_COLORS[strategy.risk];
            const estimated = strategy.estimator && profile ? strategy.estimator(profile) : null;

            return (
              <div key={strategy.id} className="glass-panel rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : strategy.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[15px] text-white">{strategy.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-[#00c8f8] font-mono">{strategy.code}</span>
                        <span className="text-[11px] text-white/30">·</span>
                        <span className="text-[11px] text-white/50">{strategy.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                        background: `${riskColor}20`,
                        color: riskColor,
                      }}>
                        {RISK_LABELS[strategy.risk]}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </div>
                  </div>
                  <p className="text-[12px] text-white/50">{strategy.maxBenefit}</p>
                  {estimated !== null && estimated > 0 && (
                    <p className="text-[13px] font-mono font-bold text-[#00e676] mt-1">
                      Est. deduction: {formatDollar(Math.round(estimated))}
                    </p>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-4">
                    <div className="mb-3">
                      <p className="text-[11px] text-[#00c8f8] font-semibold mb-1 uppercase">How It Works</p>
                      <p className="text-[13px] text-white/70 whitespace-pre-line">{strategy.how}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-[11px] text-[#00c8f8] font-semibold mb-1 uppercase">Who's Eligible</p>
                      <p className="text-[13px] text-white/70">{strategy.eligible}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-[11px] text-[#00c8f8] font-semibold mb-1 uppercase">Required Documentation</p>
                      <ul className="space-y-1">
                        {strategy.documentation.map((doc, i) => (
                          <li key={i} className="text-[12px] text-white/60 flex items-start gap-2">
                            <span className="text-[#00c8f8] mt-0.5">•</span> {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-[12px] text-white/50">IRS Reference: {strategy.irsPub}</span>
                    </div>
                    {strategy.auditNote && (
                      <div className="mb-3 p-2 rounded-lg bg-[rgba(255,184,0,0.08)] border border-[rgba(255,184,0,0.15)]">
                        <p className="text-[12px] text-[#ffb800] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {strategy.auditNote}
                        </p>
                      </div>
                    )}
                    <div className="mb-3">
                      <p className="text-[11px] text-white/30 mb-1">Applicable Entity Types:</p>
                      <div className="flex gap-1 flex-wrap">
                        {strategy.entityTypes.map(e => (
                          <span key={e} className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-white/50">
                            {ENTITY_SHORT_LABELS[e]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); togglePlan(strategy.id); }}
                        className={`gap-1 text-[12px] min-h-[36px] ${
                          inPlan
                            ? "bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30 hover:bg-[#00e676]/25"
                            : "bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black font-bold"
                        }`}
                        variant={inPlan ? "outline" : "default"}
                      >
                        {inPlan ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {inPlan ? "In My Plan" : "Add to My Plan"}
                      </Button>
                      <Link href={`/taxgpt?q=${encodeURIComponent(`Tell me more about ${strategy.title} (${strategy.code})`)}`}>
                        <Button size="sm" variant="outline" className="border-[#9c27b0]/30 text-[#9c27b0] gap-1 text-[12px] min-h-[36px]">
                          <MessageCircle className="w-3 h-3" /> Ask TaxGPT
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 text-white/10" />
            <p className="text-sm font-medium text-white/40 mb-1">No strategies match those filters.</p>
            <p className="text-xs text-white/25">Try removing a filter, or search by keyword instead.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
