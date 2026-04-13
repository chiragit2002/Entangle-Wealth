import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Calendar, ArrowRight, BookOpen, TrendingUp, GraduationCap, BarChart3 } from "lucide-react";
import { loadBlogPosts, type BlogPost } from "@/lib/seoStore";

export default function BlogIndex() {
  const [search, setSearch] = useState("");
  const posts = useMemo(() => {
    let list = loadBlogPosts().filter((p) => p.status === "published");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.metaDescription.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    return list;
  }, [search]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Entangle<span className="text-primary">Wealth</span> Blog
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Expert financial analysis, market insights, tax tips, and investing education
          </p>
        </div>

        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-sm"
          />
        </div>

        {posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : search ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">No articles match your search</p>
            <p className="text-sm">Try a different keyword or browse our other resources below.</p>
          </div>
        ) : (
          <div className="text-center py-16 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Articles Coming Soon</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              While we prepare our first articles, explore the tools and resources already available on EntangleWealth.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <Link href="/research">
                <div className="group rounded-xl border border-white/[0.06] p-5 hover:border-primary/20 transition-all cursor-pointer text-left" style={{ background: "rgba(8,8,20,0.6)" }}>
                  <TrendingUp className="w-6 h-6 text-primary mb-3" />
                  <p className="font-semibold text-white text-sm mb-1">News Intelligence</p>
                  <p className="text-xs text-muted-foreground">Live financial news scored by relevance</p>
                </div>
              </Link>
              <Link href="/technical">
                <div className="group rounded-xl border border-white/[0.06] p-5 hover:border-primary/20 transition-all cursor-pointer text-left" style={{ background: "rgba(8,8,20,0.6)" }}>
                  <BarChart3 className="w-6 h-6 text-primary mb-3" />
                  <p className="font-semibold text-white text-sm mb-1">Technical Analysis</p>
                  <p className="text-xs text-muted-foreground">55+ indicators with AI consensus signals</p>
                </div>
              </Link>
              <Link href="/market-overview">
                <div className="group rounded-xl border border-white/[0.06] p-5 hover:border-primary/20 transition-all cursor-pointer text-left" style={{ background: "rgba(8,8,20,0.6)" }}>
                  <GraduationCap className="w-6 h-6 text-primary mb-3" />
                  <p className="font-semibold text-white text-sm mb-1">Market Overview</p>
                  <p className="text-xs text-muted-foreground">Live market data and sector analysis</p>
                </div>
              </Link>
            </div>
            <Link href="/dashboard">
              <Button className="bg-primary text-black hover:bg-primary/90 font-semibold">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const date = post.publishedAt || post.createdAt;
  const preview = post.metaDescription || post.content.slice(0, 200).replace(/[#*_]/g, "");

  return (
    <Link href={`/blog/${post.slug}`}>
      <article
        className="group rounded-xl border border-white/[0.06] p-6 hover:border-primary/20 transition-all cursor-pointer"
        style={{ background: "rgba(8,8,20,0.6)" }}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>
        <h2 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        <p className="text-sm text-white/50 line-clamp-2 mb-3">{preview}</p>
        <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
          Read more <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </article>
    </Link>
  );
}
