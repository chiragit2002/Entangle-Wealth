import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, History, AlertTriangle, TrendingUp, TrendingDown, Zap, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertRule {
  id: number;
  symbol: string;
  alertType: string;
  threshold: number | null;
  enabled: boolean;
  createdAt: string;
}

interface AlertHistoryItem {
  id: number;
  symbol: string;
  alertType: string;
  triggeredValue: number | null;
  message: string | null;
  read: boolean;
  triggeredAt: string;
}

const ALERT_TYPE_OPTIONS = [
  { value: "price_above", label: "Price Above", icon: TrendingUp, color: "#00ff88" },
  { value: "price_below", label: "Price Below", icon: TrendingDown, color: "#ff3366" },
  { value: "rsi_oversold", label: "RSI Oversold (<30)", icon: Activity, color: "#00D4FF" },
  { value: "rsi_overbought", label: "RSI Overbought (>70)", icon: Activity, color: "#ffd700" },
  { value: "macd_crossover", label: "MACD Crossover", icon: Zap, color: "#9c27b0" },
  { value: "bollinger_breakout", label: "Bollinger Breakout", icon: AlertTriangle, color: "#ff6b35" },
];

function getAlertTypeLabel(type: string): string {
  return ALERT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
}

function getAlertTypeColor(type: string): string {
  return ALERT_TYPE_OPTIONS.find(o => o.value === type)?.color || "#00D4FF";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function needsThreshold(type: string): boolean {
  return type === "price_above" || type === "price_below";
}

export default function Alerts() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState("free");
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [newSymbol, setNewSymbol] = useState("");
  const [newType, setNewType] = useState("price_above");
  const [newThreshold, setNewThreshold] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await authFetch("/alerts", getToken);
      if (res.ok) {
        const data = await res.json();
        setRules(data.alerts);
        setTier(data.tier);
        setDailyLimit(data.dailyLimit);
        setDailyUsed(data.dailyUsed);
      }
    } catch { /* ignore */ }
  }, [getToken]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch("/alerts/history", getToken);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch { /* ignore */ }
  }, [getToken]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRules(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchRules, fetchHistory]);

  const createAlert = async () => {
    if (!newSymbol.trim()) return;
    if (needsThreshold(newType) && !newThreshold.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/alerts", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newSymbol.trim().toUpperCase(),
          alertType: newType,
          threshold: needsThreshold(newType) ? parseFloat(newThreshold) : null,
        }),
      });
      if (res.ok) {
        setNewSymbol("");
        setNewThreshold("");
        setShowForm(false);
        fetchRules();
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  const toggleAlert = async (id: number, currentEnabled: boolean) => {
    try {
      await authFetch(`/alerts/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    } catch { /* ignore */ }
  };

  const deleteAlert = async (id: number) => {
    try {
      await authFetch(`/alerts/${id}`, getToken, { method: "DELETE" });
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await authFetch("/alerts/mark-read", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setHistory(prev => prev.map(h => ({ ...h, read: true })));
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-[#020204] text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-mono)]">
              <span className="text-[#00D4FF]">Real-Time</span> Alerts
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Configure price, RSI, MACD, and Bollinger alerts with live evaluation
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dailyLimit && (
              <div className="text-xs text-white/30 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
                <span className="text-[#ffd700] font-bold">{dailyUsed}</span>
                <span className="text-white/20">/{dailyLimit} daily alerts</span>
                <span className="text-white/15 ml-1">(Free)</span>
              </div>
            )}
            {tier === "pro" && (
              <div className="text-xs text-[#00ff88] bg-[#00ff88]/5 rounded-lg px-3 py-2 border border-[#00ff88]/20">
                Pro — Unlimited
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("rules")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "rules" ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20" : "text-white/40 hover:text-white/60"}`}
          >
            <Settings className="w-4 h-4" /> Alert Rules
            <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full">{rules.length}</span>
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "history" ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20" : "text-white/40 hover:text-white/60"}`}
          >
            <History className="w-4 h-4" /> Triggered History
            {history.filter(h => !h.read).length > 0 && (
              <span className="text-xs bg-[#ff3366] text-white px-2 py-0.5 rounded-full">
                {history.filter(h => !h.read).length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : tab === "rules" ? (
          <div>
            <div className="mb-4">
              {!showForm ? (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 hover:bg-[#00D4FF]/20"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Alert Rule
                </Button>
              ) : (
                <div className="rounded-xl bg-white/[0.03] border border-[#00D4FF]/20 p-4">
                  <p className="text-sm font-bold text-[#00D4FF] mb-3 font-[family-name:var(--font-mono)]">Create Alert Rule</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      placeholder="Symbol (e.g. AAPL)"
                      value={newSymbol}
                      onChange={e => setNewSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 10))}
                      maxLength={10}
                      className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/30 font-[family-name:var(--font-mono)]"
                    />
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                      className="bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none [&>option]:bg-[#0d0d1a] [&>option]:text-white"
                    >
                      {ALERT_TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {needsThreshold(newType) && (
                      <input
                        placeholder="Price ($)"
                        value={newThreshold}
                        onChange={e => setNewThreshold(e.target.value.replace(/[^0-9.]/g, ""))}
                        className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/30 font-[family-name:var(--font-mono)]"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={createAlert}
                        disabled={creating || !newSymbol.trim()}
                        className="flex-1 bg-[#00D4FF] text-black font-bold hover:bg-[#00D4FF]/80"
                      >
                        {creating ? "Creating..." : "Create"}
                      </Button>
                      <Button
                        onClick={() => setShowForm(false)}
                        variant="ghost"
                        className="text-white/40 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-20 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Bell className="w-12 h-12 mx-auto mb-3 text-white/10" />
                <p className="text-white/30 text-sm">No alert rules configured</p>
                <p className="text-white/15 text-xs mt-1">Create your first alert to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rules.map(rule => {
                  const color = getAlertTypeColor(rule.alertType);
                  return (
                    <div
                      key={rule.id}
                      className={`rounded-xl border p-4 transition-all ${rule.enabled ? "bg-white/[0.02] border-white/[0.08]" : "bg-white/[0.01] border-white/[0.04] opacity-50"}`}
                      style={{ borderLeftWidth: "3px", borderLeftColor: rule.enabled ? color : "transparent" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                            <span className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
                              {rule.symbol.slice(0, 4)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white font-[family-name:var(--font-mono)]">{rule.symbol}</p>
                            <p className="text-xs text-white/30">
                              {getAlertTypeLabel(rule.alertType)}
                              {rule.threshold != null ? ` @ $${rule.threshold.toFixed(2)}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAlert(rule.id, rule.enabled)}
                            className="p-1.5 transition-colors"
                            style={{ color: rule.enabled ? "#00ff88" : "rgba(255,255,255,0.2)" }}
                          >
                            {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => deleteAlert(rule.id)}
                            className="p-1.5 text-white/20 hover:text-[#ff3366] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {history.filter(h => !h.read).length > 0 && (
              <div className="mb-4">
                <Button
                  onClick={markAllRead}
                  variant="ghost"
                  className="text-[#00D4FF] text-xs"
                >
                  Mark all as read
                </Button>
              </div>
            )}
            {history.length === 0 ? (
              <div className="text-center py-20 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <History className="w-12 h-12 mx-auto mb-3 text-white/10" />
                <p className="text-white/30 text-sm">No triggered alerts yet</p>
                <p className="text-white/15 text-xs mt-1">Alerts will appear here when triggered</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(h => {
                  const color = getAlertTypeColor(h.alertType);
                  return (
                    <div
                      key={h.id}
                      className={`rounded-xl border p-4 flex items-start gap-3 transition-all ${!h.read ? "bg-white/[0.03] border-white/[0.1]" : "bg-white/[0.01] border-white/[0.05]"}`}
                      style={{ borderLeftWidth: "3px", borderLeftColor: color }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${color}15` }}>
                        <Zap className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
                            {h.symbol}
                          </span>
                          <span className="text-xs text-white/20">{getAlertTypeLabel(h.alertType)}</span>
                          {!h.read && <div className="w-2 h-2 rounded-full bg-[#00D4FF]" />}
                        </div>
                        <p className="text-xs text-white/50 mt-1">{h.message}</p>
                        <p className="text-[10px] text-white/20 mt-1 font-[family-name:var(--font-mono)]">
                          {formatTime(h.triggeredAt)}
                          {h.triggeredValue != null && (
                            <span className="ml-2">Value: {h.triggeredValue.toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
          <p className="text-xs font-bold text-white/30 mb-2 font-[family-name:var(--font-mono)]">SUPPORTED ALERT TYPES</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {ALERT_TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <div key={opt.value} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: opt.color }} />
                  <p className="text-[11px] font-semibold text-white/60">{opt.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
