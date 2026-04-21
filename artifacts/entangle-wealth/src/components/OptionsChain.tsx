import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

interface OptionContract {
  strike: number;
  callBid: number;
  callAsk: number;
  callLast: number;
  callVol: number;
  callOI: number;
  callDelta: number;
  callGamma: number;
  callTheta: number;
  callVega: number;
  callIV: number;
  putBid: number;
  putAsk: number;
  putLast: number;
  putVol: number;
  putOI: number;
  putDelta: number;
  putGamma: number;
  putTheta: number;
  putVega: number;
  putIV: number;
  itm: "call" | "put" | "atm";
}

const CHAIN_SYMBOLS = [
  { symbol: "AAPL", price: 175.84 },
  { symbol: "NVDA", price: 878.35 },
  { symbol: "TSLA", price: 195.30 },
  { symbol: "MSFT", price: 412.30 },
  { symbol: "AMD", price: 162.75 },
  { symbol: "AMZN", price: 495.10 },
  { symbol: "META", price: 485.20 },
  { symbol: "RKLB", price: 18.45 },
  { symbol: "GOOGL", price: 485.90 },
  { symbol: "SPY", price: 524.85 },
];

const EXPIRATIONS = ["Apr 18", "Apr 25", "May 2", "May 16", "Jun 20", "Sep 19", "Dec 19", "Jan 2027"];

function generateChain(price: number): OptionContract[] {
  const step = price > 500 ? 10 : price > 100 ? 5 : price > 50 ? 2.5 : 1;
  const center = Math.round(price / step) * step;
  const strikes: number[] = [];
  for (let i = -10; i <= 10; i++) strikes.push(+(center + i * step).toFixed(2));

  return strikes.map(strike => {
    const moneyness = (price - strike) / price;
    const distFromATM = Math.abs(moneyness);
    const baseIV = 0.25 + distFromATM * 0.5 + Math.random() * 0.05;
    const callDelta = Math.max(0.01, Math.min(0.99, 0.5 + moneyness * 5));
    const gamma = Math.max(0.001, 0.05 * Math.exp(-50 * distFromATM * distFromATM));
    const theta = -(0.02 + Math.random() * 0.08) * price / 100;
    const vega = 0.1 + Math.random() * 0.3;
    const callIntrinsic = Math.max(0, price - strike);
    const putIntrinsic = Math.max(0, strike - price);
    const timeVal = price * baseIV * Math.sqrt(30 / 365) * 0.4;
    const callPrice = callIntrinsic + timeVal * callDelta;
    const putPrice = putIntrinsic + timeVal * (1 - callDelta);
    const spread = Math.max(0.01, callPrice * 0.02);
    return {
      strike,
      callBid: +Math.max(0.01, callPrice - spread / 2).toFixed(2),
      callAsk: +Math.max(0.02, callPrice + spread / 2).toFixed(2),
      callLast: +Math.max(0.01, callPrice + (Math.random() - 0.5) * spread).toFixed(2),
      callVol: Math.floor(100 + Math.random() * 5000 * Math.exp(-10 * distFromATM)),
      callOI: Math.floor(500 + Math.random() * 20000 * Math.exp(-5 * distFromATM)),
      callDelta: +callDelta.toFixed(3),
      callGamma: +gamma.toFixed(4),
      callTheta: +theta.toFixed(3),
      callVega: +vega.toFixed(3),
      callIV: +(baseIV * 100).toFixed(1),
      putBid: +Math.max(0.01, putPrice - spread / 2).toFixed(2),
      putAsk: +Math.max(0.02, putPrice + spread / 2).toFixed(2),
      putLast: +Math.max(0.01, putPrice + (Math.random() - 0.5) * spread).toFixed(2),
      putVol: Math.floor(80 + Math.random() * 4000 * Math.exp(-10 * distFromATM)),
      putOI: Math.floor(400 + Math.random() * 18000 * Math.exp(-5 * distFromATM)),
      putDelta: +(-1 + callDelta).toFixed(3),
      putGamma: +gamma.toFixed(4),
      putTheta: +(theta * 0.9).toFixed(3),
      putVega: +vega.toFixed(3),
      putIV: +(baseIV * 100 + Math.random() * 2).toFixed(1),
      itm: Math.abs(moneyness) < 0.005 ? "atm" : moneyness > 0 ? "call" : "put",
    };
  });
}

interface TradeSelection {
  symbol: string;
  optionType: "CALL" | "PUT";
  strike: number;
  premium: number;
  expiration: string;
  side: "buy" | "sell";
}

export function OptionsChain() {
  const { toast } = useToast();
  const { isSignedIn, getToken } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState(CHAIN_SYMBOLS[0]);
  const [selectedExp, setSelectedExp] = useState(EXPIRATIONS[0]);
  const [showGreeks, setShowGreeks] = useState(false);
  const [tradeSelection, setTradeSelection] = useState<TradeSelection | null>(null);
  const [contracts, setContracts] = useState("1");
  const [tradeLoading, setTradeLoading] = useState(false);

  const chain = useMemo(() => generateChain(selectedSymbol.price), [selectedSymbol]);
  const totalCallVol = chain.reduce((s, c) => s + c.callVol, 0);
  const totalPutVol = chain.reduce((s, c) => s + c.putVol, 0);
  const pcRatio = totalCallVol ? (totalPutVol / totalCallVol).toFixed(2) : "N/A";

  const selectContract = useCallback((optionType: "CALL" | "PUT", strike: number, premium: number, side: "buy" | "sell") => {
    setTradeSelection({
      symbol: selectedSymbol.symbol,
      optionType,
      strike,
      premium,
      expiration: selectedExp,
      side,
    });
    setContracts("1");
  }, [selectedSymbol, selectedExp]);

  const executeTrade = useCallback(async () => {
    if (!tradeSelection || !isSignedIn) return;
    setTradeLoading(true);
    try {
      const res = await authFetch("/paper-trading/options-trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: tradeSelection.symbol,
          optionType: tradeSelection.optionType,
          strike: tradeSelection.strike,
          expiration: tradeSelection.expiration,
          side: tradeSelection.side,
          contracts: Number(contracts),
          premium: tradeSelection.premium,
        }),
      });
      let data: { message?: string; error?: string };
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) {
        toast({ title: "Options Trade Executed", description: data.message || "Trade placed successfully" });
        setTradeSelection(null);
      } else {
        toast({ title: "Trade Failed", description: data.error || `Server error (${res.status})`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Trade Failed", description: "Network error. Please check your connection and try again.", variant: "destructive" });
    } finally {
      setTradeLoading(false);
    }
  }, [tradeSelection, contracts, isSignedIn, getToken, toast]);

  return (
    <div data-tour="options-chain" className="bg-card border border-border rounded-xl overflow-hidden mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-b border-border gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold">Options Chain</span>
          <select value={selectedSymbol.symbol} onChange={e => {
            const s = CHAIN_SYMBOLS.find(c => c.symbol === e.target.value);
            if (s) setSelectedSymbol(s);
          }} className="bg-[#0c0c1a] border border-border rounded-lg px-2.5 py-1 text-[12px] font-mono text-foreground focus:outline-none focus:border-primary/30 [&>option]:bg-[#0c0c1a] cursor-pointer">
            {CHAIN_SYMBOLS.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} ${s.price.toFixed(2)}</option>)}
          </select>
          <select value={selectedExp} onChange={e => setSelectedExp(e.target.value)}
            className="bg-[#0c0c1a] border border-border rounded-lg px-2.5 py-1 text-[12px] font-mono text-foreground focus:outline-none focus:border-primary/30 [&>option]:bg-[#0c0c1a] cursor-pointer">
            {EXPIRATIONS.map(exp => <option key={exp} value={exp}>{exp}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground/70">
            <span>P/C: <span className="font-mono font-bold text-muted-foreground/70">{pcRatio}</span></span>
          </div>
          <button onClick={() => setShowGreeks(!showGreeks)} className="text-[10px] text-muted-foreground hover:text-muted-foreground/70 transition-colors">
            {showGreeks ? "Hide Greeks" : "Show Greeks"}
          </button>
        </div>
      </div>

      {tradeSelection && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${tradeSelection.side === "buy" ? "text-[#00B4D8]" : "text-[#ff3366]"}`}>
                {tradeSelection.side.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-foreground">
                {tradeSelection.symbol} ${tradeSelection.strike} {tradeSelection.optionType}
              </span>
              <span className="text-[10px] text-muted-foreground/70">@ ${tradeSelection.premium.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground/50">exp {tradeSelection.expiration}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={contracts}
                onChange={e => setContracts(e.target.value)}
                type="number"
                min="1"
                className="w-16 h-7 px-2 text-[11px] font-mono bg-muted/50 border border-white/[0.1] rounded text-foreground focus:outline-none focus:border-[#00B4D8]/30 text-center"
              />
              <span className="text-[10px] text-muted-foreground/50">contracts</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                = ${(Number(contracts) * tradeSelection.premium * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={executeTrade}
                disabled={tradeLoading || !isSignedIn}
                className={`px-3 py-1 text-[10px] font-bold rounded transition-all disabled:opacity-40 ${
                  tradeSelection.side === "buy"
                    ? "bg-[#00B4D8] text-black hover:bg-[#00B4D8]/80"
                    : "bg-[#ff3366] text-foreground hover:bg-[#ff3366]/80"
                }`}
              >
                {tradeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
              </button>
              <button
                onClick={() => setTradeSelection(null)}
                className="px-2 py-1 text-[10px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 py-1.5 bg-primary/[0.02]"></th>
              <th colSpan={showGreeks ? 9 : 5} className="text-center py-1.5 text-primary/40 font-bold text-[9px] uppercase tracking-wider bg-primary/[0.02]">CALLS</th>
              <th className="text-center py-1.5 text-muted-foreground/70 font-bold text-[9px] uppercase tracking-wider bg-muted/30">STRIKE</th>
              <th colSpan={showGreeks ? 9 : 5} className="text-center py-1.5 text-[#ff3366]/40 font-bold text-[9px] uppercase tracking-wider bg-[#ff3366]/[0.02]">PUTS</th>
              <th className="w-8 py-1.5 bg-[#ff3366]/[0.02]"></th>
            </tr>
            <tr className="border-b border-border text-muted-foreground/70">
              <th className="px-1 py-1.5 text-center text-[8px] font-normal">Trade</th>
              <th className="px-2 py-1.5 text-right font-normal">Bid</th>
              <th className="px-2 py-1.5 text-right font-normal">Ask</th>
              <th className="px-2 py-1.5 text-right font-normal">Last</th>
              <th className="px-2 py-1.5 text-right font-normal">Vol</th>
              <th className="px-2 py-1.5 text-right font-normal">OI</th>
              {showGreeks && <>
                <th className="px-2 py-1.5 text-right font-normal">Delta</th>
                <th className="px-2 py-1.5 text-right font-normal">Gamma</th>
                <th className="px-2 py-1.5 text-right font-normal">Theta</th>
                <th className="px-2 py-1.5 text-right font-normal">IV%</th>
              </>}
              <th className="px-3 py-1.5 text-center font-bold text-muted-foreground/50">Strike</th>
              <th className="px-2 py-1.5 text-right font-normal">Bid</th>
              <th className="px-2 py-1.5 text-right font-normal">Ask</th>
              <th className="px-2 py-1.5 text-right font-normal">Last</th>
              <th className="px-2 py-1.5 text-right font-normal">Vol</th>
              <th className="px-2 py-1.5 text-right font-normal">OI</th>
              {showGreeks && <>
                <th className="px-2 py-1.5 text-right font-normal">Delta</th>
                <th className="px-2 py-1.5 text-right font-normal">Gamma</th>
                <th className="px-2 py-1.5 text-right font-normal">Theta</th>
                <th className="px-2 py-1.5 text-right font-normal">IV%</th>
              </>}
              <th className="px-1 py-1.5 text-center text-[8px] font-normal">Trade</th>
            </tr>
          </thead>
          <tbody>
            {chain.map(row => {
              const isATM = row.itm === "atm";
              const callITM = row.itm === "call";
              const putITM = row.itm === "put";
              const isCallSelected = tradeSelection?.optionType === "CALL" && tradeSelection?.strike === row.strike;
              const isPutSelected = tradeSelection?.optionType === "PUT" && tradeSelection?.strike === row.strike;
              return (
                <tr key={row.strike} className={`border-b border-white/[0.015] hover:bg-muted/30 transition-colors ${isATM ? "bg-[#FFB800]/[0.03] border-[#FFB800]/10" : ""} ${isCallSelected || isPutSelected ? "bg-[#00B4D8]/[0.04]" : ""}`}>
                  <td className="px-1 py-1">
                    <div className="flex gap-0.5">
                      <button onClick={() => selectContract("CALL", row.strike, row.callAsk, "buy")} className="w-4 h-4 flex items-center justify-center rounded bg-[#00B4D8]/10 hover:bg-[#00B4D8]/25 transition-colors" title="Buy Call">
                        <ArrowUpRight className="w-2.5 h-2.5 text-[#00B4D8]" />
                      </button>
                      <button onClick={() => selectContract("CALL", row.strike, row.callBid, "sell")} className="w-4 h-4 flex items-center justify-center rounded bg-[#ff3366]/10 hover:bg-[#ff3366]/25 transition-colors" title="Sell Call">
                        <ArrowDownRight className="w-2.5 h-2.5 text-[#ff3366]" />
                      </button>
                    </div>
                  </td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "text-primary/60 bg-primary/[0.02]" : "text-muted-foreground/40"}`}>{row.callBid}</td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "text-primary/60 bg-primary/[0.02]" : "text-muted-foreground/40"}`}>{row.callAsk}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${callITM ? "text-primary/70 bg-primary/[0.02]" : "text-muted-foreground/60"}`}>{row.callLast}</td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} ${row.callVol > 2000 ? "text-primary/50 font-bold" : "text-muted-foreground/70"}`}>{row.callVol.toLocaleString()}</td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-muted-foreground/20`}>{row.callOI.toLocaleString()}</td>
                  {showGreeks && <>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-muted-foreground/70`}>{Math.abs(row.callDelta)}</td>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-muted-foreground/20`}>{Math.abs(row.callGamma)}</td>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-[#ff3366]/30`}>{Math.abs(row.callTheta).toFixed(3)}</td>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-muted-foreground/70`}>{row.callIV}</td>
                  </>}
                  <td className={`px-3 py-1.5 text-center font-bold text-[11px] ${isATM ? "text-[#FFB800] bg-[#FFB800]/[0.05]" : "text-muted-foreground/70 bg-white/[0.015]"}`}>
                    {row.strike.toFixed(2)}
                    {isATM && <span className="text-[7px] ml-1 text-[#FFB800]/50">ATM</span>}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "text-[#ff3366]/60 bg-[#ff3366]/[0.02]" : "text-muted-foreground/40"}`}>{row.putBid}</td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "text-[#ff3366]/60 bg-[#ff3366]/[0.02]" : "text-muted-foreground/40"}`}>{row.putAsk}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${putITM ? "text-[#ff3366]/70 bg-[#ff3366]/[0.02]" : "text-muted-foreground/60"}`}>{row.putLast}</td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} ${row.putVol > 2000 ? "text-[#ff3366]/50 font-bold" : "text-muted-foreground/70"}`}>{row.putVol.toLocaleString()}</td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-muted-foreground/20`}>{row.putOI.toLocaleString()}</td>
                  {showGreeks && <>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-muted-foreground/70`}>{Math.abs(row.putDelta)}</td>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-muted-foreground/20`}>{Math.abs(row.putGamma)}</td>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-[#ff3366]/30`}>{Math.abs(row.putTheta).toFixed(3)}</td>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-muted-foreground/70`}>{row.putIV}</td>
                  </>}
                  <td className="px-1 py-1">
                    <div className="flex gap-0.5">
                      <button onClick={() => selectContract("PUT", row.strike, row.putAsk, "buy")} className="w-4 h-4 flex items-center justify-center rounded bg-[#00B4D8]/10 hover:bg-[#00B4D8]/25 transition-colors" title="Buy Put">
                        <ArrowUpRight className="w-2.5 h-2.5 text-[#00B4D8]" />
                      </button>
                      <button onClick={() => selectContract("PUT", row.strike, row.putBid, "sell")} className="w-4 h-4 flex items-center justify-center rounded bg-[#ff3366]/10 hover:bg-[#ff3366]/25 transition-colors" title="Sell Put">
                        <ArrowDownRight className="w-2.5 h-2.5 text-[#ff3366]" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
