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
  return load<BlogPost>(LS_BLOG, []);
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

function defaultMetaTags(): SeoMetaTag[] {
  const pages: Array<[string, string, string, string]> = [
    ["/", "Home", "EntangleWealth — Bloomberg Terminal-Parity for Everyone", "Free professional-grade financial analysis with 55+ indicators, 5,000 NASDAQ stocks, AI analysis, and tax tools."],
    ["/dashboard", "Dashboard", "Dashboard | EntangleWealth", "Your command center for markets, portfolio, and financial insights."],
    ["/technical", "Technical Analysis", "Technical Analysis — 55+ Indicators | EntangleWealth", "Professional technical analysis with RSI, MACD, Bollinger Bands, and 50+ more indicators."],
    ["/stocks", "Stocks", "5,000 NASDAQ Stocks | EntangleWealth", "Browse, search, and analyze 5,000 NASDAQ-listed stocks with real-time data."],
    ["/screener", "Screener", "Stock Screener | EntangleWealth", "Filter and screen stocks by market cap, volume, sector, and technical signals."],
    ["/options", "Options", "Options Chain & Greeks | EntangleWealth", "Live options chain with Greeks, IV, and strategy analysis tools."],
    ["/tax", "TaxFlow", "Tax Dashboard — Deductions & Tracking | EntangleWealth", "Track tax deductions, mileage, expenses, and maximize your refund."],
    ["/pricing", "Pricing", "Plans & Pricing | EntangleWealth", "Choose the right plan for your financial journey. Free tier available."],
    ["/about", "About", "About EntangleWealth — Our Mission", "Bloomberg Terminal-parity financial tools for everyday families."],
    ["/blog", "Blog", "EntangleWealth Blog — Financial Insights & Education", "Expert financial analysis, market insights, tax tips, and investing education."],
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
