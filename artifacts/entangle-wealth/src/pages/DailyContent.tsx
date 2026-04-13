import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import {
  Shield,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Archive,
  Megaphone,
  Twitter,
  Linkedin,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles,
  CalendarDays,
  History,
  Edit3,
  Save,
  X,
} from "lucide-react";

interface DailyPost {
  id: number;
  batch_date: string;
  platform: string;
  content: string;
  theme: string;
  status: "draft" | "approved" | "posted" | "archived";
  created_at: string;
  updated_at: string;
}

interface TodayResponse {
  batchDate: string;
  posts: DailyPost[];
  batchExists: boolean;
  theme: string;
}

interface HistoryBatch {
  date: string;
  theme: string;
  posts: DailyPost[];
}

const PLATFORM_META: Record<string, { label: string; icon: React.ReactNode; color: string; gradient: string }> = {
  twitter: {
    label: "Twitter/X",
    icon: <Twitter className="w-4 h-4" />,
    color: "#1DA1F2",
    gradient: "from-sky-500/20 to-blue-600/20",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Linkedin className="w-4 h-4" />,
    color: "#0A66C2",
    gradient: "from-blue-700/20 to-amber-700/20",
  },
  engagement: {
    label: "Engagement",
    icon: <MessageCircle className="w-4 h-4" />,
    color: "#FF8C00",
    gradient: "from-emerald-500/20 to-green-600/20",
  },
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  posted: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  archived: "bg-white/10 text-white/40 border-white/10",
};

function PostCard({
  post,
  onStatusChange,
  onContentSave,
}: {
  post: DailyPost;
  onStatusChange: (id: number, status: DailyPost["status"]) => void;
  onContentSave: (id: number, content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const meta = PLATFORM_META[post.platform] || {
    label: post.platform,
    icon: <MessageCircle className="w-4 h-4" />,
    color: "#aaa",
    gradient: "from-gray-500/20 to-gray-700/20",
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    await onContentSave(post.id, editContent);
    setSaving(false);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setEditing(false);
  };

  return (
    <div
      className="rounded-xl border border-white/[0.06] overflow-hidden"
      style={{ background: "rgba(8,8,20,0.6)" }}
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${meta.gradient} shrink-0`}
            style={{ border: `1px solid ${meta.color}30` }}
          >
            <span style={{ color: meta.color }}>{meta.icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_STYLES[post.status]}`}>
              {post.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
              title="Edit"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-2">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/90 placeholder:text-white/40 resize-none focus:outline-none focus:border-primary/40 transition-colors font-sans leading-relaxed"
              rows={8}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 gap-1.5 text-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelEdit}
                className="text-white/50 hover:text-white/70 gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 max-h-64 overflow-y-auto">
            <pre className="text-sm text-white/85 whitespace-pre-wrap font-sans leading-relaxed">{post.content}</pre>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
        {post.status !== "approved" && (
          <Button
            size="sm"
            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 text-[10px] h-7 px-2"
            onClick={() => onStatusChange(post.id, "approved")}
          >
            <Check className="w-3 h-3 mr-1" /> Approve
          </Button>
        )}
        {post.status !== "posted" && (
          <Button
            size="sm"
            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20 text-[10px] h-7 px-2"
            onClick={() => onStatusChange(post.id, "posted")}
          >
            <Megaphone className="w-3 h-3 mr-1" /> Mark Posted
          </Button>
        )}
        {post.status !== "archived" && (
          <Button
            size="sm"
            className="bg-white/5 text-white/40 hover:bg-white/10 border border-white/10 text-[10px] h-7 px-2"
            onClick={() => onStatusChange(post.id, "archived")}
          >
            <Archive className="w-3 h-3 mr-1" /> Archive
          </Button>
        )}
        {post.status !== "draft" && (
          <Button
            size="sm"
            className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/20 text-[10px] h-7 px-2"
            onClick={() => onStatusChange(post.id, "draft")}
          >
            Back to Draft
          </Button>
        )}
      </div>
    </div>
  );
}

function HistoryBatchCard({ batch }: { batch: HistoryBatch }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const statusSummary = batch.posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden" style={{ background: "rgba(8,8,20,0.5)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">{formatDate(batch.date)}</p>
            <p className="text-[11px] text-muted-foreground">{batch.theme}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Object.entries(statusSummary).map(([status, count]) => (
              <span key={status} className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${STATUS_STYLES[status]}`}>
                {count} {status}
              </span>
            ))}
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.04] p-3 space-y-2">
          {batch.posts.map((post) => {
            const meta = PLATFORM_META[post.platform];
            return (
              <div key={post.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02]">
                <span style={{ color: meta?.color || "#aaa" }}>{meta?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-white/80">{meta?.label || post.platform}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${STATUS_STYLES[post.status]}`}>
                      {post.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 truncate">{post.content.split("\n")[0]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DailyContent() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [history, setHistory] = useState<HistoryBatch[]>([]);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [regenerating, setRegenerating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchToday = useCallback(async (): Promise<TodayResponse | undefined> => {
    try {
      const res = await authFetch("/daily-content/today", getToken);
      if (!res.ok) {
        if (res.status === 403) {
          setAuthorized(false);
          setLoading(false);
          return undefined;
        }
        throw new Error("Failed to fetch");
      }
      const data: TodayResponse = await res.json();
      setAuthorized(true);
      setToday(data);
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      return undefined;
    }
  }, [getToken]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch("/daily-content/history", getToken);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.batches || []);
    } catch (err) {
      console.error("[DailyContent] Failed to fetch history:", err);
    }
  }, [getToken]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    if (activeTab === "history" && authorized) {
      fetchHistory();
    }
  }, [activeTab, authorized, fetchHistory]);

  useEffect(() => {
    if (!generating) return;

    pollRef.current = setInterval(async () => {
      const data = await fetchToday();
      if (data && data.batchExists) {
        setGenerating(false);
        if (pollRef.current) clearInterval(pollRef.current);
        toast({ title: "Batch ready", description: "Today's content has been generated" });
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [generating, fetchToday, toast]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await authFetch("/daily-content/regenerate", getToken, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start regeneration");
      setToday((prev) => prev ? { ...prev, posts: [], batchExists: false } : null);
      setGenerating(true);
      toast({ title: "Regenerating...", description: "Fresh batch is being generated | usually takes 30-60 seconds" });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await authFetch("/daily-content/regenerate", getToken, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start generation");
      toast({ title: "Generating...", description: "Today's batch is being generated | usually takes 30-60 seconds" });
    } catch (err: any) {
      setGenerating(false);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: DailyPost["status"]) => {
    try {
      const res = await authFetch(`/daily-content/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setToday((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) => (p.id === id ? data.post : p)),
        };
      });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleContentSave = async (id: number, content: string) => {
    try {
      const res = await authFetch(`/daily-content/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setToday((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) => (p.id === id ? data.post : p)),
        };
      });
      toast({ title: "Saved", description: "Post updated successfully" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            The Daily Content Engine is restricted to admin-tier accounts.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              Daily Content Engine
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Auto-generated daily batch | Twitter/X, LinkedIn, Engagement
            </p>
          </div>

          {today && today.batchExists && (
            <Button
              onClick={handleRegenerate}
              disabled={regenerating || generating}
              variant="outline"
              className="border-white/10 gap-2 shrink-0"
            >
              {regenerating || generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate Batch
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("today")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "today"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06]"
            }`}
          >
            <CalendarDays className="w-4 h-4 inline mr-1.5" />
            Today
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06]"
            }`}
          >
            <History className="w-4 h-4 inline mr-1.5" />
            History
          </button>
        </div>

        {activeTab === "today" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-white">{todayFormatted}</p>
                  {today && (
                    <p className="text-[11px] text-muted-foreground">
                      Theme: <span className="text-primary/80">{today.theme}</span>
                    </p>
                  )}
                </div>
              </div>
              {today && today.batchExists && (
                <span className="px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {today.posts.length} posts ready
                </span>
              )}
            </div>

            {generating && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/[0.04]">
                <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Generating today's batch...</p>
                  <p className="text-xs text-muted-foreground">AI is crafting your posts | typically takes 30-60 seconds</p>
                </div>
              </div>
            )}

            {today && !today.batchExists && !generating && (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">No batch yet for today</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    The auto-generator runs once per day. Generate now to get your batch immediately.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateNow}
                  className="bg-gradient-to-r from-primary/80 to-blue-600/80 text-white hover:from-primary hover:to-blue-600 gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Generate Today's Batch
                </Button>
              </div>
            )}

            {today && today.posts.length > 0 && (
              <div className="space-y-4">
                {today.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onStatusChange={handleStatusChange}
                    onContentSave={handleContentSave}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No content history yet</p>
              </div>
            ) : (
              history.map((batch) => (
                <HistoryBatchCard key={batch.date} batch={batch} />
              ))
            )}
          </div>
        )}

        <div className="mt-8 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-xs text-yellow-400/80 flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            Posts are AI-generated drafts. Always review before posting. Auto-generation runs once daily. Regenerate at any time if the batch doesn't feel right. Nothing is auto-published.
          </p>
        </div>
      </div>
    </Layout>
  );
}
