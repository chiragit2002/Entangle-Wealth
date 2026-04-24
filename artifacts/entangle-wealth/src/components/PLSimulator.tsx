import { useState, useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";

export function PLSimulator() {
  const [strikePrice, setStrikePrice] = useState(875);
  const [premium, setPremium] = useState(12.50);
  const [contracts, setContracts] = useState(1);
  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");

  const plData = useMemo(() => {
    const data = [];
    const range = strikePrice * 0.15;
    const step = range / 30;
    for (let i = 0; i <= 30; i++) {
      const price = strikePrice - range + i * step;
      let pnl;
      if (optionType === "CALL") {
        pnl = price > strikePrice
          ? (price - strikePrice - premium) * 100 * contracts
          : -premium * 100 * contracts;
      } else {
        pnl = price < strikePrice
          ? (strikePrice - price - premium) * 100 * contracts
          : -premium * 100 * contracts;
      }
      data.push({ price: Math.round(price * 100) / 100, pnl: Math.round(pnl * 100) / 100 });
    }
    return data;
  }, [strikePrice, premium, contracts, optionType]);

  const breakeven = optionType === "CALL" ? strikePrice + premium : strikePrice - premium;
  const maxLoss = premium * 100 * contracts;
  const maxProfit = optionType === "CALL" ? "Unlimited" : `$${((strikePrice - premium) * 100 * contracts).toLocaleString()}`;

  return (
    <div className="terminal-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-purple-400" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400/80">P&L Simulator</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Type</label>
          <div className="flex h-8 rounded overflow-hidden border border-border">
            <button
              onClick={() => setOptionType("CALL")}
              className={`flex-1 text-[10px] font-mono font-bold transition-colors ${optionType === "CALL" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
            >CALL</button>
            <button
              onClick={() => setOptionType("PUT")}
              className={`flex-1 text-[10px] font-mono font-bold transition-colors ${optionType === "PUT" ? "bg-red-500 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >PUT</button>
          </div>
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Strike</label>
          <input
            value={strikePrice}
            onChange={(e) => setStrikePrice(Number(e.target.value))}
            className="w-full h-8 bg-muted/50 border border-border rounded px-2 font-mono text-sm text-foreground"
            type="number"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Premium</label>
          <input
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value))}
            className="w-full h-8 bg-muted/50 border border-border rounded px-2 font-mono text-sm text-foreground"
            type="number"
            step="0.50"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase block mb-1">Contracts</label>
          <input
            value={contracts}
            onChange={(e) => setContracts(Number(e.target.value))}
            className="w-full h-8 bg-muted/50 border border-border rounded px-2 font-mono text-sm text-foreground"
            type="number"
            min="1"
          />
        </div>
      </div>

      <div className="h-44 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={plData}>
            <defs>
              <linearGradient id="plProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00B4D8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00B4D8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="plLoss" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ff4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ff4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="price" tick={{ fill: "#555", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <YAxis tick={{ fill: "#555", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.abs(v).toLocaleString()}`} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontFamily: "JetBrains Mono", fontSize: 11 }}
              formatter={(value: number) => [`$${Math.abs(value).toLocaleString()}`, "P&L"]}
              labelFormatter={(label) => `Price: $${label}`}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <ReferenceLine x={breakeven} stroke="#FFB800" strokeDasharray="3 3" label={{ value: `BE: $${breakeven.toFixed(0)}`, fill: "#FFB800", fontSize: 9 }} />
            <Area type="monotone" dataKey="pnl" stroke="#00B4D8" strokeWidth={2} fill="url(#plProfit)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-[9px] font-mono text-muted-foreground uppercase">Max Loss</div>
          <div className="text-sm font-mono font-bold text-red-400">${maxLoss.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-muted-foreground uppercase">Breakeven</div>
          <div className="text-sm font-mono font-bold text-secondary">${breakeven.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-mono text-muted-foreground uppercase">Max Profit</div>
          <div className="text-sm font-mono font-bold text-green-400">{maxProfit}</div>
        </div>
      </div>
    </div>
  );
}
