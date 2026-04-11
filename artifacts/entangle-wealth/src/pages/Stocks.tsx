import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StockAnalysisPanel } from "@/components/StockAnalysisPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fetchStocks,
  fetchMovers,
  fetchSectors,
  formatMarketCap,
  formatVolume,
  type Stock,
  type SectorSummary,
} from "@/lib/api";
import {
  Search,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  BarChart3,
  Globe,
  Brain,
  Filter,
} from "lucide-react";

const SECTORS = [
  "Technology", "Healthcare", "Consumer Cyclical", "Communication Services",
  "Financial Services", "Industrials", "Consumer Defensive", "Energy",
  "Basic Materials", "Real Estate", "Utilities",
];

const CAP_TIERS = [
  { value: "mega", label: "Mega Cap" },
  { value: "large", label: "Large Cap" },
  { value: "mid", label: "Mid Cap" },
  { value: "small", label: "Small Cap" },
  { value: "micro", label: "Micro Cap" },
];

export default function Stocks() {
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialQuery = urlParams?.get("q") || "";

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sectorFilter, setSectorFilter] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [sortBy, setSortBy] = useState("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [moversGainers, setMoversGainers] = useState<Stock[]>([]);
  const [moversLosers, setMoversLosers] = useState<Stock[]>([]);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStocks({
        q: debouncedQuery || undefined,
        sector: sectorFilter || undefined,
        capTier: capFilter || undefined,
        page,
        limit: 50,
        sortBy,
        sortDir,
      });
      setStocks(data.stocks);
      setTotalCount(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError("Failed to load stocks. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, sectorFilter, capFilter, page, sortBy, sortDir]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sectorFilter, capFilter]);

  useEffect(() => {
    fetchMovers().then((data) => {
      setMoversGainers(data.gainers.slice(0, 5));
      setMoversLosers(data.losers.slice(0, 5));
    }).catch(err => { if (import.meta.env.DEV) console.error('Failed to fetch market movers:', err); });
    fetchSectors().then((data) => setSectors(data.sectors)).catch(err => { if (import.meta.env.DEV) console.error('Failed to fetch sectors:', err); });
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir(field === "symbol" || field === "name" ? "asc" : "desc");
    }
  };

  const SortHeader = ({ field, label, className = "" }: { field: string; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-white transition-colors ${className}`}
    >
      {label}
      {sortBy === field && <ArrowUpDown className="w-3 h-3 text-primary" />}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-6 h-6 text-primary" />
                  <h1 className="text-3xl md:text-4xl font-bold">Stock Explorer</h1>
                </div>
                <p className="text-muted-foreground">
                  Search {totalCount > 0 ? totalCount.toLocaleString() : "5,000"} NASDAQ-listed stocks with AI-powered quantum analysis
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Demo data shown — prices are simulated
              </div>
            </div>

            {!selectedStock && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-panel p-4">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Top Gainers
                  </h3>
                  <div className="space-y-2">
                    {moversGainers.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => setSelectedStock(s)}
                        className="w-full flex items-center justify-between text-xs hover:bg-white/5 p-1.5 rounded transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-white">{s.symbol}</span>
                          <span className="text-muted-foreground ml-2 hidden sm:inline">{s.name.slice(0, 20)}</span>
                        </div>
                        <span className="text-green-400 font-mono">+{s.changePercent.toFixed(2)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    Top Losers
                  </h3>
                  <div className="space-y-2">
                    {moversLosers.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => setSelectedStock(s)}
                        className="w-full flex items-center justify-between text-xs hover:bg-white/5 p-1.5 rounded transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-white">{s.symbol}</span>
                          <span className="text-muted-foreground ml-2 hidden sm:inline">{s.name.slice(0, 20)}</span>
                        </div>
                        <span className="text-red-400 font-mono">{s.changePercent.toFixed(2)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="glass-panel p-4">
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Sector Overview
                  </h3>
                  <div className="space-y-1.5">
                    {sectors.slice(0, 8).map(s => (
                      <button
                        key={s.sector}
                        onClick={() => { setSectorFilter(s.sector); setSelectedStock(null); }}
                        className="w-full flex items-center justify-between text-xs hover:bg-white/5 p-1 rounded transition-colors"
                      >
                        <span className="text-muted-foreground">{s.sector}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono">{s.count}</span>
                          <span className={`font-mono ${s.avgChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {s.avgChange >= 0 ? "+" : ""}{s.avgChange.toFixed(2)}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedStock ? (
              <div className="mb-8">
                <button
                  onClick={() => setSelectedStock(null)}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 mb-4 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Stock Explorer
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass-panel p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold font-mono">{selectedStock.symbol}</h2>
                        <p className="text-muted-foreground">{selectedStock.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                          {selectedStock.sector}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-mono font-bold stat-value">${selectedStock.price.toFixed(2)}</div>
                        <div className={`text-sm font-mono ${selectedStock.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {selectedStock.change >= 0 ? "+" : ""}{selectedStock.change.toFixed(2)} ({selectedStock.changePercent >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-3 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">Market Cap</div>
                        <div className="font-mono font-bold">{formatMarketCap(selectedStock.marketCap)}</div>
                      </div>
                      <div className="p-3 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">Volume</div>
                        <div className="font-mono font-bold">{formatVolume(selectedStock.volume)}</div>
                      </div>
                      <div className="p-3 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">P/E Ratio</div>
                        <div className="font-mono font-bold">{selectedStock.pe !== null ? selectedStock.pe.toFixed(1) : "N/A"}</div>
                      </div>
                      <div className="p-3 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">Cap Tier</div>
                        <div className="font-mono font-bold capitalize">{selectedStock.capTier}</div>
                      </div>
                      <div className="p-3 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">52W High</div>
                        <div className="font-mono font-bold text-green-400">${selectedStock.week52High.toFixed(2)}</div>
                      </div>
                      <div className="p-3 rounded bg-white/5">
                        <div className="text-xs text-muted-foreground">52W Low</div>
                        <div className="font-mono font-bold text-red-400">${selectedStock.week52Low.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded bg-white/5">
                      <div className="text-xs text-muted-foreground mb-2">52-Week Range</div>
                      <div className="relative h-2 rounded-full bg-white/10">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((selectedStock.price - selectedStock.week52Low) / (selectedStock.week52High - selectedStock.week52Low)) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs font-mono text-muted-foreground">
                        <span>${selectedStock.week52Low.toFixed(2)}</span>
                        <span>${selectedStock.week52High.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <StockAnalysisPanel symbol={selectedStock.symbol} name={selectedStock.name} />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by symbol or company name..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 font-mono"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
                        <X className="w-4 h-4 text-muted-foreground hover:text-white" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-white/10 gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {(sectorFilter || capFilter) && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <div className="flex flex-wrap gap-2 mb-4 p-3 rounded bg-white/5 border border-white/10">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setSectorFilter("")}
                        className={`text-xs px-2 py-1 rounded transition-colors ${!sectorFilter ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                      >
                        All Sectors
                      </button>
                      {SECTORS.map(s => (
                        <button
                          key={s}
                          onClick={() => setSectorFilter(s)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${sectorFilter === s ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="w-full border-t border-white/5 my-1" />
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setCapFilter("")}
                        className={`text-xs px-2 py-1 rounded transition-colors ${!capFilter ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                      >
                        All Caps
                      </button>
                      {CAP_TIERS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setCapFilter(t.value)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${capFilter === t.value ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {(sectorFilter || capFilter) && (
                      <button
                        onClick={() => { setSectorFilter(""); setCapFilter(""); }}
                        className="text-xs text-primary hover:text-primary/80 ml-auto"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}

                <div className="glass-panel overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-3"><SortHeader field="symbol" label="Symbol" /></th>
                          <th className="text-left p-3 hidden md:table-cell"><SortHeader field="name" label="Company" /></th>
                          <th className="text-right p-3"><SortHeader field="price" label="Price" className="justify-end" /></th>
                          <th className="text-right p-3"><SortHeader field="changePercent" label="Change" className="justify-end" /></th>
                          <th className="text-right p-3 hidden lg:table-cell"><SortHeader field="volume" label="Volume" className="justify-end" /></th>
                          <th className="text-right p-3 hidden lg:table-cell"><SortHeader field="marketCap" label="Market Cap" className="justify-end" /></th>
                          <th className="text-center p-3 hidden md:table-cell">Sector</th>
                          <th className="text-center p-3">
                            <span className="text-xs font-medium text-muted-foreground">AI</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {error ? (
                          <tr>
                            <td className="p-8 text-center" colSpan={8}>
                              <p className="text-red-400 mb-2">{error}</p>
                              <Button variant="outline" size="sm" onClick={loadStocks} className="border-primary/30 text-primary">
                                Retry
                              </Button>
                            </td>
                          </tr>
                        ) : loading ? (
                          Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="p-3" colSpan={8}>
                                <div className="h-4 bg-white/5 rounded animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : stocks.length === 0 ? (
                          <tr>
                            <td className="p-8 text-center text-muted-foreground" colSpan={8}>
                              No stocks found matching your search.
                            </td>
                          </tr>
                        ) : (
                          stocks.map(stock => (
                            <tr
                              key={stock.symbol}
                              className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                              onClick={() => setSelectedStock(stock)}
                            >
                              <td className="p-3">
                                <span className="font-mono font-bold text-white">{stock.symbol}</span>
                              </td>
                              <td className="p-3 hidden md:table-cell">
                                <span className="text-muted-foreground text-xs">{stock.name.slice(0, 30)}</span>
                              </td>
                              <td className="p-3 text-right font-mono">${stock.price.toFixed(2)}</td>
                              <td className={`p-3 text-right font-mono ${stock.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                              </td>
                              <td className="p-3 text-right font-mono text-muted-foreground hidden lg:table-cell">
                                {formatVolume(stock.volume)}
                              </td>
                              <td className="p-3 text-right font-mono text-muted-foreground hidden lg:table-cell">
                                {formatMarketCap(stock.marketCap)}
                              </td>
                              <td className="p-3 text-center hidden md:table-cell">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
                                  {stock.sector.split(" ")[0]}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedStock(stock); }}
                                  className="p-1.5 rounded hover:bg-primary/10 transition-colors group"
                                  aria-label={`Analyze ${stock.symbol}`}
                                >
                                  <Brain className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between p-3 border-t border-white/10">
                    <span className="text-xs text-muted-foreground">
                      Showing {((page - 1) * 50) + 1}-{Math.min(page * 50, totalCount)} of {totalCount.toLocaleString()} stocks
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="border-white/10 h-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="border-white/10 h-8"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
