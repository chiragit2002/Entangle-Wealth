import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { QuantumViz } from "@/components/QuantumViz";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { SectorHeatmap } from "@/components/SectorHeatmap";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { SignalHistory } from "@/components/SignalHistory";
import { RiskRadar } from "@/components/RiskRadar";
import { stockAlerts, optionsAlerts, portfolioChartData, optionsIncomeData, agentLogMessages } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, Zap, Minus, TrendingUp, Shield, Eye, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, RefreshCw, Search } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";

const timeRanges = ["1D", "1W", "1M", "3M"] as const;

const chartDataByRange = {
  "1D": portfolioChartData,
  "1W": [
    { time: "Mon", value: 14100 }, { time: "Tue", value: 14350 }, { time: "Wed", value: 14200 },
    { time: "Thu", value: 14680 }, { time: "Fri", value: 15100 }, { time: "Sat", value: 15300 }, { time: "Sun", value: 15620 },
  ],
  "1M": [
    { time: "Wk1", value: 12500 }, { time: "Wk2", value: 13100 }, { time: "Wk3", value: 12900 },
    { time: "Wk4", value: 14200 }, { time: "Now", value: 15620 },
  ],
  "3M": [
    { time: "Jan", value: 10200 }, { time: "Feb", value: 11400 }, { time: "Mar", value: 12800 },
    { time: "Apr", value: 13500 }, { time: "May", value: 14100 }, { time: "Jun", value: 15620 },
  ],
};

export default function Dashboard() {
  const { toast } = useToast();
  const [visibleLogs, setVisibleLogs] = useState(5);
  const [chartRange, setChartRange] = useState<typeof timeRanges[number]>("1D");
  const [expandedStock, setExpandedStock] = useState<number | null>(null);
  const [savedStocks, setSavedStocks] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLogs(prev => Math.min(prev + 1, agentLogMessages.length));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsRefreshing(false);
    toast({ title: "Data refreshed", description: "All signals have been updated with latest analysis." });
  };

  const toggleSaveStock = (id: number, symbol: string) => {
    const isSaved = savedStocks.includes(id);
    setSavedStocks(prev => isSaved ? prev.filter(x => x !== id) : [...prev, id]);
    toast({
      title: isSaved ? "Removed from watchlist" : "Added to watchlist",
      description: `${symbol} ${isSaved ? "removed from" : "added to"} your watchlist.`,
    });
  };

  const filteredStocks = useMemo(() => {
    if (!searchQuery) return stockAlerts;
    return stockAlerts.filter(a => a.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return optionsAlerts;
    return optionsAlerts.filter(a => a.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const currentChartData = chartDataByRange[chartRange];
  const pctChange = ((currentChartData[currentChartData.length - 1].value - currentChartData[0].value) / currentChartData[0].value * 100).toFixed(1);
  const todayOptionsIncome = optionsIncomeData[optionsIncomeData.length - 1].income;

  const getSignalColor = (type: string) => {
    switch (type) {
      case "BUY": return "text-primary border-primary bg-primary/10";
      case "SELL": return "text-destructive border-destructive bg-destructive/10";
      case "HOLD": return "text-secondary border-secondary bg-secondary/10";
      case "CALL": return "text-primary border-primary bg-primary/10";
      case "PUT": return "text-destructive border-destructive bg-destructive/10";
      default: return "text-muted-foreground border-border";
    }
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "BUY":
      case "CALL": return <ArrowUpRight className="w-4 h-4" />;
      case "SELL":
      case "PUT": return <ArrowDownRight className="w-4 h-4" />;
      case "HOLD": return <Minus className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
            <p className="text-muted-foreground mt-1">Analysis running across 6 models. Demo data shown below.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tickers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white/5 border-white/10 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 hover:bg-white/5 gap-2"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-sm font-mono text-primary">6 MODELS ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <QuantumViz />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel rounded-xl p-5 flex flex-col items-center text-center gap-2 animate-pulse-glow">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Portfolio</span>
            <span className={`text-2xl font-bold font-mono stat-value ${Number(pctChange) >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {Number(pctChange) >= 0 ? '+' : ''}{pctChange}%
            </span>
            <span className="text-[10px] text-muted-foreground">{chartRange === "1D" ? "Today" : chartRange} demo performance</span>
          </div>
          <div className="glass-panel rounded-xl p-5 flex flex-col items-center text-center gap-2 animate-pulse-glow-gold">
            <Zap className="w-5 h-5 text-secondary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Options Income</span>
            <span className="text-2xl font-bold font-mono text-secondary stat-value">${todayOptionsIncome}</span>
            <span className="text-[10px] text-muted-foreground">Theta income today</span>
          </div>
          <div className="glass-panel rounded-xl p-5 flex flex-col items-center text-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Level</span>
            <span className="text-2xl font-bold font-mono text-green-400 stat-value">8.4%</span>
            <span className="text-[10px] text-muted-foreground">Total portfolio exposure</span>
          </div>
          <div className="glass-panel rounded-xl p-5 flex flex-col items-center text-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</span>
            <span className="text-2xl font-bold font-mono text-purple-400 stat-value">80%</span>
            <span className="text-[10px] text-muted-foreground">Last 10 signals (demo)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Portfolio Value</h3>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-mono ${Number(pctChange) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {Number(pctChange) >= 0 ? '+' : ''}{pctChange}%
                </span>
                <div className="flex bg-white/5 rounded-md overflow-hidden">
                  {timeRanges.map(r => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-2.5 py-1 text-[10px] font-mono font-semibold transition-colors ${chartRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={currentChartData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="time" tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={['dataMin - 200', 'dataMax + 200']} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 11, fontFamily: 'JetBrains Mono' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']} />
                <Area type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={2} fill="url(#portfolioGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Options Income</h3>
              <span className="text-sm font-mono text-secondary">${optionsIncomeData.reduce((a, b) => a + b.income, 0).toLocaleString()} this week</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={optionsIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 8, color: '#fff', fontSize: 11, fontFamily: 'JetBrains Mono' }} formatter={(value: number) => [`$${value}`, 'Income']} />
                <Bar dataKey="income" fill="#FFD700" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <FearGreedGauge />
          <SectorHeatmap />
          <RiskRadar />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Activity className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold">Stock Signals</h2>
              <span className="text-xs text-muted-foreground ml-auto">{filteredStocks.length} signals</span>
            </div>
            
            {filteredStocks.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No stock signals match "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredStocks.map((alert) => {
                  const isExpanded = expandedStock === alert.id;
                  const isSaved = savedStocks.includes(alert.id);
                  return (
                    <div key={`stock-${alert.id}`}>
                      <div
                        className={`glass-panel rounded-xl hover:border-white/20 transition-all cursor-pointer ${isExpanded ? 'border-primary/30' : ''}`}
                        onClick={() => setExpandedStock(isExpanded ? null : alert.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <button className="text-muted-foreground">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <div className="flex flex-col">
                                <span className="text-xl font-bold tracking-tight">{alert.symbol}</span>
                                <span className="text-muted-foreground font-mono text-xs">${alert.price.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleSaveStock(alert.id, alert.symbol); }}
                                className={`p-1.5 rounded-md transition-colors ${isSaved ? 'text-secondary' : 'text-white/20 hover:text-white/40'}`}
                              >
                                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </button>
                              <div className="flex flex-col items-end gap-1.5 w-24">
                                <div className="flex justify-between w-full text-[10px] font-mono">
                                  <span className="text-muted-foreground">Conf</span>
                                  <span>{alert.confidence}%</span>
                                </div>
                                <Progress value={alert.confidence} className={`h-1 ${alert.type === 'BUY' ? 'bg-primary/20 [&>div]:bg-primary' : alert.type === 'SELL' ? 'bg-destructive/20 [&>div]:bg-destructive' : 'bg-secondary/20 [&>div]:bg-secondary'}`} />
                              </div>
                              <Badge variant="outline" className={`px-2.5 py-1 flex items-center gap-1 font-bold text-xs ${getSignalColor(alert.type)}`}>
                                {getSignalIcon(alert.type)}
                                {alert.type}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground bg-white/[0.02] rounded px-3 py-2 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 font-mono text-[9px] uppercase">{alert.source}</span>
                              <span className="text-white/10">|</span>
                              <span className="text-white/40">{alert.pattern}</span>
                            </div>
                            <p className="text-white/50">{alert.note}</p>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-white/[0.02] border border-white/5 border-t-0 rounded-b-xl px-4 py-3 animate-in slide-in-from-top-2 duration-200">
                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="glass-panel rounded-lg p-2.5 text-center">
                              <p className="text-[9px] text-muted-foreground uppercase">Risk per Trade</p>
                              <p className="text-base font-mono font-bold text-green-400 stat-value">2.0%</p>
                            </div>
                            <div className="glass-panel rounded-lg p-2.5 text-center">
                              <p className="text-[9px] text-muted-foreground uppercase">R:R Ratio</p>
                              <p className="text-base font-mono font-bold text-primary stat-value">1:{alert.confidence > 80 ? '4' : alert.confidence > 60 ? '3' : '2'}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {alert.confidence >= 80
                              ? "High conviction signal. Multiple analysis methods strongly agree. Position sizing at full allocation within risk limits."
                              : alert.confidence >= 60
                              ? "Moderate conviction. Some analysis methods agree but not all. Consider reduced position size."
                              : "Low conviction. Limited agreement across methods. Best to wait for more confirmation before acting."}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mt-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Options Flow</h2>
              <span className="text-xs text-muted-foreground ml-auto">{filteredOptions.length} alerts</span>
            </div>
            
            {filteredOptions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No options flow matches "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredOptions.map((alert) => (
                  <div key={`option-${alert.id}`} className="glass-panel rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold tracking-tight">{alert.symbol}</span>
                        <Badge variant="outline" className={`px-2 py-0.5 flex items-center gap-1 text-xs ${getSignalColor(alert.type)}`}>
                          {getSignalIcon(alert.type)}
                          {alert.type}
                        </Badge>
                      </div>
                      <span className="font-mono text-base font-bold text-white/90">{alert.premium}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 bg-white/[0.02] rounded-lg p-2.5 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Strike</span>
                        <span className="font-mono font-medium text-sm">${alert.strike}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Expiry</span>
                        <span className="font-mono font-medium text-sm">{new Date(alert.exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        {alert.volSpike && (
                          <div className="flex items-center gap-1 text-secondary bg-secondary/10 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Vol Spike
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{alert.flowType}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <WatchlistPanel />

            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm">Live Analysis Feed</h3>
                <span className="text-[10px] text-muted-foreground ml-auto font-mono">{visibleLogs} events</span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {agentLogMessages.slice(0, visibleLogs).map((log, i) => (
                  <div key={i} className="flex gap-2 text-[10px] font-mono py-1 border-b border-white/[0.03] last:border-0 animate-in fade-in duration-500">
                    <span className="text-primary/50 shrink-0 w-14">{log.time}</span>
                    <span className="text-white/50">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SignalHistory />
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-[10px] text-muted-foreground/50 text-center">This is a demo with sample data. Live signals require an active subscription. Past performance does not guarantee future results. Trading involves risk of loss.</p>
        </div>
      </div>
    </Layout>
  );
}
