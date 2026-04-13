export interface SeoKeyword {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  rank: number;
  trend: "up" | "down" | "stable";
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeoMetaTag {
  id: string;
  pagePath: string;
  pageLabel: string;
  title: string;
  description: string;
  ogImage: string;
}

export interface Backlink {
  id: string;
  url: string;
  sourceDomain: string;
  anchorText: string;
  status: "active" | "broken";
  addedAt: string;
}

const LS_KEYWORDS = "ew_seo_keywords";
const LS_BLOG = "ew_seo_blog";
const LS_META = "ew_seo_meta";
const LS_BACKLINKS = "ew_seo_backlinks";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function loadKeywords(): SeoKeyword[] {
  return load<SeoKeyword>(LS_KEYWORDS, defaultKeywords());
}
export function saveKeywords(kw: SeoKeyword[]) {
  save(LS_KEYWORDS, kw);
}
export function addKeyword(kw: Omit<SeoKeyword, "id" | "updatedAt">): SeoKeyword {
  const entry: SeoKeyword = { ...kw, id: uid(), updatedAt: new Date().toISOString() };
  const list = loadKeywords();
  list.push(entry);
  saveKeywords(list);
  return entry;
}
export function updateKeyword(id: string, patch: Partial<SeoKeyword>) {
  const list = loadKeywords().map((k) =>
    k.id === id ? { ...k, ...patch, updatedAt: new Date().toISOString() } : k
  );
  saveKeywords(list);
}
export function deleteKeyword(id: string) {
  saveKeywords(loadKeywords().filter((k) => k.id !== id));
}

export function loadBlogPosts(): BlogPost[] {
  return load<BlogPost>(LS_BLOG, defaultBlogPosts());
}
export function saveBlogPosts(posts: BlogPost[]) {
  save(LS_BLOG, posts);
}
export function addBlogPost(post: Omit<BlogPost, "id" | "createdAt" | "updatedAt">): BlogPost {
  const now = new Date().toISOString();
  const entry: BlogPost = { ...post, id: uid(), createdAt: now, updatedAt: now };
  const list = loadBlogPosts();
  list.push(entry);
  saveBlogPosts(list);
  return entry;
}
export function updateBlogPost(id: string, patch: Partial<BlogPost>) {
  const list = loadBlogPosts().map((p) =>
    p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
  );
  saveBlogPosts(list);
}
export function deleteBlogPost(id: string) {
  saveBlogPosts(loadBlogPosts().filter((p) => p.id !== id));
}

export function loadMetaTags(): SeoMetaTag[] {
  return load<SeoMetaTag>(LS_META, defaultMetaTags());
}
export function saveMetaTags(tags: SeoMetaTag[]) {
  save(LS_META, tags);
}
export function updateMetaTag(id: string, patch: Partial<SeoMetaTag>) {
  const list = loadMetaTags().map((t) => (t.id === id ? { ...t, ...patch } : t));
  saveMetaTags(list);
}

export function loadBacklinks(): Backlink[] {
  return load<Backlink>(LS_BACKLINKS, []);
}
export function saveBacklinks(links: Backlink[]) {
  save(LS_BACKLINKS, links);
}
export function addBacklink(link: Omit<Backlink, "id" | "addedAt">): Backlink {
  const entry: Backlink = { ...link, id: uid(), addedAt: new Date().toISOString() };
  const list = loadBacklinks();
  list.push(entry);
  saveBacklinks(list);
  return entry;
}
export function updateBacklink(id: string, patch: Partial<Backlink>) {
  const list = loadBacklinks().map((b) => (b.id === id ? { ...b, ...patch } : b));
  saveBacklinks(list);
}
export function deleteBacklink(id: string) {
  saveBacklinks(loadBacklinks().filter((b) => b.id !== id));
}

function defaultKeywords(): SeoKeyword[] {
  const now = new Date().toISOString();
  const kws: Array<[string, number, number, number, "up" | "down" | "stable"]> = [
    ["stock screener free", 18100, 45, 0, "up"],
    ["technical analysis tools", 12100, 55, 0, "up"],
    ["free stock charts", 22000, 50, 0, "stable"],
    ["options chain analysis", 8100, 40, 0, "up"],
    ["financial dashboard", 6600, 35, 0, "up"],
    ["tax deduction tracker", 14800, 30, 0, "up"],
    ["gig economy tax calculator", 9900, 25, 0, "up"],
    ["1099 tax deductions", 33100, 42, 0, "stable"],
    ["stock market terminal", 5400, 48, 0, "up"],
    ["investment portfolio tracker", 27100, 55, 0, "down"],
    ["day trading platform", 40500, 65, 0, "stable"],
    ["best stock analysis software", 14800, 60, 0, "up"],
    ["options greeks calculator", 4400, 35, 0, "up"],
    ["sector rotation strategy", 3600, 30, 0, "stable"],
    ["volatility analysis tool", 2900, 28, 0, "up"],
    ["mileage deduction calculator", 18100, 38, 0, "up"],
    ["self employment tax calculator", 49500, 48, 0, "stable"],
    ["quarterly tax payment estimator", 8100, 35, 0, "up"],
    ["stock market screener", 14800, 52, 0, "up"],
    ["financial literacy platform", 3600, 22, 0, "up"],
    ["real time stock data", 12100, 45, 0, "stable"],
    ["candlestick chart patterns", 22000, 42, 0, "down"],
    ["moving average crossover", 9900, 38, 0, "stable"],
    ["RSI indicator strategy", 6600, 35, 0, "up"],
    ["MACD trading signals", 5400, 32, 0, "up"],
    ["Bollinger Bands strategy", 8100, 40, 0, "stable"],
    ["fibonacci retracement tool", 6600, 35, 0, "up"],
    ["stock comparison tool", 4400, 28, 0, "up"],
    ["market news aggregator", 3600, 30, 0, "stable"],
    ["tax loss harvesting", 14800, 45, 0, "up"],
    ["W2 vs 1099 calculator", 12100, 35, 0, "up"],
    ["small business tax deductions", 33100, 50, 0, "stable"],
    ["home office deduction", 40500, 42, 0, "stable"],
    ["receipt scanner app", 18100, 48, 0, "up"],
    ["expense tracking software", 22000, 55, 0, "down"],
    ["crypto tax calculator", 27100, 52, 0, "stable"],
    ["Uber driver tax deductions", 9900, 32, 0, "up"],
    ["DoorDash tax guide", 8100, 28, 0, "up"],
    ["freelance tax tips", 6600, 25, 0, "up"],
    ["capital gains tax calculator", 33100, 48, 0, "stable"],
    ["Bloomberg terminal alternative", 4400, 20, 0, "up"],
    ["stock market for beginners", 49500, 55, 0, "stable"],
    ["how to read stock charts", 22000, 45, 0, "stable"],
    ["best free trading tools", 12100, 42, 0, "up"],
    ["options trading for beginners", 33100, 50, 0, "down"],
    ["passive income ideas", 40500, 58, 0, "stable"],
    ["financial independence calculator", 6600, 30, 0, "up"],
    ["retirement planning calculator", 18100, 48, 0, "stable"],
    ["budget tracker app", 14800, 52, 0, "down"],
    ["net worth tracker", 9900, 35, 0, "up"],
  ];
  return kws.map(([keyword, volume, difficulty, rank, trend]) => ({
    id: uid(),
    keyword,
    volume,
    difficulty,
    rank,
    trend,
    updatedAt: now,
  }));
}

function defaultBlogPosts(): BlogPost[] {
  const now = new Date().toISOString();
  const articles: Array<[string, string, string, string, string, string]> = [
    [
      "how-to-read-stock-charts-beginners-guide",
      "How to Read Stock Charts: A Beginner's Guide",
      "How to Read Stock Charts: A Beginner's Guide | EntangleWealth",
      "Learn to interpret candlestick charts, trend lines, and key chart patterns to make more informed trading decisions.",
      `## Understanding the Basics

Stock charts are one of the most powerful tools available to investors. Whether you're new to trading or looking to sharpen your analytical skills, learning to read charts is an essential skill.

## Candlestick Charts

Candlestick charts display four key data points for each period: open, high, low, and close (OHLC). Each candle tells a story about the battle between buyers and sellers during that time period.

- **Green (bullish) candles**: The close price was higher than the open, indicating buying pressure
- **Red (bearish) candles**: The close price was lower than the open, indicating selling pressure
- **Wicks (shadows)**: The thin lines above and below the body show the high and low extremes

## Key Chart Patterns

**Support and Resistance**: Price levels where the stock has historically bounced (support) or been rejected (resistance). These levels act as psychological barriers in the market.

**Trend Lines**: Connecting successive highs (downtrend) or lows (uptrend) reveals the overall direction of price movement.

**Head and Shoulders**: A reversal pattern characterized by three peaks, with the middle peak (head) being the highest. Signals a potential trend reversal from bullish to bearish.

**Double Bottom / Double Top**: Two consecutive troughs or peaks at roughly the same price level, indicating potential reversals.

## Volume Analysis

Volume confirms price movements. A price breakout accompanied by high volume is more reliable than one on low volume. Watch for:

- Volume spikes on breakouts — validates the move
- Declining volume during consolidation — normal accumulation behavior
- Volume divergence — price moving up while volume declines can signal weakening momentum

## Using EntangleWealth's Chart Tools

EntangleWealth provides 55+ technical indicators including RSI, MACD, Bollinger Bands, and moving averages. Use the Technical Analysis page to overlay multiple indicators and identify high-confidence setups.

*All charts and analysis on EntangleWealth use simulated data for educational purposes. Past performance does not guarantee future results.*`,
      "2026-04-01T00:00:00.000Z",
    ],
    [
      "top-tax-deductions-freelancers-gig-workers-2026",
      "Top Tax Deductions for Freelancers and Gig Workers in 2026",
      "Top Tax Deductions for Freelancers & Gig Workers 2026 | EntangleWealth",
      "Maximize your tax refund as a freelancer or gig worker. Discover the most valuable deductions including home office, mileage, and equipment.",
      `## Why Tax Deductions Matter for Gig Workers

If you drive for Uber, deliver for DoorDash, freelance online, or run any side hustle, you're considered self-employed. That means you pay self-employment tax (15.3%) on top of regular income tax — but it also means you can deduct a wide range of business expenses.

## The Most Valuable Deductions

### 1. Mileage Deduction
For 2026, the IRS standard mileage rate is 67 cents per mile for business use. If you drive 10,000 business miles per year, that's a **$6,700 deduction**.

Track every business mile with apps or a simple mileage log. Deductible trips include:
- Driving to client meetings
- Uber/Lyft/DoorDash deliveries
- Trips to the post office or supply store

### 2. Home Office Deduction
If you use part of your home exclusively and regularly for business, you can deduct:
- **Simplified method**: $5 per square foot (up to 300 sq ft = $1,500)
- **Regular method**: Percentage of your home's expenses (mortgage/rent, utilities, insurance)

### 3. Phone and Internet
If you use your phone or internet for business, you can deduct the business-use percentage. Most gig workers can deduct 50–80% of these costs.

### 4. Equipment and Software
Laptops, cameras, tools, and business software are deductible. Section 179 allows you to deduct the full cost in the year of purchase rather than depreciating it.

### 5. Health Insurance Premiums
Self-employed individuals can deduct 100% of health, dental, and vision insurance premiums for themselves and their family — a significant deduction often overlooked.

### 6. Retirement Contributions
A SEP-IRA allows self-employed workers to contribute up to 25% of net self-employment income, reducing taxable income substantially.

## Quarterly Estimated Taxes

As a self-employed individual, you're required to pay estimated taxes quarterly. Missing these payments results in underpayment penalties. Use the EntangleWealth TaxFlow calculator to estimate your quarterly obligations.

*This article is for informational purposes only. Consult a qualified tax professional for advice specific to your situation.*`,
      "2026-04-05T00:00:00.000Z",
    ],
    [
      "understanding-options-trading-basics",
      "Understanding Options Trading: Calls, Puts, and the Greeks",
      "Options Trading Basics: Calls, Puts & The Greeks | EntangleWealth",
      "A clear introduction to options trading including how calls and puts work, key terminology, and how to use the Greeks to manage risk.",
      `## What Are Options?

Options are financial contracts that give the buyer the right — but not the obligation — to buy or sell an underlying asset at a predetermined price (the strike price) before or on the expiration date.

## Calls vs. Puts

**Call Options**: Give you the right to *buy* 100 shares at the strike price. You profit when the stock rises above the strike price plus the premium you paid.

**Put Options**: Give you the right to *sell* 100 shares at the strike price. You profit when the stock falls below the strike price minus the premium.

## Key Terminology

- **Premium**: The price you pay for the option contract
- **Strike Price**: The predetermined price at which you can buy/sell
- **Expiration Date**: The date the contract expires worthless if not exercised
- **In the Money (ITM)**: An option with intrinsic value
- **Out of the Money (OTM)**: An option with no intrinsic value

## The Greeks — Measuring Risk and Reward

The Greeks are mathematical measures that describe how an option's price changes with different factors:

- **Delta (Δ)**: How much the option price moves for every $1 move in the stock. A delta of 0.50 means the option gains $0.50 for every $1 rise in the stock
- **Theta (Θ)**: Time decay. Options lose value every day as expiration approaches. Sellers benefit from theta
- **Vega (ν)**: Sensitivity to implied volatility. Higher volatility = more expensive options
- **Gamma (Γ)**: Rate of change of delta. High gamma means delta changes quickly as price moves

## Common Strategies for Beginners

1. **Covered Call**: Sell a call against shares you own to generate income
2. **Cash-Secured Put**: Sell a put and set aside cash to buy shares if assigned
3. **Long Call**: Simple bullish bet with limited risk (premium paid)
4. **Protective Put**: Buy a put to hedge downside risk on a position you hold

## Using EntangleWealth's Options Tools

The Options Chain page displays live Greeks, implied volatility, and open interest for all contracts. Use the scanner to identify unusual options activity that may signal institutional positioning.

*Options trading involves significant risk. All data on EntangleWealth is simulated for educational purposes.*`,
      "2026-04-08T00:00:00.000Z",
    ],
    [
      "rsi-macd-momentum-indicators-explained",
      "RSI and MACD: Using Momentum Indicators to Find Better Entries",
      "RSI and MACD Momentum Indicators Explained | EntangleWealth",
      "Learn how to use the Relative Strength Index (RSI) and MACD indicator to identify overbought conditions, trend shifts, and high-probability entry points.",
      `## What Is Momentum Analysis?

Momentum indicators measure the rate of price change rather than the price itself. They help traders identify when a trend is accelerating, decelerating, or about to reverse — often before the price chart makes it obvious.

## The Relative Strength Index (RSI)

RSI oscillates between 0 and 100 and measures the speed and magnitude of recent price changes:

- **RSI above 70**: Overbought — potential reversal or consolidation ahead
- **RSI below 30**: Oversold — potential bounce or recovery
- **RSI at 50**: Midpoint — neutral momentum

### RSI Divergence

One of the most powerful RSI signals is divergence:
- **Bullish divergence**: Price makes a lower low but RSI makes a higher low — sellers are losing momentum
- **Bearish divergence**: Price makes a higher high but RSI makes a lower high — buyers are exhausting themselves

## MACD (Moving Average Convergence Divergence)

MACD consists of three components:
1. **MACD Line**: 12-period EMA minus 26-period EMA
2. **Signal Line**: 9-period EMA of the MACD Line
3. **Histogram**: Visual representation of the gap between MACD and Signal

### Trading MACD Signals

- **Bullish crossover**: MACD crosses above the Signal line — buy signal
- **Bearish crossover**: MACD crosses below the Signal line — sell signal
- **Zero line crossovers**: MACD crossing above/below zero confirms trend direction

## Combining RSI and MACD

The strongest signals occur when both indicators agree:
- RSI rising from oversold + MACD bullish crossover = high-probability long setup
- RSI declining from overbought + MACD bearish crossover = high-probability short setup

Use EntangleWealth's Technical Analysis page to overlay RSI, MACD, and 50+ other indicators simultaneously on any stock's chart.

*All analysis is for educational purposes only. Simulated data is used on the EntangleWealth platform.*`,
      "2026-04-10T00:00:00.000Z",
    ],
    [
      "financial-independence-building-wealth-step-by-step",
      "Financial Independence: A Step-by-Step Wealth Building Framework",
      "Financial Independence: Step-by-Step Wealth Building Guide | EntangleWealth",
      "A practical framework for building lasting wealth — from emergency funds and debt elimination to investing, tax optimization, and passive income.",
      `## The Financial Independence Roadmap

Financial independence means having enough assets to cover your living expenses without needing to work. While it sounds like a distant goal, a structured approach makes it achievable for most people.

## Step 1: Build Your Emergency Fund

Before investing, establish a cash cushion of 3–6 months of living expenses in a high-yield savings account. This protects you from unexpected expenses and prevents you from liquidating investments at the wrong time.

## Step 2: Eliminate High-Interest Debt

Consumer debt (credit cards, personal loans) charging over 7% annually will almost always have a greater impact on your net worth than investing the same money. Prioritize eliminating this debt using either:
- **Debt Avalanche**: Pay highest-interest debt first (mathematically optimal)
- **Debt Snowball**: Pay smallest balances first (psychologically motivating)

## Step 3: Maximize Tax-Advantaged Accounts

Contribute to tax-advantaged accounts before taxable investing:
1. **Employer 401(k) match**: Free money — always get the full match first
2. **HSA**: Triple tax advantage if you have a high-deductible health plan
3. **Roth IRA**: Tax-free growth and withdrawals in retirement ($7,000 limit in 2026)
4. **Max 401(k)**: Up to $23,500 pre-tax in 2026

## Step 4: Invest the Difference

Once tax-advantaged accounts are maximized, invest in a taxable brokerage with a low-cost, diversified portfolio:
- Total market index funds (e.g., VTI, FSKAX)
- International diversification (e.g., VXUS)
- Bond allocation based on your time horizon and risk tolerance

## Step 5: Optimize Your Tax Situation

- Track all deductible expenses (especially if self-employed)
- Harvest tax losses to offset capital gains
- Consider Roth conversions in lower-income years

## The 4% Rule and Your FI Number

Your Financial Independence number is typically 25x your annual expenses. At this amount, the historical "safe withdrawal rate" of 4% from a diversified portfolio has sustained 30+ years of retirement in nearly all historical scenarios.

Use the EntangleWealth WealthSim tool to model your path to financial independence based on your current income, savings rate, and investment returns.

*This article is for educational purposes only and does not constitute financial advice.*`,
      "2026-04-11T00:00:00.000Z",
    ],
  ];
  return articles.map(([slug, title, metaTitle, metaDescription, content, publishedAt]) => ({
    id: uid(),
    title,
    slug,
    content,
    metaTitle,
    metaDescription,
    status: "published" as const,
    publishedAt,
    createdAt: publishedAt,
    updatedAt: publishedAt,
  }));
}

function defaultMetaTags(): SeoMetaTag[] {
  const pages: Array<[string, string, string, string]> = [
    ["/", "Home", "EntangleWealth | Bloomberg Terminal-Parity for Everyone", "Free professional-grade financial analysis with 55+ indicators, 5,000 NASDAQ stocks, AI analysis, and tax tools."],
    ["/dashboard", "Dashboard", "Dashboard | EntangleWealth", "Your command center for markets, portfolio, and financial insights."],
    ["/technical", "Technical Analysis", "Technical Analysis | 55+ Indicators | EntangleWealth", "Professional technical analysis with RSI, MACD, Bollinger Bands, and 50+ more indicators."],
    ["/stocks", "Stocks", "5,000 NASDAQ Stocks | EntangleWealth", "Browse, search, and analyze 5,000 NASDAQ-listed stocks with real-time data."],
    ["/screener", "Screener", "Stock Screener | EntangleWealth", "Filter and screen stocks by market cap, volume, sector, and technical signals."],
    ["/options", "Options", "Options Chain & Greeks | EntangleWealth", "Live options chain with Greeks, IV, and strategy analysis tools."],
    ["/tax", "TaxFlow", "Tax Dashboard | Deductions & Tracking | EntangleWealth", "Track tax deductions, mileage, expenses, and maximize your refund."],
    ["/pricing", "Pricing", "Plans & Pricing | EntangleWealth", "Choose the right plan for your financial journey. Free tier available."],
    ["/about", "About", "About EntangleWealth | Our Mission", "Bloomberg Terminal-parity financial tools for everyday families."],
    ["/blog", "Blog", "EntangleWealth Blog | Financial Insights & Education", "Expert financial analysis, market insights, tax tips, and investing education."],
  ];
  return pages.map(([pagePath, pageLabel, title, description]) => ({
    id: uid(),
    pagePath,
    pageLabel,
    title,
    description,
    ogImage: "",
  }));
}
