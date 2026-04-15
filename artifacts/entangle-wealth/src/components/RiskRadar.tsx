import { Shield } from "lucide-react";

export function RiskRadar() {
  return (
    <div className="glass-panel rounded-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk Radar</h4>
        </div>
        <span className="text-xs font-mono font-bold text-white/30">—</span>
      </div>
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <Shield className="w-8 h-8 text-white/10 mb-1" />
        <p className="text-xs font-medium text-white/30">Risk data unavailable</p>
        <p className="text-[10px] text-white/25 max-w-[160px] leading-relaxed">Build a paper trading portfolio to see live risk metrics</p>
      </div>
    </div>
  );
}
