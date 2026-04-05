import { Layout } from "@/components/layout/Layout";
import { MarketTicker } from "@/components/MarketTicker";
import { unusualOptionsActivity, agentHighlights } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Filter, Layers, Zap, Activity, Radio, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Options() {
  const [gammaFlipLevel, setGammaFlipLevel] = useState(515);
  const [dealerPosition, setDealerPosition] = useState("Long Gamma");
  const [ivEnvironment, setIvEnvironment] = useState("Elevated");

  useEffect(() => {
    const interval = setInterval(() => {
      setGammaFlipLevel(prev => prev + (Math.random() > 0.5 ? 0.5 : -0.5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <MarketTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">Unusual Options Activity</h1>
            <p className="text-muted-foreground mt-1">AGENTS 231-260 scanning all exchanges. Track massive premium sweeps and dark pool activity.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5" data-testid="button-filters">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5" data-testid="button-columns">
              <Layers className="w-4 h-4 mr-2" /> Columns
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase">AGENT 233 - GEX Level</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">${gammaFlipLevel.toFixed(1)}</div>
            <span className="text-xs text-muted-foreground">Dealer Gamma Flip Point</span>
          </div>
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-secondary" />
              <span className="text-xs font-mono text-muted-foreground uppercase">AGENT 232 - Delta</span>
            </div>
            <div className="text-2xl font-bold font-mono text-secondary">{dealerPosition}</div>
            <span className="text-xs text-muted-foreground">Dealer Positioning</span>
          </div>
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-red-400" />
              <span className="text-xs font-mono text-muted-foreground uppercase">AGENT 235 - IV</span>
            </div>
            <div className="text-2xl font-bold font-mono text-red-400">{ivEnvironment}</div>
            <span className="text-xs text-muted-foreground">Volatility Regime</span>
          </div>
          <div className="glass-panel rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-xs font-mono text-muted-foreground uppercase">AGENT 240 - Risk</span>
            </div>
            <div className="text-2xl font-bold font-mono text-green-400">2.0%</div>
            <span className="text-xs text-muted-foreground">Max Portfolio Risk Per Trade</span>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-bold">Active Options Agents (231-260)</span>
            <span className="text-xs font-mono text-muted-foreground ml-auto">30 agents entangled</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {agentHighlights.optionsAgents.map(agent => (
              <div key={agent.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 transition-colors">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${agent.status === 'alert' ? 'bg-secondary animate-ping' : 'bg-primary'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.status === 'alert' ? 'bg-secondary' : 'bg-primary'}`}></span>
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">{agent.id}</span>
                <span className="text-[11px] font-medium text-white truncate">{agent.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[1100px] flex flex-col gap-3">
            <div className="grid grid-cols-[80px_80px_1fr_80px_80px_80px_120px_1fr_100px] gap-4 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-white/10">
              <div>Time</div>
              <div>Ticker</div>
              <div>Contract</div>
              <div className="text-right">Delta</div>
              <div className="text-right">Gamma</div>
              <div className="text-right">Theta</div>
              <div className="text-center">IV Rank</div>
              <div className="text-center">Signal Strength</div>
              <div className="text-center">Strategy</div>
            </div>

            {unusualOptionsActivity.map((item) => (
              <Card key={`uoa-${item.id}`} className="bg-black/40 border-white/5 hover:border-white/20 transition-colors overflow-hidden rounded-lg" data-testid={`card-uoa-${item.symbol}-${item.id}`}>
                <CardContent className="p-0">
                  <div className="grid grid-cols-[80px_80px_1fr_80px_80px_80px_120px_1fr_100px] gap-4 px-4 py-4 items-center">
                    <div className="text-sm font-mono text-muted-foreground">
                      {item.time}
                    </div>
                    
                    <div className="font-bold text-lg">
                      {item.symbol}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-mono">${item.strike}</span>
                      <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${item.type === 'CALL' ? 'text-primary border-primary bg-primary/10' : 'text-destructive border-destructive bg-destructive/10'}`}>
                        {item.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(item.exp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric'})}</span>
                    </div>
                    
                    <div className="text-right font-mono text-sm">
                      {item.delta.toFixed(2)}
                    </div>
                    
                    <div className="text-right font-mono text-sm">
                      {item.gamma.toFixed(2)}
                    </div>
                    
                    <div className="text-right font-mono text-sm text-destructive">
                      {item.theta.toFixed(2)}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-sm w-8 text-right">{item.ivRank}%</span>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary" 
                          style={{ width: `${item.ivRank}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3">
                      <Progress 
                        value={item.strength} 
                        className={`h-2 flex-1 ${item.strength > 80 ? 'bg-primary/20 [&>div]:bg-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'bg-white/10 [&>div]:bg-white/50'}`} 
                      />
                      <span className="font-mono text-sm font-bold w-10 text-right">{item.strength}</span>
                      {item.strength > 90 && (
                        <Zap className="w-4 h-4 text-primary animate-pulse" />
                      )}
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">{item.strategy}</span>
                    </div>
                  </div>
                  <div className="px-4 pb-3 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                    <span className="font-mono">{item.agentSource}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
