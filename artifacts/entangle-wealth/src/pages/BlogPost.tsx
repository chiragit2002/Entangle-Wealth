import { useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Calendar, Clock, FileText } from "lucide-react";
import { loadBlogPosts } from "@/lib/seoStore";
import { marked } from "marked";
import DOMPurify from "dompurify";

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      "h1","h2","h3","h4","h5","h6","p","strong","em","code","pre",
      "ul","ol","li","blockquote","a","br","hr","table","thead","tbody",
      "tr","th","td","img","span","div",
    ],
    ALLOWED_ATTR: ["href","src","alt","title","class","target","rel"],
    ALLOW_DATA_ATTR: false,
  });
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();

  const post = useMemo(() => {
    const posts = loadBlogPosts();
    return posts.find((p) => p.slug === params.slug && p.status === "published") || null;
  }, [params.slug]);

  useEffect(() => {
    if (!post) return;
    const prevTitle = document.title;
    document.title = post.metaTitle || post.title;
    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") || "";
    if (post.metaDescription) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", post.metaDescription);
    }
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", post.metaTitle || post.title);
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", post.metaDescription);
    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevDesc);
    };
  }, [post]);

  if (!post) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">This blog post doesn't exist or hasn't been published yet.</p>
          <Link href="/blog" className="text-primary hover:underline text-sm font-semibold flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </Layout>
    );
  }

  const date = post.publishedAt || post.createdAt;
  const readTime = estimateReadTime(post.content);

  return (
    <Layout>
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/blog" className="text-primary hover:underline text-sm font-semibold flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {readTime} min read
            </span>
          </div>
        </header>

        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        <div className="border-t border-border mt-12 pt-8">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <h3 className="text-lg font-bold text-foreground mb-2">Ready to level up your financial game?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              EntangleWealth gives you Bloomberg Terminal-parity tools | free.
            </p>
            <Link href="/sign-up" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </article>
    </Layout>
  );
}
