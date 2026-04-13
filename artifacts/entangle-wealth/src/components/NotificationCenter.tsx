import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Bell, X, Trash2, Settings, TrendingUp, TrendingDown, AlertTriangle, Zap, Activity, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { Link } from "wouter";

export interface AppNotification {
  id: number;
  type: "price_above" | "price_below" | "rsi_oversold" | "rsi_overbought" | "macd_crossover" | "bollinger_breakout" | "system";
  symbol: string;
  message: string;
  time: string;
  read: boolean;
}

interface AlertConfig {
  id: number;
  symbol: string;
  alertType: string;
  threshold: number | null;
  enabled: boolean;
}

const ALERT_TYPE_OPTIONS = [
  { value: "price_above", label: "Price Above" },
  { value: "price_below", label: "Price Below" },
  { value: "rsi_oversold", label: "RSI Oversold (<30)" },
  { value: "rsi_overbought", label: "RSI Overbought (>70)" },
  { value: "macd_crossover", label: "MACD Crossover" },
  { value: "bollinger_breakout", label: "Bollinger Breakout" },
];

function getNotifIcon(type: AppNotification["type"]) {
  switch (type) {
    case "price_above": return <TrendingUp className="w-4 h-4 text-[#FF8C00]" />;
    case "price_below": return <TrendingDown className="w-4 h-4 text-[#ff3366]" />;
    case "rsi_oversold": return <Activity className="w-4 h-4 text-[#FF8C00]" />;
    case "rsi_overbought": return <Activity className="w-4 h-4 text-[#FFB800]" />;
    case "macd_crossover": return <Zap className="w-4 h-4 text-[#9c27b0]" />;
    case "bollinger_breakout": return <AlertTriangle className="w-4 h-4 text-[#ff6b35]" />;
    case "system": return <Bell className="w-4 h-4 text-white/50" />;
  }
}

function getNotifBorder(type: AppNotification["type"]) {
  switch (type) {
    case "price_above": return "border-l-[#FF8C00]";
    case "price_below": return "border-l-[#ff3366]";
    case "rsi_oversold": return "border-l-[#FF8C00]";
    case "rsi_overbought": return "border-l-[#FFB800]";
    case "macd_crossover": return "border-l-[#9c27b0]";
    case "bollinger_breakout": return "border-l-[#ff6b35]";
    case "system": return "border-l-white/20";
  }
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

export default function NotificationCenter() {
  const { getToken, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notifications" | "alerts">("notifications");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [newAlert, setNewAlert] = useState({ symbol: "", type: "price_above", value: "" });
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertError, setAlertError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/alerts/unread-count", getToken);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch { /* ignore */ }
  }, [getToken, isSignedIn]);

  const fetchHistory = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/alerts/history", getToken);
      if (res.ok) {
        const data = await res.json();
        const items: AppNotification[] = (data.history || []).slice(0, 20).map((h: Record<string, unknown>) => ({
          id: h.id as number,
          type: (h.alertType as string) || "system",
          symbol: (h.symbol as string) || "",
          message: (h.message as string) || "",
          time: (h.triggeredAt as string) || new Date().toISOString(),
          read: Boolean(h.read),
        }));
        setNotifications(items);
        setUnreadCount(items.filter(n => !n.read).length);
      }
    } catch { /* ignore */ }
  }, [getToken, isSignedIn]);

  const fetchAlertRules = useCallback(async () => {
    if (!isSignedIn) return;
    setLoadingAlerts(true);
    try {
      const res = await authFetch("/alerts", getToken);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch { /* ignore */ } finally {
      setLoadingAlerts(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchUnreadCount();
    const interval = setInterval(() => {
      if (!document.hidden) fetchUnreadCount();
    }, 60_000);
    return () => clearInterval(interval);
  }, [isSignedIn, fetchUnreadCount]);

  useEffect(() => {
    if (!isSignedIn) return;
    let aborted = false;

    async function connectSSE() {
      while (!aborted) {
        try {
          const token = await getToken();
          if (!token || aborted) return;
          const res = await fetch("/api/alerts/stream", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok || !res.body) {
            await new Promise(r => setTimeout(r, 10_000));
            continue;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "alert") {
                  const notif: AppNotification = {
                    id: data.id,
                    type: data.alertType || "system",
                    symbol: data.symbol || "",
                    message: data.message || "",
                    time: data.triggeredAt || new Date().toISOString(),
                    read: false,
                  };
                  setNotifications(prev => [notif, ...prev.slice(0, 49)]);
                  setUnreadCount(prev => prev + 1);
                }
              } catch { /* ignore parse errors */ }
            }
          }
        } catch { /* connection error */ }
        if (!aborted) await new Promise(r => setTimeout(r, 5_000));
      }
    }

    connectSSE();

    return () => { aborted = true; };
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (open) {
      fetchHistory();
      if (tab === "alerts") fetchAlertRules();
      if (tab === "notifications" && unreadCount > 0) {
        authFetch("/alerts/mark-read", getToken, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).then(() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
        }).catch(() => { /* ignore */ });
      }
    }
  }, [open, tab, fetchHistory, fetchAlertRules, unreadCount, getToken]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (open && dropdownRef.current) {
      dropdownRef.current.focus();
    }
  }, [open]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await authFetch("/alerts/mark-read", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch { /* ignore */ }
  }, [getToken]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const [addingAlert, setAddingAlert] = useState(false);

  const addAlert = async () => {
    if (!newAlert.symbol.trim()) return;
    if (!isSignedIn) {
      window.location.href = "/sign-in?reason=protected";
      return;
    }
    if (needsThreshold(newAlert.type) && (!newAlert.value || isNaN(parseFloat(newAlert.value)))) return;
    setAddingAlert(true);
    try {
      const res = await authFetch("/alerts", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newAlert.symbol.toUpperCase().trim(),
          alertType: newAlert.type,
          threshold: needsThreshold(newAlert.type) ? parseFloat(newAlert.value) || null : null,
        }),
      });
      if (res.ok) {
        setNewAlert({ symbol: "", type: "price_above", value: "" });
        setAlertError(null);
        fetchAlertRules();
      } else {
        const data = await res.json().catch(() => null);
        setAlertError(data?.error || "Failed to create alert");
      }
    } catch {
      setAlertError("Network error. Please try again.");
    } finally {
      setAddingAlert(false);
    }
  };

  const toggleAlert = async (id: number) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    try {
      await authFetch(`/alerts/${id}`, getToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !alert.enabled }),
      });
    } catch { /* ignore */ }
  };

  const removeAlert = async (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    try {
      await authFetch(`/alerts/${id}`, getToken, { method: "DELETE" });
    } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#ff3366] text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={dropdownRef} tabIndex={-1} role="dialog" aria-label="Notification Center" className="fixed right-2 left-2 top-14 sm:absolute sm:left-auto sm:top-full sm:mt-2 sm:right-0 sm:w-[380px] sm:max-w-[calc(100vw-32px)] bg-[var(--nav-dropdown-bg,#0d0d1a)] border border-[rgba(255,140,0,0.15)] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden max-h-[70vh] sm:max-h-[520px] flex flex-col outline-none">
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <div className="flex gap-1">
                <button onClick={() => setTab("notifications")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${tab === "notifications" ? "bg-primary/15 text-primary" : "text-white/40"}`}>
                  Alerts {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#ff3366] text-[9px] text-white">{unreadCount}</span>}
                </button>
                <button onClick={() => setTab("alerts")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1 ${tab === "alerts" ? "bg-primary/15 text-primary" : "text-white/40"}`}>
                  <Settings className="w-3 h-3" /> Configure
                </button>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-white/30 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {tab === "notifications" && (
                <>
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-white/40">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-[13px]">No notifications yet</p>
                      <p className="text-[11px] text-white/50 mt-1">Configure alerts to get started</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 flex gap-3 items-start border-l-[3px] ${getNotifBorder(n.type)} ${!n.read ? "bg-white/[0.02]" : ""}`}>
                          <div className="mt-0.5 flex-shrink-0">{getNotifIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] font-bold truncate ${!n.read ? "text-white" : "text-white/60"}`}>
                                {n.symbol}
                              </p>
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                            </div>
                            <p className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-white/50 mt-1">{formatTime(n.time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === "alerts" && (
                <div className="p-3 space-y-3">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                    <p className="text-[12px] font-bold text-primary mb-2">Quick Add Alert</p>
                    <div className="flex gap-2 mb-2">
                      <input placeholder="Symbol" value={newAlert.symbol}
                        onChange={e => { setNewAlert(p => ({ ...p, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, "").slice(0, 10) })); setAlertError(null); }}
                        maxLength={10}
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground min-w-0" />
                      {needsThreshold(newAlert.type) && (
                        <input placeholder="Price" value={newAlert.value}
                          onChange={e => { setNewAlert(p => ({ ...p, value: e.target.value.replace(/[^0-9.]/g, "").slice(0, 20) })); setAlertError(null); }}
                          maxLength={20}
                          className="w-[80px] bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-[12px] text-foreground focus:outline-none focus:border-primary/30 placeholder:text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select value={newAlert.type} onChange={e => { setNewAlert(p => ({ ...p, type: e.target.value })); setAlertError(null); }}
                        className="flex-1 bg-[var(--nav-dropdown-bg,#0d0d1a)] border border-white/10 rounded-lg px-2 py-2 text-[11px] text-foreground focus:outline-none min-h-[44px] [&>option]:bg-[var(--nav-dropdown-bg,#0d0d1a)] [&>option]:text-foreground">
                        {ALERT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <Button
                        className="bg-primary/20 text-primary text-[11px] px-4 min-h-[44px] disabled:opacity-50"
                        onClick={addAlert}
                        disabled={addingAlert || !newAlert.symbol.trim()}
                      >
                        {addingAlert ? "..." : "Add"}
                      </Button>
                    </div>
                    {alertError && (
                      <p className="text-[11px] text-red-400 mt-1.5">{alertError}</p>
                    )}
                  </div>

                  {loadingAlerts ? (
                    <div className="space-y-2">
                      {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-white/[0.02] animate-pulse" />)}
                    </div>
                  ) : alerts.length === 0 ? (
                    <p className="text-[12px] text-white/50 text-center py-4">No alerts configured</p>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map(a => (
                        <div key={a.id} className={`rounded-lg border p-3 flex items-center gap-2 ${a.enabled ? "border-primary/20 bg-primary/[0.03]" : "border-white/[0.06] bg-white/[0.01] opacity-50"}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold">{a.symbol}</p>
                            <p className="text-[10px] text-white/30">
                              {ALERT_TYPE_OPTIONS.find(o => o.value === a.alertType)?.label}
                              {a.threshold != null ? ` @ $${a.threshold.toFixed(2)}` : ""}
                            </p>
                          </div>
                          <button onClick={() => toggleAlert(a.id)} className={`p-1.5 rounded ${a.enabled ? "text-[#FF8C00]" : "text-white/40"}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeAlert(a.id)} className="p-1.5 text-white/40 hover:text-[#ff3366]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link href="/alerts" onClick={() => setOpen(false)}
                    className="block text-center text-[11px] text-primary font-semibold py-2 hover:bg-primary/5 rounded-lg transition-colors">
                    Manage All Alerts →
                  </Link>
                </div>
              )}
            </div>

            {tab === "notifications" && notifications.length > 0 && (
              <div className="flex items-center gap-2 p-2 border-t border-white/[0.06]">
                <button onClick={markAllRead} className="flex-1 text-[11px] text-primary font-semibold py-2 hover:bg-primary/5 rounded-lg transition-colors">
                  Mark all read
                </button>
                <button onClick={clearAll} className="flex-1 text-[11px] text-white/30 font-semibold py-2 hover:bg-white/5 rounded-lg transition-colors">
                  Clear all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
