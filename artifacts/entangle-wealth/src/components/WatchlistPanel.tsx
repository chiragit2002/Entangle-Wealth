import { useState } from "react";
import { marketTickerData } from "@/lib/mock-data";
import { X, Bell, BellOff, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type WatchlistItem = { symbol: string; signal: string; confidence: number };

const defaultWatchlist: WatchlistItem[] = [
  { symbol: "NVDA", signal: "BUY", confidence: 87 },
  { symbol: "AMD", signal: "BUY", confidence: 83 },
  { symbol: "TSLA", signal: "SELL", confidence: 74 },
  { symbol: "PLTR", signal: "BUY", confidence: 79 },
];

interface WatchlistPanelProps {
  externalItems?: WatchlistItem[];
  onRemove?: (symbol: string) => void;
}

export function WatchlistPanel({ externalItems, onRemove }: WatchlistPanelProps = {}) {
  const { toast } = useToast();
  const [internalItems, setInternalItems] = useState(defaultWatchlist);
  const items = externalItems ?? internalItems;
  const [alerts, setAlerts] = useState<string[]>(["NVDA"]);

  const removeItem = (symbol: string) => {
    if (onRemove) {
      onRemove(symbol);
    } else {
      setInternalItems(prev => prev.filter(i => i.symbol !== symbol));
    }
    toast({ title: "Removed from watchlist", description: `${symbol} removed.` });
  };

  const toggleAlert = (symbol: string) => {
    const hasAlert = alerts.includes(symbol);
    setAlerts(prev => hasAlert ? prev.filter(s => s !== symbol) : [...prev, symbol]);
    toast({
      title: hasAlert ? "Alert disabled" : "Alert enabled",
      description: `${symbol} price alert ${hasAlert ? "turned off" : "turned on"}.`,
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Watchlist</h4>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{items.length} tracked</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-1.5">
          <Eye className="w-8 h-8 text-white/10 mb-1" />
          <p className="text-xs font-medium text-white/30">Your watchlist is empty</p>
          <p className="text-[10px] text-white/50 max-w-[140px] leading-relaxed">Bookmark a signal from the Signals page to track it here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const market = marketTickerData.find(m => m.symbol === item.symbol);
            const hasAlert = alerts.includes(item.symbol);
            return (
              <div key={item.symbol} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{item.symbol}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${item.signal === "BUY" ? "bg-primary/10 text-primary" : item.signal === "SELL" ? "bg-red-500/10 text-red-400" : "bg-secondary/10 text-secondary"}`}>
                      {item.signal}
                    </span>
                  </div>
                  {market && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-white/60">${market.price.toFixed(2)}</span>
                      <span className={market.isPositive ? "text-primary" : "text-red-400"}>{market.change}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <span className="text-muted-foreground">{item.confidence}%</span>
                </div>
                <button
                  onClick={() => toggleAlert(item.symbol)}
                  className={`p-1 rounded transition-colors ${hasAlert ? "text-secondary" : "text-white/40 hover:text-white/40"}`}
                  aria-label={hasAlert ? `Disable alert for ${item.symbol}` : `Enable alert for ${item.symbol}`}
                >
                  {hasAlert ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => removeItem(item.symbol)}
                  className="p-1 rounded text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove ${item.symbol} from watchlist`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
