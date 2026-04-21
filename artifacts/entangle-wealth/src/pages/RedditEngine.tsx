import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/authFetch";
import {
  Shield,
  Loader2,
  Search,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Target,
  Eye,
  Ban,
  Heart,
  ArrowUpDown,
  Info,
  X,
} from "lucide-react";
import { SUBREDDIT_DATA, type SubredditEntry } from "@/data/subreddits";

type StatusTag = "Active Target" | "Research Only" | "Avoid";

interface SubredditWithStatus extends SubredditEntry {
  status: StatusTag;
}

const LS_KEY = "ew_reddit_engine_statuses";

function loadStatuses(): Record<string, StatusTag> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStatuses(statuses: Record<string, StatusTag>) {
  localStorage.setItem(LS_KEY, JSON.stringify(statuses));
}

const STATUS_CONFIG: Record<StatusTag, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  "Active Target": { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/25", icon: <Target className="w-3 h-3" /> },
  "Research Only": { color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/25", icon: <Eye className="w-3 h-3" /> },
  "Avoid": { color: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/25", icon: <Ban className="w-3 h-3" /> },
};

const ENGAGEMENT_CONFIG: Record<string, { color: string; bg: string }> = {
  "High": { color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "Medium": { color: "text-yellow-400", bg: "bg-yellow-500/10" },
  "Low": { color: "text-muted-foreground/70", bg: "bg-muted/50" },
};

const CATEGORIES = ["All", ...Array.from(new Set(SUBREDDIT_DATA.map((s) => s.category))).sort()];

type SortField = "name" | "members" | "engagement";
type SortDir = "asc" | "desc";

function formatMembers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function StatusDropdown({ current, onChange }: { current: StatusTag; onChange: (s: StatusTag) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[current];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${cfg.bg} ${cfg.color} ${cfg.border} transition-all hover:brightness-125`}
      >
        {cfg.icon}
        {current}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg overflow-hidden"
          style={{ background: "rgba(8,8,20,0.97)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        >
          {(["Active Target", "Research Only", "Avoid"] as StatusTag[]).map((s) => {
            const sc = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50 ${
                  s === current ? sc.color : "text-muted-foreground"
                }`}
              >
                {sc.icon} {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RedditEngine() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [engagementFilter, setEngagementFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | StatusTag>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statuses, setStatuses] = useState<Record<string, StatusTag>>(loadStatuses);
  const [sortField, setSortField] = useState<SortField>("members");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [avoidDismissed, setAvoidDismissed] = useState(false);

  const checkAccess = useCallback(async () => {
    try {
      const res = await authFetch("/marketing/agents", getToken);
      if (res.ok) setAuthorized(true);
    } catch {
    }
    setLoading(false);
  }, [getToken]);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  const updateStatus = useCallback((name: string, status: StatusTag) => {
    setStatuses((prev) => {
      const next = { ...prev, [name]: status };
      saveStatuses(next);
      return next;
    });
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir(field === "name" ? "asc" : "desc");
      return field;
    });
  }, []);

  const data: SubredditWithStatus[] = useMemo(() => {
    let list = SUBREDDIT_DATA.map((s) => ({
      ...s,
      status: (statuses[s.name] || "Research Only") as StatusTag,
    }));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.notes.toLowerCase().includes(q));
    }

    if (engagementFilter !== "All") list = list.filter((s) => s.engagement === engagementFilter);
    if (statusFilter !== "All") list = list.filter((s) => s.status === statusFilter);
    if (categoryFilter !== "All") list = list.filter((s) => s.category === categoryFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "members") cmp = a.members - b.members;
      else {
        const engOrder = { High: 3, Medium: 2, Low: 1 };
        cmp = engOrder[a.engagement] - engOrder[b.engagement];
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [search, engagementFilter, statusFilter, categoryFilter, statuses, sortField, sortDir]);

  const hasAvoid = data.some((s) => s.status === "Avoid");

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
            The Reddit Strategy Engine is restricted to admin-tier accounts.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-600/10 to-red-600/10 p-4 mb-6 flex items-center gap-3">
          <Heart className="w-5 h-5 text-orange-400 shrink-0" />
          <p className="text-sm font-semibold text-orange-300">
            Lead with value. Never spam.
            <span className="text-orange-300/60 font-normal ml-2">Every post should genuinely help the community first.</span>
          </p>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600/20 to-red-600/20 flex items-center justify-center border border-orange-500/20">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            Reddit Strategy Engine
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {SUBREDDIT_DATA.length} targeted subreddits with engagement data, content rules, and strategy notes
          </p>
        </div>

        {hasAvoid && !avoidDismissed && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">
                Some subreddits are tagged <strong>"Avoid"</strong> | these have strict anti-promotion rules or hostile communities.
              </p>
            </div>
            <button onClick={() => setAvoidDismissed(true)} className="text-red-400 hover:text-red-300 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search subreddits, categories, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/50 border-border text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground/80 focus:outline-none focus:border-primary/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-card">{c === "All" ? "All Categories" : c}</option>
              ))}
            </select>

            <select
              value={engagementFilter}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "All" || v === "High" || v === "Medium" || v === "Low") setEngagementFilter(v);
              }}
              className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground/80 focus:outline-none focus:border-primary/40"
            >
              <option value="All" className="bg-card">All Engagement</option>
              <option value="High" className="bg-card">High</option>
              <option value="Medium" className="bg-card">Medium</option>
              <option value="Low" className="bg-card">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "All" || v === "Active Target" || v === "Research Only" || v === "Avoid") setStatusFilter(v);
              }}
              className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground/80 focus:outline-none focus:border-primary/40"
            >
              <option value="All" className="bg-card">All Statuses</option>
              <option value="Active Target" className="bg-card">Active Target</option>
              <option value="Research Only" className="bg-card">Research Only</option>
              <option value="Avoid" className="bg-card">Avoid</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          Showing {data.length} of {SUBREDDIT_DATA.length} subreddits
        </div>

        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "rgba(8,8,20,0.6)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                      Subreddit
                      {sortField === "name" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      {sortField !== "name" && <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    <button onClick={() => toggleSort("members")} className="flex items-center gap-1 justify-end hover:text-foreground transition-colors ml-auto">
                      Members
                      {sortField === "members" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      {sortField !== "members" && <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                    <button onClick={() => toggleSort("engagement")} className="flex items-center gap-1 justify-center hover:text-foreground transition-colors mx-auto">
                      Engagement
                      {sortField === "engagement" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                      {sortField !== "engagement" && <ArrowUpDown className="w-3 h-3 opacity-30" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Content Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden xl:table-cell">Rules</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sub) => {
                  const engCfg = ENGAGEMENT_CONFIG[sub.engagement];
                  return (
                    <tr
                      key={sub.name}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                        sub.status === "Avoid" ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://reddit.com/${sub.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm font-semibold text-orange-400 hover:text-orange-300 hover:underline transition-colors flex items-center gap-1"
                          >
                            {sub.name}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                          {sub.selfPromoRestricted && (
                            <div className="group relative">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                              <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-48 px-2 py-1 rounded-lg text-[10px] text-yellow-300 bg-black/90 border border-yellow-500/20">
                                Self-promotion restricted. Lead with pure value.
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{sub.category}</span>
                          <div className="group relative">
                            <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-64 px-3 py-2 rounded-lg text-[11px] text-foreground/80 bg-black/95 border border-border">
                              <p className="font-semibold text-foreground mb-1">{sub.name}</p>
                              <p className="text-muted-foreground mb-1">{sub.rulesSummary}</p>
                              <p className="text-primary/80 italic">{sub.notes}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm text-foreground/80 flex items-center gap-1 justify-end">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {formatMembers(sub.members)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${engCfg.color} ${engCfg.bg}`}>
                          {sub.engagement}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-48 truncate">
                        {sub.contentType}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell max-w-56 truncate">
                        {sub.rulesSummary}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusDropdown current={sub.status} onChange={(s) => updateStatus(sub.name, s)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No subreddits match your filters</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
