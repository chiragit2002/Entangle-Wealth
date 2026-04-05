import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { unusualOptionsActivity } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Filter, Layers, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Options() {
  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Options Signals</h1>
            <p className="text-muted-foreground mt-1">Unusual options activity with full Greeks breakdown. Demo data shown.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <Layers className="w-4 h-4 mr-2" /> Columns
            </Button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[1000px] flex flex-col gap-3">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-white/10">
              <div className="col-span-1">Time</div>
              <div className="col-span-1">Ticker</div>
              <div className="col-span-2">Contract</div>
              <div className="col-span-1 text-right">Delta</div>
              <div className="col-span-1 text-right">Gamma</div>
              <div className="col-span-1 text-right">Theta</div>
              <div className="col-span-1 text-center">IV Rank</div>
              <div className="col-span-2 text-center">Signal Strength</div>
              <div className="col-span-2 text-center">Strategy</div>
            </div>

            {unusualOptionsActivity.map((item) => (
              <Card key={`uoa-${item.id}`} className="bg-black/40 border-white/5 hover:border-white/20 transition-colors overflow-hidden rounded-lg">
                <CardContent className="p-0">
                  <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                    <div className="col-span-1 text-sm font-mono text-muted-foreground">
                      {item.time}
                    </div>
                    
                    <div className="col-span-1 font-bold text-lg">
                      {item.symbol}
                    </div>
                    
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="font-mono">${item.strike}</span>
                      <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${item.type === 'CALL' ? 'text-primary border-primary bg-primary/10' : 'text-destructive border-destructive bg-destructive/10'}`}>
                        {item.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(item.exp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric'})}</span>
                    </div>
                    
                    <div className="col-span-1 text-right font-mono text-sm">
                      {item.delta.toFixed(2)}
                    </div>
                    
                    <div className="col-span-1 text-right font-mono text-sm">
                      {item.gamma.toFixed(2)}
                    </div>
                    
                    <div className="col-span-1 text-right font-mono text-sm text-destructive">
                      {item.theta.toFixed(2)}
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-center gap-2">
                      <span className="font-mono text-sm w-8 text-right">{item.ivRank}%</span>
                      <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary" 
                          style={{ width: `${item.ivRank}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="col-span-2 flex items-center justify-center gap-3">
                      <Progress 
                        value={item.strength} 
                        className={`h-2 flex-1 ${item.strength > 80 ? 'bg-primary/20 [&>div]:bg-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'bg-white/10 [&>div]:bg-white/50'}`} 
                      />
                      <span className="font-mono text-sm font-bold w-10 text-right">{item.strength}</span>
                      {item.strength > 90 && (
                        <Zap className="w-4 h-4 text-primary animate-pulse" />
                      )}
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">{item.strategy}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-xs text-muted-foreground/60 text-center">Options trading carries substantial risk. The data shown above is for demonstration purposes. Signal strength is a composite score based on volume, premium size, and IV rank — it is not a recommendation to trade.</p>
        </div>
      </div>
    </Layout>
  );
}
