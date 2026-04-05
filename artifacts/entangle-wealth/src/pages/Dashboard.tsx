import { Layout } from "@/components/layout/Layout";
import { MarketTicker } from "@/components/MarketTicker";
import { stockAlerts, optionsAlerts, agentHighlights, agentSwarmData } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, Zap, Minus, Radio, Brain, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const { toast } = useToast();
  const [councilCount, setCouncilCount] = useState(0);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      toast({
        title: "AGENT 236 -- Institutional Sweep Detected",
        description: "$NVDA 950C Exp 05/17 - $4.2M Premium | Conviction: 98%",
        className: "bg-black border-primary text-white",
        duration: 5000,
      });
    }, 3000);

    const timer2 = setTimeout(() => {
      toast({
        title: "AGENT 233 -- Gamma Exposure Alert",
        description: "Dealer gamma flip detected at SPY $515. Expect volatility expansion.",
        className: "bg-black border-secondary text-white",
        duration: 5000,
      });
    }, 8000);

    const councilInterval = setInterval(() => {
      setCouncilCount(prev => prev + 1);
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearInterval(councilInterval);
    };
  }, [toast]);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">Quantum Command Center</h1>
            <p className="text-muted-foreground mt-1">300 agents entangled. Real-time market intelligence.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAgentPanel(!showAgentPanel)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
              data-testid="button-toggle-agents"
            >
              <Network className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs">SWARM STATUS</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <span className="text-sm font-mono text-primary">SYSTEM ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6 px-4 py-3 bg-white/[0.02] rounded-lg border border-white/5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">FLASH COUNCILS: <span className="text-primary font-bold">{councilCount}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-secondary" />
            <span className="text-xs font-mono text-muted-foreground">CONSENSUS RATE: <span className="text-secondary font-bold">{agentSwarmData.consensusRate}%</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono text-muted-foreground">AGENTS ONLINE: <span className="text-green-400 font-bold">{agentSwarmData.activeAgents}/{agentSwarmData.totalAgents}</span></span>
          </div>
        </div>

        {showAgentPanel && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Stock Market Agents (201-230)</span>
              </div>
              <div className="space-y-2">
                {agentHighlights.stockAgents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-white/5 transition-colors">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className={`absolute inline-flex h-full w-full rounded-full ${agent.status === 'alert' ? 'bg-secondary animate-ping' : 'bg-primary'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.status === 'alert' ? 'bg-secondary' : 'bg-primary'}`}></span>
                    </span>
                    <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">{agent.id}</span>
                    <span className="text-xs font-medium text-white w-40 shrink-0 truncate">{agent.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{agent.signal}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
                <Zap className="w-4 h-4 text-secondary" />
                <span className="text-sm font-bold">Options Mastery Agents (231-260)</span>
              </div>
              <div className="space-y-2">
                {agentHighlights.optionsAgents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-white/5 transition-colors">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className={`absolute inline-flex h-full w-full rounded-full ${agent.status === 'alert' ? 'bg-secondary animate-ping' : 'bg-primary'} opacity-75`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.status === 'alert' ? 'bg-secondary' : 'bg-primary'}`}></span>
                    </span>
                    <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">{agent.id}</span>
                    <span className="text-xs font-medium text-white w-40 shrink-0 truncate">{agent.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{agent.signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Activity className="w-5 h-5 text-secondary" />
              <h2 className="text-xl font-semibold">Algorithmic Stock Signals</h2>
              <span className="text-xs font-mono text-muted-foreground ml-auto">AGENTS 201-230</span>
            </div>
            
            <div className="grid gap-4">
              {stockAlerts.map((alert) => (
                <Card key={`stock-${alert.id}`} className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/20 transition-colors" data-testid={`card-stock-${alert.symbol}`}>
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
                    <div className="flex items-center gap-3 text-xs text-muted-foreground bg-white/[0.02] rounded px-3 py-2">
                      <span className="font-mono text-primary/80">{alert.agentSource}</span>
                      <span className="text-white/30">|</span>
                      <span>{alert.pattern}</span>
                      <span className="text-white/30">|</span>
                      <span>{alert.structure}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Live Options Flow</h2>
              <span className="text-xs font-mono text-muted-foreground ml-auto">AGENTS 231-260</span>
            </div>
            
            <div className="grid gap-4">
              {optionsAlerts.map((alert) => (
                <Card key={`option-${alert.id}`} className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-white/20 transition-colors" data-testid={`card-option-${alert.symbol}`}>
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

                    <div className="flex items-center gap-3 text-xs text-muted-foreground bg-white/[0.02] rounded px-3 py-2">
                      <span className="font-mono text-primary/80">{alert.agentSource}</span>
                      <span className="text-white/30">|</span>
                      <span>{alert.flowType}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
