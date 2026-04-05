import { Layout } from "@/components/layout/Layout";
import { MarketTicker } from "@/components/MarketTicker";
import { stockAlerts, optionsAlerts } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, Zap, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
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
      <MarketTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Live market signals and options flow. Demo data shown below.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-mono text-primary">LIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        <div className="mt-8 p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-muted-foreground/60 text-center">This is a demo with sample data. Live signals require an active subscription. Past performance does not guarantee future results. Trading involves risk of loss.</p>
        </div>
      </div>
    </Layout>
  );
}
