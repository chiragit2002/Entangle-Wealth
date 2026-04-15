import { memo, useEffect, useState } from "react";
import { useSymbolPrices } from "@/contexts/LivePriceContext";

const TICKER_SYMBOLS = [
  "AAPL","MSFT","NVDA","GOOGL","AMZN","META","TSLA","AMD","NFLX",
  "RKLB","PLTR","SOFI","COIN","SMCI","ARM","AVGO","CRM","UBER",
  "SHOP","SNOW","JPM","V","BA","CRWD","PANW","LLY","UNH","XOM","GS","RIVN",
];

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  isPositive: boolean;
}

function MarketTickerBase() {
  const { prices } = useSymbolPrices(TICKER_SYMBOLS);
  const [baseItems, setBaseItems] = useState<TickerItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/alpaca/movers")
      .then(r => r.ok ? r.json() : null)
      .then((data: { all?: { symbol: string; price: number; change: number }[] } | null) => {
        if (data?.all?.length) {
          const mapped: TickerItem[] = data.all.slice(0, 15).map(m => ({
            symbol: m.symbol,
            price: m.price,
            changePercent: m.change,
            isPositive: m.change >= 0,
          }));
          setBaseItems(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const items: TickerItem[] = baseItems.map(item => {
    const live = prices[item.symbol];
    if (live) {
      return {
        ...item,
        price: live.price,
        changePercent: live.changePercent,
        isPositive: live.changePercent >= 0,
      };
    }
    return item;
  });

  if (!loaded) return null;

  if (items.length === 0) {
    return (
      <div className="w-full bg-black/90 border-b border-white/10 py-2 flex items-center justify-center relative z-20">
        <span className="text-xs font-mono text-white/30">Market data unavailable</span>
      </div>
    );
  }

  const doubled = [...items, ...items, ...items];

  return (
    <div data-tour="market-ticker" className="w-full bg-black/90 border-b border-white/10 overflow-hidden py-2 flex items-center relative z-20">
      <div className="w-full flex space-x-8 overflow-hidden">
        <div className="flex space-x-8 animate-[ticker_30s_linear_infinite] whitespace-nowrap px-4 hover:[animation-play-state:paused]">
          {doubled.map((item, i) => (
            <div key={`${item.symbol}-${i}`} className="flex items-center gap-2 text-sm font-mono tracking-wider">
              <span className="font-bold text-white">{item.symbol}</span>
              <span className="text-white/80">${item.price.toFixed(2)}</span>
              <span className={item.isPositive ? "text-primary" : "text-destructive"}>
                {item.isPositive ? "+" : ""}{item.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const MarketTicker = memo(MarketTickerBase);
