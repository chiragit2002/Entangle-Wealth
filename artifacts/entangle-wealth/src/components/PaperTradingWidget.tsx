import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, ChevronUp, ChevronDown, RefreshCw, X, PlusCircle } from "lucide-react";
import { BuyCashStore } from "./BuyCashStore";

const DEFAULT_STARTING_CASH = 100_000;

interface PaperPortfolio {
  cashBalance: number;
  positions: { id: number; symbol: string; quantity: number; avgCost: number }[];
  trades: { id: number; symbol: string; side: string; quantity: number; price: number; totalCost: number; createdAt: string }[];
  portfolioValue: number;
  totalValue: number;
  startingCash: number;
}

const emptyPortfolio: PaperPortfolio = {
  cashBalance: DEFAULT_STARTING_CASH,
  positions: [],
  trades: [],
  portfolioValue: 0,
  totalValue: DEFAULT_STARTING_CASH,
  startingCash: DEFAULT_STARTING_CASH,
};

interface PaperTradingWidgetProps {
  initialSymbol?: string;
  initialPrice?: number;
  variant?: "floating" | "inline";
}

export function PaperTradingWidget({ initialSymbol = "", initialPrice, variant = "floating" }: PaperTradingWidgetProps) {
  const { toast } = useToast();
  const { isSignedIn, getToken } = useAuth();
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(emptyPortfolio);
  const [tradeSymbol, setTradeSymbol] = useState(initialSymbol);
  const [tradeQty, setTradeQty] = useState("");
  const [tradePrice, setTradePrice] = useState(initialPrice ? String(initialPrice) : "");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCashStore, setShowCashStore] = useState(false);

  useEffect(() => {
    if (initialSymbol) setTradeSymbol(initialSymbol);
  }, [initialSymbol]);

  useEffect(() => {
    if (initialPrice) setTradePrice(String(initialPrice));
  }, [initialPrice]);

  const [marketDataUnavailable, setMarketDataUnavailable] = useState(false);

  const loadPortfolio = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/portfolio", getToken);
      if (res.ok) {
        const data = await res.json();
        setMarketDataUnavailable(data.marketDataAvailable === false);
        setPortfolio({
          ...data,
          portfolioValue: data.portfolioValue ?? 0,
          totalValue: data.totalValue ?? data.cashBalance,
        });
      }
    } catch (err) {
      console.error("[PaperTradingWidget] Failed to load portfolio:", err);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const executeTrade = useCallback(async () => {
    if (!tradeSymbol.trim() || !tradeQty || !tradePrice) {
      toast({ title: "Missing fields", description: "Enter symbol, quantity, and price", variant: "destructive" });
      return;
    }
    setTradeLoading(true);
    try {
      const res = await authFetch("/paper-trading/trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: tradeSymbol.toUpperCase(), side: tradeSide, quantity: Number(tradeQty), price: Number(tradePrice) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Trade Executed", description: data.message });
        setTradeQty("");
        loadPortfolio();
      } else {
        toast({ title: "Trade Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Trade Failed", description: "Please sign in to trade", variant: "destructive" });
    } finally {
      setTradeLoading(false);
    }
  }, [tradeSymbol, tradeQty, tradePrice, tradeSide, getToken, toast, loadPortfolio]);

  const resetPortfolio = useCallback(async () => {
    try {
      const res = await authFetch("/paper-trading/reset", getToken, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Portfolio Reset", description: data.message });
        loadPortfolio();
      }
    } catch {
      toast({ title: "Reset Failed", description: "Please try again", variant: "destructive" });
    }
  }, [getToken, toast, loadPortfolio]);

  const pnl = portfolio.totalValue - portfolio.startingCash;
  const pnlPct = ((pnl / portfolio.startingCash) * 100).toFixed(2);

  if (variant === "floating") {
    if (isMinimized) {
      return (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-[#0A0E1A] border border-[#00B4D8]/30 rounded-lg shadow-lg shadow-black/50 hover:border-[#00B4D8]/50 transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#00B4D8]" />
          <span className="text-[10px] font-mono font-bold text-[#00B4D8]">PAPER TRADE</span>
          <span className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-[#00B4D8]' : 'text-[#ff3366]'}`}>
            {pnl >= 0 ? '+' : ''}{pnlPct}%
          </span>
        </button>
      );
    }

    return (
      <>
        {showCashStore && <BuyCashStore onClose={() => setShowCashStore(false)} onPurchaseSuccess={loadPortfolio} />}
        <div className="fixed bottom-4 right-4 z-50 w-[320px] bg-[#0A0E1A] border border-white/[0.08] rounded-lg shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] cursor-pointer" onClick={() => setIsExpanded(v => !v)}>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-[#00B4D8]" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#00B4D8]">PAPER TRADING</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-white/30">${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-[#00B4D8]' : 'text-[#ff3366]'}`}>
              {pnl >= 0 ? '+' : ''}{pnlPct}%
            </span>
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className="w-11 h-11 flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/5 rounded transition-colors" aria-label="Minimize paper trading widget">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {marketDataUnavailable && (
          <div className="px-2.5 py-1.5 bg-[#ff3366]/10 border-b border-[#ff3366]/20 flex items-center gap-1.5">
            <span className="text-[8px] font-mono font-bold text-[#ff3366]">⚠ Market data temporarily unavailable — trading paused</span>
          </div>
        )}
        <div className="p-2.5 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">CASH</p>
              <p className="text-[10px] font-mono font-bold text-[#00B4D8]">${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">POSITIONS</p>
              <p className="text-[10px] font-mono font-bold text-[#00B4D8]">${portfolio.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">TOTAL</p>
              <p className="text-[10px] font-mono font-bold text-white">${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-white/[0.03] rounded-sm p-1.5 text-center">
              <p className="text-[7px] font-mono text-white/30">P&L</p>
              <p className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-[#00B4D8]' : 'text-[#ff3366]'}`}>{pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="flex gap-1">
            <button onClick={() => setTradeSide("buy")} className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-sm transition-colors ${tradeSide === "buy" ? "bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30" : "bg-white/[0.03] text-white/30 border border-white/[0.06]"}`}>BUY</button>
            <button onClick={() => setTradeSide("sell")} className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-sm transition-colors ${tradeSide === "sell" ? "bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/30" : "bg-white/[0.03] text-white/30 border border-white/[0.06]"}`}>SELL</button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <input value={tradeSymbol} onChange={e => setTradeSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="h-7 px-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/30" />
            <input value={tradeQty} onChange={e => setTradeQty(e.target.value)} placeholder="Qty" type="number" className="h-7 px-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/30" />
            <input value={tradePrice} onChange={e => setTradePrice(e.target.value)} placeholder="Price" type="number" step="0.01" className="h-7 px-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/30" />
          </div>

          <div className="flex gap-1">
            <button onClick={executeTrade} disabled={tradeLoading || !isSignedIn} className={`flex-1 h-7 text-[9px] font-mono font-bold rounded-sm transition-colors ${tradeSide === "buy" ? "bg-[#00B4D8] text-black hover:bg-[#00B4D8]/80" : "bg-[#ff3366] text-white hover:bg-[#ff3366]/80"} disabled:opacity-40`}>
              {tradeLoading ? "EXECUTING..." : `${tradeSide.toUpperCase()} ORDER`}
            </button>
            <button onClick={resetPortfolio} disabled={!isSignedIn} className="px-2 h-7 text-[9px] font-mono font-bold text-white/30 bg-white/[0.03] border border-white/[0.06] rounded-sm hover:text-white/50 transition-colors disabled:opacity-40">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setShowCashStore(true)}
            className="w-full flex items-center justify-center gap-1 h-6 text-[9px] font-mono font-bold text-[#00B4D8]/60 bg-[#00B4D8]/[0.04] border border-[#00B4D8]/[0.15] rounded-sm hover:text-[#00B4D8] hover:bg-[#00B4D8]/[0.08] transition-colors"
          >
            <PlusCircle className="w-3 h-3" />
            ADD FUNDS
          </button>

          {!isSignedIn && <p className="text-[9px] font-mono text-[#FFB800] text-center">Sign in to start paper trading</p>}

          {isExpanded && portfolio.positions.length > 0 && (
            <div className="border-t border-white/[0.06] pt-1.5 max-h-[150px] overflow-y-auto">
              <p className="text-[8px] font-mono text-white/25 mb-1">OPEN POSITIONS</p>
              {portfolio.positions.map(p => (
                <div key={p.id} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] font-mono font-bold text-[#00B4D8]">{p.symbol}</span>
                  <span className="text-[9px] font-mono text-white/40">{p.quantity} @ ${p.avgCost.toFixed(2)}</span>
                  <span className="text-[9px] font-mono text-white/60">${(p.quantity * p.avgCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}

          {isExpanded && portfolio.trades.length > 0 && (
            <div className="border-t border-white/[0.06] pt-1.5 max-h-[120px] overflow-y-auto">
              <p className="text-[8px] font-mono text-white/25 mb-1">RECENT TRADES</p>
              {portfolio.trades.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between py-0.5">
                  <span className={`text-[9px] font-mono font-bold ${t.side === 'buy' ? 'text-[#00B4D8]' : 'text-[#ff3366]'}`}>{t.side.toUpperCase()}</span>
                  <span className="text-[10px] font-mono text-[#00B4D8]">{t.symbol}</span>
                  <span className="text-[9px] font-mono text-white/40">{t.quantity} @ ${t.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {portfolio.positions.length > 0 && (
            <button onClick={() => setIsExpanded(v => !v)} className="w-full flex items-center justify-center gap-1 py-0.5 text-[8px] font-mono text-white/40 hover:text-white/40 transition-colors">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              {isExpanded ? "COLLAPSE" : `${portfolio.positions.length} POSITION${portfolio.positions.length !== 1 ? 'S' : ''}`}
            </button>
          )}
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {showCashStore && <BuyCashStore onClose={() => setShowCashStore(false)} onPurchaseSuccess={loadPortfolio} />}
      <div className="bg-[#0A0E1A] border border-white/[0.06] rounded-sm overflow-hidden">
      {marketDataUnavailable && (
        <div className="px-2.5 py-1.5 bg-[#ff3366]/10 border-b border-[#ff3366]/20 flex items-center gap-1.5">
          <span className="text-[8px] font-mono font-bold text-[#ff3366]">⚠ Market data temporarily unavailable — trading paused. Portfolio values shown are cash only.</span>
        </div>
      )}
      <div className="flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06] border-l-2 border-l-[#00B4D8]">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-[#00B4D8]" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[#00B4D8]">PAPER TRADING</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/30">${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} CASH</span>
          <span className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-[#00B4D8]' : 'text-[#ff3366]'}`}>
            {pnl >= 0 ? '+' : ''}{pnlPct}%
          </span>
          <button
            onClick={() => setShowCashStore(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono font-bold text-[#00B4D8]/60 border border-[#00B4D8]/20 rounded-sm hover:text-[#00B4D8] hover:border-[#00B4D8]/40 transition-colors"
          >
            <PlusCircle className="w-2.5 h-2.5" />
            ADD FUNDS
          </button>
        </div>
      </div>
      <div className="p-2 space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          <div className="bg-white/[0.03] rounded-sm p-2 text-center">
            <p className="text-[8px] font-mono text-white/30">CASH</p>
            <p className="text-[11px] font-mono font-bold text-[#00B4D8]">${portfolio.cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white/[0.03] rounded-sm p-2 text-center">
            <p className="text-[8px] font-mono text-white/30">POSITIONS</p>
            <p className="text-[11px] font-mono font-bold text-[#00B4D8]">${portfolio.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white/[0.03] rounded-sm p-2 text-center">
            <p className="text-[8px] font-mono text-white/30">TOTAL</p>
            <p className="text-[11px] font-mono font-bold text-white">${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-white/[0.03] rounded-sm p-2 text-center">
            <p className="text-[8px] font-mono text-white/30">P&L</p>
            <p className={`text-[11px] font-mono font-bold ${pnl >= 0 ? 'text-[#00B4D8]' : 'text-[#ff3366]'}`}>{pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setTradeSide("buy")} className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-sm transition-colors ${tradeSide === "buy" ? "bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/30" : "bg-white/[0.03] text-white/30 border border-white/[0.06]"}`}>BUY</button>
          <button onClick={() => setTradeSide("sell")} className={`flex-1 py-1 text-[9px] font-mono font-bold rounded-sm transition-colors ${tradeSide === "sell" ? "bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/30" : "bg-white/[0.03] text-white/30 border border-white/[0.06]"}`}>SELL</button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <input value={tradeSymbol} onChange={e => setTradeSymbol(e.target.value.toUpperCase())} placeholder="AAPL" className="h-7 px-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/30" />
          <input value={tradeQty} onChange={e => setTradeQty(e.target.value)} placeholder="Qty" type="number" className="h-7 px-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/30" />
          <input value={tradePrice} onChange={e => setTradePrice(e.target.value)} placeholder="Price" type="number" step="0.01" className="h-7 px-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00B4D8]/30" />
        </div>

        <div className="flex gap-1">
          <button onClick={executeTrade} disabled={tradeLoading || !isSignedIn} className={`flex-1 h-7 text-[9px] font-mono font-bold rounded-sm transition-colors ${tradeSide === "buy" ? "bg-[#00B4D8] text-black hover:bg-[#00B4D8]/80" : "bg-[#ff3366] text-white hover:bg-[#ff3366]/80"} disabled:opacity-40`}>
            {tradeLoading ? "EXECUTING..." : `${tradeSide.toUpperCase()} ORDER`}
          </button>
          <button onClick={resetPortfolio} disabled={!isSignedIn} className="px-2 h-7 text-[9px] font-mono font-bold text-white/30 bg-white/[0.03] border border-white/[0.06] rounded-sm hover:text-white/50 transition-colors disabled:opacity-40">
            RESET
          </button>
        </div>

        <button
          onClick={() => setShowCashStore(true)}
          className="w-full flex items-center justify-center gap-1.5 h-7 text-[9px] font-mono font-bold text-[#00B4D8]/60 bg-[#00B4D8]/[0.04] border border-[#00B4D8]/[0.15] rounded-sm hover:text-[#00B4D8] hover:bg-[#00B4D8]/[0.08] transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          ADD FUNDS
        </button>

        {!isSignedIn && <p className="text-[9px] font-mono text-[#FFB800] text-center">Sign in to start paper trading</p>}

        {portfolio.positions.length > 0 && (
          <div className="border-t border-white/[0.06] pt-1.5">
            <p className="text-[8px] font-mono text-white/25 mb-1">OPEN POSITIONS</p>
            {portfolio.positions.map(p => (
              <div key={p.id} className="flex items-center justify-between py-0.5">
                <span className="text-[10px] font-mono font-bold text-[#00B4D8]">{p.symbol}</span>
                <span className="text-[9px] font-mono text-white/40">{p.quantity} shares @ ${p.avgCost.toFixed(2)}</span>
                <span className="text-[9px] font-mono text-white/60">${(p.quantity * p.avgCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
