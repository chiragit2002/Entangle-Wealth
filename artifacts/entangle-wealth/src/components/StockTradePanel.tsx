import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, Layers } from "lucide-react";

interface Position {
  id: number;
  symbol: string;
  quantity: number;
  avgCost: number;
}

interface OptionsPosition {
  id: number;
  symbol: string;
  optionType: string;
  strike: number;
  expiration: string;
  contracts: number;
  avgPremium: number;
}

interface Trade {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  totalCost: number;
  createdAt: string;
}

interface OptionsTrade {
  id: number;
  symbol: string;
  optionType: string;
  strike: number;
  expiration: string;
  side: string;
  contracts: number;
  premium: number;
  totalCost: number;
  createdAt: string;
}

interface Portfolio {
  cashBalance: number;
  positions: Position[];
  trades: Trade[];
  portfolioValue: number;
  totalValue: number;
  startingCash: number;
  optionsPositions?: OptionsPosition[];
  optionsTrades?: OptionsTrade[];
}

const EXPIRATIONS = ["Apr 18", "Apr 25", "May 2", "May 16", "Jun 20", "Sep 19", "Dec 19", "Jan 2027"];

interface StockTradePanelProps {
  symbol: string;
  currentPrice?: number;
}

export function StockTradePanel({ symbol, currentPrice }: StockTradePanelProps) {
  const { toast } = useToast();
  const { isSignedIn, getToken } = useAuth();
  const [tab, setTab] = useState<"stocks" | "options">("stocks");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState(EXPIRATIONS[0]);
  const [contracts, setContracts] = useState("");
  const [premium, setPremium] = useState("");

  useEffect(() => {
    if (currentPrice) setPrice(currentPrice.toFixed(2));
  }, [currentPrice]);

  useEffect(() => {
    if (currentPrice && symbol) {
      const step = currentPrice > 500 ? 10 : currentPrice > 100 ? 5 : currentPrice > 50 ? 2.5 : 1;
      setStrike((Math.round(currentPrice / step) * step).toFixed(2));
      const estimatedPremium = currentPrice * 0.03;
      setPremium(estimatedPremium.toFixed(2));
    }
  }, [currentPrice, symbol]);

  const loadPortfolio = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/portfolio", getToken);
      if (res.ok) setPortfolio(await res.json());
    } catch {}
  }, [isSignedIn, getToken]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const executeStockTrade = useCallback(async () => {
    if (!qty || !price) {
      toast({ title: "Missing fields", description: "Enter quantity and price", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/paper-trading/trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), side, quantity: Number(qty), price: Number(price) }),
      });
      let data: { message?: string; error?: string };
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) {
        toast({ title: "Trade Executed", description: data.message || "Trade placed successfully" });
        setQty("");
        loadPortfolio();
      } else {
        toast({ title: "Trade Failed", description: data.error || `Server error (${res.status})`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Trade Failed", description: "Network error. Please check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [symbol, side, qty, price, getToken, toast, loadPortfolio]);

  const executeOptionsTrade = useCallback(async () => {
    if (!strike || !contracts || !premium) {
      toast({ title: "Missing fields", description: "Enter strike, contracts, and premium", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/paper-trading/options-trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          optionType,
          strike: Number(strike),
          expiration,
          side,
          contracts: Number(contracts),
          premium: Number(premium),
        }),
      });
      let data: { message?: string; error?: string };
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) {
        toast({ title: "Options Trade Executed", description: data.message || "Trade placed successfully" });
        setContracts("");
        loadPortfolio();
      } else {
        toast({ title: "Trade Failed", description: data.error || `Server error (${res.status})`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Trade Failed", description: "Network error. Please check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [symbol, optionType, strike, expiration, side, contracts, premium, getToken, toast, loadPortfolio]);

  const pnl = portfolio ? portfolio.totalValue - portfolio.startingCash : 0;
  const pnlPct = portfolio ? ((pnl / portfolio.startingCash) * 100).toFixed(2) : "0.00";

  const symbolPositions = portfolio?.positions.filter(p => p.symbol === symbol.toUpperCase()) ?? [];
  const symbolOptionsPositions = portfolio?.optionsPositions?.filter(p => p.symbol === symbol.toUpperCase()) ?? [];

  const totalEstimate = tab === "stocks"
    ? (Number(qty) || 0) * (Number(price) || 0)
    : (Number(contracts) || 0) * (Number(premium) || 0) * 100;

  return (
    <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#FF8C00]" />
          <span className="text-sm font-bold text-white">Trade {symbol}</span>
        </div>
        {portfolio && (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-white/40">Cash: <span className="text-[#FF8C00] font-bold">${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
            <span className={`font-bold ${pnl >= 0 ? "text-[#FF8C00]" : "text-[#ff3366]"}`}>
              P&L: {pnl >= 0 ? "+" : ""}{pnlPct}%
            </span>
          </div>
        )}
      </div>

      <div className="flex border-b border-white/[0.06]">
        <button
          onClick={() => setTab("stocks")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${
            tab === "stocks"
              ? "text-[#FF8C00] border-b-2 border-[#FF8C00] bg-[#FF8C00]/[0.04]"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Stocks
        </button>
        <button
          onClick={() => setTab("options")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${
            tab === "options"
              ? "text-[#FF8C00] border-b-2 border-[#FF8C00] bg-[#FF8C00]/[0.04]"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Options
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSide("buy")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              side === "buy"
                ? "bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" />
            BUY
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              side === "sell"
                ? "bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/30"
                : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10"
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 inline mr-1" />
            SELL
          </button>
        </div>

        {tab === "stocks" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Shares</label>
                <input
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="100"
                  type="number"
                  className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Price</label>
                <input
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setOptionType("CALL")}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  optionType === "CALL"
                    ? "bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30"
                    : "bg-white/[0.03] text-white/40 border border-white/[0.06]"
                }`}
              >
                CALL
              </button>
              <button
                onClick={() => setOptionType("PUT")}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  optionType === "PUT"
                    ? "bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/30"
                    : "bg-white/[0.03] text-white/40 border border-white/[0.06]"
                }`}
              >
                PUT
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Strike</label>
                <input
                  value={strike}
                  onChange={e => setStrike(e.target.value)}
                  placeholder="Strike"
                  type="number"
                  step="0.01"
                  className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Expiration</label>
                <select
                  value={expiration}
                  onChange={e => setExpiration(e.target.value)}
                  className="w-full h-9 px-2 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-[#FF8C00]/30"
                >
                  {EXPIRATIONS.map(exp => (
                    <option key={exp} value={exp} className="bg-[#0a0a16]">{exp}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Contracts</label>
                <input
                  value={contracts}
                  onChange={e => setContracts(e.target.value)}
                  placeholder="1"
                  type="number"
                  className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Premium</label>
                <input
                  value={premium}
                  onChange={e => setPremium(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                />
              </div>
            </div>
          </div>
        )}

        {totalEstimate > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono text-white/40">Estimated Total</span>
            <span className="text-sm font-mono font-bold text-white">${totalEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        )}

        <button
          onClick={tab === "stocks" ? executeStockTrade : executeOptionsTrade}
          disabled={loading || !isSignedIn}
          className={`w-full py-2.5 text-sm font-bold rounded-lg transition-all disabled:opacity-40 ${
            side === "buy"
              ? "bg-[#FF8C00] text-black hover:bg-[#FF8C00]/80"
              : "bg-[#ff3366] text-white hover:bg-[#ff3366]/80"
          }`}
        >
          {loading
            ? "Executing..."
            : `${side.toUpperCase()} ${tab === "stocks" ? `${qty || 0} ${symbol}` : `${contracts || 0} ${symbol} $${strike} ${optionType}`}`
          }
        </button>

        {!isSignedIn && (
          <p className="text-[10px] font-mono text-[#FFB800] text-center">Sign in to start paper trading</p>
        )}
      </div>

      {(symbolPositions.length > 0 || symbolOptionsPositions.length > 0) && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
          <p className="text-[9px] font-mono text-white/30 uppercase font-bold">Your {symbol} Positions</p>
          {symbolPositions.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-[#FF8C00]" />
                <span className="text-xs font-mono font-bold text-white">{p.quantity} shares</span>
              </div>
              <span className="text-[10px] font-mono text-white/50">avg ${p.avgCost.toFixed(2)}</span>
              <span className="text-xs font-mono text-white/70">${(p.quantity * p.avgCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
          {symbolOptionsPositions.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-3 h-3 text-[#9c27b0]" />
                <span className="text-xs font-mono font-bold text-white">
                  {p.contracts}x ${p.strike} {p.optionType}
                </span>
              </div>
              <span className="text-[10px] font-mono text-white/50">{p.expiration}</span>
              <span className="text-xs font-mono text-white/70">${(p.contracts * p.avgPremium * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
