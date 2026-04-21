import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import {
  Link2, Unlink, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  ExternalLink, ArrowRight, Shield, Loader2, ChevronRight, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ConnectedAccount {
  id: number;
  provider: string;
  providerEmail: string | null;
  status: string;
  lastSyncAt: string | null;
  connectedAt: string | null;
  metadata: Record<string, unknown>;
}

interface ProviderInfo {
  id: string;
  name: string;
  logo: string;
  color: string;
  tagline: string;
  category: "accounting" | "tax";
  features: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    logo: "QB",
    color: "#2CA01C",
    tagline: "Intuit QuickBooks Online",
    category: "accounting",
    features: ["Auto-import expenses", "Sync invoices", "Categorize deductions"],
  },
  {
    id: "xero",
    name: "Xero",
    logo: "XR",
    color: "#13B5EA",
    tagline: "Beautiful accounting software",
    category: "accounting",
    features: ["Bank feeds", "Receipt capture sync", "Real-time reporting"],
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    logo: "FB",
    color: "#0075DD",
    tagline: "Cloud accounting for small biz",
    category: "accounting",
    features: ["Expense tracking", "Time tracking", "Project profitability"],
  },
  {
    id: "wave",
    name: "Wave",
    logo: "WV",
    color: "#1C6DD0",
    tagline: "Free financial software",
    category: "accounting",
    features: ["Free invoicing", "Receipt scanning", "Financial reports"],
  },
  {
    id: "sage",
    name: "Sage",
    logo: "SG",
    color: "#00DC00",
    tagline: "Sage Business Cloud",
    category: "accounting",
    features: ["Multi-entity", "Cash flow forecasting", "Tax compliance"],
  },
  {
    id: "zohobooks",
    name: "Zoho Books",
    logo: "ZB",
    color: "#E42527",
    tagline: "Smart online accounting",
    category: "accounting",
    features: ["Auto bank feeds", "GST/VAT ready", "Inventory tracking"],
  },
  {
    id: "hrblock",
    name: "H&R Block",
    logo: "HR",
    color: "#00A651",
    tagline: "Tax preparation & filing",
    category: "tax",
    features: ["Tax return import", "Deduction matching", "Filing status sync"],
  },
  {
    id: "turbotax",
    name: "TurboTax",
    logo: "TT",
    color: "#003DA5",
    tagline: "Intuit TurboTax",
    category: "tax",
    features: ["Auto-fill deductions", "W-2 import", "Tax document sync"],
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await authFetch("/integrations/accounting", getToken);
      const data = await res.json();
      setConnections(data.accounts || []);
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const isConnected = (providerId: string) =>
    connections.some((c) => c.provider === providerId && c.status === "connected");

  const getConnection = (providerId: string) =>
    connections.find((c) => c.provider === providerId && c.status === "connected");

  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);
    try {
      const res = await authFetch("/integrations/accounting/connect", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Connection failed");
      }
      await fetchConnections();
      toast({
        title: "Connected",
        description: `${PROVIDERS.find((p) => p.id === providerId)?.name} has been connected successfully.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Could not connect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (providerId: string) => {
    setDisconnecting(providerId);
    try {
      const res = await authFetch("/integrations/accounting/disconnect", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      await fetchConnections();
      toast({ title: "Disconnected", description: "Integration removed." });
    } catch {
      toast({ title: "Error", description: "Could not disconnect.", variant: "destructive" });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSync = async (providerId: string) => {
    setSyncing(providerId);
    try {
      const res = await authFetch("/integrations/accounting/sync", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      await fetchConnections();
      toast({
        title: "Sync Complete",
        description: data.summary?.message || "Your data has been synced.",
      });
    } catch {
      toast({ title: "Sync Failed", description: "Could not sync data.", variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const accountingProviders = PROVIDERS.filter((p) => p.category === "accounting");
  const taxProviders = PROVIDERS.filter((p) => p.category === "tax");

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#0099cc] flex items-center justify-center">
            <Link2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Connected Accounts</h1>
            <p className="text-[12px] text-muted-foreground">
              Link your accounting & tax software to auto-import expenses and deductions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-6">
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[22px] font-extrabold font-mono text-primary">{connectedCount}</p>
            <p className="text-[11px] text-muted-foreground/70">Connected</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[22px] font-extrabold font-mono text-secondary">{PROVIDERS.length}</p>
            <p className="text-[11px] text-muted-foreground/70">Available</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <p className="text-[22px] font-extrabold font-mono text-[#00B4D8]">
              {connections.filter((c) => c.lastSyncAt).length}
            </p>
            <p className="text-[11px] text-muted-foreground/70">Synced</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Shield className="w-4 h-4 text-[#9c27b0]" />
              <p className="text-[12px] font-bold text-[#9c27b0]">256-bit</p>
            </div>
            <p className="text-[11px] text-muted-foreground/70">Encrypted</p>
          </div>
        </div>

        <Link href="/receipts">
          <div className="glass-panel rounded-xl p-4 mb-6 border border-primary/10 hover:border-primary/30 cursor-pointer transition-all group flex items-center gap-3">
            <Receipt className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground/70 group-hover:text-foreground transition-colors">
                Connected accounts auto-import into your Receipt Tracker
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary flex-shrink-0" />
          </div>
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <h2 className="text-[15px] font-bold text-foreground/70 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Accounting Software
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {accountingProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  connected={isConnected(provider.id)}
                  connection={getConnection(provider.id)}
                  connecting={connecting === provider.id}
                  syncing={syncing === provider.id}
                  disconnecting={disconnecting === provider.id}
                  onConnect={() => handleConnect(provider.id)}
                  onDisconnect={() => handleDisconnect(provider.id)}
                  onSync={() => handleSync(provider.id)}
                />
              ))}
            </div>

            <h2 className="text-[15px] font-bold text-foreground/70 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              Tax Preparation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {taxProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  connected={isConnected(provider.id)}
                  connection={getConnection(provider.id)}
                  connecting={connecting === provider.id}
                  syncing={syncing === provider.id}
                  disconnecting={disconnecting === provider.id}
                  onConnect={() => handleConnect(provider.id)}
                  onDisconnect={() => handleDisconnect(provider.id)}
                  onSync={() => handleSync(provider.id)}
                />
              ))}
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.02)]">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-secondary mb-1">Security & Privacy</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    All connections use OAuth 2.0 authorization. We never store your
                    accounting passwords — only scoped access tokens. You can revoke access at any time
                    from this page or from your provider&apos;s settings.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function ProviderCard({
  provider,
  connected,
  connection,
  connecting,
  syncing,
  disconnecting,
  onConnect,
  onDisconnect,
  onSync,
}: {
  provider: ProviderInfo;
  connected: boolean;
  connection: ConnectedAccount | undefined;
  connecting: boolean;
  syncing: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
}) {
  const lastSync = connection?.lastSyncAt
    ? new Date(connection.lastSyncAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const connectedAt = connection?.connectedAt
    ? new Date(connection.connectedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`glass-panel rounded-xl p-4 border transition-all ${
        connected
          ? "border-[#00B4D8]/20 bg-[#00B4D8]/[0.02]"
          : "border-border hover:border-border"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-[14px] text-foreground flex-shrink-0"
          style={{ backgroundColor: `${provider.color}20`, color: provider.color }}
        >
          {provider.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold truncate">{provider.name}</h3>
            {connected && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#00B4D8] bg-[#00B4D8]/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> LINKED
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground/70">{provider.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {provider.features.map((f) => (
          <span key={f} className="text-[10px] text-muted-foreground/50 bg-muted/50 px-2 py-0.5 rounded-full">
            {f}
          </span>
        ))}
      </div>

      {connected ? (
        <div className="space-y-2">
          {lastSync && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Clock className="w-3 h-3" />
              Last synced: {lastSync}
            </div>
          )}
          {connectedAt && !lastSync && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Clock className="w-3 h-3" />
              Connected: {connectedAt}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 text-[12px] min-h-[36px] gap-1.5"
              onClick={onSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-[12px] min-h-[36px] gap-1.5"
              onClick={onDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Unlink className="w-3.5 h-3.5" />
              )}
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="w-full text-[13px] font-bold min-h-[40px] gap-2"
          style={{ backgroundColor: provider.color, color: "hsl(var(--foreground))" }}
          onClick={onConnect}
          disabled={connecting}
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          {connecting ? "Connecting..." : `Connect ${provider.name}`}
        </Button>
      )}
    </div>
  );
}
