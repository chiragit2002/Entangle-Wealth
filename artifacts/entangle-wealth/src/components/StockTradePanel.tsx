import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, Layers, Clock, ChevronDown, X, WifiOff, TrendingDown } from "lucide-react";
import { StockSearchDropdown } from "@/components/StockSearchDropdown";

interface Position {
  id: number;
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice?: number;
  unrealizedPnl?: number;
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

interface PaperOrder {
  id: number;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  expiresAt: string | null;
  status: string;
  filledAt: string | null;
  filledPrice: number | null;
  reservedCash: number;
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
  marketDataAvailable?: boolean;
}

const EXPIRATIONS = ["Apr 18", "Apr 25", "May 2", "May 16", "Jun 20", "Sep 19", "Dec 19", "Jan 2027"];

type OrderSide = "buy" | "sell" | "short_sell" | "short_cover";
type OrderType = "market" | "limit" | "stop" | "time_based";
type TabType = "stocks" | "options" | "orders";

interface StockTradePanelProps {
  symbol?: string;
  currentPrice?: number;
  allowSymbolSearch?: boolean;
}

export function StockTradePanel({ symbol: propSymbol = "", currentPrice, allowSymbolSearch = false }: StockTradePanelProps) {
  const { toast } = useToast();
  const { isSignedIn, getToken } = useAuth();
  const [tab, setTab] = useState<TabType>("stocks");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PaperOrder[]>([]);
  const [marketDataUnavailable, setMarketDataUnavailable] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState(propSymbol);
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(currentPrice);

  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [qty, setQty] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState(EXPIRATIONS[0]);
  const [contracts, setContracts] = useState("");
  const [premium, setPremium] = useState("");

  const symbol = selectedSymbol || propSymbol;
  const livePrice = selectedPrice ?? currentPrice;

  useEffect(() => {
    if (propSymbol) setSelectedSymbol(propSymbol);
  }, [propSymbol]);

  useEffect(() => {
    if (currentPrice) setSelectedPrice(currentPrice);
  }, [currentPrice]);

  useEffect(() => {
    if (livePrice && symbol) {
      const step = livePrice > 500 ? 10 : livePrice > 100 ? 5 : livePrice > 50 ? 2.5 : 1;
      setStrike((Math.round(livePrice / step) * step).toFixed(2));
      const estimatedPremium = livePrice * 0.03;
      setPremium(estimatedPremium.toFixed(2));
    }
  }, [livePrice, symbol]);

  const loadPortfolio = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/portfolio", getToken);
      if (res.ok) {
        const data = await res.json();
        setPortfolio({
          ...data,
          portfolioValue: data.portfolioValue ?? 0,
          totalValue: data.totalValue ?? data.cashBalance,
        });
        if (data.marketDataAvailable === false) setMarketDataUnavailable(true);
        else setMarketDataUnavailable(false);
      }
    } catch { /* silent */ }
  }, [isSignedIn, getToken]);

  const loadOrders = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/paper-trading/orders?status=pending", getToken);
      if (res.ok) {
        const data = await res.json();
        setPendingOrders(data.orders ?? []);
      }
    } catch { /* silent */ }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    loadPortfolio();
    loadOrders();
  }, [loadPortfolio, loadOrders]);

  const executeStockTrade = useCallback(async () => {
    if (!qty) {
      toast({ title: "Missing fields", description: "Enter quantity", variant: "destructive" });
      return;
    }
    if (!symbol) {
      toast({ title: "Missing fields", description: "Select a stock", variant: "destructive" });
      return;
    }
    if (orderType === "limit" && !limitPrice) {
      toast({ title: "Missing fields", description: "Enter limit price", variant: "destructive" });
      return;
    }
    if (orderType === "stop" && !stopPrice) {
      toast({ title: "Missing fields", description: "Enter stop price", variant: "destructive" });
      return;
    }
    if (orderType === "time_based" && !expiresAt) {
      toast({ title: "Missing fields", description: "Enter expiration date/time", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        symbol: symbol.toUpperCase(),
        side,
        quantity: Number(qty),
        orderType,
      };
      if (orderType === "limit" && limitPrice) body.limitPrice = Number(limitPrice);
      if (orderType === "stop" && stopPrice) body.stopPrice = Number(stopPrice);
      if (orderType === "time_based" && expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

      const res = await authFetch("/paper-trading/trade", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data: { message?: string; error?: string; marketDataUnavailable?: boolean };
      try { data = await res.json(); } catch { data = { error: "ORDER FAILED — PLEASE RETRY" }; }

      if (res.status === 503 || data.marketDataUnavailable) {
        setMarketDataUnavailable(true);
        toast({ title: "Market Data Unavailable", description: data.error || "Trading paused", variant: "destructive" });
        return;
      }

      if (res.ok && !data.error) {
        toast({ title: "Order Placed", description: data.message || "Trade placed successfully" });
        setQty("");
        setLimitPrice("");
        setStopPrice("");
        setExpiresAt("");
        loadPortfolio();
        loadOrders();
      } else {
        toast({ title: "ORDER FAILED", description: data.error || `Server error (${res.status})`, variant: "destructive" });
      }
    } catch {
      toast({ title: "ORDER FAILED", description: "Network error. Please check your connection.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [symbol, side, qty, orderType, limitPrice, stopPrice, expiresAt, getToken, toast, loadPortfolio, loadOrders]);

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
          side: side === "buy" || side === "sell" ? side : "buy",
          contracts: Number(contracts),
          premium: Number(premium),
        }),
      });
      let data: { message?: string; error?: string; marketDataUnavailable?: boolean };
      try { data = await res.json(); } catch { data = { error: "ORDER FAILED — PLEASE RETRY" }; }
      if (res.status === 503 || data.marketDataUnavailable) {
        setMarketDataUnavailable(true);
        toast({ title: "Market Data Unavailable", description: data.error || "Trading paused", variant: "destructive" });
        return;
      }
      if (res.ok && !data.error) {
        toast({ title: "Options Trade Executed", description: data.message || "Trade placed successfully" });
        setContracts("");
        loadPortfolio();
      } else {
        toast({ title: "ORDER FAILED", description: data.error || `Server error (${res.status})`, variant: "destructive" });
      }
    } catch {
      toast({ title: "ORDER FAILED", description: "Network error.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [symbol, optionType, strike, expiration, side, contracts, premium, getToken, toast, loadPortfolio]);

  const cancelOrder = useCallback(async (orderId: number) => {
    try {
      const res = await authFetch(`/paper-trading/orders/${orderId}`, getToken, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: "Order cancelled", description: "Reserved funds have been refunded." });
        loadOrders();
        loadPortfolio();
      } else {
        toast({ title: "Error", description: data.error || "Failed to cancel order", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
  }, [getToken, toast, loadOrders, loadPortfolio]);

  const pnl = portfolio ? portfolio.totalValue - portfolio.startingCash : 0;
  const pnlPct = portfolio ? ((pnl / portfolio.startingCash) * 100).toFixed(2) : "0.00";

  const symbolPositions = portfolio?.positions.filter(p => p.symbol === symbol.toUpperCase()) ?? [];
  const symbolOptionsPositions = portfolio?.optionsPositions?.filter(p => p.symbol === symbol.toUpperCase()) ?? [];
  const symbolPendingOrders = pendingOrders.filter(o => o.symbol === symbol.toUpperCase());

  const totalEstimate = tab === "stocks"
    ? (Number(qty) || 0) * (orderType === "limit" ? (Number(limitPrice) || livePrice || 0) : orderType === "stop" ? (Number(stopPrice) || livePrice || 0) : (livePrice || 0))
    : (Number(contracts) || 0) * (Number(premium) || 0) * 100;

  const sideButtons: { id: OrderSide; label: string; color: string; bg: string; borderColor: string }[] = [
    { id: "buy", label: "BUY", color: "#FF8C00", bg: "#FF8C00/15", borderColor: "#FF8C00/30" },
    { id: "sell", label: "SELL", color: "#ff3366", bg: "#ff3366/15", borderColor: "#ff3366/30" },
    { id: "short_sell", label: "SHORT", color: "#9c27b0", bg: "#9c27b0/15", borderColor: "#9c27b0/30" },
    { id: "short_cover", label: "COVER", color: "#0099cc", bg: "#0099cc/15", borderColor: "#0099cc/30" },
  ];

  const activeSideConfig = sideButtons.find(b => b.id === side) ?? sideButtons[0];

  return (
    <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden" role="region" aria-label={`Paper trade panel${symbol ? ` for ${symbol}` : ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#FF8C00]" />
          <span className="text-sm font-bold text-white">{symbol ? `Trade ${symbol}` : "Paper Trading"}</span>
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

      {marketDataUnavailable && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#ff3366]/10 border-b border-[#ff3366]/20">
          <WifiOff className="w-3.5 h-3.5 text-[#ff3366] flex-shrink-0" />
          <span className="text-xs text-[#ff3366]">Market data unavailable — trading is paused</span>
        </div>
      )}

      {allowSymbolSearch && (
        <div className="px-4 pt-3">
          <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Stock</label>
          <StockSearchDropdown
            onSelect={(sym, _name, price) => {
              setSelectedSymbol(sym);
              setSelectedPrice(price);
            }}
            value={selectedSymbol}
            placeholder="Search stock (e.g. AAPL)"
            disabled={marketDataUnavailable}
          />
        </div>
      )}

      <div className="flex border-b border-white/[0.06]" role="tablist">
        {(["stocks", "options", "orders"] as TabType[]).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${tab === t ? "text-[#FF8C00] border-b-2 border-[#FF8C00] bg-[#FF8C00]/[0.04]" : "text-white/40 hover:text-white/60"}`}
          >
            {t === "stocks" && <><BarChart3 className="w-3.5 h-3.5" /> Stocks</>}
            {t === "options" && <><Layers className="w-3.5 h-3.5" /> Options</>}
            {t === "orders" && (
              <>
                <Clock className="w-3.5 h-3.5" /> Open Orders
                {symbolPendingOrders.length > 0 && (
                  <span className="text-[9px] bg-[#FF8C00] text-black rounded-full px-1.5 py-0.5 font-bold ml-0.5">
                    {symbolPendingOrders.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {tab === "orders" ? (
        <div className="p-4">
          {symbolPendingOrders.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 mx-auto mb-2 text-white/10" />
              <p className="text-xs text-white/30">No open orders{symbol ? ` for ${symbol}` : ""}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {symbolPendingOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.06]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold font-mono text-white">{order.symbol}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${order.side === "buy" ? "bg-[#FF8C00]/20 text-[#FF8C00]" : order.side === "sell" ? "bg-[#ff3366]/20 text-[#ff3366]" : order.side === "short_sell" ? "bg-[#9c27b0]/20 text-[#9c27b0]" : "bg-[#0099cc]/20 text-[#0099cc]"}`}>
                        {order.side.replace("_", " ")}
                      </span>
                      <span className="text-[9px] text-white/30 uppercase">{order.orderType}</span>
                    </div>
                    <p className="text-[10px] font-mono text-white/50">
                      {order.quantity} shares
                      {order.limitPrice ? ` @ limit $${order.limitPrice.toFixed(2)}` : ""}
                      {order.stopPrice ? ` @ stop $${order.stopPrice.toFixed(2)}` : ""}
                      {order.expiresAt ? ` · expires ${new Date(order.expiresAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="ml-2 p-1.5 rounded-lg text-white/30 hover:text-[#ff3366] hover:bg-[#ff3366]/10 transition-colors flex-shrink-0"
                    aria-label="Cancel order"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Trade direction">
            {sideButtons.map(btn => (
              <button
                key={btn.id}
                onClick={() => setSide(btn.id)}
                aria-pressed={side === btn.id}
                className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  side === btn.id
                    ? `border`
                    : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10"
                }`}
                style={side === btn.id ? {
                  backgroundColor: `${btn.color}20`,
                  color: btn.color,
                  borderColor: `${btn.color}40`,
                } : {}}
              >
                {btn.label}
              </button>
            ))}
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
                    aria-label="Number of shares"
                    disabled={marketDataUnavailable}
                    className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Order Type</label>
                  <select
                    value={orderType}
                    onChange={e => setOrderType(e.target.value as OrderType)}
                    disabled={marketDataUnavailable}
                    className="w-full h-9 px-2 text-xs font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-[#FF8C00]/30 disabled:opacity-50 [&>option]:bg-[#0a0a16]"
                  >
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                    <option value="stop">Stop</option>
                    <option value="time_based">Time-Based</option>
                  </select>
                </div>
              </div>

              {orderType === "limit" && (
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Limit Price ($)</label>
                  <input
                    value={limitPrice}
                    onChange={e => setLimitPrice(e.target.value)}
                    placeholder={livePrice ? livePrice.toFixed(2) : "0.00"}
                    type="number"
                    step="0.01"
                    className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                  />
                </div>
              )}

              {orderType === "stop" && (
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Stop Price ($)</label>
                  <input
                    value={stopPrice}
                    onChange={e => setStopPrice(e.target.value)}
                    placeholder={livePrice ? livePrice.toFixed(2) : "0.00"}
                    type="number"
                    step="0.01"
                    className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30"
                  />
                </div>
              )}

              {orderType === "time_based" && (
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Expires At</label>
                  <input
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-[#FF8C00]/30"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2" role="group" aria-label="Option type">
                {(["CALL", "PUT"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setOptionType(t)}
                    aria-pressed={optionType === t}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      optionType === t
                        ? t === "CALL" ? "bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30" : "bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/30"
                        : "bg-white/[0.03] text-white/40 border border-white/[0.06]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Strike</label>
                  <input value={strike} onChange={e => setStrike(e.target.value)} placeholder="Strike" type="number" step="0.01" className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30" />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Expiration</label>
                  <select value={expiration} onChange={e => setExpiration(e.target.value)} className="w-full h-9 px-2 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-[#FF8C00]/30 [&>option]:bg-[#0a0a16]">
                    {EXPIRATIONS.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Contracts</label>
                  <input value={contracts} onChange={e => setContracts(e.target.value)} placeholder="1" type="number" className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30" />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-white/30 uppercase mb-1 block">Premium</label>
                  <input value={premium} onChange={e => setPremium(e.target.value)} placeholder="0.00" type="number" step="0.01" className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF8C00]/30" />
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
            disabled={loading || !isSignedIn || marketDataUnavailable || !symbol}
            aria-label={`Execute ${side} ${tab} trade`}
            className="w-full py-2.5 text-sm font-bold rounded-lg transition-all disabled:opacity-40"
            style={{
              backgroundColor: marketDataUnavailable ? "#444" : activeSideConfig.color === "#FF8C00" ? "#FF8C00" : activeSideConfig.color,
              color: activeSideConfig.color === "#FF8C00" ? "#000" : "#fff",
            }}
          >
            {loading
              ? "Executing..."
              : marketDataUnavailable
                ? "Market Data Unavailable"
                : !symbol
                  ? "Select a stock"
                  : `${side.toUpperCase().replace("_", " ")} ${tab === "stocks" ? `${qty || 0} ${symbol}` : `${contracts || 0} ${symbol} $${strike} ${optionType}`}${orderType !== "market" ? ` (${orderType})` : ""}`
            }
          </button>

          {!isSignedIn && (
            <p className="text-[10px] font-mono text-[#FFB800] text-center">Sign in to start paper trading</p>
          )}
        </div>
      )}

      {(symbolPositions.length > 0 || symbolOptionsPositions.length > 0) && tab !== "orders" && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-2">
          <p className="text-[9px] font-mono text-white/30 uppercase font-bold">Your {symbol} Positions</p>
          {symbolPositions.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-[#FF8C00]" />
                <span className={`text-xs font-mono font-bold ${p.quantity < 0 ? "text-[#9c27b0]" : "text-white"}`}>
                  {p.quantity < 0 ? `${Math.abs(p.quantity)} short` : `${p.quantity} shares`}
                </span>
              </div>
              <span className="text-[10px] font-mono text-white/50">avg ${Math.abs(p.avgCost).toFixed(2)}</span>
              {p.unrealizedPnl !== undefined && (
                <span className={`text-xs font-mono ${p.unrealizedPnl >= 0 ? "text-emerald-400" : "text-[#ff3366]"}`}>
                  {p.unrealizedPnl >= 0 ? "+" : ""}${p.unrealizedPnl.toFixed(2)}
                </span>
              )}
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
