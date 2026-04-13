import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Coins, Users, BarChart3, Send, Settings, Loader2, RefreshCw, AlertTriangle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface AdminStats {
  totalUsers: number;
  walletsLinked: number;
  totalCirculating: number;
  totalSupply: number;
  founderAllocation: number;
  rewardsPool: number;
  distributionMonths: number;
  bookings: number;
  bookingVolume: number;
  sharePrice: number;
  tokenValue: number;
}

export default function TokenAdmin() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [distributing, setDistributing] = useState(false);
  const [newSharePrice, setNewSharePrice] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => authFetch(path, getToken, options), [getToken]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchAuth("/token/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("[TokenAdmin] Failed to load stats:", err);
    }
    setLoading(false);
  }, [fetchAuth]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const triggerDistribution = async () => {
    if (!month) return;
    setDistributing(true);
    try {
      const res = await fetchAuth("/token/admin/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Distribution complete",
        description: `${data.distributed} users received rewards for ${month}`,
      });
      loadStats();
    } catch (err: any) {
      toast({ title: "Distribution failed", description: err.message, variant: "destructive" });
    } finally { setDistributing(false); }
  };

  const updateSharePrice = async () => {
    const price = parseFloat(newSharePrice);
    if (!price || price <= 0) {
      toast({ title: "Invalid price", description: "Enter a positive number", variant: "destructive" });
      return;
    }
    setUpdatingPrice(true);
    try {
      const res = await fetchAuth("/token/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharePrice: price }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Updated", description: `Share price set to $${price.toFixed(2)}, token value: $${(price * 0.25).toFixed(2)}` });
      setNewSharePrice("");
      loadStats();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setUpdatingPrice(false); }
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
              <Shield className="w-8 h-8 text-primary" />
              Token Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">Manage EntangleCoin supply, distributions, and valuation</p>
          </div>
          <Button variant="outline" className="border-white/10 gap-2" onClick={loadStats}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase">Total Users</p>
            <p className="text-xl font-bold font-mono text-white">{stats?.totalUsers || 0}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase">Wallets Linked</p>
            <p className="text-xl font-bold font-mono text-emerald-400">{stats?.walletsLinked || 0}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase">Circulating</p>
            <p className="text-xl font-bold font-mono text-yellow-400">{(stats?.totalCirculating || 0).toLocaleString()}</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <BarChart3 className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground uppercase">Distributions</p>
            <p className="text-xl font-bold font-mono text-purple-400">{stats?.distributionMonths || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" /> Supply Overview
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Total Supply</span>
                <span className="font-mono font-bold text-white">{(stats?.totalSupply || 0).toLocaleString()} ENTGL</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Founder (75%)</span>
                <span className="font-mono text-white">{(stats?.founderAllocation || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Rewards Pool (25%)</span>
                <span className="font-mono text-yellow-400">{(stats?.rewardsPool || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">In Circulation</span>
                <span className="font-mono text-emerald-400">{(stats?.totalCirculating || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">Share Price</span>
                <span className="font-mono text-primary">${(stats?.sharePrice || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Token Value (25%)</span>
                <span className="font-mono font-bold text-yellow-400">${(stats?.tokenValue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" /> Distribute Rewards
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Distribute ENTGL tokens to the top 100 users for a specific month based on leaderboard rankings.
              </p>
              <div className="flex gap-2">
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-white/5 border-white/10 font-mono"
                />
                <Button
                  onClick={triggerDistribution}
                  disabled={distributing}
                  className="bg-primary text-black hover:bg-primary/90 gap-2 whitespace-nowrap"
                >
                  {distributing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Distribute
                </Button>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Token Valuation
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Set the company share price. Token value = 25% of share price.
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`Current: $${(stats?.sharePrice || 40).toFixed(2)}`}
                  value={newSharePrice}
                  onChange={(e) => setNewSharePrice(e.target.value)}
                  className="bg-white/5 border-white/10 font-mono"
                />
                <Button
                  onClick={updateSharePrice}
                  disabled={updatingPrice}
                  className="bg-yellow-500 text-black hover:bg-yellow-400 gap-2 whitespace-nowrap"
                >
                  {updatingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Marketplace Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-4 text-center border border-white/5">
              <p className="text-xs text-muted-foreground uppercase mb-1">Total Bookings</p>
              <p className="text-2xl font-bold font-mono text-white">{stats?.bookings || 0}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4 text-center border border-white/5">
              <p className="text-xs text-muted-foreground uppercase mb-1">Booking Volume</p>
              <p className="text-2xl font-bold font-mono text-yellow-400">{(stats?.bookingVolume || 0).toLocaleString()} ENTGL</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4 text-center border border-white/5">
              <p className="text-xs text-muted-foreground uppercase mb-1">Booking USD Value</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                ${((stats?.bookingVolume || 0) * (stats?.tokenValue || 10)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-xs text-yellow-400/80 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Admin panel is restricted to admin-tier accounts. Token operations in demo mode use simulated blockchain transactions.
            Mainnet deployment requires security audit.
          </p>
        </div>
      </div>
    </Layout>
  );
}
