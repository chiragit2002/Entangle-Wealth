import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Zap, Shield, Target, TrendingUp, AlertTriangle, Crown, ChevronDown, ChevronUp, Star, Check, X, Minus } from "lucide-react";

const REPORT_DATE = "April 2026";
const PRODUCT = "EntangleWealth";

interface Competitor {
  name: string;
  category: string;
  pricing: string;
  users: string;
  strengths: string[];
  weaknesses: string[];
  aiCapability: "none" | "basic" | "advanced" | "multi-model";
  technicalIndicators: number;
  liveData: boolean;
  optionsFlow: boolean;
  newsIntel: boolean;
  taxTools: boolean;
  community: boolean;
  mobileFirst: boolean;
  freeAccess: boolean;
  threat: "high" | "medium" | "low";
}

const competitors: Competitor[] = [
  {
    name: "Bloomberg Terminal",
    category: "Institutional Terminal",
    pricing: "$32,000/yr",
    users: "325,000+",
    strengths: ["Deepest data coverage globally", "Real-time news dominance", "Institutional credibility"],
    weaknesses: ["Prohibitive cost for retail", "Archaic UI/UX", "No AI consensus signals"],
    aiCapability: "basic",
    technicalIndicators: 100,
    liveData: true,
    optionsFlow: true,
    newsIntel: true,
    taxTools: false,
    community: false,
    mobileFirst: false,
    freeAccess: false,
    threat: "low",
  },
  {
    name: "TradingView",
    category: "Charting Platform",
    pricing: "$0–$60/mo",
    users: "90M+",
    strengths: ["Best charting in the industry", "Massive community & scripts", "3.5M+ instruments"],
    weaknesses: ["No AI analysis engine", "Alerts unreliable at scale", "No tax/income tools"],
    aiCapability: "none",
    technicalIndicators: 400,
    liveData: true,
    optionsFlow: false,
    newsIntel: false,
    taxTools: false,
    community: true,
    mobileFirst: false,
    freeAccess: true,
    threat: "high",
  },
  {
    name: "Koyfin",
    category: "Research Terminal",
    pricing: "$0–$110/mo",
    users: "500K+",
    strengths: ["Bloomberg-like dashboards at fraction of cost", "Built by ex-Wall Street", "Deep fundamental data"],
    weaknesses: ["No AI signals or consensus engine", "Weak technical analysis", "No tax or income tools"],
    aiCapability: "none",
    technicalIndicators: 20,
    liveData: true,
    optionsFlow: false,
    newsIntel: true,
    taxTools: false,
    community: false,
    mobileFirst: false,
    freeAccess: true,
    threat: "medium",
  },
  {
    name: "Trade Ideas (Holly AI)",
    category: "AI Day Trading",
    pricing: "$127–$254/mo",
    users: "100K+",
    strengths: ["Holly AI | 8-year track record", "300+ pre-built strategies", "Auto-execution capable"],
    weaknesses: ["Expensive ($3K/yr premium)", "Day-trading only", "No fundamental or macro analysis"],
    aiCapability: "advanced",
    technicalIndicators: 50,
    liveData: true,
    optionsFlow: false,
    newsIntel: false,
    taxTools: false,
    community: false,
    mobileFirst: false,
    freeAccess: false,
    threat: "medium",
  },
  {
    name: "TrendSpider",
    category: "AI Technical Analysis",
    pricing: "$49–$107/mo",
    users: "55K+",
    strengths: ["Auto trendlines & patterns", "Sidekick AI chat analyst", "ML Strategy Lab"],
    weaknesses: ["Technical-only | no fundamentals", "Learning curve for bots", "No income/tax features"],
    aiCapability: "advanced",
    technicalIndicators: 150,
    liveData: true,
    optionsFlow: true,
    newsIntel: false,
    taxTools: false,
    community: false,
    mobileFirst: false,
    freeAccess: false,
    threat: "medium",
  },
  {
    name: "Danelfin",
    category: "AI Stock Scoring",
    pricing: "Freemium",
    users: "200K+",
    strengths: ["Explainable AI Score system", "376% verified track record", "10,000 features/stock/day"],
    weaknesses: ["Short-term only (3-month horizon)", "No charting or terminal", "No tax or income tools"],
    aiCapability: "advanced",
    technicalIndicators: 0,
    liveData: false,
    optionsFlow: false,
    newsIntel: false,
    taxTools: false,
    community: false,
    mobileFirst: true,
    freeAccess: true,
    threat: "medium",
  },
  {
    name: "Robinhood",
    category: "Brokerage + Analysis",
    pricing: "$0–$5/mo",
    users: "27M+",
    strengths: ["Massive user base", "Zero-commission trading", "Cortex AI assistant"],
    weaknesses: ["Shallow analysis tools", "Gamification concerns", "No professional-grade signals"],
    aiCapability: "basic",
    technicalIndicators: 15,
    liveData: true,
    optionsFlow: false,
    newsIntel: true,
    taxTools: false,
    community: true,
    mobileFirst: true,
    freeAccess: true,
    threat: "high",
  },
];

const entangleWealth = {
  name: "EntangleWealth",
  aiCapability: "multi-model" as const,
  technicalIndicators: 55,
  liveData: true,
  optionsFlow: true,
  newsIntel: true,
  taxTools: true,
  community: true,
  mobileFirst: true,
  freeAccess: true,
};

const featureMatrix = [
  { feature: "Multi-Model AI Consensus", weight: 5, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "Live Market Data (Alpaca)", weight: 5, ew: true, values: [true, true, true, true, true, false, true] },
  { feature: "55+ Technical Indicators", weight: 4, ew: true, values: [true, true, false, false, true, false, false] },
  { feature: "Options Flow & Greeks", weight: 4, ew: true, values: [true, false, false, false, true, false, false] },
  { feature: "AI News Intelligence", weight: 4, ew: true, values: [true, false, true, false, false, false, true] },
  { feature: "TaxFlow Suite", weight: 3, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "Gig/Income Tools", weight: 3, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "What-If Time Machine", weight: 4, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "Sector Flow Radar", weight: 4, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "Volatility Lab", weight: 4, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "Mobile-First Design", weight: 3, ew: true, values: [false, false, false, false, false, true, true] },
  { feature: "Community & Groups", weight: 2, ew: true, values: [false, true, false, false, false, false, true] },
  { feature: "Free Tier Available", weight: 3, ew: true, values: [false, true, true, false, false, true, true] },
  { feature: "Clerk Auth + Stripe Billing", weight: 2, ew: true, values: [false, false, false, false, false, false, false] },
  { feature: "Resume Builder", weight: 2, ew: true, values: [false, false, false, false, false, false, false] },
];

const kanoAnalysis = [
  { feature: "Real-time quotes", category: "Basic", note: "Table stakes | every competitor has this. Not a differentiator." },
  { feature: "Technical charting", category: "Basic", note: "TradingView dominates. Compete on AI overlay, not chart quality." },
  { feature: "AI stock signals", category: "Performance", note: "More AI models = better. EntangleWealth's 6-model consensus is unique." },
  { feature: "Options flow analysis", category: "Performance", note: "Growing demand. Few competitors combine with AI signals." },
  { feature: "Multi-model consensus", category: "Delighter", note: "No competitor does this. Quantum entanglement is a category-defining moat." },
  { feature: "Tax tools + income", category: "Delighter", note: "Zero competitors combine trading analysis with tax/gig tools." },
  { feature: "Time Machine / Vol Lab", category: "Delighter", note: "Unique analytical tools that create 'aha' moments for users." },
];

const strategicActions = [
  {
    title: "Lead with the Entanglement Moat",
    desc: "No competitor has multi-model AI consensus. Trade Ideas has Holly (single AI), Danelfin has a score (single model). Your 6-agent cross-verification is architecturally superior. Every landing page, every ad, every pitch should open with: '6 AI models. They must agree before a signal fires.'",
    urgency: "high" as const,
  },
  {
    title: "Attack TradingView's Weakness: No AI Brain",
    desc: "TradingView has 90M users who draw their own trendlines and hope. Position EntangleWealth as 'TradingView + a brain.' Trap-setting sales question: 'How many of your TradingView alerts actually led to profitable trades? Our AI tracks that automatically.'",
    urgency: "high" as const,
  },
  {
    title: "Own the 'Financial Wellness' Category",
    desc: "No one combines stock analysis + tax tools + gig income + resume builder. This isn't a feature | it's a category. You're not a trading platform. You're a financial empowerment platform. Robinhood gamifies trading. You dignify financial planning.",
    urgency: "medium" as const,
  },
  {
    title: "Price to Disrupt: Free Tier Must Stay Generous",
    desc: "Trade Ideas charges $3K/yr. TrendSpider charges $1.3K/yr. Your free tier with 55+ indicators and live data is a quantum tunneling opportunity | you phase through price barriers that keep retail investors locked out of institutional-grade tools.",
    urgency: "high" as const,
  },
  {
    title: "Build the Verified Track Record",
    desc: "Danelfin's biggest moat is their 376% verified return. Start publishing EntangleWealth signal accuracy publicly. Monthly transparency reports. This builds the trust that converts free users to paid.",
    urgency: "medium" as const,
  },
];

function FeatureIcon({ has }: { has: boolean }) {
  return has ? (
    <Check className="w-4 h-4 text-[#00FF41]" />
  ) : (
    <X className="w-4 h-4 text-[#ff4466] opacity-40" />
  );
}

function ThreatBadge({ level }: { level: string }) {
  const colors = {
    high: "bg-[#ff4466]/15 text-[#ff4466] border-[#ff4466]/20",
    medium: "bg-[#FFB800]/15 text-[#FFB800] border-[#FFB800]/20",
    low: "bg-[#00FF41]/15 text-[#00FF41] border-[#00FF41]/20",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[level as keyof typeof colors]}`}>
      {level}
    </span>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CompetitorCard({ c, isExpanded, onToggle }: { c: Competitor; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="glass-panel rounded-sm overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 md:p-5 flex items-center justify-between text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="font-bold text-base">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.category} · {c.pricing}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ThreatBadge level={c.threat} />
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-white/[0.06] pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Strengths</div>
              {c.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <Check className="w-3 h-3 text-[#00FF41] mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-white/80">{s}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Weaknesses</div>
              {c.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <AlertTriangle className="w-3 h-3 text-[#ff4466] mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-white/80">{w}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Users", value: c.users },
              { label: "AI Level", value: c.aiCapability === "multi-model" ? "Multi-Model" : c.aiCapability === "advanced" ? "Advanced" : c.aiCapability === "basic" ? "Basic" : "None" },
              { label: "Indicators", value: c.technicalIndicators.toString() },
              { label: "Mobile-First", value: c.mobileFirst ? "Yes" : "No" },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.03] rounded-lg p-2 text-center">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{s.label}</div>
                <div className="text-sm font-bold mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompetitiveAnalysis() {
  const { toast } = useToast();
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const W = 612, H = 792, M = 40;
      const CW = W - 2 * M;
      let y = M;

      const addHeader = () => {
        doc.setFillColor(0, 212, 255);
        doc.rect(0, 0, W, 3, "F");
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`${PRODUCT} Quantum Competitive Intelligence Report`, M, 20);
        doc.text(REPORT_DATE, W - M, 20, { align: "right" });
      };

      const addFooter = (page: number) => {
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(`Page ${page}`, W / 2, H - 15, { align: "center" });
        doc.text("CONFIDENTIAL", W - M, H - 15, { align: "right" });
      };

      const checkPage = (needed: number, page: { n: number }) => {
        if (y + needed > H - M - 20) {
          addFooter(page.n);
          doc.addPage();
          page.n++;
          addHeader();
          y = M + 20;
        }
      };

      const page = { n: 1 };
      addHeader();

      y = 60;
      doc.setFontSize(28);
      doc.setTextColor(0, 212, 255);
      doc.text("Quantum Competitive", M, y);
      y += 34;
      doc.text("Intelligence Report", M, y);
      y += 50;
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text(`${PRODUCT} | ${REPORT_DATE}`, M, y);
      y += 30;
      doc.setFontSize(11);
      doc.setTextColor(80);
      const positioningText = `For everyday families who need institutional-grade financial intelligence, ${PRODUCT} is a quantum entanglement analysis platform that delivers AI-consensus stock signals, tax tools, and income opportunities. Unlike Bloomberg ($32K/yr), TradingView (no AI), or Robinhood (gamified), ${PRODUCT} is the only platform where 6 independent AI models must agree before a signal fires.`;
      const posLines = doc.splitTextToSize(positioningText, CW);
      doc.text(posLines, M, y);
      y += posLines.length * 14 + 30;

      doc.setFontSize(13);
      doc.setTextColor(40);
      doc.text("Top 3 Strategic Recommendations", M, y);
      y += 20;
      doc.setFontSize(10);
      doc.setTextColor(80);
      strategicActions.slice(0, 3).forEach((a, i) => {
        checkPage(50, page);
        doc.setTextColor(0, 212, 255);
        doc.text(`${i + 1}.`, M, y);
        doc.setTextColor(40);
        doc.text(a.title, M + 15, y);
        y += 14;
        doc.setTextColor(100);
        const lines = doc.splitTextToSize(a.desc, CW - 15);
        doc.text(lines, M + 15, y);
        y += lines.length * 12 + 12;
      });

      addFooter(page.n);
      doc.addPage();
      page.n++;
      addHeader();
      y = M + 30;

      doc.setFontSize(18);
      doc.setTextColor(0, 212, 255);
      doc.text("Competitive Landscape", M, y);
      y += 30;

      competitors.forEach((c) => {
        checkPage(70, page);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(c.name, M, y);
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`${c.category} | ${c.pricing} | ${c.users} users | Threat: ${c.threat.toUpperCase()}`, M + 2, y + 14);
        y += 18;
        doc.setFontSize(9);
        doc.setTextColor(0, 150, 0);
        doc.text(`+ ${c.strengths[0]}`, M + 5, y + 10);
        doc.setTextColor(200, 0, 0);
        doc.text(`- ${c.weaknesses[0]}`, M + CW / 2, y + 10);
        y += 30;
      });

      addFooter(page.n);
      doc.addPage();
      page.n++;
      addHeader();
      y = M + 30;

      doc.setFontSize(18);
      doc.setTextColor(0, 212, 255);
      doc.text("Feature Matrix", M, y);
      y += 25;

      doc.setFontSize(7);
      doc.setTextColor(100);
      const colW = (CW - 140) / (competitors.length + 1);
      doc.text("Feature", M, y);
      doc.text("EW", M + 145, y);
      competitors.forEach((c, i) => {
        const label = c.name.length > 8 ? c.name.substring(0, 8) + "." : c.name;
        doc.text(label, M + 145 + colW * (i + 1), y);
      });
      y += 12;

      featureMatrix.forEach((f) => {
        checkPage(14, page);
        doc.setFontSize(8);
        doc.setTextColor(60);
        doc.text(f.feature, M, y);
        doc.setTextColor(0, 180, 0);
        doc.text(f.ew ? "YES" : "NO", M + 145, y);
        f.values.forEach((v, i) => {
          doc.setTextColor(v ? 0 : 180, v ? 180 : 0, 0);
          doc.text(v ? "YES" : "NO", M + 145 + colW * (i + 1), y);
        });
        y += 13;
      });

      addFooter(page.n);
      doc.addPage();
      page.n++;
      addHeader();
      y = M + 30;

      doc.setFontSize(18);
      doc.setTextColor(0, 212, 255);
      doc.text("Kano Analysis", M, y);
      y += 25;

      kanoAnalysis.forEach((k) => {
        checkPage(35, page);
        const catColor = k.category === "Delighter" ? [0, 212, 255] : k.category === "Performance" ? [0, 200, 100] : [150, 150, 150];
        doc.setFontSize(10);
        doc.setTextColor(catColor[0], catColor[1], catColor[2]);
        doc.text(`[${k.category}]`, M, y);
        doc.setTextColor(40);
        doc.text(k.feature, M + 70, y);
        y += 13;
        doc.setFontSize(8);
        doc.setTextColor(100);
        const nLines = doc.splitTextToSize(k.note, CW - 10);
        doc.text(nLines, M + 5, y);
        y += nLines.length * 11 + 10;
      });

      y += 15;
      checkPage(100, page);
      doc.setFontSize(18);
      doc.setTextColor(0, 212, 255);
      doc.text("Full Action Plan", M, y);
      y += 25;

      strategicActions.forEach((a, i) => {
        checkPage(60, page);
        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text(`${i + 1}. ${a.title}`, M, y);
        y += 15;
        doc.setFontSize(9);
        doc.setTextColor(90);
        const dLines = doc.splitTextToSize(a.desc, CW - 15);
        doc.text(dLines, M + 10, y);
        y += dLines.length * 11 + 15;
      });

      addFooter(page.n);

      doc.save("EntangleWealth_Competitive_Intelligence_Q2_2026.pdf");
    } catch {
      toast({ title: "Export failed", description: "Could not generate the PDF report. Please try again.", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [toast]);

  const ewScore = featureMatrix.filter((f) => f.ew).length;
  const competitorScores = competitors.map((c) => ({
    name: c.name,
    score: featureMatrix.filter((f, i) => f.values[competitors.indexOf(c)]).length,
  }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl" ref={reportRef}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2">Quantum Competitive Intelligence</div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              <span className="electric-text">Entangled</span> Market Map
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{REPORT_DATE} · 7 competitors analyzed · 15 features compared</p>
          </div>
          <Button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="bg-primary text-black font-bold hover:bg-primary/90 h-11 px-6 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGeneratingPDF ? "Generating..." : "Export PDF"}
          </Button>
        </div>

        <div className="glass-panel rounded-sm p-5 md:p-8 mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
          <h2 className="text-lg md:text-xl font-bold mb-3">April Dunford Positioning Statement</h2>
          <p className="text-sm md:text-base text-white/80 leading-relaxed italic">
            "For <span className="text-primary font-semibold">everyday families</span> who need institutional-grade financial intelligence,{" "}
            <span className="text-primary font-semibold">{PRODUCT}</span> is a{" "}
            <span className="gold-text font-semibold">quantum entanglement analysis platform</span> that delivers AI-consensus stock signals, tax tools, and income opportunities in one place. Unlike{" "}
            <span className="text-white font-semibold">Bloomberg</span> ($32K/yr),{" "}
            <span className="text-white font-semibold">TradingView</span> (no AI), or{" "}
            <span className="text-white font-semibold">Robinhood</span> (gamified trading),{" "}
            {PRODUCT} is the only platform where <span className="text-primary font-semibold">6 independent AI models must agree</span> before a signal fires."
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Our Features", value: ewScore.toString(), sub: `of ${featureMatrix.length}`, color: "text-primary" },
            { label: "Unique Features", value: "5", sub: "no competitor has", color: "text-[#00FF41]" },
            { label: "Competitors", value: competitors.length.toString(), sub: "analyzed", color: "text-secondary" },
            { label: "Threat Level", value: "2 HIGH", sub: "TradingView, Robinhood", color: "text-[#ff4466]" },
          ].map((s) => (
            <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
              <div className={`text-2xl md:text-3xl font-mono font-bold ${s.color} stat-value`}>{s.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 font-bold">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        <Section title="Competitive Landscape" icon={Target} color="bg-primary/10 text-primary">
          <div className="space-y-3">
            {competitors.map((c) => (
              <CompetitorCard
                key={c.name}
                c={c}
                isExpanded={expandedCompetitor === c.name}
                onToggle={() => setExpandedCompetitor(expandedCompetitor === c.name ? null : c.name)}
              />
            ))}
          </div>
        </Section>

        <Section title="Feature Matrix | Quantum Superiority Map" icon={Zap} color="bg-[#00FF41]/10 text-[#00FF41]">
          <div className="glass-panel rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-[160px]">Feature</th>
                    <th className="text-center p-3 text-xs font-bold uppercase tracking-wider text-primary min-w-[50px]">Wt</th>
                    <th className="text-center p-3 min-w-[60px]">
                      <span className="text-[10px] font-bold text-primary">EW</span>
                    </th>
                    {competitors.map((c) => (
                      <th key={c.name} className="text-center p-3 min-w-[60px]">
                        <span className="text-[10px] font-bold text-muted-foreground">{c.name.split(" ")[0].substring(0, 6)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((f, fi) => (
                    <tr key={f.feature} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-xs font-medium">{f.feature}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {Array.from({ length: f.weight }).map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 text-secondary fill-secondary" />
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <FeatureIcon has={f.ew} />
                      </td>
                      {f.values.map((v, vi) => (
                        <td key={vi} className="p-3 text-center">
                          <FeatureIcon has={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-primary/20 font-bold">
                    <td className="p-3 text-xs">TOTAL SCORE</td>
                    <td className="p-3" />
                    <td className="p-3 text-center text-primary font-mono">{ewScore}</td>
                    {competitorScores.map((cs) => (
                      <td key={cs.name} className="p-3 text-center text-muted-foreground font-mono">{cs.score}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section title="Positioning Map | Quantum Quadrant" icon={TrendingUp} color="bg-secondary/10 text-secondary">
          <div className="glass-panel rounded-sm p-6 md:p-8">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 border border-white/[0.06] rounded-lg">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">High AI Sophistication</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Low AI Sophistication</div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 -rotate-90 text-[10px] uppercase tracking-wider text-muted-foreground font-bold whitespace-nowrap">Narrow Scope</div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 rotate-90 text-[10px] uppercase tracking-wider text-muted-foreground font-bold whitespace-nowrap">Broad Scope</div>

                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.06]" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.06]" />

                <div className="absolute text-[10px] top-[5%] left-[5%] text-muted-foreground/40 font-bold uppercase">Specialized AI</div>
                <div className="absolute text-[10px] top-[5%] right-[5%] text-muted-foreground/40 font-bold uppercase">Platform AI</div>
                <div className="absolute text-[10px] bottom-[5%] left-[5%] text-muted-foreground/40 font-bold uppercase">Niche Manual</div>
                <div className="absolute text-[10px] bottom-[5%] right-[5%] text-muted-foreground/40 font-bold uppercase">Broad Manual</div>

                {[
                  { name: "EntangleWealth", x: 82, y: 12, color: "#00D4FF", size: "w-4 h-4", glow: true },
                  { name: "Bloomberg", x: 90, y: 55, color: "#FF6600", size: "w-3 h-3", glow: false },
                  { name: "TradingView", x: 65, y: 72, color: "#2962FF", size: "w-3 h-3", glow: false },
                  { name: "Koyfin", x: 55, y: 65, color: "#8BC34A", size: "w-2.5 h-2.5", glow: false },
                  { name: "Trade Ideas", x: 20, y: 18, color: "#FF5252", size: "w-2.5 h-2.5", glow: false },
                  { name: "TrendSpider", x: 30, y: 25, color: "#E040FB", size: "w-2.5 h-2.5", glow: false },
                  { name: "Danelfin", x: 25, y: 30, color: "#FFAB40", size: "w-2.5 h-2.5", glow: false },
                  { name: "Robinhood", x: 70, y: 78, color: "#00E676", size: "w-3 h-3", glow: false },
                ].map((p) => (
                  <div
                    key={p.name}
                    className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <div
                      className={`${p.size} rounded-full`}
                      style={{
                        backgroundColor: p.color,
                        boxShadow: p.glow ? `0 0 20px ${p.color}60, 0 0 40px ${p.color}30` : "none",
                      }}
                    />
                    <span className="text-[8px] font-bold whitespace-nowrap" style={{ color: p.color }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-8">
              EntangleWealth occupies the upper-right quadrant alone | high AI sophistication + broad platform scope. No competitor is entangled at this position.
            </p>
          </div>
        </Section>

        <Section title="Kano Feature Analysis" icon={Crown} color="bg-purple-500/10 text-purple-400">
          <div className="space-y-3">
            {kanoAnalysis.map((k) => {
              const colors = {
                Basic: { bg: "bg-white/[0.03]", border: "border-white/[0.06]", badge: "bg-white/10 text-white/50" },
                Performance: { bg: "bg-[#00FF41]/[0.03]", border: "border-[#00FF41]/10", badge: "bg-[#00FF41]/10 text-[#00FF41]" },
                Delighter: { bg: "bg-primary/[0.03]", border: "border-primary/10", badge: "bg-primary/10 text-primary" },
              }[k.category]!;
              return (
                <div key={k.feature} className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.badge}`}>{k.category}</span>
                    <span className="font-semibold text-sm">{k.feature}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{k.note}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Strategic Action Plan" icon={Shield} color="bg-[#ff4466]/10 text-[#ff4466]">
          <div className="space-y-4">
            {strategicActions.map((a, i) => (
              <div key={a.title} className="glass-panel rounded-sm p-5 md:p-6 relative overflow-hidden">
                {a.urgency === "high" && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ff4466] via-[#ff4466] to-transparent" />
                )}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-mono font-bold">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-base">{a.title}</h3>
                      {a.urgency === "high" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#ff4466]/10 text-[#ff4466] border border-[#ff4466]/20">Urgent</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="glass-panel-gold rounded-sm p-6 md:p-8 text-center mb-10">
          <div className="text-[10px] uppercase tracking-[0.2em] text-secondary/60 font-bold mb-3">The Quantum Advantage</div>
          <h2 className="text-xl md:text-2xl font-bold mb-4">
            EntangleWealth has <span className="gold-text">5 features</span> that{" "}
            <span className="text-white">zero competitors</span> offer.
          </h2>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {["Multi-Model AI Consensus", "TaxFlow Suite", "What-If Time Machine", "Sector Flow Radar", "Volatility Lab"].map((f) => (
              <span key={f} className="text-xs font-bold px-3 py-1.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">{f}</span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            No other platform in the market combines AI consensus signals, financial planning tools, and institutional-grade analytics | at any price point. This is not a feature advantage. This is a category advantage.
          </p>
        </div>

        <div className="text-center text-[10px] text-muted-foreground/40 pb-8">
          Sources: G2, TrustRadius, Crunchbase, competitor websites, App Store listings, Reddit user reviews · {REPORT_DATE} · CONFIDENTIAL
        </div>
      </div>
    </Layout>
  );
}
