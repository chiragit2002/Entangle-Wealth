import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface BeforeAfterCardProps {
  param: string;
  oldValue: number;
  newValue: number;
  impact: string;
}

export function BeforeAfterCard({ param, oldValue, newValue, impact }: BeforeAfterCardProps) {
  const improved = newValue > oldValue;
  const delta = newValue - oldValue;
  const pctChange = oldValue !== 0 ? ((delta / Math.abs(oldValue)) * 100).toFixed(1) : "—";
  const impactPositive = impact.toLowerCase().includes("+") || impact.toLowerCase().includes("improv") || impact.toLowerCase().includes("better");

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 hover:border-border transition-all group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono font-semibold text-foreground/70 capitalize">
          {param.replace(/_/g, " ")}
        </span>
        <span
          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${
            impactPositive
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
          }`}
        >
          {impact}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center bg-muted/50 border border-border rounded-lg py-3 px-2">
          <div className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider mb-1">Before</div>
          <div className="text-xl font-bold font-mono text-muted-foreground">{oldValue}</div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
          <span className={`text-[10px] font-mono font-semibold ${improved ? "text-green-400" : "text-orange-400"}`}>
            {improved ? "+" : ""}{pctChange}%
          </span>
        </div>

        <div className="flex-1 text-center bg-[#00d4ff]/[0.04] border border-[#00d4ff]/20 rounded-lg py-3 px-2">
          <div className="text-[10px] text-[#00d4ff]/50 font-mono uppercase tracking-wider mb-1">After</div>
          <div className="text-xl font-bold font-mono text-[#00d4ff]">{newValue}</div>
        </div>
      </div>

      <div className="mt-3 h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(100, (newValue / (Math.max(oldValue, newValue) || 1)) * 100)}%`,
            background: improved
              ? "linear-gradient(90deg, rgba(0,212,255,0.3), rgba(0,212,255,0.8))"
              : "linear-gradient(90deg, rgba(255,140,0,0.3), rgba(255,140,0,0.8))",
          }}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {improved ? (
          <TrendingUp className="w-3 h-3 text-green-400" />
        ) : (
          <TrendingDown className="w-3 h-3 text-orange-400" />
        )}
        <span className={`text-[10px] font-mono ${improved ? "text-green-400/70" : "text-orange-400/70"}`}>
          {improved ? "Improved by refinement engine" : "Adjusted for risk management"}
        </span>
      </div>
    </div>
  );
}
