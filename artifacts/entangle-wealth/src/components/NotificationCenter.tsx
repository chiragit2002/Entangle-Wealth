import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Trash2, Settings, TrendingUp, TrendingDown, AlertTriangle, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AppNotification {
  id: string;
  type: "buy_alert" | "sell_alert" | "price_alert" | "system" | "indicator";
  title: string;
  body: string;
  symbol?: string;
  time: string;
  read: boolean;
}

interface AlertConfig {
  id: string;
  symbol: string;
  type: "price_above" | "price_below" | "rsi_oversold" | "rsi_overbought" | "macd_cross" | "volume_spike";
  value: string;
  enabled: boolean;
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "1", type: "buy_alert", title: "BUY Signal — NVDA", body: "7-agent consensus reached: RSI oversold, MACD bullish crossover. Confidence: 87%", symbol: "NVDA", time: "2 min ago", read: false },
  { id: "2", type: "sell_alert", title: "SELL Signal — TSLA", body: "RSI overbought at 78, Bollinger Band squeeze detected. Consider taking profits.", symbol: "TSLA", time: "15 min ago", read: false },
  { id: "3", type: "price_alert", title: "AAPL hit $198", body: "Your price alert for AAPL above $198 has been triggered.", symbol: "AAPL", time: "1 hr ago", read: false },
  { id: "4", type: "indicator", title: "Volume Spike — AMD", body: "AMD volume 3.2x above 20-day average. Unusual activity detected.", symbol: "AMD", time: "2 hrs ago", read: true },
  { id: "5", type: "system", title: "Market Opening", body: "Pre-market scan complete. 3 new signals generated for your watchlist.", time: "4 hrs ago", read: true },
  { id: "6", type: "buy_alert", title: "BUY Signal — MSFT", body: "Supertrend flipped bullish. ADX at 32 confirming strong trend.", symbol: "MSFT", time: "Yesterday", read: true },
];

const ALERT_TYPE_OPTIONS = [
  { value: "price_above", label: "Price Above" },
  { value: "price_below", label: "Price Below" },
  { value: "rsi_oversold", label: "RSI Oversold (<30)" },
  { value: "rsi_overbought", label: "RSI Overbought (>70)" },
  { value: "macd_cross", label: "MACD Crossover" },
  { value: "volume_spike", label: "Volume Spike (>2x)" },
];

const STORAGE_KEY = "entangle-alerts";

function getNotifIcon(type: AppNotification["type"]) {
  switch (type) {
    case "buy_alert": return <TrendingUp className="w-4 h-4 text-[#00ff88]" />;
    case "sell_alert": return <TrendingDown className="w-4 h-4 text-[#ff3366]" />;
    case "price_alert": return <Zap className="w-4 h-4 text-[#ffd700]" />;
    case "indicator": return <AlertTriangle className="w-4 h-4 text-primary" />;
    case "system": return <Bell className="w-4 h-4 text-white/50" />;
  }
}

function getNotifBorder(type: AppNotification["type"]) {
  switch (type) {
    case "buy_alert": return "border-l-[#00ff88]";
    case "sell_alert": return "border-l-[#ff3366]";
    case "price_alert": return "border-l-[#ffd700]";
    case "indicator": return "border-l-primary";
    case "system": return "border-l-white/20";
  }
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notifications" | "alerts">("notifications");
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [alerts, setAlerts] = useState<AlertConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newAlert, setNewAlert] = useState({ symbol: "", type: "price_above", value: "" });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

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

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addAlert = () => {
    if (!newAlert.symbol.trim()) return;
    const config: AlertConfig = {
      id: crypto.randomUUID(),
      symbol: newAlert.symbol.toUpperCase().trim().slice(0, 10),
      type: newAlert.type as AlertConfig["type"],
      value: newAlert.value.trim().slice(0, 20) || "Auto",
      enabled: true,
    };
    setAlerts(prev => [config, ...prev]);
    setNewAlert({ symbol: "", type: "price_above", value: "" });
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
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
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div ref={dropdownRef} tabIndex={-1} role="dialog" aria-label="Notification Center" className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-32px)] bg-[#0d0d1a] border border-[rgba(0,212,255,0.15)] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden max-h-[520px] flex flex-col outline-none">
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
                    <div className="text-center py-10 text-white/20">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-[13px]">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.04]">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 flex gap-3 items-start border-l-[3px] ${getNotifBorder(n.type)} ${!n.read ? "bg-white/[0.02]" : ""}`}>
                          <div className="mt-0.5 flex-shrink-0">{getNotifIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[13px] font-bold truncate ${!n.read ? "text-white" : "text-white/60"}`}>{n.title}</p>
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                            </div>
                            <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-[10px] text-white/20 mt-1">{n.time}</p>
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
                    <p className="text-[12px] font-bold text-primary mb-2">New Alert</p>
                    <div className="flex gap-2 mb-2">
                      <input placeholder="Symbol" value={newAlert.symbol}
                        onChange={e => setNewAlert(p => ({ ...p, symbol: e.target.value.toUpperCase().slice(0, 10) }))}
                        maxLength={10}
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-primary/30 placeholder:text-white/20 min-w-0" />
                      <input placeholder="Value" value={newAlert.value}
                        onChange={e => setNewAlert(p => ({ ...p, value: e.target.value.slice(0, 20) }))}
                        maxLength={20}
                        className="w-[80px] bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-primary/30 placeholder:text-white/20" />
                    </div>
                    <div className="flex gap-2">
                      <select value={newAlert.type} onChange={e => setNewAlert(p => ({ ...p, type: e.target.value }))}
                        className="flex-1 bg-[#0d0d1a] border border-white/10 rounded-lg px-2 py-2 text-[11px] text-white focus:outline-none min-h-[36px] [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                        {ALERT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <Button className="bg-primary/20 text-primary text-[11px] px-3 min-h-[36px]" onClick={addAlert}>Add</Button>
                    </div>
                  </div>

                  {alerts.length === 0 ? (
                    <p className="text-[12px] text-white/20 text-center py-4">No alerts configured</p>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map(a => (
                        <div key={a.id} className={`rounded-lg border p-3 flex items-center gap-2 ${a.enabled ? "border-primary/20 bg-primary/[0.03]" : "border-white/[0.06] bg-white/[0.01] opacity-50"}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold">{a.symbol}</p>
                            <p className="text-[10px] text-white/30">{ALERT_TYPE_OPTIONS.find(o => o.value === a.type)?.label} {a.value !== "Auto" ? `@ ${a.value}` : ""}</p>
                          </div>
                          <button onClick={() => toggleAlert(a.id)} className={`p-1.5 rounded ${a.enabled ? "text-[#00ff88]" : "text-white/20"}`}>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeAlert(a.id)} className="p-1.5 text-white/20 hover:text-[#ff3366]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
