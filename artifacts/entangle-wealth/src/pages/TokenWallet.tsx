import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Coins, TrendingUp, ArrowUpRight, ArrowDownRight, ExternalLink, Copy, Check, Loader2, Link2, RefreshCw, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface TokenBalance {
  balance: number;
  walletAddress: string | null;
  tokenValue: number;
  totalValue: number;
  sharePrice: number;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  txHash: string | null;
  status: string;
  createdAt: string;
}

export default function TokenWallet() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletInput, setWalletInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => authFetch(path, getToken, options), [getToken]);

  const loadData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.allSettled([
        fetchAuth("/token/balance"),
        fetchAuth("/token/transactions"),
      ]);
      if (balRes.status === "fulfilled" && balRes.value.ok) setBalance(await balRes.value.json());
      if (txRes.status === "fulfilled" && txRes.value.ok) {
        const txData = await txRes.value.json();
        setTransactions(Array.isArray(txData) ? txData : txData.items || []);
      }
    } catch {
    }
    setLoading(false);
  }, [fetchAuth]);

  useEffect(() => { loadData(); }, [loadData]);

  const linkWallet = async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletInput)) {
      toast({ title: "Invalid address", description: "Enter a valid Ethereum address (0x...)", variant: "destructive" });
      return;
    }
    setLinking(true);
    try {
      const res = await fetchAuth("/token/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletInput }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast({ title: "Wallet linked", description: "Your Ethereum wallet has been connected." });
      setShowLinkForm(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to link wallet", variant: "destructive" });
    } finally { setLinking(false); }
  };

  const copyAddress = () => {
    if (balance?.walletAddress) {
      navigator.clipboard.writeText(balance.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Coins className="w-8 h-8 text-yellow-400" />
              EntangleCoin Wallet
            </h1>
            <p className="text-muted-foreground mt-1">Your ENTGL token balance, transactions, and wallet</p>
          </div>
          <Button variant="outline" className="border-border gap-2" onClick={loadData}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-panel p-6 col-span-1 md:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rewards Balance</p>
                <p className="text-4xl font-bold font-mono text-yellow-400">
                  {(balance?.balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ ${(balance?.totalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Token Value</p>
                <p className="text-2xl font-bold font-mono text-primary">
                  ${(balance?.tokenValue || 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  25% of ${(balance?.sharePrice || 0).toFixed(2)} share
                </p>
              </div>
            </div>

            {balance?.walletAddress ? (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Linked Wallet:</span>
                  <code className="text-xs text-primary font-mono">
                    {balance.walletAddress.slice(0, 6)}...{balance.walletAddress.slice(-4)}
                  </code>
                  <button onClick={copyAddress} className="text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`https://sepolia.etherscan.io/address/${balance.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-border">
                {showLinkForm ? (
                  <div className="flex gap-2">
                    <Input
                      aria-label="Ethereum wallet address"
                      placeholder="0x... Ethereum wallet address"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") linkWallet(); }}
                      className="bg-muted/50 border-border font-mono text-sm"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button onClick={linkWallet} disabled={linking} aria-label="Link wallet" className="bg-primary text-black px-4">
                      {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowLinkForm(false)} aria-label="Cancel" className="text-muted-foreground">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="border-primary/30 text-primary gap-2" onClick={() => setShowLinkForm(true)}>
                    <Link2 className="w-4 h-4" /> Link Ethereum Wallet
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Network</span>
              </div>
              <p className="text-sm font-bold text-foreground">Ethereum (Sepolia Testnet)</p>
              <p className="text-xs text-muted-foreground mt-1">Off-chain ledger (pre-mainnet)</p>
            </div>
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Supply Info</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply</span>
                  <span className="font-mono text-foreground">100,000,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Founder (75%)</span>
                  <span className="font-mono text-foreground">75,000,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rewards (25%)</span>
                  <span className="font-mono text-yellow-400">25,000,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-primary" /> Transaction History
          </h2>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Earn ENTGL through monthly XP-based reward distributions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-white/5 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {tx.amount > 0 ? (
                        <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()} · {tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.amount > 0 ? "+" : ""}{Math.abs(tx.amount).toLocaleString()} ENTGL
                    </p>
                    {tx.txHash && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {tx.txHash.startsWith("sim_") ? "Off-chain record" : tx.txHash.slice(0, 10) + "..."}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
