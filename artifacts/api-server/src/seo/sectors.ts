import { ssrHtmlShell, escHtml, SITE_URL } from "./ssrShared";

export interface SectorGuide {
  name: string;
  slug: string;
  color: string;
  etf: string;
  description: string;
  keyDrivers: string[];
  topStocks: { ticker: string; name: string }[];
  subIndustries: string[];
  businessCyclePhase: string;
  riskFactors: string[];
  keyMetrics: string[];
  correlations: string;
  historicalPerformance: string;
}

export const SECTORS: SectorGuide[] = [
  {
    name: "Technology",
    slug: "technology",
    color: "cyan",
    etf: "XLK",
    description: "The technology sector encompasses companies that develop, manufacture, and distribute technology-based goods and services. It includes software, hardware, semiconductors, cloud computing, cybersecurity, and artificial intelligence. The largest sector by market cap in the S&P 500, technology drives innovation and economic productivity.",
    keyDrivers: ["AI and machine learning adoption cycles", "Cloud computing migration and SaaS growth", "Semiconductor supply chain dynamics", "Interest rate sensitivity (growth stock valuation)", "Regulatory risks (antitrust, data privacy)", "Enterprise digital transformation spending"],
    topStocks: [{ ticker: "AAPL", name: "Apple" }, { ticker: "MSFT", name: "Microsoft" }, { ticker: "NVDA", name: "NVIDIA" }, { ticker: "AVGO", name: "Broadcom" }, { ticker: "ADBE", name: "Adobe" }, { ticker: "CRM", name: "Salesforce" }, { ticker: "AMD", name: "AMD" }, { ticker: "INTC", name: "Intel" }],
    subIndustries: ["Software", "Semiconductors", "Cloud Infrastructure", "Cybersecurity", "IT Services", "Hardware & Peripherals", "AI & Machine Learning"],
    businessCyclePhase: "Outperforms during economic expansion and early recovery. Technology benefits from increased business investment in productivity tools. Underperforms during rising interest rate environments as high growth multiples compress. Defensive tech (cloud/SaaS) holds up better in downturns than cyclical hardware.",
    riskFactors: ["Valuation compression during rate hikes", "Antitrust regulation in major economies", "China-US tech decoupling risks", "Cybersecurity breach reputational damage", "Talent competition and wage inflation", "Product cycle misses (e.g., smartphone saturation)"],
    keyMetrics: ["Revenue Growth Rate (YoY)", "Rule of 40 (growth + margin)", "Price-to-Sales (P/S) ratio", "Free Cash Flow margin", "Annual Recurring Revenue (ARR)", "Net Dollar Retention Rate", "R&D as % of revenue"],
    correlations: "Highly correlated with QQQ and growth factor. Negative correlation with rising interest rates. Positive correlation with business investment cycles. Tech tends to lead market rallies and declines.",
    historicalPerformance: "The technology sector has been the best-performing S&P 500 sector over the past 15 years, returning approximately 18-20% annualized. The sector experienced significant drawdowns in the 2022 rate-hiking cycle (-33%) but recovered strongly. The 2000 dot-com bust remains a cautionary lesson about valuation excess.",
  },
  {
    name: "Healthcare",
    slug: "healthcare",
    color: "green",
    etf: "XLV",
    description: "The healthcare sector includes pharmaceutical companies, biotechnology firms, medical device manufacturers, healthcare providers, and health insurance companies. It is traditionally defensive, with demand for healthcare services remaining relatively stable regardless of economic conditions.",
    keyDrivers: ["FDA approvals and drug pipeline progress", "Patent expirations and generic competition", "Aging demographics in developed nations", "Healthcare policy and regulation changes", "M&A activity (biotech acquisitions)", "Clinical trial results and data readouts"],
    topStocks: [{ ticker: "UNH", name: "UnitedHealth" }, { ticker: "JNJ", name: "Johnson & Johnson" }, { ticker: "LLY", name: "Eli Lilly" }, { ticker: "ABBV", name: "AbbVie" }, { ticker: "MRK", name: "Merck" }, { ticker: "PFE", name: "Pfizer" }, { ticker: "TMO", name: "Thermo Fisher" }, { ticker: "AMGN", name: "Amgen" }],
    subIndustries: ["Pharmaceuticals", "Biotechnology", "Medical Devices", "Health Insurance", "Healthcare Providers", "Life Sciences Tools", "Diagnostics"],
    businessCyclePhase: "Defensive sector — outperforms during economic downturns and late-cycle environments. Healthcare demand is inelastic; people need medicine regardless of the economy. Best relative performance during recessions. Underperforms in strong bull markets when investors chase higher-beta growth.",
    riskFactors: ["Drug pricing regulation and political pressure", "Clinical trial failures (binary biotech risk)", "Patent cliffs reducing revenue", "Healthcare policy changes (ACA repeal/modification)", "Rising R&D costs and longer approval timelines", "Generic competition eroding branded drug revenues"],
    keyMetrics: ["Pipeline value and phase progression", "Revenue per drug / franchise", "P/E ratio relative to growth", "Dividend yield (pharma)", "Drug approval probability by phase", "Patent expiration timeline", "R&D productivity ratio"],
    correlations: "Low correlation with broader market — true defensive sector. Negative correlation with economic growth expectations. Biotech subsector correlates more with risk appetite. Large-cap pharma correlates with bond proxies (dividends).",
    historicalPerformance: "Healthcare has returned approximately 12-14% annualized over 20 years with lower volatility than the broad market. The sector provided significant downside protection during the 2008 financial crisis and 2020 COVID crash. Biotech subsector is higher volatility but offers higher growth potential.",
  },
  {
    name: "Financials",
    slug: "financials",
    color: "gold",
    etf: "XLF",
    description: "The financial sector includes banks, insurance companies, asset managers, capital markets firms, and financial technology companies. Financials are closely tied to interest rates, credit cycles, and economic growth, making them a key cyclical sector.",
    keyDrivers: ["Interest rate environment (net interest margin)", "Loan growth and credit quality", "Yield curve shape (steepening vs. inversion)", "Regulatory capital requirements", "M&A and IPO activity", "Consumer and commercial credit demand"],
    topStocks: [{ ticker: "JPM", name: "JPMorgan Chase" }, { ticker: "BRK.B", name: "Berkshire Hathaway" }, { ticker: "V", name: "Visa" }, { ticker: "MA", name: "Mastercard" }, { ticker: "BAC", name: "Bank of America" }, { ticker: "GS", name: "Goldman Sachs" }, { ticker: "MS", name: "Morgan Stanley" }, { ticker: "SCHW", name: "Charles Schwab" }],
    subIndustries: ["Diversified Banks", "Investment Banking", "Insurance", "Asset Management", "Payments & Fintech", "Regional Banks", "Consumer Finance"],
    businessCyclePhase: "Performs best during early economic recovery and rising interest rate environments. Banks benefit from steepening yield curves (higher net interest margins). Underperforms during recessions due to rising loan losses and credit deterioration. Insurance benefits from higher rates on investment portfolios.",
    riskFactors: ["Credit cycle deterioration and loan losses", "Inverted yield curve compressing bank margins", "Regulatory changes (capital requirements, stress tests)", "Systemic risk and bank runs (SVB 2023)", "Fintech disruption of traditional banking", "Geopolitical risks affecting global capital flows"],
    keyMetrics: ["Net Interest Margin (NIM)", "Return on Equity (ROE)", "Price-to-Book (P/B) ratio", "Efficiency ratio (expenses/revenue)", "Tier 1 Capital ratio", "Net charge-off rate", "Loan-to-deposit ratio"],
    correlations: "Strong positive correlation with interest rates and yield curve steepness. Positive correlation with economic growth (GDP). Regional banks correlate with local economic conditions. Payment processors (V, MA) correlate more with consumer spending than rates.",
    historicalPerformance: "Financials returned approximately 10-12% annualized over 20 years, with high variability. The sector suffered severe losses in the 2008 financial crisis (-83% for some banks) and the 2023 regional banking crisis. Recoveries from crises have been powerful, with significant mean reversion.",
  },
  {
    name: "Consumer Discretionary",
    slug: "consumer-discretionary",
    color: "purple",
    etf: "XLY",
    description: "Consumer discretionary companies sell non-essential goods and services — products people want but don't need. Includes retail, automotive, luxury goods, travel, restaurants, and entertainment. The sector is highly sensitive to consumer confidence and disposable income.",
    keyDrivers: ["Consumer confidence and spending trends", "Employment and wage growth", "Housing wealth effect", "E-commerce penetration growth", "Interest rates affecting big-ticket purchases", "Seasonal and holiday spending patterns"],
    topStocks: [{ ticker: "AMZN", name: "Amazon" }, { ticker: "TSLA", name: "Tesla" }, { ticker: "HD", name: "Home Depot" }, { ticker: "MCD", name: "McDonald's" }, { ticker: "NKE", name: "Nike" }, { ticker: "SBUX", name: "Starbucks" }, { ticker: "LOW", name: "Lowe's" }, { ticker: "TJX", name: "TJX Companies" }],
    subIndustries: ["Internet Retail", "Automotive", "Home Improvement", "Restaurants", "Apparel & Luxury", "Hotels & Leisure", "Media & Entertainment"],
    businessCyclePhase: "Strongly cyclical — outperforms during economic expansions when consumer spending rises. First to rebound in early recovery as pent-up demand is released. Underperforms during recessions as consumers cut discretionary spending. Amazon and e-commerce may dampen traditional cyclicality.",
    riskFactors: ["Consumer spending pullback during recessions", "Inflation eroding purchasing power", "Interest rate hikes reducing big-ticket spending", "E-commerce disruption of brick-and-mortar retail", "Supply chain disruptions affecting inventory", "Changing consumer preferences and trends"],
    keyMetrics: ["Same-store sales growth", "Revenue per square foot (retail)", "Consumer confidence index", "E-commerce penetration rate", "Inventory turnover", "Free cash flow yield", "Brand value rankings"],
    correlations: "High positive correlation with consumer confidence and employment data. Correlates with housing market strength (Home Depot, Lowe's). Amazon dominance means the ETF is heavily weighted toward e-commerce. Negative correlation with consumer staples.",
    historicalPerformance: "Consumer discretionary has been one of the best-performing sectors over 15 years (~16% annualized), largely driven by Amazon and Tesla. The sector experienced significant drawdowns in 2008 (-59%) and 2022 (-37%) but recovered strongly each time.",
  },
  {
    name: "Consumer Staples",
    slug: "consumer-staples",
    color: "green",
    etf: "XLP",
    description: "Consumer staples companies sell essential everyday products — food, beverages, household goods, and personal care items. These are goods consumers buy regardless of economic conditions, making the sector defensive and dividend-rich.",
    keyDrivers: ["Inflation and pricing power", "Population growth and demographics", "Commodity input costs (agriculture, packaging)", "Private label competition", "Health and wellness trends", "Emerging market consumer growth"],
    topStocks: [{ ticker: "PG", name: "Procter & Gamble" }, { ticker: "KO", name: "Coca-Cola" }, { ticker: "PEP", name: "PepsiCo" }, { ticker: "COST", name: "Costco" }, { ticker: "WMT", name: "Walmart" }, { ticker: "PM", name: "Philip Morris" }, { ticker: "CL", name: "Colgate-Palmolive" }, { ticker: "KHC", name: "Kraft Heinz" }],
    subIndustries: ["Household Products", "Beverages", "Food Products", "Food Retail", "Tobacco", "Personal Products", "Drug Retail"],
    businessCyclePhase: "Classic defensive sector — outperforms during recessions and market downturns. Staples demand is inelastic; people buy toothpaste and food in any economy. Underperforms in strong bull markets as investors prefer higher-growth sectors. Best for capital preservation and income.",
    riskFactors: ["Input cost inflation (commodities, labor)", "Private label competition from retailers", "Changing consumer preferences (health trends)", "Currency headwinds for international sales", "E-commerce disrupting traditional retail channels", "Regulatory risks (tobacco, sugar taxes)"],
    keyMetrics: ["Organic revenue growth", "Operating margin trends", "Dividend yield and payout ratio", "Brand market share", "Price elasticity of products", "P/E ratio relative to growth", "Free cash flow conversion"],
    correlations: "Low correlation with economic growth — defensive nature. Positive correlation with bond yields (bond proxy). Negative correlation with consumer discretionary (risk-off rotation). Correlates with inflation expectations (pricing power).",
    historicalPerformance: "Consumer staples have returned approximately 9-11% annualized over 20 years with significantly lower volatility. The sector's maximum drawdown in 2008 was approximately -30% vs. -55% for the S&P 500. Provides steady income through dividends (2-3% yield typical).",
  },
  {
    name: "Energy",
    slug: "energy",
    color: "red",
    etf: "XLE",
    description: "The energy sector includes companies involved in the exploration, production, refining, and distribution of oil, natural gas, and renewable energy. It is the most commodity-sensitive sector, driven primarily by global oil and gas prices.",
    keyDrivers: ["Crude oil and natural gas prices", "OPEC+ production decisions", "Global energy demand (GDP-driven)", "Geopolitical risks (Middle East, Russia)", "Energy transition and ESG pressure", "US shale production and rig counts"],
    topStocks: [{ ticker: "XOM", name: "ExxonMobil" }, { ticker: "CVX", name: "Chevron" }, { ticker: "COP", name: "ConocoPhillips" }, { ticker: "SLB", name: "Schlumberger" }, { ticker: "EOG", name: "EOG Resources" }, { ticker: "MPC", name: "Marathon Petroleum" }, { ticker: "PSX", name: "Phillips 66" }, { ticker: "VLO", name: "Valero" }],
    subIndustries: ["Integrated Oil & Gas", "Exploration & Production", "Oil Field Services", "Refining & Marketing", "Midstream (Pipelines)", "Renewable Energy", "Coal"],
    businessCyclePhase: "Late-cycle outperformer — energy performs best when the economy is overheating and commodity prices are elevated. Benefits from inflation and supply constraints. Underperforms during recessions and demand destruction. Capital discipline has improved sector returns since 2020.",
    riskFactors: ["Oil price volatility and demand destruction", "Energy transition reducing long-term fossil fuel demand", "OPEC+ production changes disrupting markets", "Environmental regulations and carbon taxes", "Geopolitical supply disruptions", "ESG-driven capital flow away from fossil fuels"],
    keyMetrics: ["Oil price breakeven per barrel", "Free cash flow yield", "Reserve replacement ratio", "Production growth rate", "Dividend yield and buyback yield", "Debt-to-EBITDA ratio", "Capital expenditure vs. cash flow"],
    correlations: "High positive correlation with crude oil prices. Positive correlation with inflation expectations. Negative correlation with technology in most environments. Energy is the primary inflation hedge within equities.",
    historicalPerformance: "Energy has been the most volatile S&P 500 sector, with 20-year returns around 7-9% annualized. The sector collapsed in 2020 (COVID demand destruction, negative oil prices) and surged 65% in 2022 (post-COVID recovery, Ukraine war). Capital discipline since 2020 has dramatically improved shareholder returns.",
  },
  {
    name: "Industrials",
    slug: "industrials",
    color: "cyan",
    etf: "XLI",
    description: "The industrials sector includes companies involved in manufacturing, aerospace & defense, transportation, construction, and industrial equipment. It is a broad, economically sensitive sector that serves as a barometer for global economic activity.",
    keyDrivers: ["Manufacturing PMI and industrial production", "Infrastructure spending and government contracts", "Global trade volumes and supply chains", "Aerospace cycle (commercial and defense)", "Capital expenditure trends", "Labor market conditions"],
    topStocks: [{ ticker: "GE", name: "GE Aerospace" }, { ticker: "CAT", name: "Caterpillar" }, { ticker: "RTX", name: "RTX (Raytheon)" }, { ticker: "HON", name: "Honeywell" }, { ticker: "UNP", name: "Union Pacific" }, { ticker: "BA", name: "Boeing" }, { ticker: "LMT", name: "Lockheed Martin" }, { ticker: "DE", name: "Deere" }],
    subIndustries: ["Aerospace & Defense", "Railroads", "Machinery", "Electrical Equipment", "Construction & Engineering", "Airlines", "Waste Management"],
    businessCyclePhase: "Mid-cycle performer — industrials benefit from sustained economic expansion and rising business investment. Transportation sub-sector (railroads, trucking) is a leading indicator. Defense is counter-cyclical (government spending). Capital goods orders signal turning points.",
    riskFactors: ["Economic slowdown reducing capital expenditure", "Trade wars and tariffs disrupting supply chains", "Raw material cost inflation", "Labor shortages in skilled manufacturing", "Regulatory changes (environmental, safety)", "Geopolitical tensions affecting defense budgets"],
    keyMetrics: ["Backlog and book-to-bill ratio", "Operating leverage (incremental margins)", "Free cash flow conversion", "Revenue by end market", "Capacity utilization", "ISM Manufacturing PMI", "Capital expenditure growth"],
    correlations: "Strong positive correlation with GDP growth and manufacturing PMI. Positive correlation with commodity prices (input costs). Transportation stocks (rails, trucking) correlate with trade volume. Defense correlates with government spending priorities.",
    historicalPerformance: "Industrials have returned approximately 11-13% annualized over 20 years, closely tracking economic cycles. The sector experienced a -47% drawdown in 2008 and recovered over the next 3 years. Infrastructure spending bills have provided tailwinds in recent years.",
  },
  {
    name: "Materials",
    slug: "materials",
    color: "gold",
    etf: "XLB",
    description: "The materials sector includes companies that produce raw materials — chemicals, metals, mining, construction materials, paper, and packaging. It is highly sensitive to commodity prices, global demand, and economic cycles.",
    keyDrivers: ["Commodity prices (metals, chemicals, lumber)", "Global construction and infrastructure demand", "China demand (largest commodity consumer)", "Currency movements (dollar strength)", "Supply constraints and mining permits", "Sustainability and recycling trends"],
    topStocks: [{ ticker: "LIN", name: "Linde" }, { ticker: "SHW", name: "Sherwin-Williams" }, { ticker: "APD", name: "Air Products" }, { ticker: "FCX", name: "Freeport-McMoRan" }, { ticker: "ECL", name: "Ecolab" }, { ticker: "NEM", name: "Newmont" }, { ticker: "NUE", name: "Nucor" }, { ticker: "DOW", name: "Dow" }],
    subIndustries: ["Chemicals", "Metals & Mining", "Construction Materials", "Packaging", "Paper & Forest Products", "Gold & Precious Metals", "Industrial Gases"],
    businessCyclePhase: "Late-cycle and early-cycle outperformer. Materials benefit from commodity price inflation during economic expansions and supply constraints. Gold mining is counter-cyclical (safe haven). Construction materials correlate with housing and infrastructure.",
    riskFactors: ["Commodity price volatility", "China economic slowdown reducing demand", "Environmental regulations on mining and chemicals", "Currency fluctuations affecting exports", "Substitution risk as technology replaces materials", "Overcapacity in certain subsectors"],
    keyMetrics: ["Commodity price realization", "EBITDA margin sensitivity to input costs", "Reserve life (mining companies)", "Cost per ton/ounce", "Volume growth by end market", "Capital intensity ratio", "Dividend yield"],
    correlations: "High positive correlation with commodity prices and inflation. Positive correlation with emerging market growth (especially China). Gold miners negatively correlated with real interest rates. Packaging companies less cyclical than mining.",
    historicalPerformance: "Materials have returned approximately 9-11% annualized over 20 years with higher volatility. The sector is a primary beneficiary of inflation and commodity supercycles. Significantly underperformed in the deflationary 2013-2019 period.",
  },
  {
    name: "Utilities",
    slug: "utilities",
    color: "green",
    etf: "XLU",
    description: "The utilities sector includes electric utilities, gas utilities, water utilities, and renewable energy utilities. These are regulated monopolies with predictable revenue streams, making them the most bond-like equity sector with high dividend yields.",
    keyDrivers: ["Interest rates (bond proxy competition)", "Regulatory rate case decisions", "Renewable energy transition investments", "Weather patterns affecting demand", "Data center power demand (AI boom)", "Infrastructure upgrade requirements"],
    topStocks: [{ ticker: "NEE", name: "NextEra Energy" }, { ticker: "SO", name: "Southern Company" }, { ticker: "DUK", name: "Duke Energy" }, { ticker: "D", name: "Dominion Energy" }, { ticker: "AEP", name: "American Electric Power" }, { ticker: "SRE", name: "Sempra" }, { ticker: "EXC", name: "Exelon" }, { ticker: "XEL", name: "Xcel Energy" }],
    subIndustries: ["Electric Utilities", "Multi-Utilities", "Gas Utilities", "Water Utilities", "Independent Power Producers", "Renewable Utilities"],
    businessCyclePhase: "Defensive sector — outperforms during recessions, market corrections, and rising uncertainty. Underperforms in strong bull markets and rising interest rate environments (bond proxy competition). The AI data center boom is creating a secular growth catalyst for electricity demand.",
    riskFactors: ["Rising interest rates making dividend yields less attractive", "Regulatory risk on allowed rates of return", "Wildfire liability (California utilities)", "Transition risk from fossil fuel to renewable generation", "Capital expenditure requirements for grid modernization", "Political risk around energy policy"],
    keyMetrics: ["Dividend yield and payout ratio", "Regulated vs. unregulated revenue mix", "Rate base growth", "Return on equity (allowed vs. earned)", "Capital expenditure plans", "Debt-to-equity ratio", "FFO-to-debt ratio"],
    correlations: "Strong negative correlation with interest rates (bond proxy). Low correlation with broader equity market. Positive correlation with bond prices. Low correlation with economic growth (regulated revenue).",
    historicalPerformance: "Utilities have returned approximately 8-10% annualized over 20 years with the lowest volatility of any sector. Drawdowns are typically shallow (2008: -29% vs. S&P -55%). The sector provides reliable income through 3-4% dividend yields. The AI data center theme is driving renewed growth interest.",
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    color: "purple",
    etf: "XLRE",
    description: "The real estate sector includes Real Estate Investment Trusts (REITs) that own, operate, or finance income-generating properties. REITs are required to distribute 90% of taxable income as dividends, making them a primary source of equity income.",
    keyDrivers: ["Interest rates and cap rates", "Property occupancy rates and rent growth", "Economic growth driving demand for space", "E-commerce impact on retail/industrial", "Remote work impact on office demand", "Demographics driving housing demand"],
    topStocks: [{ ticker: "PLD", name: "Prologis" }, { ticker: "AMT", name: "American Tower" }, { ticker: "EQIX", name: "Equinix" }, { ticker: "SPG", name: "Simon Property" }, { ticker: "PSA", name: "Public Storage" }, { ticker: "O", name: "Realty Income" }, { ticker: "WELL", name: "Welltower" }, { ticker: "DLR", name: "Digital Realty" }],
    subIndustries: ["Industrial REITs", "Data Center REITs", "Cell Tower REITs", "Retail REITs", "Residential REITs", "Office REITs", "Healthcare REITs", "Self-Storage REITs"],
    businessCyclePhase: "Sensitive to interest rates — performs best in falling rate environments. REITs provide income and inflation hedging through rent escalation clauses. Office REITs face secular headwinds from remote work. Data center and industrial REITs benefit from e-commerce and AI trends.",
    riskFactors: ["Rising interest rates increasing borrowing costs", "Remote work reducing office demand permanently", "Overbuilding in certain property types", "Tenant credit risk during recessions", "Property market illiquidity", "Environmental regulations on buildings"],
    keyMetrics: ["Funds from Operations (FFO)", "Net Asset Value (NAV)", "Cap rate and implied cap rate", "Occupancy rate", "Same-store NOI growth", "Dividend yield and FFO payout ratio", "Debt-to-EBITDA ratio"],
    correlations: "Strong negative correlation with interest rates. Moderate positive correlation with inflation (rent escalation). Data center and tower REITs correlate with tech demand. Retail REITs negatively correlated with e-commerce growth.",
    historicalPerformance: "REITs have returned approximately 9-11% annualized over 20 years with income providing 3-5% of that return. The sector suffered significant losses in 2008 (-68%) due to credit crisis leverage. Post-2020, data center and industrial REITs have significantly outperformed office and retail.",
  },
  {
    name: "Communication Services",
    slug: "communication-services",
    color: "cyan",
    etf: "XLC",
    description: "Communication services includes media, entertainment, social media, telecommunications, and interactive content companies. The sector was restructured in 2018 to combine telecom with internet media companies, creating a diverse mix of growth and value stocks.",
    keyDrivers: ["Digital advertising spending trends", "Streaming subscriber growth and churn", "5G infrastructure investment", "Social media engagement and monetization", "Content creation costs and competition", "Regulatory scrutiny (antitrust, content moderation)"],
    topStocks: [{ ticker: "META", name: "Meta Platforms" }, { ticker: "GOOGL", name: "Alphabet" }, { ticker: "NFLX", name: "Netflix" }, { ticker: "DIS", name: "Walt Disney" }, { ticker: "T", name: "AT&T" }, { ticker: "VZ", name: "Verizon" }, { ticker: "CMCSA", name: "Comcast" }, { ticker: "TMUS", name: "T-Mobile" }],
    subIndustries: ["Interactive Media", "Digital Advertising", "Streaming & Entertainment", "Telecommunications", "Cable & Satellite", "Gaming", "Publishing"],
    businessCyclePhase: "Mixed cyclicality — digital advertising (META, GOOGL) is cyclical with ad spending. Telecom (T, VZ) is defensive with stable revenue. Streaming is secular growth but competitive. The sector blends growth and value characteristics depending on the subsector.",
    riskFactors: ["Advertising revenue cyclicality", "Streaming competition ('streaming wars')", "Content cost inflation", "Antitrust regulation (big tech)", "Data privacy regulation reducing ad targeting", "Cord-cutting affecting traditional media"],
    keyMetrics: ["Revenue per user (ARPU)", "Daily/Monthly Active Users (DAU/MAU)", "Subscriber count and churn rate", "Ad revenue growth", "Content spending as % of revenue", "Free cash flow margin", "P/E and P/S ratios"],
    correlations: "Digital advertising subsector correlates with consumer spending and economic growth. Telecom correlates with bond yields (defensive income). Streaming correlates with consumer discretionary spending. META and GOOGL dominate sector performance.",
    historicalPerformance: "The current sector composition (post-2018 restructure) makes long-term comparison difficult. Since restructure, returns have been driven primarily by META and GOOGL. The sector experienced extreme volatility in 2022 (-40%) and strong recovery in 2023 (+55%). Telecom provides stability while tech media drives growth.",
  },
];

export function getSectorBySlug(slug: string): SectorGuide | undefined {
  return SECTORS.find(s => s.slug === slug);
}

export function getSectorHtml(slug: string): string | null {
  const s = getSectorBySlug(slug);
  if (!s) return null;

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${s.name} Sector Analysis — Key Drivers, Top Stocks & Outlook`,
    description: s.description,
    url: `${SITE_URL}/sectors/${s.slug}`,
    publisher: { "@type": "Organization", name: "EntangleWealth", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/sectors/${s.slug}`,
  });

  const body = `
  <div class="hero-section" style="padding-bottom:24px;">
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
      <span class="tag tag-${s.color}">Sector Analysis</span>
      <span class="tag tag-gold mono">${escHtml(s.etf)}</span>
    </div>
    <h1>${escHtml(s.name)} Sector</h1>
    <p>${escHtml(s.description)}</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div style="max-width:900px;margin:0 auto;">

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;color:#00D4FF;">Top Stocks</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
          ${s.topStocks.map(st => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
            <span class="mono" style="color:#00D4FF;font-weight:700;font-size:14px;">${escHtml(st.ticker)}</span>
            <span style="color:rgba(255,255,255,0.5);font-size:13px;">${escHtml(st.name)}</span>
          </div>`).join("")}
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00e676;">Key Drivers</h2>
        <ul style="list-style:none;padding:0;">
          ${s.keyDrivers.map(d => `<li style="color:rgba(255,255,255,0.7);font-size:14px;padding:8px 0;display:flex;gap:8px;align-items:baseline;border-bottom:1px solid rgba(255,255,255,0.03);"><span style="color:#00e676;font-size:10px;">●</span> ${escHtml(d)}</li>`).join("")}
        </ul>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#FFD700;">Business Cycle Position</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.businessCyclePhase)}</p>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#a855f7;">Sub-Industries</h2>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${s.subIndustries.map(sub => `<span class="tag tag-purple">${escHtml(sub)}</span>`).join("")}
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="glass-card">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#ff3366;">Risk Factors</h2>
          <ul style="list-style:none;padding:0;">
            ${s.riskFactors.map(r => `<li style="color:rgba(255,255,255,0.6);font-size:13px;padding:6px 0;display:flex;gap:8px;align-items:baseline;"><span style="color:#ff3366;font-size:10px;">●</span> ${escHtml(r)}</li>`).join("")}
          </ul>
        </div>
        <div class="glass-card">
          <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#00D4FF;">Key Metrics</h2>
          <ul style="list-style:none;padding:0;">
            ${s.keyMetrics.map(m => `<li style="color:rgba(255,255,255,0.6);font-size:13px;padding:6px 0;display:flex;gap:8px;align-items:baseline;"><span style="color:#00D4FF;font-size:10px;">●</span> ${escHtml(m)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#00D4FF;">Correlations & Relationships</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.correlations)}</p>
      </div>

      <div class="glass-card" style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#FFD700;">Historical Performance</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.8;font-size:15px;">${escHtml(s.historicalPerformance)}</p>
      </div>

    </div>
  </div>`;

  return ssrHtmlShell({
    title: `${s.name} Sector — Top Stocks, Key Drivers & Analysis | EntangleWealth`,
    description: `${s.name} sector analysis: key drivers, top stocks (${s.topStocks.slice(0,3).map(st => st.ticker).join(", ")}), business cycle positioning, risk factors, and performance history.`,
    canonical: `${SITE_URL}/sectors/${s.slug}`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Sectors", url: `${SITE_URL}/sectors` },
      { name: s.name, url: `${SITE_URL}/sectors/${s.slug}` },
    ],
  });
}

export function getSectorIndexHtml(): string {
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Market Sectors Guide",
    description: `Analysis of all ${SECTORS.length} S&P 500 sectors with key drivers, top stocks, business cycle positioning, and performance data.`,
    url: `${SITE_URL}/sectors`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: SECTORS.length,
      itemListElement: SECTORS.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: `${SITE_URL}/sectors/${s.slug}`,
      })),
    },
  });

  const body = `
  <div class="hero-section">
    <span class="tag tag-cyan" style="margin-bottom:16px;">Market Structure</span>
    <h1>Market Sectors Guide</h1>
    <p>Deep analysis of all ${SECTORS.length} S&P 500 sectors. Key drivers, top stocks, business cycle positioning, risk factors, and historical performance.</p>
  </div>
  <div class="container" style="padding-bottom:64px;">
    <div class="grid-2">
      ${SECTORS.map(s => `
      <a href="/sectors/${s.slug}" style="text-decoration:none;">
        <div class="glass-card" style="height:100%;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <h3 style="font-size:18px;font-weight:700;color:#fff;margin:0;">${escHtml(s.name)}</h3>
            <span class="tag tag-gold mono" style="font-size:10px;">${escHtml(s.etf)}</span>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin-bottom:12px;">${escHtml(s.description.slice(0, 160))}...</p>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${s.topStocks.slice(0, 4).map(st => `<span class="mono" style="color:#00D4FF;font-size:11px;background:rgba(0,212,255,0.08);padding:3px 8px;border-radius:4px;">${escHtml(st.ticker)}</span>`).join("")}
            <span style="color:rgba(255,255,255,0.2);font-size:11px;padding:3px 0;">+${s.topStocks.length - 4} more</span>
          </div>
        </div>
      </a>`).join("")}
    </div>
  </div>`;

  return ssrHtmlShell({
    title: `Market Sectors Guide — All ${SECTORS.length} S&P 500 Sectors | EntangleWealth`,
    description: `Deep analysis of all ${SECTORS.length} S&P 500 sectors with top stocks, key drivers, business cycle positioning, and performance data for informed sector rotation.`,
    canonical: `${SITE_URL}/sectors`,
    schemaJson: schema,
    body,
    breadcrumbs: [
      { name: "Home", url: SITE_URL },
      { name: "Sectors", url: `${SITE_URL}/sectors` },
    ],
  });
}
