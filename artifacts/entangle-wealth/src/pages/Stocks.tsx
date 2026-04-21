import { useState, useEffect } from "react";
import { useListStocks, useGetTopMovers, useGetSectors } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StockAnalysisPanel } from "@/components/StockAnalysisPanel";
import { MicroFeedback } from "@/components/MicroFeedback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Stock, SectorSummary, ListStocksSortBy, ListStocksSortDir } from "@workspace/api-client-react";
import { formatMarketCap, formatVolume } from "@/lib/api";
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
import { PaperTradingWidget } from "@/components/PaperTradingWidget";

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

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sectorFilter, setSectorFilter] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [sortBy, setSortBy] = useState("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sectorFilter, capFilter]);

  const stocksQuery = useListStocks(
    {
      q: debouncedQuery || undefined,
      sector: sectorFilter || undefined,
      capTier: capFilter || undefined,
      page,
      limit: 50,
      sortBy: sortBy as ListStocksSortBy,
      sortDir: sortDir as ListStocksSortDir,
    },
    { query: { staleTime: 60_000, placeholderData: (prev: unknown) => prev } },
  );

  const moversQuery = useGetTopMovers({ query: { staleTime: 2 * 60_000 } });

  const sectorsQuery = useGetSectors({ query: { staleTime: 5 * 60_000 } });

  const stocks = stocksQuery.data?.stocks ?? [];
  const totalCount = stocksQuery.data?.pagination.total ?? 0;
  const totalPages = stocksQuery.data?.pagination.totalPages ?? 1;
  const loading = stocksQuery.isLoading || stocksQuery.isFetching;
  const error = stocksQuery.isError ? "Failed to load stocks. Please try again." : null;
  const moversGainers = moversQuery.data?.gainers.slice(0, 5) ?? [];
  const moversLosers = moversQuery.data?.losers.slice(0, 5) ?? [];
  const sectors = sectorsQuery.data?.sectors ?? [];

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
      className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {label}
      {sortBy === field && <ArrowUpDown className="w-3 h-3 text-primary" />}
    </button>
  );
  const sortAttr = (field: string): React.AriaAttributes["aria-sort"] =>
    sortBy === field ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-1">Stock Explorer</h1>
                <p className="text-muted-foreground text-sm">
                  Search {totalCount > 0 ? totalCount.toLocaleString() : "5,000"} stocks — click any to run an analysis.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20 text-amber-400/70">
                <Globe className="w-3 h-3" />
                <span className="font-mono text-[11px]">DELAYED · Reference catalog prices — not live market data</span>
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
                        className="w-full flex items-center justify-between text-xs hover:bg-muted/50 p-1.5 rounded transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-foreground">{s.symbol}</span>
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
                        className="w-full flex items-center justify-between text-xs hover:bg-muted/50 p-1.5 rounded transition-colors"
                      >
                        <div>
                          <span className="font-mono font-bold text-foreground">{s.symbol}</span>
                          <span className="text-muted-foreground ml-2 hidden sm:inline">{s.name.slice(0, 20)}</span>
                        </div>
                        <span className="text-red-400 font-mono">{Math.abs(s.changePercent).toFixed(2)}%</span>
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
                        className="w-full flex items-center justify-between text-xs hover:bg-muted/50 p-1 rounded transition-colors"
                      >
                        <span className="text-muted-foreground">{s.sector}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono">{s.count}</span>
                          <span className={`font-mono ${s.avgChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {s.avgChange >= 0 ? "+" : ""}{Math.abs(s.avgChange).toFixed(2)}%
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
                        <span className="text-xs px-2 py-0.5 rounded bg-muted/50 border border-border text-muted-foreground">
                          {selectedStock.sector}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-mono font-bold stat-value">${selectedStock.price.toFixed(2)}</div>
                        <div className={`text-sm font-mono ${selectedStock.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {selectedStock.change >= 0 ? "+" : ""}{Math.abs(selectedStock.change).toFixed(2)} ({selectedStock.changePercent >= 0 ? "+" : ""}{Math.abs(selectedStock.changePercent).toFixed(2)}%)
                        </div>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400/70">
                          DELAYED
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-3 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Market Cap</div>
                        <div className="font-mono font-bold">{formatMarketCap(selectedStock.marketCap)}</div>
                      </div>
                      <div className="p-3 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Volume</div>
                        <div className="font-mono font-bold">{formatVolume(selectedStock.volume)}</div>
                      </div>
                      <div className="p-3 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">P/E Ratio</div>
                        <div className="font-mono font-bold">{selectedStock.pe !== null ? selectedStock.pe.toFixed(1) : "N/A"}</div>
                      </div>
                      <div className="p-3 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">Cap Tier</div>
                        <div className="font-mono font-bold capitalize">{selectedStock.capTier}</div>
                      </div>
                      <div className="p-3 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">52W High</div>
                        <div className="font-mono font-bold text-green-400">${selectedStock.week52High.toFixed(2)}</div>
                      </div>
                      <div className="p-3 rounded bg-muted/50">
                        <div className="text-xs text-muted-foreground">52W Low</div>
                        <div className="font-mono font-bold text-red-400">${selectedStock.week52Low.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground mb-2">52-Week Range</div>
                      <div className="relative h-2 rounded-full bg-muted">
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
                      className="pl-10 bg-muted/50 border-border font-mono"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="border-border gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {(sectorFilter || capFilter) && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <div className="flex flex-wrap gap-2 mb-4 p-3 rounded bg-muted/50 border border-border">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setSectorFilter("")}
                        className={`text-xs px-2 py-1 rounded transition-colors ${!sectorFilter ? "bg-primary text-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                      >
                        All Sectors
                      </button>
                      {SECTORS.map(s => (
                        <button
                          key={s}
                          onClick={() => setSectorFilter(s)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${sectorFilter === s ? "bg-primary text-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="w-full border-t border-white/5 my-1" />
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setCapFilter("")}
                        className={`text-xs px-2 py-1 rounded transition-colors ${!capFilter ? "bg-primary text-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                      >
                        All Caps
                      </button>
                      {CAP_TIERS.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setCapFilter(t.value)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${capFilter === t.value ? "bg-primary text-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
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
                        <tr className="border-b border-border">
                          <th aria-sort={sortAttr("symbol")} className="text-left p-3"><SortHeader field="symbol" label="Symbol" /></th>
                          <th aria-sort={sortAttr("name")} className="text-left p-3 hidden md:table-cell"><SortHeader field="name" label="Company" /></th>
                          <th aria-sort={sortAttr("price")} className="text-right p-3"><SortHeader field="price" label="Price" className="justify-end" /></th>
                          <th aria-sort={sortAttr("changePercent")} className="text-right p-3"><SortHeader field="changePercent" label="Change" className="justify-end" /></th>
                          <th aria-sort={sortAttr("volume")} className="text-right p-3 hidden lg:table-cell"><SortHeader field="volume" label="Volume" className="justify-end" /></th>
                          <th aria-sort={sortAttr("marketCap")} className="text-right p-3 hidden lg:table-cell"><SortHeader field="marketCap" label="Market Cap" className="justify-end" /></th>
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
                              <Button variant="outline" size="sm" onClick={() => stocksQuery.refetch()} className="border-primary/30 text-primary">
                                Retry
                              </Button>
                            </td>
                          </tr>
                        ) : loading ? (
                          Array.from({ length: 10 }).map((_, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="p-3" colSpan={8}>
                                <div className="h-4 bg-muted/50 rounded animate-pulse" />
                              </td>
                            </tr>
                          ))
                        ) : stocks.length === 0 ? (
                          <tr>
                            <td className="p-10 text-center" colSpan={8}>
                              <div className="flex flex-col items-center gap-3">
                                <Search className="w-8 h-8 text-muted-foreground/20" />
                                <p className="text-sm font-medium text-muted-foreground">No stocks found</p>
                                <p className="text-xs text-muted-foreground">
                                  {query || sectorFilter || capFilter
                                    ? "Try adjusting your search or filters."
                                    : "No stocks available right now."}
                                </p>
                                {(query || sectorFilter || capFilter) && (
                                  <button
                                    onClick={() => { setQuery(""); setSectorFilter(""); setCapFilter(""); }}
                                    className="text-xs text-primary hover:text-primary/80 transition-colors underline"
                                  >
                                    Clear all filters
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          stocks.map(stock => (
                            <tr
                              key={stock.symbol}
                              className="border-b border-white/5 hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => setSelectedStock(stock)}
                            >
                              <td className="p-3">
                                <span className="font-mono font-bold text-foreground">{stock.symbol}</span>
                              </td>
                              <td className="p-3 hidden md:table-cell">
                                <span className="text-muted-foreground text-xs">{stock.name.slice(0, 30)}</span>
                              </td>
                              <td className="p-3 text-right font-mono">${stock.price.toFixed(2)}</td>
                              <td className={`p-3 text-right font-mono ${stock.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {stock.changePercent >= 0 ? "+" : ""}{Math.abs(stock.changePercent).toFixed(2)}%
                              </td>
                              <td className="p-3 text-right font-mono text-muted-foreground hidden lg:table-cell">
                                {formatVolume(stock.volume)}
                              </td>
                              <td className="p-3 text-right font-mono text-muted-foreground hidden lg:table-cell">
                                {formatMarketCap(stock.marketCap)}
                              </td>
                              <td className="p-3 text-center hidden md:table-cell">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
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

                  <div className="flex items-center justify-between p-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Showing {((page - 1) * 50) + 1}-{Math.min(page * 50, totalCount)} of {totalCount.toLocaleString()} stocks
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="border-border h-8"
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
                        className="border-border h-8"
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
      <div className="fixed bottom-20 left-4 z-40">
        {selectedStock && (
          <MicroFeedback context="stock_analysis" label="Was this analysis helpful?" className="bg-card border border-border rounded-xl p-3 shadow-xl" />
        )}
      </div>
      <PaperTradingWidget variant="floating" initialSymbol={selectedStock?.symbol || ""} />
    </div>
  );
}
