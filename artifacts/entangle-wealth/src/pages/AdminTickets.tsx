import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import { Ticket, Filter, ChevronDown, ChevronUp, Clock, MessageSquare, RefreshCw, CheckCircle2, AlertCircle, Circle } from "lucide-react";

interface SupportTicket {
  id: number;
  user_id: string;
  user_email: string;
  subject: string;
  category: string;
  description: string;
  screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const STATUS_OPTIONS = ["all", "open", "in_progress", "resolved", "closed"] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  open: { label: "Open", color: "#00B4D8", icon: Circle },
  in_progress: { label: "In Progress", color: "#FFB800", icon: AlertCircle },
  resolved: { label: "Resolved", color: "#00B4D8", icon: CheckCircle2 },
  closed: { label: "Closed", color: "#666", icon: CheckCircle2 },
};

export default function AdminTickets() {
  const isAdmin = useIsAdmin();
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState<Record<number, string>>({});
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (isAdmin === false) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const fetchTickets = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    try {
      const offset = append ? tickets.length : 0;
      const res = await authFetch(`/support/admin/tickets?status=${statusFilter}&limit=50&offset=${offset}`, getToken);
      if (res.ok) {
        const data = await res.json();
        setTickets(prev => append ? [...prev, ...data.tickets] : data.tickets);
        setTicketsTotal(data.total || data.tickets.length);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load tickets" });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter, toast, getToken, tickets.length]);

  useEffect(() => {
    if (isAdmin) fetchTickets();
  }, [isAdmin, fetchTickets]);

  const updateTicket = async (id: number, status?: string, adminNotes?: string) => {
    try {
      const res = await authFetch(`/support/admin/tickets/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (res.ok) {
        toast({ title: "Updated", description: `Ticket #${id} updated` });
        fetchTickets();
      } else {
        toast({ title: "Error", description: "Failed to update ticket" });
      }
    } catch {
      toast({ title: "Error", description: "Network error" });
    }
  };

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <RefreshCw className="w-6 h-6 text-muted-foreground/70 animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground/50 text-sm">Checking access...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  const statusCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-[#00B4D8]" />
            <div>
              <h1 className="text-2xl font-bold">Support Tickets</h1>
              <p className="text-xs text-muted-foreground/50">{tickets.length} tickets</p>
            </div>
          </div>
          <button onClick={() => fetchTickets()} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground/70" />
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                statusFilter === s
                  ? "bg-[#00B4D8]/10 text-[#00B4D8] border-[#00B4D8]/30"
                  : "bg-muted/50 text-muted-foreground/70 border-border hover:bg-muted"
              }`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label || s}
              {s === "all" ? ` (${tickets.length})` : statusCounts[s] ? ` (${statusCounts[s]})` : ""}
            </button>
          ))}
        </div>

        {loading && tickets.length === 0 ? (
          <div className="text-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground/70 animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground/50 text-sm">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 border border-border rounded-xl">
            <Ticket className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground/50">No tickets found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const isExpanded = expandedId === ticket.id;
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              const StatusIcon = cfg.icon;
              return (
                <div key={ticket.id} className={`border rounded-xl overflow-hidden transition-colors ${isExpanded ? "border-[#00B4D8]/20 bg-muted/30" : "border-border bg-muted/30"}`}>
                  <button onClick={() => setExpandedId(isExpanded ? null : ticket.id)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="text-xs font-mono text-muted-foreground/70 shrink-0">#{ticket.id}</span>
                      <StatusIcon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground/80 truncate">{ticket.subject}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{ticket.user_email} · {ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: cfg.color, borderColor: `${cfg.color}33`, backgroundColor: `${cfg.color}10` }}>
                        {cfg.label}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/70" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/70" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 border border-border rounded-lg p-4">{ticket.description}</p>
                          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Created:</span>
                              <span className="text-muted-foreground ml-1 font-mono">{new Date(ticket.created_at).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Updated:</span>
                              <span className="text-muted-foreground ml-1 font-mono">{new Date(ticket.updated_at).toLocaleString()}</span>
                            </div>
                            {ticket.resolved_at && (
                              <div>
                                <span className="text-muted-foreground">Resolved:</span>
                                <span className="text-[#00B4D8] ml-1 font-mono">{new Date(ticket.resolved_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Admin Actions</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</label>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateTicket(ticket.id, s)}
                                    disabled={ticket.status === s}
                                    className={`px-3 py-1 text-[10px] font-semibold rounded-lg border transition-colors ${
                                      ticket.status === s
                                        ? "opacity-40 cursor-not-allowed bg-muted/50 border-border text-muted-foreground/50"
                                        : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {STATUS_CONFIG[s]?.label || s}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Internal Notes</label>
                              <textarea
                                value={editNotes[ticket.id] ?? ticket.admin_notes ?? ""}
                                onChange={(e) => setEditNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                                rows={3}
                                className="w-full mt-1 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-[#00B4D8]/30 resize-none"
                                placeholder="Add internal notes..."
                              />
                              <button
                                onClick={() => {
                                  const notes = editNotes[ticket.id];
                                  if (notes !== undefined) updateTicket(ticket.id, undefined, notes);
                                }}
                                className="mt-1 px-3 py-1 text-[10px] font-semibold bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/20 rounded-lg hover:bg-[#00B4D8]/20 transition-colors"
                              >
                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                Save Notes
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tickets.length > 0 && tickets.length < ticketsTotal && (
          <div className="text-center mt-4">
            <button
              onClick={() => { setLoadingMore(true); fetchTickets(true); }}
              disabled={loadingMore}
              className="text-[#00B4D8] text-xs font-semibold hover:underline"
            >
              {loadingMore ? "Loading..." : `Load More (${tickets.length}/${ticketsTotal})`}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
