import { BarChart3 } from "lucide-react";

export function SignalHistory() {
  return (
    <div className="glass-panel rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signal History</h4>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">0 signals</span>
      </div>
      <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
        <BarChart3 className="w-8 h-8 text-muted-foreground/20 mb-1" />
        <p className="text-xs font-medium text-muted-foreground/50">No signal history yet</p>
        <p className="text-[10px] text-muted-foreground/40 max-w-[180px] leading-relaxed">Use Quick Analysis on a stock to generate your first signal</p>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[9px] text-muted-foreground/50 text-center">Signals generated from real market data only. Past performance does not guarantee future results.</p>
      </div>
    </div>
  );
}
