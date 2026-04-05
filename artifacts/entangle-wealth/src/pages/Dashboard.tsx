import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { stockAlerts, optionsAlerts, portfolioChartData, optionsIncomeData, agentLogMessages } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, Zap, Minus, TrendingUp, Shield, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";

export default function Dashboard() {
  const [visibleLogs, setVisibleLogs] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLogs(prev => Math.min(prev + 1, agentLogMessages.length));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

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

  const portfolioChange = ((portfolioChartData[portfolioChartData.length - 1].value - portfolioChartData[0].value) / portfolioChartData[0].value * 100).toFixed(1);
  const todayOptionsIncome = optionsIncomeData[optionsIncomeData.length - 1].income;

  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Good evening 👋</h1>
            <p className="text-muted-foreground mt-1">Your analysis is running. Demo data shown below.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-mono text-primary">6 MODELS ACTIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-5 flex flex-col items-center text-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio</span>
              <span className="text-2xl font-bold font-mono text-primary">+{portfolioChange}%</span>
              <span className="text-xs text-muted-foreground">Today's demo performance</span>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-5 flex flex-col items-center text-center gap-2">
              <Zap className="w-6 h-6 text-secondary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Options Income</span>
              <span className="text-2xl font-bold font-mono text-secondary">${todayOptionsIncome}</span>
              <span className="text-xs text-muted-foreground">Theta income today</span>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-5 flex flex-col items-center text-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Risk Level</span>
              <span className="text-2xl font-bold font-mono text-green-400">8.4%</span>
              <span className="text-xs text-muted-foreground">Total portfolio exposure</span>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Portfolio Value</h3>
                <span className="text-sm font-mono text-primary">+{portfolioChange}% today</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={portfolioChartData}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} domain={['dataMin - 200', 'dataMax + 200']} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']} />
                  <Area type="monotone" dataKey="value" stroke="#00D4FF" strokeWidth={2} fill="url(#portfolioGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Options Income</h3>
                <span className="text-sm font-mono text-secondary">${optionsIncomeData.reduce((a, b) => a + b.income, 0).toLocaleString()} this week</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={optionsIncomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }} formatter={(value: number) => [`$${value}`, 'Income']} />
                  <Bar dataKey="income" fill="#FFD700" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Activity className="w-5 h-5 text-secondary" />
              <h2 className="text-xl font-semibold">Stock Signals</h2>
            </div>
            
            <div className="grid gap-4">
              {stockAlerts.map((alert) => (
                <Card key={`stock-${alert.id}`} className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold tracking-tight">{alert.symbol}</span>
                          <span className="text-muted-foreground font-mono text-sm">${alert.price.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end gap-2 w-32">
                          <div className="flex justify-between w-full text-xs font-mono">
                            <span className="text-muted-foreground">Confidence</span>
                            <span>{alert.confidence}%</span>
                          </div>
                          <Progress value={alert.confidence} className={`h-1.5 ${alert.type === 'BUY' ? 'bg-primary/20 [&>div]:bg-primary' : alert.type === 'SELL' ? 'bg-destructive/20 [&>div]:bg-destructive' : 'bg-secondary/20 [&>div]:bg-secondary'}`} />
                        </div>
                        
                        <Badge variant="outline" className={`px-3 py-1.5 flex items-center gap-1 font-bold ${getSignalColor(alert.type)}`}>
                          {getSignalIcon(alert.type)}
                          {alert.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-white/[0.02] rounded px-3 py-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 font-mono text-[10px] uppercase">{alert.source}</span>
                        <span className="text-white/20">|</span>
                        <span className="text-white/50">{alert.pattern}</span>
                      </div>
                      <p>{alert.note}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Options Flow</h2>
            </div>
            
            <div className="grid gap-4">
              {optionsAlerts.map((alert) => (
                <Card key={`option-${alert.id}`} className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/20 transition-colors">
                  <CardContent className="p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold tracking-tight">{alert.symbol}</span>
                        <Badge variant="outline" className={`px-2 py-0.5 flex items-center gap-1 ${getSignalColor(alert.type)}`}>
                          {getSignalIcon(alert.type)}
                          {alert.type}
                        </Badge>
                      </div>
                      <span className="font-mono text-lg font-bold text-white/90">{alert.premium}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 bg-white/5 rounded-lg p-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Strike</span>
                        <span className="font-mono font-medium">${alert.strike}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Expiry</span>
                        <span className="font-mono font-medium">{new Date(alert.exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        {alert.volSpike && (
                          <div className="flex items-center gap-1 text-secondary bg-secondary/10 px-2 py-1 rounded text-xs font-bold uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Vol Spike
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{alert.flowType}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <Card className="bg-black/40 border-white/10 mb-8">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">Live Analysis Feed</h3>
              <span className="text-xs text-muted-foreground ml-auto font-mono">showing last {visibleLogs} events</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agentLogMessages.slice(0, visibleLogs).map((log, i) => (
                <div key={i} className="flex gap-3 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-primary/70 shrink-0 w-16">{log.time}</span>
                  <span className="text-muted-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-muted-foreground/60 text-center">This is a demo with sample data. Live signals require an active subscription. Past performance does not guarantee future results. Trading involves risk of loss.</p>
        </div>
      </div>
    </Layout>
  );
}
