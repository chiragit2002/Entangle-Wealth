import { ssrHtmlShell, escHtml, SITE_URL } from "./ssrShared";

export interface StockComparison {
  slug: string;
  stockA: { ticker: string; name: string; sector: string };
  stockB: { ticker: string; name: string; sector: string };
  category: "mega-cap" | "semiconductor" | "cloud" | "fintech" | "auto" | "retail" | "pharma" | "streaming" | "social" | "energy";
  overview: string;
  businessModelA: string;
  businessModelB: string;
  revenueComparison: string;
  growthComparison: string;
  valuationComparison: string;
  dividendComparison: string;
  riskComparison: string;
  verdict: string;
}

const CAT_META: Record<string, { label: string; color: string }> = {
  "mega-cap": { label: "Mega Cap", color: "cyan" },
  semiconductor: { label: "Semiconductors", color: "purple" },
  cloud: { label: "Cloud & SaaS", color: "cyan" },
  fintech: { label: "Fintech", color: "gold" },
  auto: { label: "Automotive", color: "red" },
  retail: { label: "Retail", color: "green" },
  pharma: { label: "Pharma", color: "green" },
  streaming: { label: "Streaming", color: "red" },
  social: { label: "Social Media", color: "purple" },
  energy: { label: "Energy", color: "gold" },
};

export const COMPARISONS: StockComparison[] = [
  {
    slug: "aapl-vs-msft",
    stockA: { ticker: "AAPL", name: "Apple", sector: "Technology" },
    stockB: { ticker: "MSFT", name: "Microsoft", sector: "Technology" },
    category: "mega-cap",
    overview: "The two largest companies by market cap, Apple and Microsoft compete for the world's most valuable company title. While both are technology giants, their business models diverge significantly — Apple dominates consumer hardware and services, while Microsoft leads enterprise software and cloud computing.",
    businessModelA: "Apple's revenue is driven by iPhone (52%), Services (22%), Mac (8%), iPad (7%), and Wearables (11%). The company operates a vertically integrated hardware-software ecosystem that creates powerful lock-in through iOS, macOS, and the App Store. Services (Apple Music, iCloud, App Store fees) are the highest-growth, highest-margin segment.",
    businessModelB: "Microsoft's revenue comes from Intelligent Cloud (Azure, 42%), Productivity & Business (Office 365, LinkedIn, 33%), and More Personal Computing (Windows, Xbox, 25%). Azure is the fastest-growing segment, competing directly with AWS. Microsoft's strength is its enterprise moat — Office 365 and Azure are deeply embedded in corporate workflows.",
    revenueComparison: "Apple generates approximately $383B in annual revenue versus Microsoft's $227B. However, Microsoft's revenue growth rate has been higher (15-20% vs. Apple's 5-8%) due to Azure's rapid expansion. Apple's revenue is more hardware-dependent and seasonal (Q4 iPhone launches), while Microsoft's is more recurring (subscription-based).",
    growthComparison: "Microsoft has the higher growth rate driven by Azure's 30%+ growth. Apple's growth has slowed as the smartphone market matures, but Services growth (15-20%) is accelerating. Microsoft benefits from AI tailwinds (Copilot integration across Office, GitHub, Azure OpenAI). Apple's growth catalyst is the Vision Pro platform and India market expansion.",
    valuationComparison: "Both trade at premium valuations (28-35× P/E) reflecting their quality and moat. Microsoft typically trades at a slight premium due to higher growth. Apple's P/E has expanded as the market values its Services transition. On a PEG basis (P/E relative to growth), Microsoft offers better value given its higher growth rate.",
    dividendComparison: "Both pay dividends but are primarily growth stocks. Apple yields ~0.5% with massive buyback programs ($90B+ annually) that are the primary shareholder return mechanism. Microsoft yields ~0.7% with growing dividends and buybacks. Apple's buyback program is the largest in corporate history.",
    riskComparison: "Apple risk: iPhone concentration (52% of revenue), China manufacturing dependency, App Store regulatory threats (DMA, antitrust), and smartphone market saturation. Microsoft risk: Azure competition with AWS, AI monetization uncertainty, enterprise spending cycles, and antitrust scrutiny on Activision/gaming.",
    verdict: "Both are exceptional long-term holdings. Microsoft offers higher growth through Azure and AI leadership but at a premium. Apple offers unmatched ecosystem moat and massive buybacks but faces growth challenges. For growth investors, Microsoft edges ahead; for dividend and buyback enthusiasts, Apple's capital return program is unrivaled.",
  },
  {
    slug: "nvda-vs-amd",
    stockA: { ticker: "NVDA", name: "NVIDIA", sector: "Technology" },
    stockB: { ticker: "AMD", name: "AMD", sector: "Technology" },
    category: "semiconductor",
    overview: "The AI chip wars pit NVIDIA's dominant GPU ecosystem against AMD's growing portfolio of data center accelerators and CPUs. Both companies are central to the AI infrastructure boom, but their market positions and strategies differ significantly.",
    businessModelA: "NVIDIA derives 80%+ of revenue from Data Center (AI training and inference GPUs), with Gaming, Professional Visualization, and Automotive making up the rest. The CUDA software ecosystem creates deep lock-in — developers build on NVIDIA's platform, making switching costs enormous. The A100/H100/B200 GPU families dominate AI training.",
    businessModelB: "AMD has a more diversified model: Data Center (EPYC CPUs + MI300 AI accelerators, 50%), Client (Ryzen CPUs, 25%), Gaming (Radeon GPUs + console chips, 15%), and Embedded (10%). AMD competes in both CPU (vs. Intel) and GPU (vs. NVIDIA) markets, offering price-performance value across multiple segments.",
    revenueComparison: "NVIDIA's revenue ($60B+) has surpassed AMD's ($23B) by a wide margin due to the AI boom. NVIDIA's growth rate has been extraordinary (100%+ YoY) driven by data center GPU demand. AMD is growing data center revenue at 50-70% but from a smaller base. NVIDIA has pricing power that AMD currently lacks in AI.",
    growthComparison: "NVIDIA's growth has been parabolic — the AI training market is essentially a monopoly. AMD's MI300X is gaining traction but is at least 12-18 months behind in software ecosystem maturity. NVIDIA's CUDA moat is the key differentiator. AMD has better growth potential in CPUs (taking share from Intel) and offers a more diversified growth profile.",
    valuationComparison: "NVIDIA trades at 35-45× forward P/E, reflecting its dominant AI position. AMD trades at 25-35× forward P/E. On a PEG basis, both are similarly valued relative to their growth rates. NVIDIA's premium is justified by its near-monopoly position, but any AI spending slowdown would compress the multiple significantly.",
    dividendComparison: "NVIDIA pays a nominal dividend (~0.02% yield) — essentially a token payment. AMD pays no dividend. Both companies reinvest profits into R&D and strategic acquisitions. Neither is suitable for income investors.",
    riskComparison: "NVIDIA risk: extreme AI capex concentration risk, China export restrictions, competition from custom chips (Google TPU, Amazon Trainium), and valuation compression if AI spending disappoints. AMD risk: CUDA ecosystem disadvantage, Intel resurgence under new leadership, console cycle weakness, and execution risk on MI300 ramp.",
    verdict: "NVIDIA is the AI infrastructure monopoly with proven dominance but trades at a premium. AMD offers a more diversified bet on semiconductors with multiple growth vectors and a lower valuation. For pure AI exposure, NVIDIA is the pick. For a diversified semiconductor play with CPU and GPU growth, AMD offers more balanced risk/reward.",
  },
  {
    slug: "googl-vs-meta",
    stockA: { ticker: "GOOGL", name: "Alphabet (Google)", sector: "Communication Services" },
    stockB: { ticker: "META", name: "Meta Platforms", sector: "Communication Services" },
    category: "social",
    overview: "The digital advertising duopoly faces off — Google controls search and YouTube advertising while Meta dominates social media advertising through Facebook, Instagram, WhatsApp, and Threads. Both are investing heavily in AI, but with different strategic focuses.",
    businessModelA: "Alphabet generates 78% of revenue from advertising (Google Search 57%, YouTube 10%, Network 11%), with Google Cloud (11%) and Other Bets (Waymo, Verily, 1%) providing diversification. Google Search has a near-monopoly in search advertising. YouTube is the world's largest video platform. Google Cloud is the #3 cloud provider growing 25%+.",
    businessModelB: "Meta derives 98% of revenue from advertising across its Family of Apps (Facebook, Instagram, WhatsApp, Messenger). Reality Labs (VR/AR hardware and metaverse) generates <2% of revenue but consumes $15B+ annually in R&D. Meta's advantage is personalized social advertising using deep user engagement data.",
    revenueComparison: "Alphabet generates $307B+ in revenue versus Meta's $134B. However, Meta's per-user revenue is higher and the company operates at higher margins. Alphabet is more diversified (Cloud adds non-ad revenue). Both are recovering strongly from the 2022 digital ad recession with 20%+ growth.",
    growthComparison: "Meta has shown the stronger revenue growth rebound (25%+) driven by Reels monetization and AI-powered ad targeting improvements. Alphabet's growth is solid (15-20%) but faces antitrust headwinds. Google Cloud is the highest-growth division at Alphabet. Meta's growth depends on Instagram and WhatsApp monetization.",
    valuationComparison: "Both trade at similar valuations (22-28× forward P/E). Meta is often slightly cheaper due to Reality Labs losses and metaverse uncertainty. Alphabet is viewed as higher quality due to diversification. Both are historically cheap relative to their growth rates, reflecting market skepticism about AI disruption to search.",
    dividendComparison: "Both recently initiated dividends (2024). Alphabet yields ~0.5% and Meta ~0.3%. Both conduct significant buybacks. Shareholder returns are primarily through buybacks rather than dividends.",
    riskComparison: "Alphabet risk: antitrust cases (DOJ search monopoly), AI disruption of search (ChatGPT), YouTube competition (TikTok), and regulatory fragmentation. Meta risk: Reality Labs cash burn ($15B+/year), user growth saturation, Apple privacy changes affecting ad targeting, and regulatory risks (children's safety, content moderation).",
    verdict: "Alphabet offers better diversification (Search + Cloud + YouTube) and a stronger moat in search. Meta offers higher growth potential and better per-user monetization. For conservative investors, Alphabet's diversification wins. For growth-focused investors willing to tolerate Reality Labs spending, Meta's social advertising dominance and margin expansion are compelling.",
  },
  {
    slug: "amzn-vs-wmt",
    stockA: { ticker: "AMZN", name: "Amazon", sector: "Consumer Discretionary" },
    stockB: { ticker: "WMT", name: "Walmart", sector: "Consumer Staples" },
    category: "retail",
    overview: "The retail battle of the century — Amazon's e-commerce and cloud empire versus Walmart's massive physical retail network and growing digital presence. Both are evolving their strategies: Amazon expanding physical presence, Walmart accelerating e-commerce.",
    businessModelA: "Amazon operates three pillars: AWS (cloud computing, ~62% of operating income), Online Store & Marketplace (e-commerce, ~30%), and Advertising (8%+ and growing). AWS subsidizes retail operations. Amazon Prime (200M+ subscribers) creates ecosystem lock-in. The company reinvests aggressively in logistics, AI, and new ventures.",
    businessModelB: "Walmart is the world's largest retailer with $611B+ in annual revenue. Revenue: US stores (66%), International (18%), Sam's Club (13%), and growing e-commerce (3%). Walmart's competitive advantages are supply chain efficiency, scale-based pricing power, and 4,700 US locations within 10 miles of 90% of Americans.",
    revenueComparison: "Walmart generates $611B versus Amazon's $574B in total revenue. But profitability differs dramatically: Amazon's operating income is $36B+ (led by AWS) while Walmart's is $27B. Amazon's revenue grows at 12-15% while Walmart grows at 5-7%. AWS alone generates more profit than all of Walmart.",
    growthComparison: "Amazon's growth is driven by AWS (20%+ growth), advertising (25%+ growth), and international expansion. Walmart's growth comes from same-store sales (3-5%), e-commerce acceleration (20%+ growth from a smaller base), and Walmart+ membership. Amazon has more growth vectors but Walmart is a more defensive holding.",
    valuationComparison: "Amazon trades at 35-45× forward P/E reflecting its growth profile and AWS dominance. Walmart trades at 25-30× forward P/E, a premium to historical levels due to its e-commerce transformation and defensive qualities. Amazon is better valued on a sum-of-parts basis (AWS + retail + ads).",
    dividendComparison: "Walmart is a Dividend Aristocrat with 50+ years of consecutive increases, yielding ~1.3%. Amazon paid no dividend historically but initiated a small dividend in 2024. Walmart is the clear choice for income investors. Amazon returns capital primarily through buybacks.",
    riskComparison: "Amazon risk: AWS competition (Azure, GCP), antitrust regulation, margin pressure from logistics investments, and retail competition. Walmart risk: margin pressure from e-commerce investments, rising labor costs, consumer spending weakness, and competition from Amazon and deep-discount retailers (Aldi, Dollar stores).",
    verdict: "Amazon is the superior growth investment with AWS providing a high-margin profit engine and advertising as an emerging juggernaut. Walmart is the better defensive investment with consistent dividends, physical retail moat, and improving digital strategy. Growth portfolios favor Amazon; income and stability portfolios favor Walmart.",
  },
  {
    slug: "tsla-vs-f",
    stockA: { ticker: "TSLA", name: "Tesla", sector: "Consumer Discretionary" },
    stockB: { ticker: "F", name: "Ford", sector: "Consumer Discretionary" },
    category: "auto",
    overview: "The EV revolution pits Tesla — the pure-play electric vehicle disruptor — against Ford, the 120-year-old auto giant transitioning from ICE to electric. Their approaches to electrification, margins, and valuation couldn't be more different.",
    businessModelA: "Tesla is an integrated energy and transportation company. Revenue: Automotive (82%), Energy Generation & Storage (10%), Services (8%). Beyond cars, Tesla sells Powerwall/Megapack energy storage, Solar Roof, and is developing Full Self-Driving (FSD) and Optimus humanoid robot. The company operates gigafactories globally with vertical integration.",
    businessModelB: "Ford operates traditional auto manufacturing with a growing EV division. Segments: Ford Blue (ICE vehicles, profitable), Ford Model e (EVs, currently unprofitable), Ford Pro (commercial vehicles, highest margin). Ford carries legacy costs (pensions, dealer network, UAW labor agreements) that Tesla doesn't have.",
    revenueComparison: "Ford generates $176B versus Tesla's $96B in revenue. But Tesla's automotive gross margin (18-20%) far exceeds Ford's (5-8%). Ford's volume (4.4M vehicles) dwarfs Tesla's (1.8M). Tesla has much higher revenue per vehicle due to premium pricing and direct-to-consumer sales (no dealer markup).",
    growthComparison: "Tesla's growth has slowed from 50%+ to 15-20% as EV competition intensifies from BYD, Rivian, and legacy automakers. Ford's Model e is growing but losing $4-5B annually. Tesla's growth catalysts are FSD licensing, energy storage, and lower-cost models. Ford's growth depends on Ford Pro's profitability and EV cost reduction.",
    valuationComparison: "Tesla trades at 50-80× forward P/E — a massive premium reflecting AI/FSD optionality, energy business, and future revenue streams. Ford trades at 6-10× forward P/E, typical of legacy auto. The valuation gap reflects the market's belief in Tesla's technology platform versus Ford's traditional auto business.",
    dividendComparison: "Ford pays a substantial dividend (~5% yield) plus occasional special dividends. Tesla pays no dividend and has historically not prioritized shareholder returns. Ford is an income stock; Tesla is a pure growth/momentum stock.",
    riskComparison: "Tesla risk: valuation compression, EV competition (BYD dominance in China), FSD regulatory delays, Elon Musk key-person risk, and margin pressure from price cuts. Ford risk: EV transition losses ($4-5B/year), UAW labor costs, ICE decline faster than EV ramp, legacy liabilities, and capital-intensive manufacturing.",
    verdict: "Tesla is a bet on future technology (FSD, AI, energy, robotics) at a premium valuation — high reward, high risk. Ford is a value play on a legacy automaker navigating the EV transition with an attractive dividend but significant execution risk. Risk-tolerant growth investors pick Tesla; income and value investors pick Ford.",
  },
  {
    slug: "v-vs-ma",
    stockA: { ticker: "V", name: "Visa", sector: "Financials" },
    stockB: { ticker: "MA", name: "Mastercard", sector: "Financials" },
    category: "fintech",
    overview: "The payment network duopoly — Visa and Mastercard together process over 85% of global card transactions outside China. Both operate asset-light business models with extraordinary margins and benefit from the global shift from cash to digital payments.",
    businessModelA: "Visa processes 260+ billion transactions annually across 200+ countries. Revenue comes from service fees (payment volume), data processing (transactions processed), international fees (cross-border), and other revenues (consulting). Visa's network handles more volume than Mastercard, particularly in debit. Operating margin: ~67%.",
    businessModelB: "Mastercard processes 130+ billion transactions annually with higher international exposure than Visa. Revenue streams mirror Visa's: assessment fees, processing fees, cross-border fees, and value-added services. Mastercard has historically grown faster due to greater international and commercial payment exposure. Operating margin: ~57%.",
    revenueComparison: "Visa generates $32B versus Mastercard's $25B in annual revenue. Visa's larger network processes more total volume. However, Mastercard has grown revenue faster (15-18% vs. Visa's 10-12%) due to stronger international and cross-border exposure. Both have exceptionally predictable revenue streams.",
    growthComparison: "Mastercard has delivered higher growth due to international expansion and value-added services. Visa's growth is robust but slightly slower as it has higher market share (there's a ceiling effect). Both benefit from: cash-to-digital conversion (still 70%+ of global transactions are cash), cross-border travel recovery, and contactless adoption.",
    valuationComparison: "Both trade at premium valuations (30-35× forward P/E) reflecting their duopoly position and consistent double-digit growth. Mastercard typically trades at a slight premium due to higher growth. On a PEG basis, they're similarly valued. Both are perennial 'expensive but worth it' stocks.",
    dividendComparison: "Visa yields ~0.7% with a 20%+ payout ratio and 15+ years of consecutive increases. Mastercard yields ~0.5% with similar growth trajectory. Both prioritize buybacks alongside growing dividends. Neither is primarily an income stock — the yield is a bonus on top of capital appreciation.",
    riskComparison: "Shared risks: regulatory interchange fee pressure, fintech disruption (buy-now-pay-later, account-to-account payments), cryptocurrency/stablecoin competition, antitrust scrutiny, and China's UnionPay dominance domestically. Both face the risk that real-time payment systems (FedNow, PIX) bypass card networks.",
    verdict: "You genuinely can't go wrong with either — they're essentially a duopoly in the secular shift from cash to digital. Mastercard offers slightly higher growth from international exposure. Visa offers slightly more stability from its larger network. Many investors simply own both. If forced to choose, growth investors lean Mastercard; stability investors lean Visa.",
  },
  {
    slug: "nflx-vs-dis",
    stockA: { ticker: "NFLX", name: "Netflix", sector: "Communication Services" },
    stockB: { ticker: "DIS", name: "Walt Disney", sector: "Communication Services" },
    category: "streaming",
    overview: "The streaming war between Netflix — the pure-play streaming pioneer — and Disney, the content conglomerate with parks, movies, and Disney+. Netflix has achieved profitability at scale while Disney struggles to make streaming profitable alongside its traditional media empire.",
    businessModelA: "Netflix is a pure streaming platform with 260M+ subscribers globally. Revenue is nearly 100% subscription-based across 4 tiers (ad-supported, standard, premium, and standard with ads). Content spending of $17B+ annually creates a massive library advantage. The company has achieved 25%+ operating margins at scale.",
    businessModelB: "Disney operates across four segments: Entertainment (Disney+, Hulu, movies, 40% of revenue), Experiences (theme parks, cruises, 37%), Sports (ESPN+, 18%), and corporate. Disney+ has 150M+ subscribers but operates near breakeven. Parks are highly profitable (25%+ margins) and provide revenue stability.",
    revenueComparison: "Disney generates $88B versus Netflix's $35B in revenue. Disney is far more diversified but lower-margin overall. Netflix's revenue is growing faster (15%+) and is almost entirely recurring. Disney's parks revenue is strong but seasonal and capital-intensive.",
    growthComparison: "Netflix is in a mature growth phase — subscriber growth has slowed but revenue per user is rising through price increases and ad-tier adoption. Disney's growth depends on Disney+ subscriber growth, parks expansion, and ESPN's digital transformation. Netflix has better unit economics; Disney has more growth levers.",
    valuationComparison: "Netflix trades at 30-40× forward P/E reflecting its market leadership and proven profitability. Disney trades at 18-25× forward P/E, discounted due to streaming losses, linear TV decline, and execution concerns. Netflix is priced for continued dominance; Disney is priced for a turnaround.",
    dividendComparison: "Disney suspended its dividend in 2020 (COVID) and partially restored it with a ~0.7% yield. Netflix pays no dividend. Disney has historically been an income stock; Netflix has never been one. Disney offers modest income; Netflix offers pure growth.",
    riskComparison: "Netflix risk: content fatigue, subscriber saturation in developed markets, password-sharing crackdowns creating churn, and competition from every streaming service. Disney risk: streaming profitability timeline, ESPN cord-cutting, theme park economic sensitivity, and CEO succession concerns.",
    verdict: "Netflix is the proven streaming winner with superior margins and business model simplicity. Disney offers diversification (parks + streaming + ESPN) and is a better value play at current levels. For streaming purity, Netflix wins. For a diversified entertainment conglomerate at a discount, Disney is the contrarian pick.",
  },
  {
    slug: "jpm-vs-gs",
    stockA: { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials" },
    stockB: { ticker: "GS", name: "Goldman Sachs", sector: "Financials" },
    category: "fintech",
    overview: "The two pillars of Wall Street — JPMorgan, the universal bank serving everyone from Main Street to Wall Street, versus Goldman Sachs, the elite investment bank pivoting to a broader financial services model.",
    businessModelA: "JPMorgan is the largest US bank with four segments: Consumer & Community Banking (retail, 40%), Corporate & Investment Bank (28%), Commercial Banking (14%), and Asset & Wealth Management (18%). It is the only bank with leadership positions across all major financial services: retail, investment banking, trading, commercial banking, and wealth management.",
    businessModelB: "Goldman Sachs operates primarily in three segments: Global Banking & Markets (investment banking, trading, 65%), Asset & Wealth Management (30%), and Platform Solutions (consumer, 5%). Goldman has retreated from consumer banking (Marcus) to refocus on its core strengths: institutional clients, trading, and alternative investments.",
    revenueComparison: "JPMorgan generates $154B+ in managed revenue versus Goldman's $46B. JPM's diversification creates more stable revenue. Goldman's revenue is more volatile, depending heavily on trading and deal activity. JPM's consumer banking provides a stable deposit base that Goldman lacks.",
    growthComparison: "JPMorgan offers more consistent growth (10-15%) driven by net interest income and fee-based businesses. Goldman's growth is more cyclical — explosive during M&A booms and capital markets activity, subdued during slowdowns. Goldman's alternatives/wealth management push is a structural growth initiative.",
    valuationComparison: "JPMorgan trades at 12-14× forward P/E, a premium to most banks reflecting its quality. Goldman trades at 10-12× forward P/E, cheaper due to revenue volatility. Both are attractively valued relative to the broader market. JPM commands a deserved premium for its consistency and franchise.",
    dividendComparison: "JPMorgan yields ~2.2% with a strong history of dividend growth and buybacks. Goldman yields ~2.5% with growing shareholder returns. Both return significant capital to shareholders. JPM's dividend is more reliable due to its stable consumer banking base.",
    riskComparison: "JPMorgan risk: credit cycle deterioration in consumer loans, regulatory capital requirements, net interest margin compression if rates fall, and CEO succession (Jamie Dimon). Goldman risk: M&A activity dependence, trading revenue volatility, consumer banking losses (Marcus write-downs), and key-person risk in deal relationships.",
    verdict: "JPMorgan is the best-in-class universal bank — the gold standard of banking with unmatched diversification. Goldman is the elite investment bank with higher beta to capital markets activity. For core bank holdings, JPM is the clear winner. For capital markets cycle exposure, Goldman offers more upside during deal booms.",
  },
  {
    slug: "xom-vs-cvx",
    stockA: { ticker: "XOM", name: "ExxonMobil", sector: "Energy" },
    stockB: { ticker: "CVX", name: "Chevron", sector: "Energy" },
    category: "energy",
    overview: "America's two supermajor oil companies — ExxonMobil, the world's largest publicly traded oil company, versus Chevron, its slightly smaller but more agile rival. Both dominate upstream production, downstream refining, and are navigating the energy transition.",
    businessModelA: "ExxonMobil operates across Upstream (exploration & production, 60% of earnings), Downstream (refining & chemicals, 25%), and Chemicals (15%). The company is the world's largest refiner and a major chemicals producer. ExxonMobil's Permian Basin and Guyana assets are among the world's best new production sources.",
    businessModelB: "Chevron operates Upstream (70% of earnings) and Downstream (refining, chemicals, lubricants, 30%). Chevron is more upstream-weighted, making it more sensitive to oil prices. The company's Permian Basin assets are its crown jewel, and the Tengiz project in Kazakhstan is a major growth driver.",
    revenueComparison: "ExxonMobil generates $340B versus Chevron's $200B in revenue. ExxonMobil is larger in every dimension — production, refining capacity, and chemical output. However, Chevron's lower cost structure often translates to higher per-barrel profitability in certain environments.",
    growthComparison: "ExxonMobil's growth is driven by Guyana (lowest breakeven basin globally at $25/barrel) and Permian expansion. Chevron's growth depends on Tengiz completion, Permian optimization, and the Hess acquisition (Guyana exposure). Both are focused on capital discipline over volume growth.",
    valuationComparison: "Both trade at 10-14× forward P/E, typical for integrated oil companies. Chevron often trades at a slight premium due to its cleaner balance sheet and higher capital return focus. On a P/CF (price-to-cash flow) basis, ExxonMobil is often slightly cheaper.",
    dividendComparison: "ExxonMobil yields ~3.5% with 40+ consecutive years of dividend increases. Chevron yields ~4.0% with 35+ consecutive years. Both are Dividend Aristocrats. Chevron has committed to larger buybacks relative to its size. Both are core energy income holdings.",
    riskComparison: "Shared risks: oil price collapse below $50/barrel, energy transition reducing long-term demand, environmental liability (climate lawsuits), OPEC+ production decisions, and ESG-driven capital outflows. ExxonMobil-specific: larger scale means less agility. Chevron-specific: concentration in fewer mega-projects.",
    verdict: "Both are excellent energy majors with strong dividends and capital discipline. ExxonMobil offers greater diversification (refining, chemicals) and Guyana upside. Chevron offers a cleaner balance sheet, higher yield, and potentially better capital returns. For total return, ExxonMobil edges ahead. For income and capital allocation, Chevron wins.",
  },
  {
    slug: "lly-vs-mrk",
    stockA: { ticker: "LLY", name: "Eli Lilly", sector: "Healthcare" },
    stockB: { ticker: "MRK", name: "Merck", sector: "Healthcare" },
    category: "pharma",
    overview: "Two pharmaceutical giants with very different growth trajectories — Eli Lilly, the GLP-1/obesity drug sensation, versus Merck, the Keytruda (cancer immunotherapy) powerhouse. Both are innovating in breakthrough areas, but their current momentum differs dramatically.",
    businessModelA: "Eli Lilly generates 100% of revenue from pharmaceuticals, with key franchises in GLP-1 (Mounjaro/Zepbound for diabetes and obesity), oncology (Verzenio), immunology (Olumiant), and neuroscience (Donanemab for Alzheimer's). The GLP-1 portfolio is driving extraordinary growth as the obesity treatment market expands from $10B to a projected $100B+ by 2030.",
    businessModelB: "Merck is driven by Keytruda (cancer immunotherapy, 45% of revenue), vaccines (Gardasil HPV, 15%), and Animal Health (10%). Keytruda is the world's best-selling drug ($25B+ annually) but faces a patent cliff in 2028. Merck is investing heavily in next-gen oncology to extend its cancer franchise beyond Keytruda.",
    revenueComparison: "Merck generates $60B versus Eli Lilly's $41B in revenue. But Eli Lilly is growing at 30-40% due to the GLP-1 explosion, while Merck grows at 5-10%. By 2026-2027, Eli Lilly could surpass Merck in revenue. Eli Lilly's growth rate is virtually unprecedented for a large-cap pharma company.",
    growthComparison: "Eli Lilly is experiencing a growth supercycle — GLP-1 demand is far outstripping supply. The obesity market addressable population (700M globally) is barely penetrated. Merck faces a growth cliff when Keytruda loses exclusivity in 2028, needing $25B+ in replacement revenue. Merck's pipeline (larotrectinib, Welireg) is promising but may not fully offset Keytruda loss.",
    valuationComparison: "Eli Lilly trades at 50-70× forward P/E — a massive premium reflecting GLP-1 revenue potential. Merck trades at 12-16× forward P/E, discounted due to the Keytruda patent cliff. Eli Lilly is priced for perfection; any supply constraint or competitive setback could compress the multiple. Merck is priced for the cliff but has upside if the pipeline delivers.",
    dividendComparison: "Merck yields ~2.5% with a reliable payout ratio and dividend growth. Eli Lilly yields ~0.6% — the stock has rallied so much that the yield has compressed. Merck is far superior for income investors. Eli Lilly is a pure growth story.",
    riskComparison: "Eli Lilly risk: GLP-1 supply constraints, competition (Novo Nordisk's Wegovy/Ozempic), pricing pressure from payers, manufacturing scale-up execution, and extreme valuation. Merck risk: Keytruda patent cliff (2028), pipeline replacement uncertainty, vaccine competition, and generic erosion.",
    verdict: "Eli Lilly is the high-conviction growth play on the obesity drug revolution — potentially the largest pharmaceutical market ever. Merck is the value play with strong near-term earnings, a best-in-class dividend, and a potential pipeline surprise. Growth investors with high risk tolerance pick Lilly; value/income investors pick Merck.",
  },
];

export function getComparisonBySlug(slug: string): StockComparison | undefined {
  return COMPARISONS.find(c => c.slug === slug);
}

export function getComparisonHtml(slug: string): string | null {
  const c = getComparisonBySlug(slug);
  if (!c) return null;

  const catMeta = CAT_META[c.category] || { label: c.category, color: "cyan" };
  const titleStr = `${c.stockA.ticker} vs ${c.stockB.ticker}`;

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${c.stockA.name} (${c.stockA.ticker}) vs ${c.stockB.name} (${c.stockB.ticker}) — Stock Comparison`,
    description: c.overview,
    url: `${SITE_URL}/compare/${c.slug}`,
    publisher: { "@type": "Organization", name: "EntangleWealth", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/compare/${c.slug}`,
  });

  const sections = [
    { title: `${c.stockA.ticker} Business Model`, content: c.businessModelA, color: "#00D4FF" },
    { title: `${c.stockB.ticker} Business Model`, content: c.businessModelB, color: "#FFD700" },
    { title: "Revenue Comparison", content: c.revenueComparison, color: "#00e676" },
    { title: "Growth Comparison", content: c.growthComparison, color: "#a855f7" },
    { title: "Valuation Comparison", content: c.valuationComparison, color: "#00D4FF" },
    { title: "Dividend & Shareholder Returns", content: c.dividendComparison, color: "#FFD700" },
    { title: "Risk Comparison", content: c.riskComparison, color: "#ff3366" },
  ];

  const body = `
  <div class="hero-section" style="padding-bottom:24px;">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
      <span class="tag tag-${catMeta.color}">${catMeta.label}</span>
    </div>
    <h1>${escHtml(c.stockA.ticker)} vs ${escHtml(c.stockB.ticker)}</h1>
    <p style="font-size:16px;color:rgba(255,255,255,0.6);margin-bottom:8px;">${escHtml(c.stockA.name)} vs ${escHtml(c.stockB.name)}</p>
    <p>${escHtml(c.overview)}</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div style="max-width:800px;margin:0 auto;">

      <div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap;">
        <div class="glass-card" style="flex:1;min-width:200px;text-align:center;">
          <span class="mono" style="font-size:28px;font-weight:800;color:#00D4FF;">${escHtml(c.stockA.ticker)}</span>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">${escHtml(c.stockA.name)}</p>
          <span class="tag tag-cyan" style="margin-top:8px;">${escHtml(c.stockA.sector)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;">
          <span style="font-size:24px;font-weight:800;color:rgba(255,255,255,0.2);">VS</span>
        </div>
        <div class="glass-card" style="flex:1;min-width:200px;text-align:center;">
          <span class="mono" style="font-size:28px;font-weight:800;color:#FFD700;">${escHtml(c.stockB.ticker)}</span>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px;">${escHtml(c.stockB.name)}</p>
          <span class="tag tag-gold" style="margin-top:8px;">${escHtml(c.stockB.sector)}</span>
        </div>
      </div>

      ${sections.map(s => `
      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:${s.color};">${s.title}</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.content)}</p>
      </div>`).join("")}

      <div class="glass-card" style="border-color:rgba(0,212,255,0.2);background:rgba(0,212,255,0.03);">
        <h2 style="font-size:18px;font-weight:800;margin-bottom:12px;color:#00D4FF;">The Verdict</h2>
        <p style="color:rgba(255,255,255,0.8);line-height:1.9;font-size:15px;">${escHtml(c.verdict)}</p>
      </div>

    </div>
  </div>`;

  return ssrHtmlShell({
    title: `${titleStr} — Stock Comparison & Analysis | EntangleWealth`,
    description: `${c.stockA.name} vs ${c.stockB.name}: Revenue, growth, valuation, dividends, and risk comparison. Which stock is the better investment?`,
    canonical: `${SITE_URL}/compare/${c.slug}`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Compare Stocks", url: `${SITE_URL}/compare` },
      { name: titleStr, url: `${SITE_URL}/compare/${c.slug}` },
    ],
  });
}

export function getComparisonIndexHtml(): string {
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Stock Comparison Hub",
    description: `${COMPARISONS.length} head-to-head stock comparisons analyzing revenue, growth, valuation, dividends, and risk.`,
    url: `${SITE_URL}/compare`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: COMPARISONS.length,
      itemListElement: COMPARISONS.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${c.stockA.ticker} vs ${c.stockB.ticker}`,
        url: `${SITE_URL}/compare/${c.slug}`,
      })),
    },
  });

  const grouped = new Map<string, StockComparison[]>();
  for (const c of COMPARISONS) {
    const arr = grouped.get(c.category) || [];
    arr.push(c);
    grouped.set(c.category, arr);
  }

  const body = `
  <div class="hero-section">
    <span class="tag tag-purple" style="margin-bottom:16px;">Head-to-Head</span>
    <h1>Stock Comparison Hub</h1>
    <p>${COMPARISONS.length} detailed stock comparisons covering revenue, growth, valuation, dividends, risk, and analyst verdicts.</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    ${Array.from(grouped.entries()).map(([cat, items]) => {
      const meta = CAT_META[cat] || { label: cat, color: "cyan" };
      return `
      <div style="margin-bottom:40px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <span class="tag tag-${meta.color}">${meta.label}</span>
        </div>
        <div class="grid-2">
          ${items.map(c => `
          <a href="/compare/${c.slug}" style="text-decoration:none;">
            <div class="glass-card" style="height:100%;">
              <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px;">
                <span class="mono" style="font-size:22px;font-weight:800;color:#00D4FF;">${escHtml(c.stockA.ticker)}</span>
                <span style="font-size:14px;color:rgba(255,255,255,0.2);font-weight:800;">VS</span>
                <span class="mono" style="font-size:22px;font-weight:800;color:#FFD700;">${escHtml(c.stockB.ticker)}</span>
              </div>
              <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin-bottom:8px;">${escHtml(c.stockA.name)} vs ${escHtml(c.stockB.name)}</p>
              <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">${escHtml(c.overview.slice(0, 140))}...</p>
            </div>
          </a>`).join("")}
        </div>
      </div>`;
    }).join("")}
  </div>`;

  return ssrHtmlShell({
    title: `Stock Comparisons — ${COMPARISONS.length} Head-to-Head Analyses | EntangleWealth`,
    description: `${COMPARISONS.length} detailed stock comparisons. AAPL vs MSFT, NVDA vs AMD, and more. Revenue, growth, valuation, dividends, and risk analysis for every pair.`,
    canonical: `${SITE_URL}/compare`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Compare Stocks", url: `${SITE_URL}/compare` },
    ],
  });
}
