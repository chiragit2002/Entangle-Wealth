import { useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { ArrowLeft, Calendar, Clock, FileText } from "lucide-react";
import { loadBlogPosts } from "@/lib/seoStore";

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, '<code class="bg-white/[0.06] px-1.5 py-0.5 rounded text-primary text-sm font-mono">$1</code>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 text-white/70 mb-1">• $1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-white/70 mb-1">$1</li>');
  html = html.replace(/\n\n/g, '</p><p class="text-white/70 leading-relaxed mb-4">');
  html = `<p class="text-white/70 leading-relaxed mb-4">${html}</p>`;
  html = html.replace(/<p class="text-white\/70 leading-relaxed mb-4">(<h[1-3])/g, "$1");
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, "$1");

  return html;
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
          <h1 className="text-2xl font-bold text-white mb-2">Article Not Found</h1>
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4 leading-tight">
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
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        <div className="border-t border-white/[0.06] mt-12 pt-8">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Ready to level up your financial game?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              EntangleWealth gives you Bloomberg Terminal-parity tools — free.
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
