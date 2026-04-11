import { marketTickerData } from "@/lib/mock-data";

export function MarketTicker() {
  return (
    <div data-tour="market-ticker" className="w-full bg-black/90 border-b border-white/10 overflow-hidden py-2 flex items-center relative z-20">
      <div className="w-full flex space-x-8 overflow-hidden">
        <div className="flex space-x-8 animate-[ticker_30s_linear_infinite] whitespace-nowrap px-4 hover:[animation-play-state:paused]">
          {[...marketTickerData, ...marketTickerData, ...marketTickerData].map((item, i) => (
            <div key={`${item.symbol}-${i}`} className="flex items-center gap-2 text-sm font-mono tracking-wider">
              <span className="font-bold text-white">{item.symbol}</span>
              <span className="text-white/80">${item.price.toFixed(2)}</span>
              <span className={item.isPositive ? "text-primary" : "text-destructive"}>
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
