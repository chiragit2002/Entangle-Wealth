import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, History, AlertTriangle, TrendingUp, TrendingDown, Zap, Activity, Settings, Pencil, X, Mail, RefreshCw, BarChart2, Volume2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";
import { UpgradePrompt, useUpgradePrompt } from "@/components/UpgradePrompt";
import { StockSearchDropdown } from "@/components/StockSearchDropdown";

const ALERT_TYPE_OPTIONS = [
  { value: "price_above", label: "Price Above", icon: TrendingUp, color: "#FF8C00", needsThreshold: true, thresholdLabel: "Target Price ($)" },
  { value: "price_below", label: "Price Below", icon: TrendingDown, color: "#ff3366", needsThreshold: true, thresholdLabel: "Target Price ($)" },
  { value: "pct_change", label: "% Change", icon: BarChart2, color: "#9c27b0", needsThreshold: true, thresholdLabel: "Min % Change" },
  { value: "volume_spike", label: "Volume Spike", icon: Volume2, color: "#0099cc", needsThreshold: true, thresholdLabel: "Min Multiplier (e.g. 2 = 2x avg)" },
  { value: "rsi_oversold", label: "RSI Oversold (<30)", icon: Activity, color: "#FF8C00", needsThreshold: false, thresholdLabel: "" },
  { value: "rsi_overbought", label: "RSI Overbought (>70)", icon: Activity, color: "#FFB800", needsThreshold: false, thresholdLabel: "" },
  { value: "macd_crossover", label: "MACD Crossover", icon: Zap, color: "#9c27b0", needsThreshold: false, thresholdLabel: "" },
  { value: "bollinger_breakout", label: "Bollinger Breakout", icon: AlertTriangle, color: "#ff6b35", needsThreshold: false, thresholdLabel: "" },
];

function getAlertTypeLabel(type: string): string {
  return ALERT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
}

function getAlertTypeColor(type: string): string {
  return ALERT_TYPE_OPTIONS.find(o => o.value === type)?.color || "#FF8C00";
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
  return ALERT_TYPE_OPTIONS.find(o => o.value === type)?.needsThreshold ?? false;
}

function getThresholdLabel(type: string): string {
  return ALERT_TYPE_OPTIONS.find(o => o.value === type)?.thresholdLabel || "Threshold";
}

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

export default function Alerts() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { promptConfig, showUpgradePrompt, closePrompt } = useUpgradePrompt();
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState("free");
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editType, setEditType] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [digestFrequency, setDigestFrequency] = useState("off");
  const [rulesTotal, setRulesTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marketDataUnavailable, setMarketDataUnavailable] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedSymbolName, setSelectedSymbolName] = useState("");
  const [alertType, setAlertType] = useState("price_above");
  const [threshold, setThreshold] = useState("");
  const [formError, setFormError] = useState("");

  const fetchRules = useCallback(async (append = false) => {
    try {
      const offset = append ? rules.length : 0;
      const res = await authFetch(`/alerts?limit=50&offset=${offset}`, getToken);
      if (res.ok) {
        const data = await res.json();
        setRules(prev => append ? [...prev, ...data.alerts] : (data.alerts ?? []));
        setRulesTotal(data.total || 0);
        setTier(data.tier);
        setDailyLimit(data.dailyLimit);
        setDailyUsed(data.dailyUsed);
      }
    } catch (err) {
      console.error("Failed to fetch alert rules:", err);
    }
  }, [getToken, rules.length]);

  const fetchHistory = useCallback(async (append = false) => {
    try {
      const offset = append ? history.length : 0;
      const res = await authFetch(`/alerts/history?limit=50&offset=${offset}`, getToken);
      if (res.ok) {
        const data = await res.json();
        setHistory(prev => append ? [...prev, ...data.history] : (data.history ?? []));
        setHistoryTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch alert history:", err);
    }
  }, [getToken, history.length]);

  const fetchDigestPref = useCallback(async () => {
    try {
      const res = await authFetch("/alerts/digest-preference", getToken);
      if (res.ok) {
        const data = await res.json();
        setDigestFrequency(data.digestFrequency || "off");
      }
    } catch { /* non-fatal */ }
  }, [getToken]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRules(), fetchHistory(), fetchDigestPref()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (dailyLimit !== null && dailyUsed >= dailyLimit && tier === "free") {
      showUpgradePrompt({
        limitType: "alert_triggers",
        limitLabel: "Daily alert triggers",
        currentUsage: dailyUsed,
        maxUsage: dailyLimit,
        unlocks: [
          "Unlimited daily alert triggers",
          "Priority alert processing",
          "Email & push notifications",
          "Unlimited alert rules",
        ],
      });
    }
  }, [dailyUsed, dailyLimit, tier, showUpgradePrompt]);

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedSymbol) {
      setFormError("Please select a stock from the search dropdown");
      return;
    }
    if (needsThreshold(alertType) && !threshold.trim()) {
      setFormError("Please enter a threshold value");
      return;
    }
    if (needsThreshold(alertType) && isNaN(parseFloat(threshold))) {
      setFormError("Please enter a valid number");
      return;
    }

    if (tier === "free" && rules.length >= 20) {
      showUpgradePrompt({
        limitType: "alert_rules",
        limitLabel: "Alert rules",
        currentUsage: rules.length,
        maxUsage: 20,
        unlocks: ["Unlimited alert rules", "10+ daily trigger events", "Priority processing", "All 8 alert types"],
      });
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch("/alerts", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol,
          alertType,
          threshold: needsThreshold(alertType) ? parseFloat(threshold) : null,
        }),
      });

      if (res.ok) {
        setSelectedSymbol("");
        setSelectedSymbolName("");
        setThreshold("");
        setAlertType("price_above");
        setShowForm(false);
        fetchRules();
        toast({ title: "Alert created", description: `${selectedSymbol} alert rule added.` });
        trackEvent("alert_created", { symbol: selectedSymbol, type: alertType });
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to create alert" }));
        if (res.status === 503 || err.marketDataUnavailable) {
          setMarketDataUnavailable(true);
          setFormError(err.error || "Market data unavailable — cannot validate symbol");
        } else if (res.status === 403) {
          showUpgradePrompt({
            limitType: "alert_rules",
            limitLabel: "Alert rules",
            currentUsage: rules.length,
            maxUsage: 20,
            unlocks: ["Unlimited alert rules", "10+ daily trigger events", "Priority processing"],
          });
        } else {
          setFormError(err.error || "Failed to create alert");
        }
      }
    } catch {
      setFormError("Network error — please try again");
    } finally {
      setCreating(false);
    }
  };

  const toggleAlert = async (id: number, currentEnabled: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    try {
      const res = await authFetch(`/alerts/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (!res.ok) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: currentEnabled } : r));
        toast({ title: "Error", description: "Failed to toggle alert", variant: "destructive" });
      }
    } catch {
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: currentEnabled } : r));
    }
  };

  const deleteAlert = async (id: number) => {
    const prev = rules;
    setRules(r => r.filter(x => x.id !== id));
    try {
      const res = await authFetch(`/alerts/${id}`, getToken, { method: "DELETE" });
      if (!res.ok) {
        setRules(prev);
        toast({ title: "Error", description: "Failed to delete alert", variant: "destructive" });
      }
    } catch {
      setRules(prev);
    }
  };

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setEditType(rule.alertType);
    setEditThreshold(rule.threshold != null ? String(rule.threshold) : "");
  };

  const saveEdit = async (id: number) => {
    try {
      const body: Record<string, unknown> = { alertType: editType };
      if (needsThreshold(editType)) {
        body.threshold = parseFloat(editThreshold) || null;
      } else {
        body.threshold = null;
      }
      const res = await authFetch(`/alerts/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setRules(prev => prev.map(r => r.id === id ? { ...r, alertType: updated.alertType, threshold: updated.threshold } : r));
        setEditingId(null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to save alert changes", variant: "destructive" });
    }
  };

  const markAllRead = async () => {
    try {
      await authFetch("/alerts/mark-read", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setHistory(prev => prev.map(h => ({ ...h, read: true })));
    } catch { /* non-fatal */ }
  };

  const updateDigestPref = async (freq: string) => {
    setDigestFrequency(freq);
    try {
      await authFetch("/alerts/digest-preference", getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: freq }),
      });
    } catch { /* non-fatal */ }
  };

  const loadMoreRules = async () => {
    setLoadingMore(true);
    await fetchRules(true);
    setLoadingMore(false);
  };

  const loadMoreHistory = async () => {
    setLoadingMore(true);
    await fetchHistory(true);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-[#020204] text-white">
      {promptConfig && <UpgradePrompt config={promptConfig} onClose={closePrompt} />}
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 pt-24">

        {marketDataUnavailable && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/20">
            <WifiOff className="w-5 h-5 text-[#ff3366] flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#ff3366]">Market Data Unavailable</p>
              <p className="text-xs text-white/50">Alert creation requires live price validation. Trading and alert creation are disabled until data is restored.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-mono)]">
              <span className="text-[#FF8C00]">Real-Time</span> Alerts
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Configure price, % change, volume, RSI, MACD, and Bollinger alerts with live evaluation
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dailyLimit && (
              <div className="text-xs text-white/30 bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]">
                <span className="text-[#FFB800] font-bold">{dailyUsed}</span>
                <span className="text-white/50">/{dailyLimit} daily alerts</span>
                <span className="text-white/50 ml-1">(Free)</span>
              </div>
            )}
            {tier === "pro" && (
              <div className="text-xs text-[#FF8C00] bg-[#FF8C00]/5 rounded-lg px-3 py-2 border border-[#FF8C00]/20">
                Pro | Unlimited
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setTab("rules")}
            variant="ghost"
            className={`flex items-center gap-2 px-4 py-2.5 h-auto rounded-xl text-sm font-semibold ${tab === "rules" ? "bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20" : "text-white/40 hover:text-white/60"}`}
          >
            <Settings className="w-4 h-4" /> Alert Rules
            <span className="text-xs bg-white/[0.06] px-2 py-0.5 rounded-full">{rules.length}</span>
          </Button>
          <Button
            onClick={() => setTab("history")}
            variant="ghost"
            className={`flex items-center gap-2 px-4 py-2.5 h-auto rounded-xl text-sm font-semibold ${tab === "history" ? "bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20" : "text-white/40 hover:text-white/60"}`}
          >
            <History className="w-4 h-4" /> Triggered History
            {history.filter(h => !h.read).length > 0 && (
              <span className="text-xs bg-[#ff3366] text-white px-2 py-0.5 rounded-full">
                {history.filter(h => !h.read).length}
              </span>
            )}
          </Button>
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
                  disabled={marketDataUnavailable}
                  className="bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/20 hover:bg-[#FF8C00]/20 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Alert Rule
                </Button>
              ) : (
                <form onSubmit={createAlert} className="rounded-xl bg-white/[0.03] border border-[#FF8C00]/20 p-4">
                  <p className="text-sm font-bold text-[#FF8C00] mb-1 font-[family-name:var(--font-mono)]">Create Alert Rule</p>
                  <p className="text-xs text-white/30 mb-4">Search for a stock and configure your condition. All alerts are validated against live prices.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-mono text-white/30 uppercase mb-1.5 block">Stock Symbol</label>
                      <StockSearchDropdown
                        onSelect={(sym, name) => {
                          setSelectedSymbol(sym);
                          setSelectedSymbolName(name);
                          setFormError("");
                        }}
                        value={selectedSymbol}
                        placeholder="Search stock (e.g. AAPL)"
                        disabled={marketDataUnavailable}
                      />
                      {selectedSymbol && (
                        <p className="text-[10px] text-white/30 mt-1 font-mono">{selectedSymbolName}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-white/30 uppercase mb-1.5 block">Alert Type</label>
                      <select
                        value={alertType}
                        onChange={e => { setAlertType(e.target.value); setThreshold(""); }}
                        aria-label="Alert type"
                        className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none [&>option]:bg-[#0d0d1a] [&>option]:text-white"
                      >
                        {ALERT_TYPE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {needsThreshold(alertType) && (
                    <div className="mb-3">
                      <label className="text-[10px] font-mono text-white/30 uppercase mb-1.5 block">{getThresholdLabel(alertType)}</label>
                      <input
                        value={threshold}
                        onChange={e => setThreshold(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder={alertType === "pct_change" ? "e.g. 5 (= 5%)" : alertType === "volume_spike" ? "e.g. 2 (= 2x avg)" : "e.g. 185.00"}
                        className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF8C00]/30 font-mono"
                      />
                    </div>
                  )}

                  {formError && (
                    <p className="text-xs text-[#ff3366] mb-3">{formError}</p>
                  )}

                  <div className="flex gap-2 items-center">
                    <Button
                      type="submit"
                      disabled={creating || marketDataUnavailable}
                      className="bg-[#FF8C00] text-black font-bold hover:bg-[#FF8C00]/80 gap-1 disabled:opacity-50"
                    >
                      {creating ? <><RefreshCw className="w-3 h-3 animate-spin" /> Creating...</> : "Create Alert"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => { setShowForm(false); setSelectedSymbol(""); setThreshold(""); setFormError(""); }}
                      variant="ghost"
                      className="text-white/50 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-20 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Bell className="w-12 h-12 mx-auto mb-3 text-white/10" />
                <p className="text-white/30 text-sm font-semibold">No alert rules yet</p>
                <p className="text-white/50 text-xs mt-1 max-w-xs mx-auto">Set up your first price alert to get notified when stocks hit your target levels.</p>
                <Button onClick={() => setShowForm(true)} disabled={marketDataUnavailable} className="mt-4 bg-gradient-to-r from-[#FF8C00] to-[#0099cc] text-black text-xs font-bold hover:opacity-90">
                  Create Your First Alert
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rules.map(rule => {
                  const color = getAlertTypeColor(rule.alertType);
                  const isEditing = editingId === rule.id;
                  return (
                    <div
                      key={rule.id}
                      className={`rounded-xl border p-4 transition-all ${rule.enabled ? "bg-white/[0.02] border-white/[0.08]" : "bg-white/[0.01] border-white/[0.04] opacity-50"}`}
                      style={{ borderLeftWidth: "3px", borderLeftColor: rule.enabled ? color : "transparent" }}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-[#FF8C00] font-[family-name:var(--font-mono)]">Edit: {rule.symbol}</p>
                            <Button onClick={() => setEditingId(null)} size="icon" variant="ghost" className="w-7 h-7 text-white/30 hover:text-white">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <select
                            value={editType}
                            onChange={e => setEditType(e.target.value)}
                            className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none [&>option]:bg-[#0d0d1a] [&>option]:text-white"
                          >
                            {ALERT_TYPE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {needsThreshold(editType) && (
                            <input
                              placeholder={getThresholdLabel(editType)}
                              value={editThreshold}
                              onChange={e => setEditThreshold(e.target.value.replace(/[^0-9.]/g, ""))}
                              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF8C00]/30 font-[family-name:var(--font-mono)]"
                            />
                          )}
                          <div className="flex gap-2">
                            <Button onClick={() => saveEdit(rule.id)} className="flex-1 bg-[#FF8C00] text-black font-bold text-xs">Save</Button>
                            <Button onClick={() => setEditingId(null)} variant="ghost" className="text-white/50 text-xs">Cancel</Button>
                          </div>
                        </div>
                      ) : (
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
                                {rule.threshold != null ? ` @ ${rule.threshold}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button onClick={() => startEdit(rule)} size="icon" variant="ghost" className="w-7 h-7 text-white/30 hover:text-[#FF8C00]" aria-label="Edit alert">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => toggleAlert(rule.id, rule.enabled)} size="icon" variant="ghost" className="w-7 h-7" style={{ color: rule.enabled ? "#FF8C00" : "rgba(255,255,255,0.3)" }} aria-label={rule.enabled ? "Disable alert" : "Enable alert"}>
                              {rule.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </Button>
                            <Button onClick={() => deleteAlert(rule.id)} size="icon" variant="ghost" className="w-7 h-7 text-white/30 hover:text-[#ff3366]" aria-label="Delete alert">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {rules.length > 0 && rules.length < rulesTotal && (
              <div className="text-center mt-4">
                <Button onClick={loadMoreRules} disabled={loadingMore} variant="ghost" className="text-[#FF8C00] text-xs gap-2">
                  {loadingMore ? <><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</> : `Load More (${rules.length}/${rulesTotal})`}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {history.filter(h => !h.read).length > 0 && (
              <div className="mb-4">
                <Button onClick={markAllRead} variant="ghost" className="text-[#FF8C00] text-xs">
                  Mark all as read
                </Button>
              </div>
            )}
            {history.length === 0 ? (
              <div className="text-center py-20 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <History className="w-12 h-12 mx-auto mb-3 text-white/10" />
                <p className="text-white/30 text-sm font-semibold">No triggered alerts yet</p>
                <p className="text-white/50 text-xs mt-1 max-w-xs mx-auto">When your alert conditions are met, triggered notifications will appear here.</p>
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
                          <span className="text-sm font-bold font-[family-name:var(--font-mono)]" style={{ color }}>{h.symbol}</span>
                          <span className="text-xs text-white/50">{getAlertTypeLabel(h.alertType)}</span>
                          {!h.read && <div className="w-2 h-2 rounded-full bg-[#FF8C00]" />}
                        </div>
                        <p className="text-xs text-white/50 mt-1">{h.message}</p>
                        <p className="text-[10px] text-white/50 mt-1 font-[family-name:var(--font-mono)]">
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
            {history.length > 0 && history.length < historyTotal && (
              <div className="text-center mt-4">
                <Button onClick={loadMoreHistory} disabled={loadingMore} variant="ghost" className="text-[#FF8C00] text-xs gap-2">
                  {loadingMore ? <><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</> : `Load More (${history.length}/${historyTotal})`}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <p className="text-xs font-bold text-white/30 mb-2 font-[family-name:var(--font-mono)]">SUPPORTED ALERT TYPES</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALERT_TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <div key={opt.value} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                    <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: opt.color }} />
                    <p className="text-[10px] font-semibold text-white/60 leading-tight">{opt.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-[#FF8C00]" />
              <p className="text-xs font-bold text-white/30 font-[family-name:var(--font-mono)]">EMAIL DIGEST</p>
            </div>
            <p className="text-xs text-white/30 mb-3">Receive a summary of your triggered alerts via email</p>
            <div className="flex gap-2">
              {[
                { value: "off", label: "Off" },
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
              ].map(opt => (
                <Button
                  key={opt.value}
                  onClick={() => updateDigestPref(opt.value)}
                  variant="ghost"
                  className={`flex-1 h-auto py-2.5 rounded-lg text-xs font-semibold ${digestFrequency === opt.value ? "bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30" : "bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/50"}`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            {digestFrequency !== "off" && (
              <p className="text-[10px] text-[#FF8C00]/60 mt-2">
                {digestFrequency === "daily" ? "You'll receive a daily digest at 8:00 AM UTC" : "You'll receive a weekly digest every Monday at 8:00 AM UTC"}
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
