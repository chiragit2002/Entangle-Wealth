import { useState, useEffect, useRef, useCallback } from "react";
import { Search, TrendingUp, TrendingDown, Loader2, AlertTriangle } from "lucide-react";

interface StockResult {
  symbol: string;
  name: string;
  sector: string;
  livePrice: number | null;
  staticPrice: number;
  changePercent: number;
  marketDataAvailable: boolean;
}

interface StockSearchDropdownProps {
  onSelect: (symbol: string, name: string, price?: number) => void;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  className?: string;
  autoFocus?: boolean;
  clearOnSelect?: boolean;
}

export function StockSearchDropdown({
  onSelect,
  placeholder = "Search stocks (e.g. AAPL, Tesla)",
  disabled = false,
  value: controlledValue,
  className = "",
  autoFocus = false,
  clearOnSelect = false,
}: StockSearchDropdownProps) {
  const [query, setQuery] = useState(controlledValue ?? "");
  const [results, setResults] = useState<StockResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marketDataUnavailable, setMarketDataUnavailable] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) setQuery(controlledValue);
  }, [controlledValue]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) {
        setMarketDataUnavailable(true);
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setMarketDataUnavailable(!data.marketDataAvailable);
      setIsOpen((data.results ?? []).length > 0);
      setActiveIndex(-1);
    } catch {
      setMarketDataUnavailable(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(val), 280);
  };

  const handleSelect = (result: StockResult) => {
    if (clearOnSelect) {
      setQuery("");
    } else {
      setQuery(result.symbol);
    }
    setIsOpen(false);
    setResults([]);
    onSelect(result.symbol, result.name, result.livePrice ?? result.staticPrice);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const displayPrice = (r: StockResult) => {
    const p = r.livePrice ?? r.staticPrice;
    return p > 0 ? `$${p.toFixed(2)}` : "—";
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`flex items-center gap-2 bg-white/[0.05] border rounded-lg px-3 py-2.5 ${disabled ? "opacity-50 cursor-not-allowed" : "border-white/10 focus-within:border-[#FF8C00]/40"}`}>
        {loading
          ? <Loader2 className="w-4 h-4 text-white/30 animate-spin flex-shrink-0" />
          : <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none font-mono min-w-0 disabled:cursor-not-allowed"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0d0d1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          role="listbox"
          aria-label="Stock search results"
        >
          {marketDataUnavailable && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FF8C00]/10 border-b border-[#FF8C00]/20">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF8C00] flex-shrink-0" />
              <span className="text-xs text-[#FF8C00]/80">Live prices unavailable — showing static data</span>
            </div>
          )}
          <div className="max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.symbol}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] ${i === activeIndex ? "bg-white/[0.07]" : ""} ${i > 0 ? "border-t border-white/[0.04]" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#FF8C00]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold font-mono text-[#FF8C00]">
                      {r.symbol.slice(0, 3)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-white">{r.symbol}</span>
                      <span className="text-[10px] text-white/30 truncate max-w-[120px]">{r.name}</span>
                    </div>
                    <span className="text-[10px] text-white/20">{r.sector}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <span className="text-sm font-mono font-bold text-white">{displayPrice(r)}</span>
                  {r.livePrice !== null && (
                    <span className={`text-[10px] font-mono flex items-center gap-0.5 ${r.changePercent >= 0 ? "text-emerald-400" : "text-[#ff3366]"}`}>
                      {r.changePercent >= 0
                        ? <TrendingUp className="w-2.5 h-2.5" />
                        : <TrendingDown className="w-2.5 h-2.5" />
                      }
                      {r.changePercent >= 0 ? "+" : ""}{r.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
