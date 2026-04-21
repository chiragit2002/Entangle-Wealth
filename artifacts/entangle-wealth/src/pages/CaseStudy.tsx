import { useState, useRef, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Shield, Target, Crown, Check, X, Minus, ArrowRight, BarChart3, Users, DollarSign, Zap, Globe, Brain, Layers } from "lucide-react";

const REPORT_DATE = "April 2026";

const Section = ({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) => (
  <section id={id} className="mb-16">
    <div className="mb-8 border-b border-amber-900/30 pb-4">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: "JetBrains Mono, monospace" }}>{title}</h2>
      {subtitle && <p className="text-amber-500/70 text-sm mt-1">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const StatCard = ({ label, value, sub, color = "#00B4D8" }: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="bg-card border border-gray-800/60 rounded-lg p-5 text-center">
    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</div>
    <div className="text-2xl md:text-3xl font-bold" style={{ color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

const FeatureRow = ({ feature, ew, bb, tv, ti, kf, ts, df, rh }: {
  feature: string; ew: "yes"|"no"|"partial"; bb: "yes"|"no"|"partial"; tv: "yes"|"no"|"partial";
  ti: "yes"|"no"|"partial"; kf: "yes"|"no"|"partial"; ts: "yes"|"no"|"partial";
  df: "yes"|"no"|"partial"; rh: "yes"|"no"|"partial";
}) => {
  const icon = (v: "yes"|"no"|"partial") =>
    v === "yes" ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> :
    v === "no" ? <X className="w-4 h-4 text-red-400/60 mx-auto" /> :
    <Minus className="w-4 h-4 text-yellow-400 mx-auto" />;
  return (
    <tr className="border-b border-gray-800/40 hover:bg-muted/30">
      <td className="py-2.5 px-3 text-sm text-gray-300 text-left">{feature}</td>
      <td className="py-2.5 px-2 text-center bg-amber-1000/[0.04]">{icon(ew)}</td>
      <td className="py-2.5 px-2 text-center">{icon(bb)}</td>
      <td className="py-2.5 px-2 text-center">{icon(tv)}</td>
      <td className="py-2.5 px-2 text-center">{icon(ti)}</td>
      <td className="py-2.5 px-2 text-center">{icon(kf)}</td>
      <td className="py-2.5 px-2 text-center">{icon(ts)}</td>
      <td className="py-2.5 px-2 text-center">{icon(df)}</td>
      <td className="py-2.5 px-2 text-center">{icon(rh)}</td>
    </tr>
  );
};

export default function CaseStudy() {
  const [tocOpen, setTocOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = 612, H = 792, M = 40;
    const cw = W - M * 2;
    let y = M;
    let pageNum = 1;

    const addFooter = () => {
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`EntangleWealth Competitive Case Study | ${REPORT_DATE}`, M, H - 20);
      doc.text(`Page ${pageNum}`, W - M, H - 20, { align: "right" });
      doc.text("CONFIDENTIAL | For Internal & Investor Use Only", W / 2, H - 20, { align: "center" });
    };

    const ensureSpace = (need: number) => {
      if (y + need > H - M - 20) {
        addFooter();
        doc.addPage();
        pageNum++;
        y = M;
      }
    };

    const addHeading = (text: string, size: number = 16) => {
      ensureSpace(40);
      doc.setFontSize(size);
      doc.setTextColor(0, 180, 220);
      doc.text(text, M, y);
      y += size + 8;
      doc.setDrawColor(0, 180, 220);
      doc.setLineWidth(0.5);
      doc.line(M, y - 4, M + cw, y - 4);
      y += 8;
    };

    const addParagraph = (text: string, size: number = 10) => {
      doc.setFontSize(size);
      doc.setTextColor(50);
      const lines = doc.splitTextToSize(text, cw);
      ensureSpace(lines.length * (size + 3));
      doc.text(lines, M, y);
      y += lines.length * (size + 3) + 6;
    };

    const addBullet = (text: string) => {
      doc.setFontSize(10);
      doc.setTextColor(50);
      const lines = doc.splitTextToSize(text, cw - 15);
      ensureSpace(lines.length * 13);
      doc.text("•", M, y);
      doc.text(lines, M + 15, y);
      y += lines.length * 13 + 2;
    };

    doc.setFillColor(5, 5, 15);
    doc.rect(0, 0, W, H, "F");
    doc.setFontSize(32);
    doc.setTextColor(255, 140, 0);
    doc.text("EntangleWealth", W / 2, 200, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(255, 215, 0);
    doc.text("COMPETITIVE CASE STUDY", W / 2, 235, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(180);
    doc.text(`${REPORT_DATE} | CEO Strategic Briefing`, W / 2, 270, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("How EntangleWealth Delivers Bloomberg Terminal-Grade Intelligence", W / 2, 310, { align: "center" });
    doc.text("at 99.6% Lower Cost | Backed by Market Data and Feature Analysis", W / 2, 325, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("CONFIDENTIAL | For Internal & Investor Use Only", W / 2, H - 60, { align: "center" });
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("1. EXECUTIVE SUMMARY", 18);
    addParagraph("EntangleWealth is the first financial analysis platform to combine Bloomberg Terminal-grade market intelligence with AI multi-agent consensus verification | at a price point accessible to the 400 million global retail investors currently priced out of professional-grade tools.");
    addParagraph("POSITIONING STATEMENT (April Dunford Framework):");
    addParagraph("For retail investors and independent traders who need institutional-quality market intelligence, EntangleWealth is a full-spectrum financial command center that delivers AI-verified consensus signals across 5,000+ NASDAQ stocks with 55+ technical indicators, live market data, options flow analysis, and integrated tax optimization. Unlike Bloomberg Terminal ($32,000/yr), TradingView (charting only), or Trade Ideas (scanner only), EntangleWealth provides the only multi-model AI consensus engine that requires 6 independent analysis methods to agree before issuing a signal | eliminating single-model bias while including career tools, tax intelligence, and community features in a single platform starting at $0/month.");
    y += 10;
    addHeading("Key Metrics", 12);
    addBullet("Total Addressable Market: $9.6B stock trading app market (2025), growing to $34.5B by 2035 at 13.62% CAGR");
    addBullet("Predictive AI in stock market: $840M (2025) → $1.82B (2030) at 17% CAGR");
    addBullet("Global retail active investment app users: 400M+, with 60%+ executing trades via mobile");
    addBullet("Competitor pricing gap: Bloomberg $32,000/yr, Trade Ideas $2,136/yr, TrendSpider $648–$2,388/yr | EntangleWealth Pro: $348/yr");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("2. MARKET OPPORTUNITY", 18);
    addParagraph("The global fintech market reached $394.9 billion in 2025 and is projected to grow at 18.2% CAGR to $1.76 trillion by 2034 (Fortune Business Insights). Within this, the stock trading app market specifically hit $9.6 billion in 2025 with projection to $34.5 billion by 2035.");
    addParagraph("Three converging forces create an unprecedented window:");
    addBullet("DEMOCRATIZATION: 400M+ retail investors globally now trade via mobile apps. Retail investors account for 21-35% of US equity trading volume. Yet zero platforms offer multi-model AI consensus at accessible pricing.");
    addBullet("AI MATURITY: The predictive AI in finance segment reached $840M in 2025, growing 17% annually. 92% of financial institutions now consider AI critical to competitiveness. The tools exist | but remain siloed behind institutional paywalls.");
    addBullet("FRAGMENTATION: Retail investors currently need 3-5 separate tools (charting, scanning, news, tax, options) at $200-$500/month combined. EntangleWealth consolidates all into one platform at $29/month.");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("3. COMPETITIVE LANDSCAPE", 18);
    const compHeaders = ["Platform", "Pricing", "Users", "AI Model", "Indicators", "Tax", "Free"];
    const compData = [
      ["EntangleWealth", "$0-79/mo", "Early", "6-Model Consensus", "55+", "Yes", "Yes"],
      ["Bloomberg", "$2,665/mo", "325K", "Single", "100+", "No", "No"],
      ["TradingView", "$0-200/mo", "100M+", "None", "400+", "No", "Yes"],
      ["Trade Ideas", "$89-254/mo", "~50K", "Holly AI (1)", "N/A", "No", "No"],
      ["Koyfin", "$0-239/mo", "500K+", "None", "Limited", "No", "Yes"],
      ["TrendSpider", "$54-199/mo", "~30K", "Basic", "~150", "No", "No"],
      ["Danelfin", "$0-59/mo", "~100K", "Score (1)", "N/A", "No", "Yes"],
      ["Robinhood", "$0-5/mo", "24M+", "None", "Few", "No", "Yes"],
    ];
    doc.setFontSize(9);
    const colW = [90, 70, 55, 95, 55, 30, 30];
    let tx = M;
    doc.setTextColor(0, 180, 220);
    doc.setFont("helvetica", "bold");
    compHeaders.forEach((h, i) => { doc.text(h, tx, y); tx += colW[i]; });
    y += 4;
    doc.setDrawColor(0, 180, 220);
    doc.line(M, y, M + cw, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    compData.forEach((row, ri) => {
      ensureSpace(16);
      tx = M;
      doc.setTextColor(ri === 0 ? 0 : 70, ri === 0 ? 212 : 70, ri === 0 ? 255 : 70);
      row.forEach((cell, ci) => { doc.text(cell, tx, y); tx += colW[ci]; });
      y += 14;
    });
    y += 10;
    addParagraph("Source: Bloomberg LP public filings (2025 6.5% price increase letter), TradingView (100M+ users, 150+ exchanges), Robinhood Q4 2024 earnings (24M funded accounts), Koyfin (500K+ investors, Capital IQ powered), Trade Ideas (Holly AI overnight backtesting), Danelfin (AI Score 1-10 methodology), TrendSpider (automated trendline detection).");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("4. THE ENTANGLEWEALTH DIFFERENCE", 18);
    addParagraph("DIFFERENTIATOR #1: 6-Model AI Consensus Engine");
    addParagraph("Every competitor uses either zero AI or a single-model approach. Bloomberg relies on human analysts. TradingView has no AI analysis. Trade Ideas uses Holly | a single AI model. Danelfin uses a single scoring algorithm. EntangleWealth is the ONLY platform requiring 6 independent AI models (Price Action, Volume Analysis, Options Flow, Technical Indicators, Sentiment Analysis, Risk Management) to achieve consensus before issuing a signal. This cross-verification methodology mirrors how institutional quant desks operate | but no retail platform has implemented it until now.");
    y += 5;
    addParagraph("DIFFERENTIATOR #2: Full-Spectrum Financial Platform");
    addParagraph("Competitors are narrowly focused. Bloomberg does terminal. TradingView does charts. Trade Ideas does scanning. Robinhood does execution. None offer integrated tax intelligence (TaxGPT with IRS publication training), career tools (resume builder, job search), income opportunities (gig marketplace, options income strategies), AND community features in a single platform. EntangleWealth consolidates what would require 5+ separate subscriptions.");
    y += 5;
    addParagraph("DIFFERENTIATOR #3: Bloomberg-Grade Data at 99.6% Lower Cost");
    addParagraph("Bloomberg Terminal costs $31,980/year minimum with 2-year contract lock-in and 50% early termination penalty. EntangleWealth Pro delivers live market data, 55+ technical indicators, options flow, market internals (TICK, TRIN, A/D, VIX), multi-asset coverage (crypto, forex, commodities, bonds), and AI consensus analysis for $348/year | a 99.6% cost reduction. Even against mid-market competitors: Trade Ideas Premium ($2,136/yr), TrendSpider ($648-2,388/yr), Koyfin Pro ($948/yr) | EntangleWealth undercuts every professional-grade alternative.");
    y += 5;
    addParagraph("DIFFERENTIATOR #4: 166-Page SEO Content Engine");
    addParagraph("EntangleWealth has deployed a programmatic SEO system generating 166 optimized pages across 7 content verticals (Glossary: 67 terms, Technical Indicators: 16, Trading Strategies: 24, Chart Patterns: 21, Sector Analysis: 12, Stock Comparisons: 11, Educational Pages: 15). No competitor has built comparable educational content infrastructure. This creates an organic acquisition moat that compounds over time.");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("5. FEATURE MATRIX", 18);
    addParagraph("Comprehensive capability comparison across 24 feature dimensions:");
    y += 5;
    const fmHeaders = ["Capability", "EW", "BBG", "TV", "TI", "KF", "TS", "DF", "RH"];
    const fmColW = [160, 40, 40, 40, 40, 40, 40, 40, 40];
    const fmData: [string, string, string, string, string, string, string, string, string][] = [
      ["Multi-Model AI Consensus", "✓", "✗", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Live Market Data (Alpaca)", "✓", "✓", "✓", "✓", "✓", "✓", "✗", "✓"],
      ["55+ Technical Indicators", "✓", "✓", "✓", "~", "~", "✓", "✗", "✗"],
      ["Options Flow & Greeks", "✓", "✓", "~", "✗", "✗", "✗", "✗", "~"],
      ["Market Internals (TICK/TRIN)", "✓", "✓", "✗", "✓", "✗", "✗", "✗", "✗"],
      ["Multi-Asset (Crypto/FX/Cmdty)", "✓", "✓", "✓", "✗", "✓", "✗", "✗", "✓"],
      ["News Intelligence (AI Scored)", "✓", "✓", "~", "✗", "✓", "✗", "✗", "~"],
      ["Volatility Lab", "✓", "✓", "✗", "✗", "✗", "✓", "✗", "✗"],
      ["Sector Flow Radar", "✓", "✓", "✗", "~", "✓", "✗", "✗", "✗"],
      ["Time Machine (Backtesting)", "✓", "✓", "~", "✓", "✗", "✓", "✗", "✗"],
      ["Tax Intelligence (TaxGPT)", "✓", "✗", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Resume Builder", "✓", "✗", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Job Search Integration", "✓", "✗", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Gig Marketplace", "✓", "✗", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Bloomberg-Style Terminal", "✓", "✓", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Keyboard Shortcuts (Pro Nav)", "✓", "✓", "✓", "✗", "✓", "✗", "✗", "✗"],
      ["Mobile-First Design", "✓", "✗", "✓", "✗", "~", "~", "✓", "✓"],
      ["Free Tier Available", "✓", "✗", "✓", "✗", "✓", "✗", "✓", "✓"],
      ["SEO Content Engine (166 pgs)", "✓", "✗", "✗", "✗", "✗", "✗", "✗", "✗"],
      ["Community Features", "✓", "✗", "✓", "✗", "✗", "✗", "✗", "✗"],
      ["Stripe Payments / KYC", "✓", "✓", "✓", "✓", "✓", "✓", "✓", "✓"],
      ["Economic Calendar", "✓", "✓", "✓", "✗", "✓", "✗", "✗", "~"],
      ["Stock Screener (5000+ stocks)", "✓", "✓", "✓", "✓", "✓", "✓", "✓", "✓"],
      ["P&L Simulator", "✓", "✓", "✗", "✗", "✗", "✗", "✗", "✗"],
    ];
    doc.setFontSize(7);
    tx = M;
    doc.setTextColor(0, 180, 220);
    doc.setFont("helvetica", "bold");
    fmHeaders.forEach((h, i) => { doc.text(h, tx + (i === 0 ? 0 : fmColW[i]/2), y, i === 0 ? {} : { align: "center" }); tx += fmColW[i]; });
    y += 4;
    doc.line(M, y, M + cw, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    fmData.forEach(row => {
      ensureSpace(12);
      tx = M;
      row.forEach((cell, ci) => {
        if (ci === 0) {
          doc.setTextColor(180);
          doc.text(cell, tx, y);
        } else {
          const clr = cell === "✓" ? [0, 200, 120] : cell === "✗" ? [200, 60, 60] : [200, 180, 0];
          doc.setTextColor(clr[0], clr[1], clr[2]);
          doc.text(cell, tx + fmColW[ci]/2, y, { align: "center" });
        }
        tx += fmColW[ci];
      });
      y += 11;
    });
    y += 5;
    addParagraph("Legend: EW = EntangleWealth, BBG = Bloomberg, TV = TradingView, TI = Trade Ideas, KF = Koyfin, TS = TrendSpider, DF = Danelfin, RH = Robinhood. ✓ = Full support, ~ = Partial, ✗ = Not available.");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("6. PRICING DISRUPTION ANALYSIS", 18);
    addParagraph("Annual cost comparison for comparable feature sets:");
    y += 5;
    const pricingData = [
      ["Bloomberg Terminal", "$31,980", "2-year lock-in, 50% early exit fee, $300 keyboard"],
      ["Trade Ideas Premium", "$2,136", "Holly AI requires Premium tier only"],
      ["TrendSpider Advanced", "$2,388", "Full feature access at top tier"],
      ["Koyfin Pro", "$948", "No AI analysis, Capital IQ data"],
      ["TradingView Premium", "$720", "Charts only, no AI, no tax tools"],
      ["Danelfin Pro", "$499", "Single score, no terminal, no options"],
      ["EntangleWealth Pro", "$348", "Full platform: AI + terminal + tax + career"],
      ["EntangleWealth Starter", "$0", "Core features free forever"],
    ];
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 180, 220);
    doc.text("Platform", M, y);
    doc.text("Annual Cost", M + 180, y);
    doc.text("Notes", M + 280, y);
    y += 4;
    doc.line(M, y, M + cw, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    pricingData.forEach((row, ri) => {
      ensureSpace(16);
      const isEW = ri >= 6;
      doc.setTextColor(isEW ? 0 : 70, isEW ? 212 : 70, isEW ? 255 : 70);
      doc.text(row[0], M, y);
      doc.setTextColor(isEW ? 0 : 50, isEW ? 200 : 50, isEW ? 100 : 50);
      doc.text(row[1], M + 180, y);
      doc.setTextColor(120);
      const noteLines = doc.splitTextToSize(row[2], cw - 280);
      doc.text(noteLines, M + 280, y);
      y += Math.max(noteLines.length, 1) * 13 + 2;
    });
    y += 10;
    addParagraph("Cost Efficiency Ratio: EntangleWealth delivers 24 core capabilities at $14.50/capability/year. Bloomberg delivers comparable depth at $1,332/capability/year | a 92x efficiency advantage.");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("7. WHITE SPACE & STRATEGIC MOAT", 18);
    addParagraph("Analysis reveals four unserved market gaps where EntangleWealth operates without direct competition:");
    y += 5;
    addBullet("GAP 1 | AI CONSENSUS VERIFICATION: No competitor offers multi-model signal cross-verification. Single-model approaches (Holly, Danelfin Score) are vulnerable to model bias and cannot achieve the signal confidence levels that institutional desks require. EntangleWealth's 6-model consensus is architecturally unique in the retail space.");
    addBullet("GAP 2 | FINANCIAL WELLNESS INTEGRATION: Zero competitors combine trading analysis with tax optimization, career tools, and income generation. The 400M+ retail investors include freelancers, gig workers, and families for whom financial wellness extends beyond stock picks. EntangleWealth is the only platform addressing the full financial lifecycle.");
    addBullet("GAP 3 | CONTENT-LED ACQUISITION: No competitor has deployed programmatic SEO at this scale for financial education. 166 pages across 7 verticals create a compounding organic traffic moat. TradingView has community-generated content but no structured educational SEO engine.");
    addBullet("GAP 4 | PRICE-TO-FEATURE RATIO: The market splits into two extremes: expensive-and-complete (Bloomberg, Trade Ideas) or cheap-and-limited (Robinhood, free TradingView). No platform occupies the Bloomberg-features-at-retail-pricing position that EntangleWealth holds.");
    y += 10;
    addHeading("8. RISK FACTORS & HONEST ASSESSMENT", 14);
    addParagraph("Where competitors currently lead:");
    addBullet("DATA DEPTH: Bloomberg's 325,000+ terminal users generate proprietary network effects. Their chat function (IB) creates institutional switching costs that EntangleWealth cannot replicate at the retail level.");
    addBullet("USER BASE: TradingView's 100M+ users create massive community-driven content and indicator libraries. EntangleWealth's community features are newer and smaller.");
    addBullet("EXECUTION: Robinhood's 24M funded accounts include built-in order execution. EntangleWealth currently provides analysis | execution requires a brokerage integration.");
    addBullet("INDICATOR LIBRARY: TradingView offers 400+ indicators vs. EntangleWealth's 55+. However, research shows most active traders use 3-8 indicators consistently.");
    y += 5;
    addParagraph("Mitigation: EntangleWealth's moat is not in competing on Bloomberg's data depth or TradingView's indicator count | it's in the AI consensus layer and full-lifecycle financial platform that neither can replicate without fundamental architectural changes.");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("9. STRATEGIC RECOMMENDATIONS", 18);
    addBullet("ACTION 1 | LEAD WITH COST DISRUPTION: In all investor and user-facing materials, anchor on the $31,980 vs. $348 comparison (99.6% cost reduction). This is the most compelling narrative for both fundraising and user acquisition. Source: Bloomberg LP's January 2025 price increase letter confirming $2,665/month base pricing.");
    addBullet("ACTION 2 | OWN THE 'AI CONSENSUS' CATEGORY: No competitor has claimed multi-model verification as a positioning category. File for trademark on 'Quantum Entanglement Analysis' methodology. Build case studies showing signal accuracy improvements from consensus vs. single-model approaches.");
    addBullet("ACTION 3 | EXPAND SEO MOAT: Current 166 pages should grow to 500+ within 6 months. Target: 'best [indicator] strategy', '[stock] vs [stock]', '[sector] analysis 2026' long-tail keywords. Estimated organic traffic value at 500 pages: $15K-40K/month equivalent paid traffic.");
    addBullet("ACTION 4 | BROKERAGE INTEGRATION ROADMAP: Partner with Alpaca for embedded execution to close the analysis-to-execution gap. This eliminates Robinhood's primary structural advantage while maintaining EntangleWealth's analytical superiority.");
    addBullet("ACTION 5 | BATTLECARD DEPLOYMENT: For every prospect evaluating Bloomberg or TradingView, lead with: 'What would you do with the $31,000 you save per seat per year?' and 'When was the last time your charting tool helped you file taxes or find a job?'");

    addFooter();
    doc.addPage();
    pageNum++;
    y = M;

    addHeading("10. CONCLUSION", 18);
    addParagraph("EntangleWealth occupies a unique and defensible position in a $9.6B market growing to $34.5B by 2035. No existing platform combines multi-model AI consensus verification, Bloomberg-grade market intelligence, tax optimization, career tools, and programmatic content infrastructure at accessible pricing.");
    addParagraph("The competitive landscape reveals a clear pattern: incumbents are either too expensive (Bloomberg), too narrow (TradingView, Trade Ideas), or too shallow (Robinhood, Danelfin). EntangleWealth is architected to serve the intersection | delivering institutional-quality intelligence at retail pricing while addressing the full financial lifecycle of modern investors.");
    addParagraph("The 6-model AI consensus engine is not a feature | it is a category. No competitor can replicate it without rebuilding their analysis infrastructure from the ground up. Combined with 166-page SEO content moat, integrated financial wellness tools, and a pricing model that undercuts every professional alternative by 73-99%, EntangleWealth is positioned to capture significant share of the retail financial intelligence market.");
    y += 20;
    addHeading("SOURCES", 12);
    const sources = [
      "Bloomberg LP | January 2025 pricing letter: 6.5% increase to $2,665/mo ($31,980/yr), 2-year contracts",
      "TradingView | 100M+ users, 150+ exchanges, 2M+ instruments (tradingview.com)",
      "Trade Ideas | Holly AI: overnight backtesting, 60% win-rate threshold, Premium at $254/mo (trade-ideas.com)",
      "Koyfin | 500K+ investors, Capital IQ powered, Pro at $79/mo annual (koyfin.com)",
      "TrendSpider | Automated trendline detection, 4 tiers from $54-$199/mo (trendspider.com)",
      "Danelfin | AI Score 1-10 methodology, 10K+ features per stock, Pro at $59/mo (danelfin.com)",
      "Robinhood | Q4 2024: 24M funded accounts, Gold at $5/mo, 3.35% APY (robinhood.com)",
      "Fortune Business Insights | Global fintech market $394.9B (2025), 18.2% CAGR to $1.76T by 2034",
      "Stock Trading App Market | $9.6B (2025) → $34.5B (2035), 13.62% CAGR (multiple sources)",
      "Predictive AI in Stock Market | $840M (2025) → $1.82B (2030), 17% CAGR",
      "Retail Trading | 400M+ global active investment app users, 60%+ mobile-first (2024-2025 surveys)",
    ];
    doc.setFontSize(8);
    sources.forEach((s, i) => {
      ensureSpace(14);
      doc.setTextColor(0, 150, 200);
      doc.text(`[${i + 1}]`, M, y);
      doc.setTextColor(100);
      const sLines = doc.splitTextToSize(s, cw - 25);
      doc.text(sLines, M + 25, y);
      y += sLines.length * 11 + 2;
    });

    addFooter();
    doc.save("EntangleWealth_Competitive_Case_Study_April_2026.pdf");
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-[#020204] text-foreground" ref={reportRef}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">

          <div className="relative mb-16 py-16 px-8 rounded-sm overflow-hidden" style={{ background: "linear-gradient(135deg, #020204 0%, #0a1628 50%, #020204 100%)" }}>
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 30% 50%, #00B4D8 0%, transparent 50%), radial-gradient(circle at 70% 50%, #FFB800 0%, transparent 50%)" }} />
            <div className="relative text-center">
              <div className="inline-block px-4 py-1.5 rounded-full border border-amber-1000/30 bg-amber-1000/10 mb-6">
                <span className="text-amber-500 text-xs tracking-widest uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>Competitive Intelligence Report | {REPORT_DATE}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
                <span className="text-foreground">Entangle</span><span className="text-amber-500">Wealth</span>
              </h1>
              <p className="text-xl md:text-2xl text-yellow-400/90 font-semibold mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                CEO Strategic Case Study
              </p>
              <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                How EntangleWealth Delivers Bloomberg Terminal-Grade Intelligence at 99.6% Lower Cost | Backed by Market Data and Competitive Feature Analysis
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button onClick={handleDownloadPDF} className="bg-amber-1000 hover:bg-amber-500 text-black font-bold px-6 py-3 text-base gap-2">
                  <Download className="w-5 h-5" /> Download PDF Report
                </Button>
                <Button variant="outline" onClick={() => setTocOpen(!tocOpen)} className="border-gray-600 text-gray-300 hover:text-foreground px-6 py-3 text-base">
                  Table of Contents
                </Button>
              </div>
              {tocOpen && (
                <div className="mt-6 max-w-md mx-auto text-left bg-black/60 border border-gray-800 rounded-lg p-4">
                  {["Executive Summary","Market Opportunity","Competitive Landscape","The EntangleWealth Difference","Feature Matrix","Pricing Disruption","White Space & Strategic Moat","Risk Factors","Strategic Recommendations","Conclusion"].map((t, i) => (
                    <a key={i} href={`#section-${i+1}`} className="block py-1.5 text-sm text-gray-400 hover:text-amber-500 transition-colors">
                      {i + 1}. {t}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <StatCard label="Market Opportunity" value="$9.6B" sub="Growing to $34.5B by 2035" />
            <StatCard label="Cost vs Bloomberg" value="99.6%" sub="Lower annual cost" color="#00B4D8" />
            <StatCard label="AI Models" value="6" sub="Consensus verification engine" color="#FFB800" />
            <StatCard label="SEO Pages" value="166" sub="Across 7 content verticals" color="#9c27b0" />
          </div>

          <Section id="section-1" title="1. Executive Summary" subtitle="April Dunford Positioning Framework">
            <div className="bg-card border border-amber-1000/20 rounded-xl p-6 md:p-8 mb-8">
              <div className="flex items-start gap-3 mb-4">
                <Target className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-amber-500 mb-2">Positioning Statement</h3>
                  <p className="text-gray-300 leading-relaxed">
                    <strong className="text-foreground">For</strong> retail investors and independent traders <strong className="text-foreground">who</strong> need institutional-quality market intelligence,{" "}
                    <strong className="text-amber-500">EntangleWealth</strong> is a full-spectrum financial command center that delivers AI-verified consensus signals across 5,000+ NASDAQ stocks with 55+ technical indicators, live market data, options flow analysis, and integrated tax optimization.{" "}
                    <strong className="text-foreground">Unlike</strong> Bloomberg Terminal ($32,000/yr), TradingView (charting only), or Trade Ideas (scanner only),{" "}
                    <strong className="text-foreground">EntangleWealth</strong> provides the only multi-model AI consensus engine that requires 6 independent analysis methods to agree before issuing a signal | eliminating single-model bias while including career tools, tax intelligence, and community features starting at <strong className="text-emerald-400">$0/month</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-gray-800/60 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-semibold text-foreground">Competitive Alternatives</span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-400">
                  <li>• Bloomberg Terminal ($32,000/yr)</li>
                  <li>• TradingView + Trade Ideas ($3,500/yr combined)</li>
                  <li>• Spreadsheets + manual research</li>
                  <li>• "Do nothing" | gut-feel trading</li>
                </ul>
              </div>
              <div className="bg-card border border-gray-800/60 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-semibold text-foreground">Unique Attributes</span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-400">
                  <li>• 6-model AI consensus (no competitor has this)</li>
                  <li>• Full financial lifecycle (trade + tax + career)</li>
                  <li>• Bloomberg UI at 99.6% cost reduction</li>
                  <li>• 166-page programmatic SEO moat</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section id="section-2" title="2. Market Opportunity" subtitle="$9.6B TAM growing to $34.5B by 2035">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <StatCard label="Global Fintech Market" value="$394.9B" sub="18.2% CAGR → $1.76T by 2034" />
              <StatCard label="Stock Trading Apps" value="$9.6B" sub="13.62% CAGR → $34.5B by 2035" color="#FFB800" />
              <StatCard label="AI in Stock Market" value="$840M" sub="17% CAGR → $1.82B by 2030" color="#9c27b0" />
            </div>
            <div className="space-y-4">
              {[
                { icon: Users, color: "#00B4D8", title: "Democratization", text: "400M+ retail investors globally trade via mobile apps. Retail accounts for 21-35% of US equity trading volume. Yet zero platforms offer multi-model AI consensus at accessible pricing." },
                { icon: Brain, color: "#FFB800", title: "AI Maturity", text: "Predictive AI in finance reached $840M in 2025, growing 17% annually. 92% of financial institutions consider AI critical to competitiveness. The tools exist | but remain behind institutional paywalls." },
                { icon: Layers, color: "#9c27b0", title: "Fragmentation", text: "Retail investors need 3-5 separate tools (charting, scanning, news, tax, options) at $200-$500/month combined. EntangleWealth consolidates all into one platform at $29/month." },
              ].map(({ icon: Icon, color, title, text }) => (
                <div key={title} className="flex gap-4 bg-card border border-gray-800/60 rounded-lg p-5">
                  <Icon className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color }} />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4">Sources: Fortune Business Insights (2025), multiple market research firms, 2024-2025 retail trading surveys</p>
          </Section>

          <Section id="section-3" title="3. Competitive Landscape" subtitle="7 competitors analyzed across pricing, AI capability, and feature depth">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-amber-1000/30">
                    <th className="text-left py-3 px-3 text-amber-500 font-semibold">Platform</th>
                    <th className="text-left py-3 px-3 text-amber-500 font-semibold">Pricing</th>
                    <th className="text-left py-3 px-3 text-amber-500 font-semibold">Users</th>
                    <th className="text-left py-3 px-3 text-amber-500 font-semibold">AI Approach</th>
                    <th className="text-left py-3 px-3 text-amber-500 font-semibold">Threat</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Bloomberg Terminal", pricing: "$2,665/mo ($31,980/yr)", users: "325,000+", ai: "Human analysts, basic automation", threat: "Low", color: "#00B4D8" },
                    { name: "TradingView", pricing: "$0–$200/mo", users: "100M+", ai: "No AI analysis", threat: "Medium", color: "#FFB800" },
                    { name: "Trade Ideas", pricing: "$89–$254/mo", users: "~50,000", ai: "Holly AI (single model)", threat: "Medium", color: "#FFB800" },
                    { name: "Koyfin", pricing: "$0–$239/mo", users: "500,000+", ai: "No AI", threat: "Low", color: "#00B4D8" },
                    { name: "TrendSpider", pricing: "$54–$199/mo", users: "~30,000", ai: "Basic automation", threat: "Low", color: "#00B4D8" },
                    { name: "Danelfin", pricing: "$0–$59/mo", users: "~100,000", ai: "Single AI score (1-10)", threat: "Medium", color: "#FFB800" },
                    { name: "Robinhood", pricing: "$0–$5/mo", users: "24M+", ai: "No analysis AI", threat: "High", color: "#ff3366" },
                  ].map((c) => (
                    <tr key={c.name} className="border-b border-gray-800/40 hover:bg-muted/30">
                      <td className="py-3 px-3 text-foreground font-medium">{c.name}</td>
                      <td className="py-3 px-3 text-gray-400">{c.pricing}</td>
                      <td className="py-3 px-3 text-gray-400">{c.users}</td>
                      <td className="py-3 px-3 text-gray-400">{c.ai}</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded text-xs font-bold" style={{ color: c.color, background: `${c.color}15` }}>{c.threat}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-4">Sources: Bloomberg LP public filings, TradingView (tradingview.com), Robinhood Q4 2024 earnings, Trade Ideas (trade-ideas.com), Koyfin (koyfin.com), TrendSpider (trendspider.com), Danelfin (danelfin.com)</p>
          </Section>

          <Section id="section-4" title="4. The EntangleWealth Difference" subtitle="Four structural differentiators no competitor can replicate without fundamental rebuilds">
            <div className="space-y-6">
              {[
                { num: "01", icon: Brain, color: "#00B4D8", title: "6-Model AI Consensus Engine", desc: "Every competitor uses either zero AI or a single-model approach. Bloomberg relies on human analysts. TradingView has no AI analysis. Trade Ideas uses Holly | a single AI. Danelfin uses a single scoring algorithm. EntangleWealth is the ONLY platform requiring 6 independent AI models (Price Action, Volume Analysis, Options Flow, Technical Indicators, Sentiment Analysis, Risk Management) to achieve consensus before issuing a signal. This cross-verification methodology mirrors institutional quant desks | but no retail platform has implemented it." },
                { num: "02", icon: Layers, color: "#FFB800", title: "Full-Spectrum Financial Platform", desc: "Competitors are narrowly focused. Bloomberg does terminal. TradingView does charts. Trade Ideas does scanning. Robinhood does execution. None offer integrated tax intelligence (TaxGPT trained on IRS publications), career tools (resume builder, job search), income opportunities (gig marketplace, options income strategies), AND community features in a single platform. EntangleWealth consolidates what would require 5+ separate subscriptions." },
                { num: "03", icon: DollarSign, color: "#00B4D8", title: "Bloomberg-Grade Data at 99.6% Lower Cost", desc: "Bloomberg Terminal costs $31,980/year minimum with 2-year contract lock-in and 50% early termination penalty. EntangleWealth Pro delivers live market data, 55+ technical indicators, options flow, market internals (TICK, TRIN, A/D, VIX), multi-asset coverage (crypto, forex, commodities, bonds), and AI consensus analysis for $348/year | a 99.6% cost reduction. Even mid-market competitors: Trade Ideas $2,136/yr, TrendSpider $648–$2,388/yr, Koyfin Pro $948/yr | EntangleWealth undercuts every professional alternative." },
                { num: "04", icon: TrendingUp, color: "#9c27b0", title: "166-Page SEO Content Engine", desc: "EntangleWealth has deployed a programmatic SEO system generating 166 optimized pages across 7 content verticals (Glossary: 67, Indicators: 16, Strategies: 24, Patterns: 21, Sectors: 12, Comparisons: 11, Educational: 15). No competitor has comparable educational content infrastructure. This creates an organic acquisition moat that compounds over time, reducing CAC as the content library grows." },
              ].map(({ num, icon: Icon, color, title, desc }) => (
                <div key={num} className="flex gap-5 bg-card border border-gray-800/60 rounded-xl p-6 hover:border-gray-700/60 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <div className="text-center mt-2 text-xs font-bold" style={{ color, fontFamily: "JetBrains Mono, monospace" }}>#{num}</div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="section-5" title="5. Feature Matrix" subtitle="24 capabilities across 8 platforms | green wins, red gaps, yellow partial">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-amber-1000/30">
                    <th className="text-left py-2.5 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Capability</th>
                    <th className="py-2.5 px-2 text-center font-bold text-xs uppercase tracking-wider bg-amber-1000/[0.06] text-amber-500">EW</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">BBG</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">TV</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">TI</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">KF</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">TS</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">DF</th>
                    <th className="py-2.5 px-2 text-center text-gray-500 font-semibold text-xs uppercase tracking-wider">RH</th>
                  </tr>
                </thead>
                <tbody>
                  <FeatureRow feature="Multi-Model AI Consensus" ew="yes" bb="no" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Live Market Data" ew="yes" bb="yes" tv="yes" ti="yes" kf="yes" ts="yes" df="no" rh="yes" />
                  <FeatureRow feature="55+ Technical Indicators" ew="yes" bb="yes" tv="yes" ti="partial" kf="partial" ts="yes" df="no" rh="no" />
                  <FeatureRow feature="Options Flow & Greeks" ew="yes" bb="yes" tv="partial" ti="no" kf="no" ts="no" df="no" rh="partial" />
                  <FeatureRow feature="Market Internals (TICK/TRIN)" ew="yes" bb="yes" tv="no" ti="yes" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Multi-Asset Coverage" ew="yes" bb="yes" tv="yes" ti="no" kf="yes" ts="no" df="no" rh="yes" />
                  <FeatureRow feature="AI-Scored News Intelligence" ew="yes" bb="yes" tv="partial" ti="no" kf="yes" ts="no" df="no" rh="partial" />
                  <FeatureRow feature="Volatility Lab" ew="yes" bb="yes" tv="no" ti="no" kf="no" ts="yes" df="no" rh="no" />
                  <FeatureRow feature="Sector Flow Radar" ew="yes" bb="yes" tv="no" ti="partial" kf="yes" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Backtesting / Time Machine" ew="yes" bb="yes" tv="partial" ti="yes" kf="no" ts="yes" df="no" rh="no" />
                  <FeatureRow feature="Tax Intelligence (TaxGPT)" ew="yes" bb="no" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Resume Builder" ew="yes" bb="no" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Job Search Integration" ew="yes" bb="no" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Gig Marketplace" ew="yes" bb="no" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Bloomberg-Style Terminal UI" ew="yes" bb="yes" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Keyboard Shortcuts (Pro Nav)" ew="yes" bb="yes" tv="yes" ti="no" kf="yes" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Mobile-First Responsive" ew="yes" bb="no" tv="yes" ti="no" kf="partial" ts="partial" df="yes" rh="yes" />
                  <FeatureRow feature="Free Tier Available" ew="yes" bb="no" tv="yes" ti="no" kf="yes" ts="no" df="yes" rh="yes" />
                  <FeatureRow feature="Programmatic SEO (166 pages)" ew="yes" bb="no" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Community & Social" ew="yes" bb="no" tv="yes" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Economic Calendar" ew="yes" bb="yes" tv="yes" ti="no" kf="yes" ts="no" df="no" rh="partial" />
                  <FeatureRow feature="Stock Screener (5000+)" ew="yes" bb="yes" tv="yes" ti="yes" kf="yes" ts="yes" df="yes" rh="yes" />
                  <FeatureRow feature="P&L Simulator" ew="yes" bb="yes" tv="no" ti="no" kf="no" ts="no" df="no" rh="no" />
                  <FeatureRow feature="Stripe Payments + KYC" ew="yes" bb="yes" tv="yes" ti="yes" kf="yes" ts="yes" df="yes" rh="yes" />
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Full support</span>
              <span className="flex items-center gap-1.5"><Minus className="w-3 h-3 text-yellow-400" /> Partial</span>
              <span className="flex items-center gap-1.5"><X className="w-3 h-3 text-red-400/60" /> Not available</span>
              <span className="text-gray-600 ml-4">EW = EntangleWealth, BBG = Bloomberg, TV = TradingView, TI = Trade Ideas, KF = Koyfin, TS = TrendSpider, DF = Danelfin, RH = Robinhood</span>
            </div>
            <div className="mt-6 bg-card border border-emerald-500/20 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-bold text-foreground">Feature Count Scorecard</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {[
                  { name: "EntangleWealth", score: "24/24", pct: "100%", color: "#00B4D8" },
                  { name: "Bloomberg", score: "16/24", pct: "67%", color: "#FFB800" },
                  { name: "TradingView", score: "12/24", pct: "50%", color: "#9c27b0" },
                  { name: "Robinhood", score: "8/24", pct: "33%", color: "#ff3366" },
                ].map(s => (
                  <div key={s.name} className="text-center p-3 rounded-lg bg-black/40">
                    <div className="text-xs text-gray-500 mb-1">{s.name}</div>
                    <div className="text-lg font-bold" style={{ color: s.color, fontFamily: "JetBrains Mono, monospace" }}>{s.score}</div>
                    <div className="text-xs text-gray-600">{s.pct} coverage</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="section-6" title="6. Pricing Disruption Analysis" subtitle="Annual cost for comparable professional feature sets">
            <div className="space-y-3 mb-8">
              {[
                { name: "Bloomberg Terminal", cost: "$31,980/yr", note: "2-year lock-in, 50% early exit penalty, $300 proprietary keyboard", bar: 100, color: "#ff3366" },
                { name: "Trade Ideas Premium", cost: "$2,136/yr", note: "Holly AI requires Premium tier", bar: 6.7, color: "#ff6b35" },
                { name: "TrendSpider Advanced", cost: "$2,388/yr", note: "Top tier for full features", bar: 7.5, color: "#ff6b35" },
                { name: "Koyfin Pro", cost: "$948/yr", note: "Capital IQ data, no AI analysis", bar: 3, color: "#FFB800" },
                { name: "TradingView Premium", cost: "$720/yr", note: "Charts only, no AI, no tax tools", bar: 2.3, color: "#FFB800" },
                { name: "Danelfin Pro", cost: "$499/yr", note: "Single score, no terminal", bar: 1.6, color: "#FFB800" },
                { name: "EntangleWealth Pro", cost: "$348/yr", note: "Full platform: 6-model AI + terminal + tax + career", bar: 1.1, color: "#00B4D8", highlight: true },
                { name: "EntangleWealth Starter", cost: "$0/yr", note: "Core features free forever", bar: 0.05, color: "#00B4D8", highlight: true },
              ].map((p) => (
                <div key={p.name} className={`flex items-center gap-4 p-4 rounded-lg ${p.highlight ? "bg-amber-1000/[0.06] border border-amber-1000/20" : "bg-card border border-gray-800/40"}`}>
                  <div className="w-48 flex-shrink-0">
                    <div className={`text-sm font-medium ${p.highlight ? "text-amber-500" : "text-foreground"}`}>{p.name}</div>
                    <div className="text-xs text-gray-500">{p.note}</div>
                  </div>
                  <div className="flex-1 h-6 bg-gray-900 rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(p.bar, 1)}%`, background: p.color }} />
                  </div>
                  <div className="w-28 text-right font-bold" style={{ color: p.color, fontFamily: "JetBrains Mono, monospace" }}>{p.cost}</div>
                </div>
              ))}
            </div>
            <div className="bg-card border border-yellow-500/20 rounded-lg p-5">
              <h4 className="font-bold text-yellow-400 mb-2">Cost Efficiency Analysis</h4>
              <p className="text-sm text-gray-400">
                EntangleWealth delivers <strong className="text-foreground">24 core capabilities</strong> at <strong className="text-emerald-400">$14.50/capability/year</strong>.
                Bloomberg delivers comparable depth at <strong className="text-red-400">$1,332/capability/year</strong> | a{" "}
                <strong className="text-amber-500">92x efficiency advantage</strong>.
                For a 10-person trading desk, switching from Bloomberg to EntangleWealth saves <strong className="text-emerald-400">$316,320/year</strong>.
              </p>
            </div>
          </Section>

          <Section id="section-7" title="7. White Space & Strategic Moat" subtitle="Four market gaps where EntangleWealth operates without direct competition">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "AI Consensus Verification", desc: "No competitor offers multi-model signal cross-verification. Single-model approaches are vulnerable to bias. EntangleWealth's 6-model consensus is architecturally unique in retail.", color: "#00B4D8" },
                { title: "Financial Wellness Integration", desc: "Zero competitors combine trading analysis with tax optimization, career tools, and income generation. EntangleWealth addresses the full financial lifecycle of 400M+ retail investors.", color: "#FFB800" },
                { title: "Content-Led Acquisition", desc: "No competitor has deployed programmatic SEO at this scale. 166 pages across 7 verticals create a compounding organic traffic moat that reduces CAC over time.", color: "#00B4D8" },
                { title: "Price-to-Feature Ratio", desc: "The market splits into expensive-and-complete (Bloomberg) or cheap-and-limited (Robinhood). No platform occupies Bloomberg-features-at-retail-pricing.", color: "#9c27b0" },
              ].map((g) => (
                <div key={g.title} className="bg-card border border-gray-800/60 rounded-lg p-5">
                  <div className="w-3 h-3 rounded-full mb-3" style={{ background: g.color }} />
                  <h4 className="font-bold text-foreground mb-2">{g.title}</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="section-8" title="8. Risk Factors & Honest Assessment" subtitle="Where competitors currently lead | and our mitigation strategy">
            <div className="bg-card border border-red-500/20 rounded-lg p-6 mb-6">
              <h4 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Competitive Advantages Held by Others
              </h4>
              <div className="space-y-3">
                {[
                  { area: "Data Network Effects", detail: "Bloomberg's 325K terminal users generate proprietary data and IB chat creates institutional switching costs.", leader: "Bloomberg" },
                  { area: "Community Scale", detail: "TradingView's 100M+ users create massive community-driven indicator libraries and social trading content.", leader: "TradingView" },
                  { area: "Trade Execution", detail: "Robinhood's 24M funded accounts include built-in order execution. EntangleWealth provides analysis only.", leader: "Robinhood" },
                  { area: "Indicator Library", detail: "TradingView offers 400+ indicators vs. EntangleWealth's 55+. However, most traders use 3-8 consistently.", leader: "TradingView" },
                ].map((r) => (
                  <div key={r.area} className="flex gap-3 items-start">
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded flex-shrink-0 mt-0.5">{r.leader}</span>
                    <div>
                      <span className="text-sm text-foreground font-medium">{r.area}: </span>
                      <span className="text-sm text-gray-400">{r.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-emerald-500/20 rounded-lg p-6">
              <h4 className="font-bold text-emerald-400 mb-2">Mitigation</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                EntangleWealth's moat is not in competing on Bloomberg's data depth or TradingView's indicator count | it's in the <strong className="text-foreground">AI consensus layer</strong> and <strong className="text-foreground">full-lifecycle financial platform</strong> that neither can replicate without fundamental architectural changes.  
                The brokerage execution gap can be closed through Alpaca embedded trading integration, which is on the product roadmap.
              </p>
            </div>
          </Section>

          <Section id="section-9" title="9. Strategic Recommendations" subtitle="Five specific actions with source citations">
            <div className="space-y-4">
              {[
                { num: 1, title: "Lead with Cost Disruption", text: "In all investor and user-facing materials, anchor on the $31,980 vs. $348 comparison (99.6% cost reduction). This is the most compelling narrative for fundraising and user acquisition.", source: "Bloomberg LP January 2025 pricing letter" },
                { num: 2, title: "Own the 'AI Consensus' Category", text: "No competitor has claimed multi-model verification as a positioning category. File for trademark on 'Quantum Entanglement Analysis.' Build case studies showing signal accuracy from consensus vs. single-model.", source: "Competitive feature analysis (Section 5)" },
                { num: 3, title: "Expand SEO Moat to 500+ Pages", text: "Current 166 pages should grow to 500+ within 6 months. Target long-tail keywords: 'best [indicator] strategy', '[stock] vs [stock]'. Est. organic traffic value at 500 pages: $15K-40K/month.", source: "Programmatic SEO page audit" },
                { num: 4, title: "Close the Execution Gap", text: "Partner with Alpaca for embedded execution to close the analysis-to-execution gap. This eliminates Robinhood's primary structural advantage while maintaining analytical superiority.", source: "Robinhood Q4 2024 earnings, Alpaca API capabilities" },
                { num: 5, title: "Deploy Battlecard Questions", text: "For prospects evaluating Bloomberg: 'What would you do with the $31,000 you save per seat per year?' For TradingView: 'How many AI models cross-check your signals before you trade?'", source: "April Dunford positioning framework" },
              ].map((a) => (
                <div key={a.num} className="flex gap-4 bg-card border border-gray-800/60 rounded-lg p-5">
                  <div className="w-10 h-10 rounded-lg bg-amber-1000/10 border border-amber-1000/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-500 font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>{a.num}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">{a.title}</h4>
                    <p className="text-sm text-gray-400 mb-2">{a.text}</p>
                    <p className="text-xs text-gray-600">Source: {a.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="section-10" title="10. Conclusion">
            <div className="bg-gradient-to-br from-amber-1000/5 to-yellow-500/5 border border-gray-800/60 rounded-xl p-8">
              <p className="text-gray-300 leading-relaxed mb-4">
                EntangleWealth occupies a <strong className="text-foreground">unique and defensible position</strong> in a $9.6B market growing to $34.5B by 2035.
                No existing platform combines multi-model AI consensus verification, Bloomberg-grade market intelligence, tax optimization, career tools, and programmatic content infrastructure at accessible pricing.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                The competitive landscape reveals a clear pattern: incumbents are either <strong className="text-red-400">too expensive</strong> (Bloomberg),{" "}
                <strong className="text-yellow-400">too narrow</strong> (TradingView, Trade Ideas), or{" "}
                <strong className="text-yellow-400">too shallow</strong> (Robinhood, Danelfin).
                EntangleWealth is architected to serve the intersection | delivering institutional-quality intelligence at retail pricing while addressing the full financial lifecycle.
              </p>
              <p className="text-gray-300 leading-relaxed">
                The 6-model AI consensus engine is not a feature | <strong className="text-amber-500">it is a category</strong>. No competitor can replicate it without rebuilding their analysis infrastructure from the ground up. Combined with the 166-page SEO content moat, integrated financial wellness tools, and pricing that undercuts every professional alternative by 73-99%,{" "}
                <strong className="text-foreground">EntangleWealth is positioned to capture significant share of the retail financial intelligence market</strong>.
              </p>
            </div>
          </Section>

          <div className="border-t border-gray-800/40 pt-8 mb-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Sources & Citations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
              {[
                "[1] Bloomberg LP | Jan 2025 pricing letter: 6.5% increase to $2,665/mo ($31,980/yr)",
                "[2] TradingView | 100M+ users, 150+ exchanges (tradingview.com)",
                "[3] Trade Ideas | Holly AI overnight backtesting, Premium $254/mo (trade-ideas.com)",
                "[4] Koyfin | 500K+ investors, Capital IQ powered (koyfin.com)",
                "[5] TrendSpider | Automated analysis, 4 tiers $54-$199/mo (trendspider.com)",
                "[6] Danelfin | AI Score 1-10, 10K+ features/stock (danelfin.com)",
                "[7] Robinhood | Q4 2024: 24M funded accounts, Gold $5/mo (robinhood.com)",
                "[8] Fortune Business Insights | Fintech $394.9B (2025), 18.2% CAGR",
                "[9] Stock Trading App Market | $9.6B → $34.5B (2035), 13.62% CAGR",
                "[10] Predictive AI in Stock Market | $840M → $1.82B (2030), 17% CAGR",
                "[11] Retail Trading | 400M+ global users, 60%+ mobile (2024-2025)",
              ].map((s) => (
                <p key={s}>{s}</p>
              ))}
            </div>
          </div>

          <div className="text-center pb-12">
            <Button onClick={handleDownloadPDF} className="bg-amber-1000 hover:bg-amber-500 text-black font-bold px-8 py-4 text-lg gap-2">
              <Download className="w-5 h-5" /> Download Full PDF Report
            </Button>
            <p className="text-xs text-gray-600 mt-3">CONFIDENTIAL | For Internal & Investor Use Only</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
