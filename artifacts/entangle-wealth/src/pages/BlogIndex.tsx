import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Search, FileText, Calendar, ArrowRight } from "lucide-react";
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
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">
              {search ? "No articles match your search" : "No articles published yet"}
            </p>
            <p className="text-sm">Check back soon for financial insights and analysis.</p>
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
