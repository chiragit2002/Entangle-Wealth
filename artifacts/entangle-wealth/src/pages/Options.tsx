import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { OptionsChain } from "@/components/OptionsChain";
import { unusualOptionsActivity } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, X, ChevronDown, ChevronUp, ArrowUpDown, Bookmark, BookmarkCheck, BarChart3, Target, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";
import { StockTradePanel } from "@/components/StockTradePanel";

type SortField = "time" | "symbol" | "strike" | "delta" | "gamma" | "theta" | "ivRank" | "strength";
type SortDir = "asc" | "desc";

const allTickers = [...new Set(unusualOptionsActivity.map(i => i.symbol))];

export default function Options() {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<"ALL" | "CALL" | "PUT">("ALL");
  const [filterTickers, setFilterTickers] = useState<string[]>([]);
  const [filterMinStrength, setFilterMinStrength] = useState(0);
  const [filterMinIV, setFilterMinIV] = useState(0);
  const [sortField, setSortField] = useState<SortField>("strength");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [savedSignals, setSavedSignals] = useState<number[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTradeSymbol, setSelectedTradeSymbol] = useState("");

  const [visibleCols, setVisibleCols] = useState({
    time: true, symbol: true, contract: true, delta: true, gamma: true, theta: true, ivRank: true, strength: true, strategy: true,
  });

  const activeFilterCount = (filterType !== "ALL" ? 1 : 0) + (filterTickers.length > 0 ? 1 : 0) + (filterMinStrength > 0 ? 1 : 0) + (filterMinIV > 0 ? 1 : 0);

  const toggleTicker = (t: string) => {
    setFilterTickers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const clearFilters = () => {
    setFilterType("ALL");
    setFilterTickers([]);
    setFilterMinStrength(0);
    setFilterMinIV(0);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const toggleSave = (id: number, symbol: string) => {
    const isSaved = savedSignals.includes(id);
    setSavedSignals(prev => isSaved ? prev.filter(x => x !== id) : [...prev, id]);
    toast({
      title: isSaved ? "Removed from watchlist" : "Added to watchlist",
      description: isSaved ? `${symbol} signal removed.` : `${symbol} signal saved to your watchlist.`,
    });
  };

  const toggleCol = (col: keyof typeof visibleCols) => {
    setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const filtered = useMemo(() => {
    let data = [...unusualOptionsActivity];
    if (filterType !== "ALL") data = data.filter(i => i.type === filterType);
    if (filterTickers.length > 0) data = data.filter(i => filterTickers.includes(i.symbol));
    if (filterMinStrength > 0) data = data.filter(i => i.strength >= filterMinStrength);
    if (filterMinIV > 0) data = data.filter(i => i.ivRank >= filterMinIV);

    data.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return data;
  }, [filterType, filterTickers, filterMinStrength, filterMinIV, sortField, sortDir]);

  const SortHeader = ({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <button onClick={() => handleSort(field)} className={`flex items-center gap-1 hover:text-primary transition-colors group ${className}`}>
      {children}
      <ArrowUpDown className={`w-3 h-3 transition-colors ${sortField === field ? 'text-primary' : 'text-white/40 group-hover:text-white/40'}`} />
      {sortField === field && <span className="text-primary text-[9px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  const colCount = Object.values(visibleCols).filter(Boolean).length;

  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />
      <FinancialDisclaimerBanner pageKey="options" />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <OptionsChain />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Options Flow</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Unusual activity with full Greeks · {filtered.length} of {unusualOptionsActivity.length} signals
              <span className="text-white/30"> · simulated</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-white/10 hover:bg-white/5 relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-black/95 border-white/10 w-80">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center justify-between">
                    Filter Signals
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-white">
                        Clear all
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 mt-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Type</p>
                    <div className="flex gap-2">
                      {(["ALL", "CALL", "PUT"] as const).map(t => (
                        <Button
                          key={t}
                          variant={filterType === t ? "default" : "outline"}
                          size="sm"
                          className={filterType === t ? "bg-primary text-primary-foreground" : "border-white/10 hover:bg-white/5"}
                          onClick={() => setFilterType(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ticker</p>
                    <div className="flex flex-wrap gap-2">
                      {allTickers.map(t => (
                        <Button
                          key={t}
                          variant={filterTickers.includes(t) ? "default" : "outline"}
                          size="sm"
                          className={filterTickers.includes(t) ? "bg-primary text-primary-foreground" : "border-white/10 hover:bg-white/5"}
                          onClick={() => toggleTicker(t)}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Min Signal Strength: {filterMinStrength}</p>
                    <Slider value={[filterMinStrength]} onValueChange={([v]) => setFilterMinStrength(v)} max={100} step={5} className="w-full" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Min IV Rank: {filterMinIV}%</p>
                    <Slider value={[filterMinIV]} onValueChange={([v]) => setFilterMinIV(v)} max={100} step={5} className="w-full" />
                  </div>

                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2" onClick={() => setIsFilterOpen(false)}>
                    Apply Filters ({filtered.length} results)
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="border-white/10 hover:bg-white/5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                  Columns ({colCount})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="bg-black/95 border-white/10 w-48 p-3" align="end">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Toggle Columns</p>
                <div className="flex flex-col gap-2">
                  {(Object.keys(visibleCols) as (keyof typeof visibleCols)[]).map(col => (
                    <label key={col} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <Checkbox checked={visibleCols[col]} onCheckedChange={() => toggleCol(col)} />
                      <span className="capitalize">{col === "ivRank" ? "IV Rank" : col}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {filterType !== "ALL" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                {filterType} <button onClick={() => setFilterType("ALL")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filterTickers.map(t => (
              <Badge key={t} variant="outline" className="bg-white/5 text-white border-white/10 gap-1 text-xs">
                {t} <button onClick={() => toggleTicker(t)}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
            {filterMinStrength > 0 && (
              <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30 gap-1 text-xs">
                Strength ≥ {filterMinStrength} <button onClick={() => setFilterMinStrength(0)}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filterMinIV > 0 && (
              <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30 gap-1 text-xs">
                IV ≥ {filterMinIV}% <button onClick={() => setFilterMinIV(0)}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary ml-2 underline">Clear all</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold mb-1">No signals match your filters</p>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your filter criteria.</p>
            <Button variant="outline" className="border-white/10" onClick={clearFilters}>Clear All Filters</Button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[900px] flex flex-col gap-2">
              <div className="flex items-center gap-4 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-white/10">
                <div className="w-8" />
                {visibleCols.time && <div className="w-20"><SortHeader field="time">Time</SortHeader></div>}
                {visibleCols.symbol && <div className="w-20"><SortHeader field="symbol">Ticker</SortHeader></div>}
                {visibleCols.contract && <div className="w-36">Contract</div>}
                {visibleCols.delta && <div className="w-20 text-right"><SortHeader field="delta" className="justify-end">Delta</SortHeader></div>}
                {visibleCols.gamma && <div className="w-20 text-right"><SortHeader field="gamma" className="justify-end">Gamma</SortHeader></div>}
                {visibleCols.theta && <div className="w-20 text-right"><SortHeader field="theta" className="justify-end">Theta</SortHeader></div>}
                {visibleCols.ivRank && <div className="w-28 text-center"><SortHeader field="ivRank" className="justify-center">IV Rank</SortHeader></div>}
                {visibleCols.strength && <div className="flex-1 min-w-[160px] text-center"><SortHeader field="strength" className="justify-center">Signal Strength</SortHeader></div>}
                {visibleCols.strategy && <div className="w-36 text-center">Strategy</div>}
                <div className="w-10" />
              </div>

              {filtered.map((item) => {
                const isExpanded = expandedRow === item.id;
                const isSaved = savedSignals.includes(item.id);
                return (
                  <div key={`uoa-${item.id}`}>
                    <Card className={`border-white/5 hover:border-white/20 transition-all overflow-hidden rounded-lg cursor-pointer ${isExpanded ? 'bg-white/[0.04] border-primary/30' : 'bg-black/40'}`}
                      onClick={() => setExpandedRow(isExpanded ? null : item.id)}>
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 px-4 py-4">
                          <button className="w-8 flex items-center justify-center text-muted-foreground" onClick={() => setExpandedRow(isExpanded ? null : item.id)} aria-label={isExpanded ? "Collapse" : "Expand"}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {visibleCols.time && <div className="w-20 text-sm font-mono text-muted-foreground">{item.time}</div>}
                          {visibleCols.symbol && <div className="w-20 font-bold text-lg">{item.symbol}</div>}
                          {visibleCols.contract && (
                            <div className="w-36 flex items-center gap-2">
                              <span className="font-mono">${item.strike}</span>
                              <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${item.type === 'CALL' ? 'text-primary border-primary bg-primary/10' : 'text-destructive border-destructive bg-destructive/10'}`}>
                                {item.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{new Date(item.exp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric'})}</span>
                            </div>
                          )}
                          {visibleCols.delta && <div className="w-20 text-right font-mono text-sm">{Math.abs(item.delta).toFixed(2)}</div>}
                          {visibleCols.gamma && <div className="w-20 text-right font-mono text-sm">{Math.abs(item.gamma).toFixed(2)}</div>}
                          {visibleCols.theta && <div className="w-20 text-right font-mono text-sm text-destructive">{Math.abs(item.theta).toFixed(2)}</div>}
                          {visibleCols.ivRank && (
                            <div className="w-28 flex items-center justify-center gap-2">
                              <span className="font-mono text-sm w-8 text-right">{item.ivRank}%</span>
                              <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-secondary" style={{ width: `${item.ivRank}%` }} />
                              </div>
                            </div>
                          )}
                          {visibleCols.strength && (
                            <div className="flex-1 min-w-[160px] flex items-center justify-center gap-3">
                              <Progress
                                value={item.strength}
                                className={`h-2 flex-1 max-w-[120px] ${item.strength > 80 ? 'bg-primary/20 [&>div]:bg-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'bg-white/10 [&>div]:bg-white/50'}`}
                              />
                              <span className="font-mono text-sm font-bold w-10 text-right">{item.strength}</span>
                              {item.strength > 90 && <Zap className="w-4 h-4 text-primary animate-pulse" />}
                            </div>
                          )}
                          {visibleCols.strategy && (
                            <div className="w-36 text-center">
                              <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">{item.strategy}</span>
                            </div>
                          )}
                          <div className="w-10 flex items-center justify-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSave(item.id, item.symbol); }}
                              className={`p-1.5 rounded-md transition-colors ${isSaved ? 'text-secondary hover:text-secondary/80' : 'text-white/40 hover:text-white/50'}`}
                            >
                              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {isExpanded && (
                      <div className="bg-white/[0.02] border border-white/5 border-t-0 rounded-b-lg px-6 py-5 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract Details</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="text-muted-foreground">Symbol:</span> <span className="font-bold">{item.symbol}</span></div>
                              <div><span className="text-muted-foreground">Strike:</span> <span className="font-mono">${item.strike}</span></div>
                              <div><span className="text-muted-foreground">Type:</span> <span className={item.type === "CALL" ? "text-primary" : "text-destructive"}>{item.type}</span></div>
                              <div><span className="text-muted-foreground">Expiry:</span> <span className="font-mono">{item.exp}</span></div>
                              <div><span className="text-muted-foreground">Strategy:</span> <span>{item.strategy}</span></div>
                              <div><span className="text-muted-foreground">Detected:</span> <span>{item.time}</span></div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Greeks</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="glass-panel rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">Delta</p>
                                <p className="text-lg font-mono font-bold">{Math.abs(item.delta).toFixed(2)}</p>
                              </div>
                              <div className="glass-panel rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">Gamma</p>
                                <p className="text-lg font-mono font-bold">{Math.abs(item.gamma).toFixed(2)}</p>
                              </div>
                              <div className="glass-panel rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">Theta</p>
                                <p className="text-lg font-mono font-bold text-destructive">{Math.abs(item.theta).toFixed(2)}</p>
                              </div>
                              <div className="glass-panel rounded-lg p-3 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">IV Rank</p>
                                <p className="text-lg font-mono font-bold text-secondary">{item.ivRank}%</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signal Analysis</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Signal Strength</span>
                                <span className="font-mono font-bold text-lg">{item.strength}/100</span>
                              </div>
                              <Progress value={item.strength} className={`h-3 ${item.strength > 80 ? 'bg-primary/20 [&>div]:bg-primary' : 'bg-white/10 [&>div]:bg-white/50'}`} />
                              <div className="flex items-center gap-2 mt-2">
                                {item.strength >= 90 && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">High Conviction</Badge>}
                                {item.ivRank >= 70 && <Badge className="bg-secondary/20 text-secondary border-secondary/30 text-xs">Elevated IV</Badge>}
                                {item.type === "CALL" && item.delta > 0.4 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Deep ITM</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {item.strength >= 90
                                  ? "Multiple analysis methods confirm this signal. Strong institutional activity detected."
                                  : item.strength >= 70
                                  ? "Moderate agreement across analysis methods. Worth monitoring."
                                  : "Limited agreement. Exercise caution | fewer methods confirm this signal."}
                              </p>
                              <Button
                                size="sm"
                                className="w-full mt-3 bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTradeSymbol(prev => prev === item.symbol ? "" : item.symbol);
                                }}
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                {selectedTradeSymbol === item.symbol ? "Hide Trade Panel" : `Trade ${item.symbol}`}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedTradeSymbol && (
          <div className="mt-6">
            <StockTradePanel symbol={selectedTradeSymbol} />
          </div>
        )}

        <div className="mt-8 p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-muted-foreground/60 text-center">Options trading carries substantial risk. The data shown above is for demonstration purposes. Signal strength is a composite score based on volume, premium size, and IV rank | it is not a recommendation to trade.</p>
        </div>
      </div>
    </Layout>
  );
}
