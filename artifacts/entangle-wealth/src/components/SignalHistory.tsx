import { signalHistory } from "@/lib/mock-data";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function SignalHistory() {
  const wins = signalHistory.filter(s => s.result === "win").length;
  const losses = signalHistory.filter(s => s.result === "loss").length;
  const winRate = ((wins / signalHistory.length) * 100).toFixed(0);
  const totalPnl = signalHistory.reduce((acc, s) => acc + s.pnl, 0).toFixed(2);
  const avgWin = (signalHistory.filter(s => s.result === "win").reduce((a, s) => a + s.pnl, 0) / wins).toFixed(2);
  const avgLoss = (signalHistory.filter(s => s.result === "loss").reduce((a, s) => a + s.pnl, 0) / losses).toFixed(2);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signal History</h4>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">Last {signalHistory.length} signals</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-white/[0.02] rounded-lg p-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Win Rate</div>
          <div className="text-lg font-mono font-bold text-primary stat-value">{winRate}%</div>
        </div>
        <div className="bg-white/[0.02] rounded-lg p-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Total P&L</div>
          <div className={`text-lg font-mono font-bold stat-value ${parseFloat(totalPnl) >= 0 ? "text-green-400" : "text-red-400"}`}>
            {parseFloat(totalPnl) >= 0 ? "+" : ""}{totalPnl}%
          </div>
        </div>
        <div className="bg-white/[0.02] rounded-lg p-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Avg Win</div>
          <div className="text-lg font-mono font-bold text-green-400">+{avgWin}%</div>
        </div>
        <div className="bg-white/[0.02] rounded-lg p-2 text-center">
          <div className="text-[9px] text-muted-foreground uppercase">Avg Loss</div>
          <div className="text-lg font-mono font-bold text-red-400">{avgLoss}%</div>
        </div>
      </div>

      <div className="flex gap-0.5 mb-4">
        {signalHistory.map((s) => (
          <div
            key={s.id}
            className={`flex-1 h-6 rounded-sm ${s.result === "win" ? "bg-green-400/20 border border-green-400/30" : "bg-red-400/20 border border-red-400/30"}`}
            title={`${s.symbol} ${s.type} ${s.result === "win" ? "+" : ""}${s.pnl}%`}
          />
        ))}
      </div>

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {signalHistory.map((signal) => (
          <div key={signal.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
            <span className="text-muted-foreground font-mono w-12">{signal.date}</span>
            <span className="font-bold w-12">{signal.symbol}</span>
            <span className={`flex items-center gap-1 w-12 ${signal.type === "BUY" ? "text-primary" : "text-red-400"}`}>
              {signal.type === "BUY" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {signal.type}
            </span>
            <span className="text-muted-foreground font-mono flex-1">
              ${signal.entry.toFixed(0)} → ${signal.exit.toFixed(0)}
            </span>
            <span className={`font-mono font-bold w-14 text-right ${signal.result === "win" ? "text-green-400" : "text-red-400"}`}>
              {signal.pnl >= 0 ? "+" : ""}{signal.pnl.toFixed(2)}%
            </span>
            <span className="text-muted-foreground font-mono w-8 text-right">{signal.holdTime}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-[9px] text-muted-foreground/50 text-center">Demo data. Past performance does not guarantee future results.</p>
      </div>
    </div>
  );
}
