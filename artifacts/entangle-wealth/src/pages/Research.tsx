import { useState, useEffect, useCallback, Fragment } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { fetchNews, type NewsItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, ExternalLink, RefreshCw, Clock, Zap, ChevronDown, ChevronUp,
  Cpu, Globe, Truck, Scale, Newspaper,
} from "lucide-react";

const TOPICS = ["All", "Microelectronics", "Geopolitics", "Supply Chain", "Tech Policy"];
const TOPIC_ICONS: Record<string, typeof Cpu> = {
  Microelectronics: Cpu,
  Geopolitics: Globe,
  "Supply Chain": Truck,
  "Tech Policy": Scale,
};
const TOPIC_COLORS: Record<string, string> = {
  Microelectronics: "text-[#00c8f8] bg-[rgba(0,200,248,0.1)] border-[rgba(0,200,248,0.2)]",
  Geopolitics: "text-[#ff4466] bg-[rgba(255,68,102,0.1)] border-[rgba(255,68,102,0.2)]",
  "Supply Chain": "text-[#f5c842] bg-[rgba(245,200,66,0.1)] border-[rgba(245,200,66,0.2)]",
  "Tech Policy": "text-[#00e676] bg-[rgba(0,230,118,0.1)] border-[rgba(0,230,118,0.2)]",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 15 ? "text-[#00e676] bg-[rgba(0,230,118,0.15)]" :
    score >= 8 ? "text-[#f5c842] bg-[rgba(245,200,66,0.15)]" :
    score >= 3 ? "text-[#00c8f8] bg-[rgba(0,200,248,0.15)]" :
    "text-muted-foreground bg-white/5";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      <Zap className="w-3 h-3" />
      {score}
    </span>
  );
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  const color =
    sentiment === "positive" ? "bg-[#00e676]" :
    sentiment === "negative" ? "bg-[#ff4466]" :
    "bg-[#5a5a7a]";
  return <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />;
}

function TickerLink({ ticker }: { ticker: string }) {
  return (
    <Link
      href={`/stocks`}
      className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold hover:bg-primary/20 transition-colors"
    >
      ${ticker}
    </Link>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);
  const topicColor = TOPIC_COLORS[item.topic] || "text-muted-foreground bg-white/5 border-white/10";
  const TopicIcon = TOPIC_ICONS[item.topic] || Newspaper;

  return (
    <div className="signal-card mb-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${topicColor}`}>
              <TopicIcon className="w-3 h-3" />
              {item.topic}
            </span>
            <ScoreBadge score={item.score} />
            <SentimentDot sentiment={item.sentiment} />
          </div>
          <h3 className="text-sm font-bold text-white leading-snug">{item.title}</h3>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
        <span className="font-semibold text-white/50">{item.source}</span>
        <span>·</span>
        <Clock className="w-3 h-3" />
        <span>{timeAgo(item.published)}</span>
        {item.link && (
          <>
            <span>·</span>
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
              <ExternalLink className="w-3 h-3" />
              Read
            </a>
          </>
        )}
      </div>

      {item.tickers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {item.tickers.map((t) => <TickerLink key={t} ticker={t} />)}
        </div>
      )}

      {item.summary && (
        <>
          <p className={`text-xs text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {item.summary}
          </p>
          {item.summary.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-primary font-semibold mt-1 inline-flex items-center gap-0.5 hover:underline"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="signal-card mb-3 animate-pulse">
      <div className="flex gap-2 mb-2">
        <div className="h-4 w-28 bg-white/5 rounded-full" />
        <div className="h-4 w-10 bg-white/5 rounded-full" />
      </div>
      <div className="h-4 w-full bg-white/5 rounded mb-1.5" />
      <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  );
}

export default function Research() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [topic, setTopic] = useState("All");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [feedCount, setFeedCount] = useState(0);

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNews({ topic: topic === "All" ? undefined : topic, search: search || undefined, limit: 50 });
      setItems(data.items);
      setTotal(data.total);
      setTopicCounts(data.topics);
      setFeedCount(data.feedCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [topic, search]);

  useEffect(() => { loadNews(); }, [loadNews]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const totalAll = Object.values(topicCounts).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">
              News <span className="electric-text">Intelligence</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {feedCount} feeds · {totalAll} articles · Scored by financial relevance
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadNews}
            disabled={loading}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles, tickers, sources..."
              className="pl-10 h-11 bg-black/50 border-white/10 focus-visible:ring-primary"
            />
          </div>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {TOPICS.map((t) => {
            const count = t === "All" ? totalAll : (topicCounts[t] || 0);
            const active = topic === t;
            return (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`filter-pill flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-white/[0.03] border-white/[0.08] text-muted-foreground hover:bg-white/[0.06]"
                }`}
              >
                {t}
                <span className={`text-[10px] ${active ? "text-primary/70" : "text-muted-foreground/50"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-muted-foreground mb-1">No articles found</h3>
            <p className="text-sm text-muted-foreground/60">
              {search ? "Try a different search term" : "Feeds are being scraped — check back shortly"}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{total} articles</span>
              <span className="live-dot text-[10px]">LIVE</span>
            </div>
            {items.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
