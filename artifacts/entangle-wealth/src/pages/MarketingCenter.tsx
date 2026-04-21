import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import {
  Shield,
  Loader2,
  Copy,
  Check,
  Save,
  Trash2,
  Download,
  Filter,
  MessageSquare,
  Facebook,
  Instagram,
  Github,
  FileText,
  Mail,
  Users,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Archive,
  Clock,
  Megaphone,
  X,
  Twitter,
  Linkedin,
} from "lucide-react";

import { type QueueItem, getQueueFromStorage, saveQueueToStorage } from "@/lib/marketingQueue";

interface AgentConfig {
  id: string;
  name: string;
  maxChars: number;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const AGENT_CONFIGS: AgentConfig[] = [
  { id: "reddit", name: "Reddit", maxChars: 10000, icon: <MessageSquare className="w-5 h-5" />, color: "#FF4500", gradient: "from-orange-600/20 to-red-600/20" },
  { id: "facebook", name: "Facebook", maxChars: 63206, icon: <Facebook className="w-5 h-5" />, color: "#1877F2", gradient: "from-blue-600/20 to-blue-800/20" },
  { id: "instagram", name: "Instagram", maxChars: 2200, icon: <Instagram className="w-5 h-5" />, color: "#E4405F", gradient: "from-pink-600/20 to-purple-600/20" },
  { id: "twitter", name: "Twitter/X", maxChars: 280, icon: <Twitter className="w-5 h-5" />, color: "#1DA1F2", gradient: "from-sky-500/20 to-blue-600/20" },
  { id: "linkedin", name: "LinkedIn", maxChars: 3000, icon: <Linkedin className="w-5 h-5" />, color: "#0A66C2", gradient: "from-blue-700/20 to-amber-700/20" },
  { id: "github", name: "GitHub", maxChars: 65536, icon: <Github className="w-5 h-5" />, color: "#8B5CF6", gradient: "from-purple-600/20 to-violet-700/20" },
  { id: "blog", name: "Blog/SEO", maxChars: 50000, icon: <FileText className="w-5 h-5" />, color: "#00B4D8", gradient: "from-amber-1000/20 to-amber-600/20" },
  { id: "email", name: "Email Newsletter", maxChars: 50000, icon: <Mail className="w-5 h-5" />, color: "#FFB800", gradient: "from-yellow-500/20 to-amber-600/20" },
  { id: "community", name: "Community Reply", maxChars: 5000, icon: <Users className="w-5 h-5" />, color: "#00B4D8", gradient: "from-emerald-500/20 to-green-600/20" },
];

const TONES = [
  { value: "educational", label: "Educational", emoji: "📚" },
  { value: "motivational", label: "Motivational", emoji: "🔥" },
  { value: "data-driven", label: "Data-Driven", emoji: "📊" },
  { value: "casual", label: "Casual", emoji: "💬" },
];

function AgentPanel({
  agent,
  onSaveToQueue,
}: {
  agent: AgentConfig;
  onSaveToQueue: (item: Omit<QueueItem, "id" | "status" | "createdAt">) => void;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("educational");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: "Topic required", description: "Enter a topic to generate content", variant: "destructive" });
      return;
    }
    setLoading(true);
    setOutput("");
    try {
      const res = await authFetch("/marketing/generate", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agent.id, topic: topic.trim(), tone, context: context.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutput(data.content);
      setExpanded(true);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveToQueue({ platform: agent.id, platformName: agent.name, content: output, tone, topic });
    toast({ title: "Saved to queue", description: `${agent.name} content added to your queue` });
  };

  const charRatio = output.length / agent.maxChars;
  const charColor = charRatio > 0.9 ? "text-red-400" : charRatio > 0.7 ? "text-yellow-400" : "text-emerald-400";

  return (
    <div
      className={`rounded-xl border border-border overflow-hidden transition-all duration-300 hover:border-border`}
      style={{ background: "rgba(8,8,20,0.6)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${agent.gradient}`}
            style={{ border: `1px solid ${agent.color}30` }}
          >
            <span style={{ color: agent.color }}>{agent.icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
            <p className="text-[10px] text-muted-foreground">{agent.maxChars.toLocaleString()} char limit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {output && (
            <span className={`text-[10px] font-mono ${charColor}`}>
              {output.length.toLocaleString()} / {agent.maxChars.toLocaleString()}
            </span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 block">Topic / Prompt</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`What should ${agent.name} content be about?`}
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:border-primary/40 transition-colors"
              rows={2}
            />
          </div>

          <button
            onClick={() => setShowContext(!showContext)}
            className="text-[11px] text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
          >
            {showContext ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Additional context (optional)
          </button>

          {showContext && (
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any specific angles, data points, or requirements..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:border-primary/40 transition-colors"
              rows={2}
            />
          )}

          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tone === t.value
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-foreground/70"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="w-full bg-gradient-to-r from-primary/80 to-blue-600/80 text-foreground hover:from-primary hover:to-blue-600 gap-2 h-10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate {agent.name} Content
              </>
            )}
          </Button>

          {output && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Output</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-mono ${charColor}`}>
                    {output.length.toLocaleString()} / {agent.maxChars.toLocaleString()} chars
                  </span>
                </div>
              </div>
              <div
                className="bg-muted/30 border border-border rounded-lg p-3 max-h-80 overflow-y-auto"
              >
                <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border gap-1.5 text-xs flex-1"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 gap-1.5 text-xs flex-1"
                  onClick={handleSave}
                >
                  <Save className="w-3.5 h-3.5" /> Save to Queue
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QueuePanel({
  queue,
  onUpdateStatus,
  onDelete,
  onExport,
}: {
  queue: QueueItem[];
  onUpdateStatus: (id: string, status: QueueItem["status"]) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}) {
  const [filter, setFilter] = useState<QueueItem["status"] | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "all" ? queue : queue.filter((q) => q.status === filter);

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    posted: "bg-blue-500/20 text-blue-400 border-blue-500/20",
    archived: "bg-muted text-muted-foreground/70 border-border",
  };

  const statusCounts = {
    all: queue.length,
    draft: queue.filter((q) => q.status === "draft").length,
    approved: queue.filter((q) => q.status === "approved").length,
    posted: queue.filter((q) => q.status === "posted").length,
    archived: queue.filter((q) => q.status === "archived").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary" /> Content Queue
          <span className="text-sm text-muted-foreground font-normal">({queue.length} items)</span>
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="border-border gap-1.5 text-xs"
          onClick={onExport}
          disabled={queue.length === 0}
        >
          <Download className="w-3.5 h-3.5" /> Export JSON
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "draft", "approved", "posted", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === s
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            <Filter className="w-3 h-3 inline mr-1" />
            {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No content in queue{filter !== "all" ? ` with status "${filter}"` : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border overflow-hidden"
              style={{ background: "rgba(8,8,20,0.6)" }}
            >
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.platformName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.topic}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  {expandedId === item.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {expandedId === item.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Tone: {item.tone}</span>
                    <span>|</span>
                    <span>{item.content.length.toLocaleString()} chars</span>
                  </div>
                  <div className="bg-muted/30 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{item.content}</pre>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.status !== "approved" && (
                      <Button size="sm" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 text-[10px] h-7 px-2" onClick={() => onUpdateStatus(item.id, "approved")}>
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {item.status !== "posted" && (
                      <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20 text-[10px] h-7 px-2" onClick={() => onUpdateStatus(item.id, "posted")}>
                        <Megaphone className="w-3 h-3 mr-1" /> Mark Posted
                      </Button>
                    )}
                    {item.status !== "archived" && (
                      <Button size="sm" className="bg-muted/50 text-muted-foreground/70 hover:bg-muted border border-border text-[10px] h-7 px-2" onClick={() => onUpdateStatus(item.id, "archived")}>
                        <Archive className="w-3 h-3 mr-1" /> Archive
                      </Button>
                    )}
                    {item.status !== "draft" && (
                      <Button size="sm" className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/20 text-[10px] h-7 px-2" onClick={() => onUpdateStatus(item.id, "draft")}>
                        <FileText className="w-3 h-3 mr-1" /> Back to Draft
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-[10px] h-7 px-2 ml-auto" onClick={() => onDelete(item.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AIQueueStatus {
  active: number;
  queued: number;
  maxConcurrent: number;
  totalProcessed: number;
  totalFailed: number;
}

export default function MarketingCenter() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<"agents" | "queue">("agents");
  const [aiQueueStatus, setAiQueueStatus] = useState<AIQueueStatus | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await authFetch("/metrics", getToken);
      if (res.ok) {
        const data = await res.json();
        if (data && data.aiQueue) {
          setAiQueueStatus(data.aiQueue);
        }
      }
    } catch {
    }
  }, [getToken]);

  const checkAccess = useCallback(async () => {
    try {
      const res = await authFetch("/marketing/agents", getToken);
      if (res.ok) {
        setAuthorized(true);
        fetchQueueStatus();
      }
    } catch {
    }
    setLoading(false);
  }, [getToken, fetchQueueStatus]);

  useEffect(() => {
    checkAccess();
    setQueue(getQueueFromStorage());
  }, [checkAccess]);

  useEffect(() => {
    if (!authorized) return;
    const interval = setInterval(() => {
      if (!document.hidden) fetchQueueStatus();
    }, 60_000);
    return () => clearInterval(interval);
  }, [authorized, fetchQueueStatus]);

  const addToQueue = (item: Omit<QueueItem, "id" | "status" | "createdAt">) => {
    const newItem: QueueItem = {
      ...item,
      id: crypto.randomUUID(),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...queue];
    setQueue(updated);
    saveQueueToStorage(updated);
  };

  const updateStatus = (id: string, status: QueueItem["status"]) => {
    const updated = queue.map((q) => (q.id === id ? { ...q, status } : q));
    setQueue(updated);
    saveQueueToStorage(updated);
  };

  const deleteItem = (id: string) => {
    const updated = queue.filter((q) => q.id !== id);
    setQueue(updated);
    saveQueueToStorage(updated);
  };

  const exportQueue = () => {
    const blob = new Blob([JSON.stringify(queue, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entangle-marketing-queue-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${queue.length} items exported to JSON` });
  };

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
          <p className="text-muted-foreground max-w-md">
            The AI Marketing Command Center is restricted to admin-tier accounts. Contact the platform administrator for access.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center border border-primary/20">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            AI Marketing Command Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">9 AI agents generating platform-optimized content for your marketing channels</p>
        </div>

        {aiQueueStatus && (
          <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${aiQueueStatus.active > 0 ? "bg-[#00B4D8] animate-pulse" : "bg-[#00B4D8]"}`} />
              <span className="text-muted-foreground">AI Queue:</span>
            </div>
            <span className="text-foreground/80 font-mono">{aiQueueStatus.active}/{aiQueueStatus.maxConcurrent} active</span>
            {aiQueueStatus.queued > 0 && (
              <span className="text-[#FFB800] font-mono">{aiQueueStatus.queued} waiting</span>
            )}
            <span className="text-muted-foreground">|</span>
            <span className="text-[#00B4D8] font-mono">{aiQueueStatus.totalProcessed} processed</span>
            {aiQueueStatus.totalFailed > 0 && (
              <span className="text-[#ff3366] font-mono">{aiQueueStatus.totalFailed} failed</span>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "agents"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Agents ({AGENT_CONFIGS.length})
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "queue"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-muted/50 text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            <Archive className="w-4 h-4 inline mr-1.5" />
            Queue ({queue.length})
          </button>
        </div>

        {activeTab === "agents" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {AGENT_CONFIGS.map((agent) => (
              <AgentPanel key={agent.id} agent={agent} onSaveToQueue={addToQueue} />
            ))}
          </div>
        ) : (
          <QueuePanel
            queue={queue}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
            onExport={exportQueue}
          />
        )}

        <div className="mt-6 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-xs text-yellow-400/80 flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            Content is generated by AI and saved locally. Always review before posting. Nothing is auto-published. Uses Replit AI Integrations for Anthropic access | no API key required; charges are billed to your credits.
          </p>
        </div>
      </div>
    </Layout>
  );
}
