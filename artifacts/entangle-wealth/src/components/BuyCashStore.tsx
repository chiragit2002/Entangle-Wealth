import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { X, DollarSign, Zap, Clock, TrendingUp, ShoppingCart } from "lucide-react";

interface VirtualCashProduct {
  productId: string;
  priceId: string;
  name: string;
  description: string;
  virtualAmount: number;
  unitAmount: number;
  currency: string;
}

interface PurchaseRecord {
  id: number;
  stripeSessionId: string;
  amountPaidCents: number;
  virtualAmountCredited: number;
  createdAt: string;
}

interface BuyCashStoreProps {
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

export function BuyCashStore({ onClose, onPurchaseSuccess }: BuyCashStoreProps) {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<VirtualCashProduct[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"store" | "history">("store");

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/virtual-cash-products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/stripe/virtual-cash-purchases", getToken);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      }
    } catch (err) {
      console.error("[BuyCashStore] Failed to load purchases:", err);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    loadProducts();
    loadPurchases();
  }, [loadProducts, loadPurchases]);

  const handleBuy = useCallback(async (priceId: string) => {
    if (!isSignedIn) {
      toast({ title: "Sign in required", description: "Please sign in to purchase virtual cash", variant: "destructive" });
      return;
    }

    setCheckoutLoading(priceId);
    try {
      const res = await authFetch("/stripe/create-virtual-cash-checkout", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Checkout Failed", description: data.error || "Please try again", variant: "destructive" });
      }
    } catch {
      toast({ title: "Checkout Failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  }, [isSignedIn, getToken, toast]);

  const formatVirtualAmount = (amount: number) => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const popularProductIndex = products.findIndex(p => p.virtualAmount === 100000);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 " onClick={onClose}>
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#0A0E1A] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#00FF41]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#00FF41]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono tracking-wide">BUY PRACTICE CASH</h2>
              <p className="text-[10px] font-mono text-white/30">Top up your paper trading account</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white/50 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab("store")}
            className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${activeTab === "store" ? "text-[#00FF41] border-b-2 border-[#00FF41] bg-[#00FF41]/[0.05]" : "text-white/30 hover:text-white/50"}`}
          >
            <ShoppingCart className="w-3 h-3 inline mr-1.5" />
            Store
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${activeTab === "history" ? "text-[#00FF41] border-b-2 border-[#00FF41] bg-[#00FF41]/[0.05]" : "text-white/30 hover:text-white/50"}`}
          >
            <Clock className="w-3 h-3 inline mr-1.5" />
            History
          </button>
        </div>

        <div className="p-5 max-h-[520px] overflow-y-auto">
          {activeTab === "store" && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-[#00FF41]/30 border-t-[#00FF41] rounded-full animate-spin" />
                    <p className="text-[10px] font-mono text-white/30">LOADING PACKAGES...</p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <DollarSign className="w-8 h-8 text-white/10" />
                  <p className="text-xs font-mono text-white/30">No packages available at this time</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {products.map((product, idx) => {
                    const isPopular = idx === popularProductIndex || (popularProductIndex === -1 && idx === Math.floor(products.length / 2));
                    const realPrice = (product.unitAmount / 100).toFixed(0);
                    const isLoading = checkoutLoading === product.priceId;
                    return (
                      <div
                        key={product.priceId}
                        className={`relative flex flex-col gap-2.5 p-4 rounded-lg border transition-all ${isPopular ? "border-[#00FF41]/40 bg-[#00FF41]/[0.04]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12]"}`}
                      >
                        {isPopular && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                            <span className="px-2 py-0.5 text-[8px] font-mono font-bold bg-[#00FF41] text-black rounded-full uppercase tracking-wide">
                              POPULAR
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Zap className={`w-3 h-3 ${isPopular ? "text-[#00FF41]" : "text-[#00D4FF]"}`} />
                          <span className="text-[9px] font-mono text-white/30 uppercase">Virtual Cash</span>
                        </div>

                        <div>
                          <p className={`text-2xl font-bold font-mono ${isPopular ? "text-[#00FF41]" : "text-white"}`}>
                            {formatVirtualAmount(product.virtualAmount)}
                          </p>
                          <p className="text-[9px] font-mono text-white/25 mt-0.5">
                            ${product.virtualAmount.toLocaleString()} practice dollars
                          </p>
                        </div>

                        <button
                          onClick={() => handleBuy(product.priceId)}
                          disabled={isLoading || !isSignedIn}
                          className={`w-full h-8 text-[10px] font-mono font-bold rounded-md transition-all disabled:opacity-40 ${isPopular ? "bg-[#00FF41] text-black hover:bg-[#00FF41]/80" : "bg-white/[0.06] text-white hover:bg-white/[0.10] border border-white/[0.08]"}`}
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                              LOADING...
                            </span>
                          ) : (
                            `BUY FOR $${realPrice}`
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isSignedIn && (
                <p className="text-center text-[10px] font-mono text-[#FFB800] mt-4">
                  Sign in to purchase virtual cash packages
                </p>
              )}
              <div className="mt-4 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <p className="text-[9px] font-mono text-white/40 text-center leading-relaxed">
                  Virtual cash is for paper trading practice only and has no real-world monetary value.
                  Payments are processed securely by Stripe.
                </p>
              </div>
            </>
          )}

          {activeTab === "history" && (
            <>
              {!isSignedIn ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Clock className="w-8 h-8 text-white/10" />
                  <p className="text-xs font-mono text-white/30">Sign in to view purchase history</p>
                </div>
              ) : purchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <ShoppingCart className="w-8 h-8 text-white/10" />
                  <p className="text-xs font-mono text-white/30">No purchases yet</p>
                  <button
                    onClick={() => setActiveTab("store")}
                    className="text-[10px] font-mono text-[#00FF41] hover:underline"
                  >
                    Browse packages →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-md bg-[#00FF41]/10 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-[#00FF41]" />
                        </div>
                        <div>
                          <p className="text-[11px] font-mono font-bold text-[#00FF41]">
                            +{formatVirtualAmount(purchase.virtualAmountCredited)} Virtual Cash
                          </p>
                          <p className="text-[9px] font-mono text-white/25">{formatDate(purchase.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-mono font-bold text-white">
                          ${(purchase.amountPaidCents / 100).toFixed(0)}
                        </p>
                        <p className="text-[9px] font-mono text-white/40 uppercase">paid</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
