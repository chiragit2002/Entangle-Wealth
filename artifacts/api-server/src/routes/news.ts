import { Router, type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";
import Parser from "rss-parser";

const router = Router();
const rssParser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "EntangleWealth/1.0 NewsBot" },
});

const FEEDS: { topic: string; url: string }[] = [
  { topic: "Microelectronics", url: "https://www.eetimes.com/feed/" },
  { topic: "Microelectronics", url: "https://semiengineering.com/feed/" },
  { topic: "Microelectronics", url: "https://www.allaboutcircuits.com/rss/" },
  { topic: "Geopolitics", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { topic: "Geopolitics", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { topic: "Geopolitics", url: "https://rss.cnn.com/rss/edition.rss" },
  { topic: "Tech Policy", url: "https://www.theverge.com/rss/index.xml" },
  { topic: "Supply Chain", url: "https://www.supplychaindive.com/feeds/news/" },
  { topic: "Microelectronics", url: "https://www.tomshardware.com/feeds/all" },
  { topic: "Tech Policy", url: "https://arstechnica.com/feed/" },
];

export interface NewsItem {
  id: string;
  topic: string;
  title: string;
  link: string;
  source: string;
  published: string;
  publishedAt: number;
  summary: string;
  score: number;
  sentiment: "positive" | "negative" | "neutral";
  tickers: string[];
}

const RELEVANCE_WEIGHTS: Record<string, number> = {
  chip: 3, semiconductor: 3, tsmc: 4, nvidia: 3, amd: 3, intel: 3,
  globalfoundries: 3, fab: 2, foundry: 2, wafer: 2, asml: 3,
  ai: 2, "artificial intelligence": 3, "machine learning": 2, gpu: 2, cpu: 2,
  "supply chain": 3, shortage: 3, "export": 3, sanction: 4, "export control": 4,
  "trade war": 4, tariff: 3, embargo: 4,
  taiwan: 4, china: 3, usa: 2, europe: 2, japan: 2, "south korea": 2,
  nato: 2, conflict: 3, war: 2, tension: 2,
  investment: 2, funding: 2, regulation: 2, policy: 2,
  earnings: 2, revenue: 2, "market cap": 2, ipo: 2, acquisition: 2, merger: 2,
  inflation: 2, "interest rate": 3, "federal reserve": 3, fed: 2, recession: 3,
  cryptocurrency: 2, bitcoin: 2, blockchain: 2,
  cybersecurity: 2, hack: 2, breach: 2,
  "data center": 2, cloud: 2, quantum: 3,
};

const POSITIVE_WORDS = [
  "surge", "rally", "gain", "bullish", "record", "growth", "profit", "exceed",
  "beat", "upgrade", "expansion", "boost", "optimistic", "recovery", "breakthrough",
  "innovation", "strong", "outperform", "positive", "soar",
];

const NEGATIVE_WORDS = [
  "crash", "plunge", "drop", "bearish", "decline", "loss", "miss", "downgrade",
  "recession", "warning", "threat", "risk", "concern", "weakness", "sell-off",
  "default", "layoff", "bankruptcy", "negative", "slump", "shutdown", "crisis",
];

const COMMON_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "AVGO",
  "NFLX", "AMD", "INTC", "QCOM", "TXN", "AMAT", "LRCX", "MU", "MRVL",
  "ASML", "TSM", "SMCI", "ARM", "PLTR", "COIN", "SOFI", "RKLB", "CRWD",
  "PANW", "CRM", "UBER", "SHOP", "SNOW", "NET", "DDOG", "SQ", "PYPL",
  "BABA", "JD", "PDD", "NIO", "LI", "RIVN", "LCID",
  "SPY", "QQQ", "DIA", "IWM", "VTI",
  "JPM", "GS", "V", "MA", "BAC", "WFC",
  "XOM", "CVX", "BA", "LMT", "RTX",
  "UNH", "LLY", "PFE", "JNJ", "MRNA",
]);

function scoreItem(title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 0;
  for (const [token, weight] of Object.entries(RELEVANCE_WEIGHTS)) {
    if (text.includes(token)) score += weight;
  }
  if (summary && summary.length > 50) score += 2;
  else if (summary) score += 1;
  return score;
}

function deriveSentiment(title: string, summary: string): "positive" | "negative" | "neutral" {
  const text = `${title} ${summary}`.toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POSITIVE_WORDS) { if (text.includes(w)) pos++; }
  for (const w of NEGATIVE_WORDS) { if (text.includes(w)) neg++; }
  if (pos > neg + 1) return "positive";
  if (neg > pos + 1) return "negative";
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

function extractTickers(text: string): string[] {
  const words = text.split(/[\s,.()\[\]{}<>:;!?"'\/]+/);
  const found = new Set<string>();
  for (const w of words) {
    const upper = w.toUpperCase();
    if (COMMON_TICKERS.has(upper) && upper.length >= 2) {
      found.add(upper);
    }
  }
  return Array.from(found);
}

function cleanText(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/<[^>]*>/g, "");
  text = text.replace(/&[a-zA-Z]+;/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > 500) text = text.slice(0, 500) + "...";
  return text;
}

let cachedItems: NewsItem[] = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function parseFeed(topic: string, url: string): Promise<NewsItem[]> {
  try {
    const feed = await rssParser.parseURL(url);
    const source = feed.title || url;
    const items: NewsItem[] = [];

    const feedEntries = (feed.items || []).slice(0, 10);
    for (let idx = 0; idx < feedEntries.length; idx++) {
      const entry = feedEntries[idx];
      const title = cleanText(entry.title || "Untitled");
      const link = entry.link || "";
      const pubDate = entry.pubDate || entry.isoDate || "";
      const summary = cleanText(entry.contentSnippet || entry.content || entry.summary || "");
      const combinedText = `${title} ${summary}`;
      const score = scoreItem(title, summary);
      const sentiment = deriveSentiment(title, summary);
      const tickers = extractTickers(combinedText);

      const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now();
      const raw = `${url}::${idx}::${link}::${title}`;
      const id = Buffer.from(raw).toString("base64url").slice(0, 40);

      items.push({
        id,
        topic,
        title,
        link,
        source,
        published: pubDate,
        publishedAt: isNaN(publishedAt) ? Date.now() : publishedAt,
        summary,
        score,
        sentiment,
        tickers,
      });
    }

    return items;
  } catch (err: any) {
    logger.warn({ url, err: err.message }, "Failed to parse RSS feed");
    return [];
  }
}

async function scrapeAllFeeds(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cachedItems.length > 0 && now - cacheTime < CACHE_TTL) {
    return cachedItems;
  }

  logger.info("Scraping RSS feeds for news intelligence...");

  const results = await Promise.allSettled(
    FEEDS.map((f) => parseFeed(f.topic, f.url))
  );

  const allItems: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") allItems.push(...r.value);
  }

  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of allItems) {
    const key = item.title.toLowerCase().slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => b.score - a.score || b.publishedAt - a.publishedAt);

  cachedItems = deduped;
  cacheTime = now;

  logger.info({ count: deduped.length }, "News intelligence scrape complete");
  return deduped;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function newsRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > 30) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }
  next();
}

router.use("/news", newsRateLimit);

router.get("/news", async (req: Request, res: Response) => {
  try {
    const items = await scrapeAllFeeds();

    const topic = (req.query.topic as string) || "";
    const search = (req.query.search as string) || "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let filtered = items;

    if (topic && topic !== "All") {
      filtered = filtered.filter((i) => i.topic === topic);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q) ||
          i.tickers.some((t) => t.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    const topicCounts: Record<string, number> = {};
    for (const i of items) {
      topicCounts[i.topic] = (topicCounts[i.topic] || 0) + 1;
    }

    res.json({
      items: paged,
      total,
      topics: topicCounts,
      cachedAt: cacheTime,
      feedCount: FEEDS.length,
    });
  } catch (err: any) {
    logger.error({ err }, "News endpoint failed");
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

let lastRefreshRequest = 0;
const REFRESH_COOLDOWN = 60_000;

router.get("/news/refresh", async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (now - lastRefreshRequest < REFRESH_COOLDOWN) {
      res.status(429).json({ error: "Refresh cooldown active. Try again in 60s." });
      return;
    }
    lastRefreshRequest = now;
    cacheTime = 0;
    cachedItems = [];
    const items = await scrapeAllFeeds();
    res.json({ refreshed: true, count: items.length });
  } catch (err: any) {
    logger.error({ err }, "News refresh failed");
    res.status(500).json({ error: "Failed to refresh news" });
  }
});

export default router;
