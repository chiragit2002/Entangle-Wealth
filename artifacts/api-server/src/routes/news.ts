import { Router, type Request, type Response, type NextFunction } from "express";
import { createHash } from "crypto";
import { logger } from "../lib/logger";
import Parser from "rss-parser";
import { getAllSymbols } from "../data/nasdaq-stocks";
import { newsCache } from "../lib/cache";

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
  { topic: "Markets", url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^IXIC&region=US&lang=en-US" },
  { topic: "Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { topic: "Tech Policy", url: "https://techcrunch.com/feed/" },
  { topic: "Geopolitics", url: "https://feeds.npr.org/1004/rss.xml" },
  { topic: "Supply Chain", url: "https://www.freightwaves.com/news/rss.xml" },
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

let VALID_TICKERS: Set<string> | null = null;
function getValidTickers(): Set<string> {
  if (!VALID_TICKERS) {
    VALID_TICKERS = getAllSymbols();
  }
  return VALID_TICKERS;
}

const COMMON_NAMES_TO_TICKERS: Record<string, string> = {
  apple: "AAPL", microsoft: "MSFT", google: "GOOGL", alphabet: "GOOGL",
  amazon: "AMZN", nvidia: "NVDA", meta: "META", tesla: "TSLA",
  broadcom: "AVGO", netflix: "NFLX", amd: "AMD", intel: "INTC",
  qualcomm: "QCOM", tsmc: "TSM", arm: "ARM", palantir: "PLTR",
  coinbase: "COIN", crowdstrike: "CRWD", salesforce: "CRM", uber: "UBER",
  shopify: "SHOP", snowflake: "SNOW", paypal: "PYPL", boeing: "BA",
};

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

const TICKER_EXCLUSIONS = new Set([
  "A", "AN", "AM", "ARE", "AS", "AT", "BE", "BY", "DO", "FOR", "GO", "HAS",
  "HE", "IF", "IN", "IS", "IT", "KEY", "LOW", "MAN", "MAR", "MAT", "MAY",
  "MET", "NEW", "NOW", "OF", "OLD", "ON", "ONE", "OR", "OUT", "OWN",
  "RUN", "SAY", "SEE", "SET", "SO", "THE", "TO", "TWO", "UP", "US", "WAS",
  "WAY", "WE", "ALL", "BIG", "CAN", "CAR", "DAY", "DID", "END", "ERA",
  "FAR", "FIT", "GET", "GOT", "HAD", "HER", "HIM", "HIS", "HOW", "ITS",
  "JOB", "LET", "LOT", "NOT", "OUR", "PUT", "RAN", "SAT", "SHE", "SIT",
  "SIX", "TEN", "TOP", "TRY", "USE", "VIA", "WON", "YES", "YET",
  "ELSE", "EVER", "JUST", "LIKE", "MAKE", "MUCH", "NEXT", "OPEN",
  "PLUG", "PLUS", "VERY", "WELL", "WHEN", "WING",
  "FIVE", "FOUR", "FAST", "FACT", "GOOD", "GOLD", "GRAB", "FLEX",
  "FORM", "FREE", "FULL", "FUND", "GAIN", "GAME", "PEAK", "REAL",
  "RISK", "ROCK", "ROLL", "SAFE", "SAVE", "SHIP", "SHOP", "SHOW",
  "SIGN", "STAY", "STEP", "TAKE", "TALK", "TELL", "THAT", "THEM",
  "THEY", "THIS", "THAN", "THEN", "TRIP", "TRUE", "TURN", "UNIT",
  "WORK", "BILL", "BORN", "CALL", "CAME", "CASH", "CHIP", "CITE",
  "COAT", "COLD", "COME", "COOL", "CORE", "COST", "DEAL", "DEEP",
  "DROP", "EACH", "EAST", "EDGE", "EVEN", "FACE", "FAIL", "FALL",
  "FEEL", "FILE", "FILL", "FIRE", "FIRM", "FLAT", "FLOW", "FOLD",
  "FOOT", "GAVE", "GOES", "GONE", "GROW", "HALF", "HAND", "HANG",
  "HARD", "HATE", "HEAD", "HEAR", "HEAT", "HELP", "HERE", "HIGH",
  "HOLD", "HOME", "HOPE", "HUGE", "IDEA", "IRON", "JACK", "JOHN",
  "JOIN", "JUMP", "KEEP", "KEPT", "KIND", "KING", "KNEW", "KNOW",
  "LACK", "LAND", "LAST", "LATE", "LEAD", "LEFT", "LESS", "LIFT",
  "LINE", "LINK", "LIST", "LIVE", "LOAD", "LOCK", "LONG", "LOOK",
  "LORD", "LOSE", "LOST", "LOVE", "LUCK", "MADE", "MAIL", "MAIN",
  "MARK", "MASS", "MEAN", "MEET", "MIKE", "MILD", "MIND", "MINE",
  "MISS", "MODE", "MORE", "MOST", "MOVE", "MUST", "NAME", "NEAR",
  "NEED", "NEWS", "NOTE", "ONLY", "OVER", "PACE", "PACK", "PAGE",
  "PAID", "PAIR", "PALM", "PART", "PASS", "PAST", "PATH", "PICK",
  "PLAN", "PLAY", "POLL", "POOL", "POOR", "PORT", "POST", "POUR",
  "PRAY", "PULL", "PURE", "PUSH", "RACE", "RAIN", "RANK", "RARE",
  "RATE", "READ", "RELY", "REST", "RICH", "RIDE", "RING", "RISE",
  "ROAD", "ROLE", "ROOF", "ROOT", "ROPE", "ROSE", "RULE", "RUSH",
  "SAID", "SALE", "SALT", "SAME", "SAND", "SANG", "SEAT", "SEED",
  "SEEK", "SEEM", "SEEN", "SELF", "SELL", "SEND", "SENT", "SHOT",
  "SHUT", "SIDE", "SITE", "SIZE", "SLIP", "SLOW", "SNOW", "SOFT",
  "SOIL", "SOLD", "SOLE", "SOME", "SONG", "SOON", "SORT", "SPIN",
  "SPOT", "STAR", "STEM", "STOP", "SUCH", "SURE", "SWAP", "TALL",
  "TANK", "TAPE", "TASK", "TEAM", "TEAR", "TECH", "TEND", "TERM",
  "TEST", "TEXT", "THIN", "TIED", "TILL", "TIME", "TINY", "TIRE",
  "TOLD", "TONE", "TOOK", "TOOL", "TORN", "TOWN", "TREE", "TUBE",
  "TYPE", "UPON", "VAST", "VOTE", "WAGE", "WAIT", "WAKE", "WALK",
  "WALL", "WANT", "WARM", "WARN", "WASH", "WAVE", "WEAK", "WEAR",
  "WEEK", "WENT", "WEST", "WHAT", "WIDE", "WIFE", "WILD", "WILL",
  "WIND", "WINE", "WIRE", "WISE", "WISH", "WITH", "WOOD", "WORD",
  "WORE", "WRAP", "YARD", "YEAR", "YOUR", "ZERO", "ZONE",
  "ICE", "AIR", "AGE", "AID", "AIM", "ARM", "ART", "ASK", "ATE",
  "BAD", "BAR", "BAT", "BED", "BIT", "BOX", "BOY", "BUS", "BUT",
  "BUY", "COP", "CUT", "DIE", "DOG", "DRY", "DUE", "EAR", "EAT",
  "EGG", "EYE", "FAN", "FAT", "FED", "FEW", "FLY", "FOX", "FUN",
  "GAS", "GAP", "GUN", "GUY", "HIT", "HOT", "HUB", "HUT",
  "ILL", "JAM", "JET", "LAW", "LAY", "LED", "LEG", "LIE", "LIP",
  "LOG", "MAP", "MIX", "MOB", "MOM", "MUD", "NAP", "NET", "NOR",
  "NUT", "ODD", "OIL", "OWE", "PAD", "PAN", "PAY", "PEN", "PER",
  "PET", "PIE", "PIN", "PIT", "POP", "POT", "RAW", "RED", "RIB",
  "RID", "ROB", "ROD", "ROW", "RUB", "RUG", "SAD", "SAN", "TAP",
  "TAX", "TIE", "TIP", "TOE", "TON", "TOO", "WAR", "WEB", "WET",
  "WHO", "WHY", "WIN", "WIT", "WOK",
]);

function extractTickers(text: string): string[] {
  const tickers = getValidTickers();
  const found = new Set<string>();

  const words = text.split(/[\s,.()\[\]{}<>:;!?"'\/]+/);
  for (const w of words) {
    const upper = w.toUpperCase();
    if (upper.length >= 2 && upper.length <= 5 && tickers.has(upper) && !TICKER_EXCLUSIONS.has(upper)) {
      found.add(upper);
    }
  }

  const lower = text.toLowerCase();
  for (const [name, ticker] of Object.entries(COMMON_NAMES_TO_TICKERS)) {
    if (lower.includes(name)) {
      found.add(ticker);
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

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

async function fetchArticleBody(url: string): Promise<string> {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return "";
    const h = parsed.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0"
      || h.startsWith("10.") || h.startsWith("192.168.")
      || h.startsWith("172.16.") || h.startsWith("172.17.") || h.startsWith("172.18.")
      || h.startsWith("172.19.") || h.startsWith("172.2") || h.startsWith("172.30.")
      || h.startsWith("172.31.") || h.startsWith("169.254.")
      || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")
      || h.endsWith(".local") || h.endsWith(".internal")) return "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "EntangleWealth/1.0 NewsBot" },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const html = await res.text();
    const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : "";
    let text = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<[^>]*>/g, " ");
    text = text.replace(/&[a-zA-Z]+;/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > 1000) text = text.slice(0, 1000) + "...";
    return text;
  } catch {
    return "";
  }
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
      const rssSummary = cleanText(entry.contentSnippet || entry.content || entry.summary || "");
      const summary = rssSummary;
      const combinedText = `${title} ${summary}`;
      const score = scoreItem(title, combinedText);
      const sentiment = deriveSentiment(title, summary);
      const tickers = extractTickers(combinedText);

      const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now();
      const id = createHash("sha256").update(`${url}::${idx}::${link}::${title}`).digest("hex").slice(0, 16);

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

  const topItems = deduped.slice(0, 15);
  const bodyResults = await Promise.allSettled(
    topItems.map((item) => fetchArticleBody(item.link))
  );
  for (let i = 0; i < topItems.length; i++) {
    const r = bodyResults[i];
    if (r.status === "fulfilled" && r.value) {
      const bodyText = r.value;
      const bodyTickers = extractTickers(bodyText);
      for (const t of bodyTickers) {
        if (!topItems[i].tickers.includes(t)) {
          topItems[i].tickers.push(t);
        }
      }
      const bodyScore = scoreItem("", bodyText);
      topItems[i].score += Math.min(bodyScore, 10);
      if (!topItems[i].summary || topItems[i].summary.length < 50) {
        topItems[i].summary = bodyText.slice(0, 500);
      }
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
    const topic = (req.query.topic as string) || "";
    const search = (req.query.search as string) || "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const newsCacheKey = `news:${topic}:${search}:${limit}:${offset}`;
    const cached = newsCache.get(newsCacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const items = await scrapeAllFeeds();

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

    const response = {
      items: paged,
      total,
      topics: topicCounts,
      cachedAt: cacheTime,
      feedCount: FEEDS.length,
    };
    newsCache.set(newsCacheKey, response);
    res.json(response);
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
