import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function PositionCalculator() {
  const { toast } = useToast();
  const [accountSize, setAccountSize] = useState("25000");
  const [riskPercent, setRiskPercent] = useState("2");
  const [entryPrice, setEntryPrice] = useState("875.20");
  const [stopLoss, setStopLoss] = useState("850.00");

  const account = parseFloat(accountSize) || 0;
  const risk = parseFloat(riskPercent) || 0;
  const entry = parseFloat(entryPrice) || 0;
  const stop = parseFloat(stopLoss) || 0;

  const riskAmount = account * (risk / 100);
  const riskPerShare = Math.abs(entry - stop);
  const shares = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const positionValue = shares * entry;
  const positionPercent = account > 0 ? ((positionValue / account) * 100).toFixed(1) : "0";

  const handleCopy = async () => {
    const text = `Position: ${shares} shares @ $${entry} | Risk: $${riskAmount.toFixed(0)} (${risk}%) | Stop: $${stop}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "Position details copied." });
    } catch {
      toast({ title: "Copy failed", description: "Could not access clipboard. Try selecting the text manually." });
    }
  };

  return (
    <div className="terminal-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/80">Position Calculator</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Account Size</label>
          <Input
            value={accountSize}
            onChange={(e) => setAccountSize(e.target.value)}
            className="h-8 bg-muted/50 border-border font-mono text-sm text-primary"
            type="number"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Risk %</label>
          <Input
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            className="h-8 bg-muted/50 border-border font-mono text-sm text-secondary"
            type="number"
            step="0.5"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Entry Price</label>
          <Input
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="h-8 bg-muted/50 border-border font-mono text-sm"
            type="number"
            step="0.01"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Stop Loss</label>
          <Input
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="h-8 bg-muted/50 border-border font-mono text-sm text-red-400"
            type="number"
            step="0.01"
          />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <div className="text-[9px] font-mono text-muted-foreground uppercase">Shares</div>
            <div className="text-xl font-mono font-bold text-primary stat-value">{shares}</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-2.5 text-center">
            <div className="text-[9px] font-mono text-muted-foreground uppercase">Risk Amount</div>
            <div className="text-xl font-mono font-bold text-secondary stat-value">${riskAmount.toFixed(0)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-muted-foreground">Position Value:</span>
          <span className="text-foreground">${positionValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono mb-3">
          <span className="text-muted-foreground">% of Account:</span>
          <span className={parseFloat(positionPercent) > 20 ? "text-red-400" : "text-green-400"}>{positionPercent}%</span>
        </div>
        <button
          onClick={handleCopy}
          className="w-full text-[10px] font-mono uppercase tracking-wider py-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
        >
          Copy Position Details
        </button>
      </div>
    </div>
  );
}
