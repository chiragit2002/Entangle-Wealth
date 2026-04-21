import { Activity } from "lucide-react";

export function FearGreedGauge() {
  return (
    <div className="glass-panel rounded-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00B4D8]/40" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fear & Greed Index</h4>
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <Activity className="w-8 h-8 text-[#00B4D8]/20 mb-1" />
        <p className="text-xs font-medium text-muted-foreground/50 font-mono tracking-tight">SENTIMENT DATA UNAVAILABLE</p>
        <p className="text-[10px] text-muted-foreground/40 max-w-[160px] leading-relaxed">Market sentiment index requires a third-party data provider</p>
      </div>
    </div>
  );
}
