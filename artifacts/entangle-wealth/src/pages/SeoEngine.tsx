import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import {
  Shield,
  Loader2,
  Search,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Globe,
  FileText,
  Link2,
  BarChart3,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Eye,
  Copy,
  Download,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
} from "lucide-react";
import {
  type SeoKeyword,
  type BlogPost,
  type SeoMetaTag,
  type Backlink,
  loadKeywords,
  saveKeywords,
  addKeyword,
  deleteKeyword,
  loadBlogPosts,
  addBlogPost,
  updateBlogPost,
  deleteBlogPost,
  loadMetaTags,
  updateMetaTag,
  loadBacklinks,
  saveBacklinks,
  addBacklink,
  updateBacklink,
  deleteBacklink,
  updateKeyword,
  slugify,
} from "@/lib/seoStore";

type Tab = "keywords" | "blog" | "meta" | "backlinks";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "keywords", label: "Keywords", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "blog", label: "Blog", icon: <FileText className="w-4 h-4" /> },
  { id: "meta", label: "Meta Tags", icon: <Globe className="w-4 h-4" /> },
  { id: "backlinks", label: "Backlinks", icon: <Link2 className="w-4 h-4" /> },
];

function KeywordsTab() {
  const [keywords, setKeywords] = useState<SeoKeyword[]>(loadKeywords);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"keyword" | "volume" | "difficulty" | "rank">("volume");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKw, setNewKw] = useState("");
  const [newVol, setNewVol] = useState("");
  const [newDiff, setNewDiff] = useState("");
  const [newRank, setNewRank] = useState("");
  const [editKw, setEditKw] = useState("");
  const [editVol, setEditVol] = useState("");
  const [editDiff, setEditDiff] = useState("");
  const [editRank, setEditRank] = useState("");
  const [editTrend, setEditTrend] = useState<"up" | "down" | "stable">("stable");

  const filtered = useMemo(() => {
    let list = keywords;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((k) => k.keyword.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "keyword") cmp = a.keyword.localeCompare(b.keyword);
      else cmp = (a[sortField] || 0) - (b[sortField] || 0);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [keywords, search, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir(field === "keyword" ? "asc" : "desc");
    }
  };

  const handleAdd = () => {
    if (!newKw.trim()) return;
    const entry = addKeyword({
      keyword: newKw.trim(),
      volume: parseInt(newVol) || 0,
      difficulty: parseInt(newDiff) || 0,
      rank: parseInt(newRank) || 0,
      trend: "stable",
    });
    setKeywords([...keywords, entry]);
    setNewKw("");
    setNewVol("");
    setNewDiff("");
    setNewRank("");
    setShowAdd(false);
  };

  const startEdit = (kw: SeoKeyword) => {
    setEditingId(kw.id);
    setEditKw(kw.keyword);
    setEditVol(String(kw.volume));
    setEditDiff(String(kw.difficulty));
    setEditRank(String(kw.rank));
    setEditTrend(kw.trend);
  };

  const handleEdit = () => {
    if (!editingId || !editKw.trim()) return;
    updateKeyword(editingId, {
      keyword: editKw.trim(),
      volume: parseInt(editVol) || 0,
      difficulty: parseInt(editDiff) || 0,
      rank: parseInt(editRank) || 0,
      trend: editTrend,
    });
    setKeywords(loadKeywords());
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteKeyword(id);
    setKeywords(keywords.filter((k) => k.id !== id));
  };

  const SortBtn = ({ field, label }: { field: typeof sortField; label: string }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      {sortField === field ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
    </button>
  );

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground/50" />;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search keywords..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted/50 border-border text-sm" />
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Keyword
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Input placeholder="Keyword" value={newKw} onChange={(e) => setNewKw(e.target.value)} className="bg-muted/50 border-border text-sm col-span-2 md:col-span-1" />
          <Input placeholder="Volume" type="number" value={newVol} onChange={(e) => setNewVol(e.target.value)} className="bg-muted/50 border-border text-sm" />
          <Input placeholder="Difficulty (0-100)" type="number" value={newDiff} onChange={(e) => setNewDiff(e.target.value)} className="bg-muted/50 border-border text-sm" />
          <Input placeholder="Current Rank" type="number" value={newRank} onChange={(e) => setNewRank(e.target.value)} className="bg-muted/50 border-border text-sm" />
          <Button onClick={handleAdd} className="bg-primary text-black hover:bg-primary/90 text-xs font-bold">Save</Button>
        </div>
      )}

      <div className="text-xs text-muted-foreground mb-2">{filtered.length} keywords tracked</div>

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: "rgba(8,8,20,0.6)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold"><SortBtn field="keyword" label="Keyword" /></th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold"><SortBtn field="volume" label="Volume" /></th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold"><SortBtn field="difficulty" label="Difficulty" /></th>
                <th className="text-right px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold"><SortBtn field="rank" label="Rank" /></th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold">Trend</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((kw) =>
                editingId === kw.id ? (
                  <tr key={kw.id} className="border-b border-primary/20 bg-primary/5">
                    <td className="px-4 py-2"><Input value={editKw} onChange={(e) => setEditKw(e.target.value)} className="bg-muted/50 border-border text-sm h-8" /></td>
                    <td className="px-4 py-2"><Input type="number" value={editVol} onChange={(e) => setEditVol(e.target.value)} className="bg-muted/50 border-border text-sm h-8 text-right w-24 ml-auto" /></td>
                    <td className="px-4 py-2"><Input type="number" value={editDiff} onChange={(e) => setEditDiff(e.target.value)} className="bg-muted/50 border-border text-sm h-8 text-right w-20 ml-auto" /></td>
                    <td className="px-4 py-2"><Input type="number" value={editRank} onChange={(e) => setEditRank(e.target.value)} className="bg-muted/50 border-border text-sm h-8 text-right w-20 ml-auto" /></td>
                    <td className="px-4 py-2 text-center">
                      <select value={editTrend} onChange={(e) => setEditTrend(e.target.value as "up" | "down" | "stable")} className="bg-muted/50 border border-border rounded px-2 py-1 text-xs text-foreground">
                        <option value="up">↑ Up</option>
                        <option value="down">↓ Down</option>
                        <option value="stable">— Stable</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={handleEdit} className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="Save edit"><Save className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Cancel edit"><X className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={kw.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-foreground/90">{kw.keyword}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-foreground/70">{kw.volume.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono text-sm ${kw.difficulty <= 30 ? "text-emerald-400" : kw.difficulty <= 60 ? "text-yellow-400" : "text-red-400"}`}>{kw.difficulty}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-foreground/70">{kw.rank || "—"}</td>
                    <td className="px-4 py-3 text-center"><TrendIcon trend={kw.trend} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(kw)} className="text-blue-400/60 hover:text-blue-400 transition-colors" aria-label={`Edit keyword ${kw.keyword}`}><Edit3 className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button onClick={() => handleDelete(kw.id)} className="text-red-400/60 hover:text-red-400 transition-colors" aria-label={`Delete keyword ${kw.keyword}`}><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[10px] font-mono text-muted-foreground/40">&gt; NO KEYWORDS FOUND — adjust search parameters</div>
        )}
      </div>
    </div>
  );
}

function BlogTab() {
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>(loadBlogPosts);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [generating, setGenerating] = useState(false);

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setContent("");
    setMetaTitle("");
    setMetaDesc("");
    setEditing(null);
    setCreating(false);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setCreating(true);
    setTitle(post.title);
    setSlug(post.slug);
    setContent(post.content);
    setMetaTitle(post.metaTitle);
    setMetaDesc(post.metaDescription);
  };

  const handleSave = (status: "draft" | "published") => {
    if (!title.trim()) return;
    const finalSlug = slug.trim() || slugify(title);
    if (editing) {
      updateBlogPost(editing.id, {
        title: title.trim(),
        slug: finalSlug,
        content,
        metaTitle: metaTitle.trim(),
        metaDescription: metaDesc.trim(),
        status,
        publishedAt: status === "published" && !editing.publishedAt ? new Date().toISOString() : editing.publishedAt,
      });
    } else {
      addBlogPost({
        title: title.trim(),
        slug: finalSlug,
        content,
        metaTitle: metaTitle.trim() || title.trim(),
        metaDescription: metaDesc.trim(),
        status,
        publishedAt: status === "published" ? new Date().toISOString() : null,
      });
    }
    setPosts(loadBlogPosts());
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteBlogPost(id);
    setPosts(loadBlogPosts());
  };

  const handleGenerate = async () => {
    if (!title.trim()) return;
    setGenerating(true);
    try {
      const res = await authFetch("/marketing/generate", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "blog", topic: title, tone: "educational" }),
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || "");
      }
    } catch {
      /* AI unavailable */
    }
    setGenerating(false);
  };

  const exportPost = (post: BlogPost, format: "html" | "md") => {
    let output = "";
    if (format === "html") {
      const htmlContent = post.content
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/^- (.+)$/gm, "<li>$1</li>")
        .replace(/\n/g, "<br/>\n");
      output = `<!DOCTYPE html>\n<html><head><title>${post.metaTitle}</title><meta name="description" content="${post.metaDescription}"/></head><body>\n<h1>${post.title}</h1>\n${htmlContent}\n</body></html>`;
    } else {
      output = `# ${post.title}\n\n${post.content}`;
    }
    const blob = new Blob([output], { type: format === "html" ? "text/html" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${post.slug}.${format === "html" ? "html" : "md"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (creating) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">{editing ? "Edit Post" : "New Blog Post"}</h3>
          <Button variant="ghost" size="sm" onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} className="bg-muted/50 border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slug</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="bg-muted/50 border-border font-mono text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Meta Title <span className={metaTitle.length > 60 ? "text-red-400" : "text-muted-foreground/50"}>({metaTitle.length}/60)</span></label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="bg-muted/50 border-border" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Meta Description <span className={metaDesc.length > 160 ? "text-red-400" : "text-muted-foreground/50"}>({metaDesc.length}/160)</span></label>
              <Input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} className="bg-muted/50 border-border" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Content (Markdown)</label>
              <Button onClick={handleGenerate} disabled={generating || !title.trim()} className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 gap-1.5 text-xs h-7 px-3">
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generate with AI
              </Button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground/90 font-mono resize-y focus:outline-none focus:border-primary/40"
              placeholder="Write your blog post content in Markdown..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={() => handleSave("draft")} className="bg-muted/50 text-foreground/80 hover:bg-white/[0.1] border border-border gap-1.5 text-xs">
              <Save className="w-3.5 h-3.5" /> Save Draft
            </Button>
            <Button onClick={() => handleSave("published")} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Publish
            </Button>
          </div>

          {(metaTitle || title) && (
            <div className="mt-4">
              <label className="text-xs text-muted-foreground mb-2 block">Google Search Preview</label>
              <SerpPreview title={metaTitle || title} description={metaDesc} url={`entanglewealth.com/blog/${slug || slugify(title)}`} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">{posts.length} posts</span>
        <Button onClick={() => setCreating(true)} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> New Post
        </Button>
      </div>
      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="rounded-xl border border-border p-4 hover:border-white/[0.1] transition-colors" style={{ background: "rgba(8,8,20,0.6)" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">{post.title}</h4>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${post.status === "published" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                    {post.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">/blog/{post.slug}</p>
                {post.metaDescription && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.metaDescription}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {post.status === "published" && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-primary hover:bg-muted/50 transition-colors">
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => exportPost(post, "html")} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-primary hover:bg-muted/50 transition-colors" title="Export HTML">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => exportPost(post, "md")} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-primary hover:bg-muted/50 transition-colors" title="Export Markdown">
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(post)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-blue-400 hover:bg-muted/50 transition-colors" aria-label="Edit post">
                  <Edit3 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button onClick={() => handleDelete(post.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/70 hover:text-red-400 hover:bg-muted/50 transition-colors" aria-label="Delete post">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No blog posts yet. Create your first post.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SerpPreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="rounded-lg border border-border p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
      <p className="text-xs text-emerald-400/80 font-normal mb-0.5 truncate">{url || "entanglewealth.com"}</p>
      <p className="text-[#8ab4f8] text-base font-medium mb-1 truncate hover:underline cursor-default">{title || "Page Title"}</p>
      <p className="text-[#bdc1c6] text-[13px] leading-relaxed line-clamp-2">{description || "Add a meta description to see a preview here."}</p>
    </div>
  );
}

function MetaTagsTab() {
  const [tags, setTags] = useState<SeoMetaTag[]>(loadMetaTags);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleUpdate = (id: string, field: keyof SeoMetaTag, value: string) => {
    updateMetaTag(id, { [field]: value });
    setTags(tags.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  return (
    <div className="space-y-4">
      {tags.map((tag) => {
        const isEditing = editingId === tag.id;
        return (
          <div key={tag.id} className="rounded-xl border border-border p-4" style={{ background: "rgba(8,8,20,0.6)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{tag.pageLabel}</span>
                <span className="text-xs text-muted-foreground font-mono">{tag.pagePath}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingId(isEditing ? null : tag.id)} className="text-xs text-muted-foreground hover:text-foreground h-7 px-2" aria-label={isEditing ? "Cancel editing" : `Edit ${tag.pageLabel}`}>
                {isEditing ? <X className="w-3.5 h-3.5" aria-hidden="true" /> : <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Title <span className={tag.title.length > 60 ? "text-red-400" : "text-muted-foreground/50"}>({tag.title.length}/60)</span>
                  </label>
                  <Input value={tag.title} onChange={(e) => handleUpdate(tag.id, "title", e.target.value)} className="bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Description <span className={tag.description.length > 160 ? "text-red-400" : "text-muted-foreground/50"}>({tag.description.length}/160)</span>
                  </label>
                  <Input value={tag.description} onChange={(e) => handleUpdate(tag.id, "description", e.target.value)} className="bg-muted/50 border-border text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">og:image URL</label>
                  <Input value={tag.ogImage} onChange={(e) => handleUpdate(tag.id, "ogImage", e.target.value)} placeholder="https://..." className="bg-muted/50 border-border text-sm" />
                </div>
                <SerpPreview title={tag.title} description={tag.description} url={`entanglewealth.com${tag.pagePath}`} />
              </div>
            ) : (
              <SerpPreview title={tag.title} description={tag.description} url={`entanglewealth.com${tag.pagePath}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BacklinksTab() {
  const [links, setLinks] = useState<Backlink[]>(loadBacklinks);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newAnchor, setNewAnchor] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editAnchor, setEditAnchor] = useState("");

  const handleAdd = () => {
    if (!newUrl.trim() || !newSource.trim()) return;
    addBacklink({ url: newUrl.trim(), sourceDomain: newSource.trim(), anchorText: newAnchor.trim(), status: "active" });
    setLinks(loadBacklinks());
    setNewUrl("");
    setNewSource("");
    setNewAnchor("");
    setShowAdd(false);
  };

  const startEdit = (link: Backlink) => {
    setEditingId(link.id);
    setEditUrl(link.url);
    setEditSource(link.sourceDomain);
    setEditAnchor(link.anchorText);
  };

  const handleEdit = () => {
    if (!editingId || !editUrl.trim()) return;
    updateBacklink(editingId, { url: editUrl.trim(), sourceDomain: editSource.trim(), anchorText: editAnchor.trim() });
    setLinks(loadBacklinks());
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteBacklink(id);
    setLinks(links.filter((l) => l.id !== id));
  };

  const toggleStatus = (link: Backlink) => {
    const newStatus: "active" | "broken" = link.status === "active" ? "broken" : "active";
    updateBacklink(link.id, { status: newStatus });
    setLinks(loadBacklinks());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">{links.length} backlinks tracked</span>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Backlink
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="bg-muted/50 border-border text-sm" />
          <Input placeholder="Source Domain" value={newSource} onChange={(e) => setNewSource(e.target.value)} className="bg-muted/50 border-border text-sm" />
          <Input placeholder="Anchor Text" value={newAnchor} onChange={(e) => setNewAnchor(e.target.value)} className="bg-muted/50 border-border text-sm" />
          <Button onClick={handleAdd} className="bg-primary text-black hover:bg-primary/90 text-xs font-bold">Save</Button>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: "rgba(8,8,20,0.6)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold">URL</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold">Source</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold hidden md:table-cell">Anchor Text</th>
                <th className="text-center px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground text-xs uppercase tracking-wider font-semibold hidden lg:table-cell">Added</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {links.map((link) =>
                editingId === link.id ? (
                  <tr key={link.id} className="border-b border-primary/20 bg-primary/5">
                    <td className="px-4 py-2"><Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="bg-muted/50 border-border text-xs h-8" /></td>
                    <td className="px-4 py-2"><Input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="bg-muted/50 border-border text-xs h-8" /></td>
                    <td className="px-4 py-2 hidden md:table-cell"><Input value={editAnchor} onChange={(e) => setEditAnchor(e.target.value)} className="bg-muted/50 border-border text-xs h-8" /></td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${link.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {link.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 hidden lg:table-cell text-xs text-muted-foreground/70">{new Date(link.addedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={handleEdit} className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="Save edit"><Save className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Cancel edit"><X className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={link.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs font-mono truncate max-w-56">
                        {link.url} <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground/70">{link.sourceDomain}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{link.anchorText || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleStatus(link)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${link.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {link.status === "active" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {link.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground/70 hidden lg:table-cell">{new Date(link.addedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(link)} className="text-blue-400/60 hover:text-blue-400 transition-colors" aria-label={`Edit backlink ${link.url}`}><Edit3 className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <button onClick={() => handleDelete(link.id)} className="text-red-400/60 hover:text-red-400 transition-colors" aria-label={`Delete backlink ${link.url}`}><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {links.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No backlinks tracked yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeoEngine() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("keywords");

  const checkAccess = useCallback(async () => {
    try {
      const res = await authFetch("/marketing/agents", getToken);
      if (res.ok) setAuthorized(true);
    } catch {
    }
    setLoading(false);
  }, [getToken]);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!authorized) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="w-16 h-16 rounded-sm bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">The SEO Engine is restricted to admin-tier accounts.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center border border-green-500/20">
              <Search className="w-5 h-5 text-green-400" />
            </div>
            SEO Engine
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Keyword tracking, blog management, meta tags, and backlink monitoring</p>
        </div>

        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "keywords" && <KeywordsTab />}
        {activeTab === "blog" && <BlogTab />}
        {activeTab === "meta" && <MetaTagsTab />}
        {activeTab === "backlinks" && <BacklinksTab />}
      </div>
    </Layout>
  );
}
