import { useState, useMemo } from "react";
import { ChevronDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

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

const EXPIRATIONS = ["Apr 11", "Apr 18", "Apr 25", "May 2", "May 16", "Jun 20", "Sep 19", "Dec 19", "Jan 2027"];

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

export function OptionsChain() {
  const [selectedSymbol, setSelectedSymbol] = useState(CHAIN_SYMBOLS[0]);
  const [selectedExp, setSelectedExp] = useState(EXPIRATIONS[0]);
  const [showGreeks, setShowGreeks] = useState(true);

  const chain = useMemo(() => generateChain(selectedSymbol.price), [selectedSymbol]);
  const totalCallVol = chain.reduce((s, c) => s + c.callVol, 0);
  const totalPutVol = chain.reduce((s, c) => s + c.putVol, 0);
  const pcRatio = totalCallVol ? (totalPutVol / totalCallVol).toFixed(2) : "—";

  return (
    <div data-tour="options-chain" className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold">Options Chain</span>
          <select value={selectedSymbol.symbol} onChange={e => {
            const s = CHAIN_SYMBOLS.find(c => c.symbol === e.target.value);
            if (s) setSelectedSymbol(s);
          }} className="bg-[#0c0c1a] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[12px] font-mono text-white focus:outline-none focus:border-primary/30 [&>option]:bg-[#0c0c1a] cursor-pointer">
            {CHAIN_SYMBOLS.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} ${s.price.toFixed(2)}</option>)}
          </select>
          <select value={selectedExp} onChange={e => setSelectedExp(e.target.value)}
            className="bg-[#0c0c1a] border border-white/[0.08] rounded-lg px-2.5 py-1 text-[12px] font-mono text-white focus:outline-none focus:border-primary/30 [&>option]:bg-[#0c0c1a] cursor-pointer">
            {EXPIRATIONS.map(exp => <option key={exp} value={exp}>{exp}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <span>P/C Ratio: <span className="font-mono font-bold text-white/40">{pcRatio}</span></span>
            <span>Call Vol: <span className="font-mono text-primary/50">{totalCallVol.toLocaleString()}</span></span>
            <span>Put Vol: <span className="font-mono text-[#ff3366]/50">{totalPutVol.toLocaleString()}</span></span>
          </div>
          <button onClick={() => setShowGreeks(!showGreeks)} className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
            {showGreeks ? "Hide Greeks" : "Show Greeks"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th colSpan={showGreeks ? 9 : 5} className="text-center py-1.5 text-primary/40 font-bold text-[9px] uppercase tracking-wider bg-primary/[0.02]">CALLS</th>
              <th className="text-center py-1.5 text-white/20 font-bold text-[9px] uppercase tracking-wider bg-white/[0.02]">STRIKE</th>
              <th colSpan={showGreeks ? 9 : 5} className="text-center py-1.5 text-[#ff3366]/40 font-bold text-[9px] uppercase tracking-wider bg-[#ff3366]/[0.02]">PUTS</th>
            </tr>
            <tr className="border-b border-white/[0.04] text-white/15">
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
              <th className="px-3 py-1.5 text-center font-bold text-white/30">Strike</th>
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
            </tr>
          </thead>
          <tbody>
            {chain.map(row => {
              const isATM = row.itm === "atm";
              const callITM = row.itm === "call";
              const putITM = row.itm === "put";
              return (
                <tr key={row.strike} className={`border-b border-white/[0.015] hover:bg-white/[0.015] transition-colors ${isATM ? "bg-[#ffd700]/[0.03] border-[#ffd700]/10" : ""}`}>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "text-primary/60 bg-primary/[0.02]" : "text-white/25"}`}>{row.callBid}</td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "text-primary/60 bg-primary/[0.02]" : "text-white/25"}`}>{row.callAsk}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${callITM ? "text-primary/70 bg-primary/[0.02]" : "text-white/35"}`}>{row.callLast}</td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} ${row.callVol > 2000 ? "text-primary/50 font-bold" : "text-white/15"}`}>{row.callVol.toLocaleString()}</td>
                  <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-white/12`}>{row.callOI.toLocaleString()}</td>
                  {showGreeks && <>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-white/20`}>{row.callDelta}</td>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-white/12`}>{row.callGamma}</td>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-[#ff3366]/30`}>{row.callTheta}</td>
                    <td className={`px-2 py-1.5 text-right ${callITM ? "bg-primary/[0.02]" : ""} text-white/15`}>{row.callIV}</td>
                  </>}
                  <td className={`px-3 py-1.5 text-center font-bold text-[11px] ${isATM ? "text-[#ffd700] bg-[#ffd700]/[0.05]" : "text-white/40 bg-white/[0.015]"}`}>
                    {row.strike.toFixed(2)}
                    {isATM && <span className="text-[7px] ml-1 text-[#ffd700]/50">ATM</span>}
                  </td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "text-[#ff3366]/60 bg-[#ff3366]/[0.02]" : "text-white/25"}`}>{row.putBid}</td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "text-[#ff3366]/60 bg-[#ff3366]/[0.02]" : "text-white/25"}`}>{row.putAsk}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${putITM ? "text-[#ff3366]/70 bg-[#ff3366]/[0.02]" : "text-white/35"}`}>{row.putLast}</td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} ${row.putVol > 2000 ? "text-[#ff3366]/50 font-bold" : "text-white/15"}`}>{row.putVol.toLocaleString()}</td>
                  <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-white/12`}>{row.putOI.toLocaleString()}</td>
                  {showGreeks && <>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-white/20`}>{row.putDelta}</td>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-white/12`}>{row.putGamma}</td>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-[#ff3366]/30`}>{row.putTheta}</td>
                    <td className={`px-2 py-1.5 text-right ${putITM ? "bg-[#ff3366]/[0.02]" : ""} text-white/15`}>{row.putIV}</td>
                  </>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
