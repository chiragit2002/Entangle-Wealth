import { useState, useEffect, useCallback } from "react";
import { trackEvent } from "@/lib/trackEvent";
import { Layout } from "@/components/layout/Layout";
import { fetchAlpacaSnapshots } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { FinancialDisclaimerBanner } from "@/components/FinancialDisclaimerBanner";

const SECTOR_STOCKS: Record<string, string[]> = {
  Technology: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AVGO", "AMD", "CRM", "ADBE", "INTC"],
  Healthcare: ["LLY", "UNH", "JNJ", "MRNA", "PFE", "ABBV", "AMGN", "GILD", "VRTX", "REGN"],
  "Consumer Cyclical": ["AMZN", "TSLA", "HD", "NKE", "SBUX", "MCD", "BKNG", "LULU", "RIVN", "LCID"],
  Financials: ["JPM", "V", "MA", "GS", "BAC", "WFC", "AXP", "MS", "SCHW", "BLK"],
  Energy: ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "VLO", "PSX", "OXY", "HAL"],
  Industrials: ["BA", "CAT", "UPS", "LMT", "RTX", "HON", "GE", "DE", "UNP", "FDX"],
  "Comm Services": ["NFLX", "DIS", "TMUS", "CMCSA", "RBLX", "SPOT", "SNAP", "PINS", "ROKU", "ZM"],
  "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "SPG", "O", "DLR", "PSA", "VICI", "WELL"],
};

interface SectorData {
  name: string;
  avgChange: number;
  totalVolume: number;
  gainers: number;
  losers: number;
  neutral: number;
  momentum: "bullish" | "bearish" | "neutral";
  topMover: { symbol: string; change: number };
  worstMover: { symbol: string; change: number };
  stocks: { symbol: string; price: number; change: number; volume: number }[];
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#00B4D8",
  Healthcare: "#00B4D8",
  "Consumer Cyclical": "#FFB800",
  Financials: "#FFB800",
  Energy: "#ff4466",
  Industrials: "#9c27b0",
  "Comm Services": "#ff9800",
  "Real Estate": "#2196f3",
};

function RadarChart({ sectors }: { sectors: SectorData[] }) {
  const size = 400;
  const center = size / 2;
  const maxRadius = 150;
  const maxChange = Math.max(...sectors.map((s) => Math.abs(s.avgChange)), 0.5);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-md mx-auto">
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <circle key={i} cx={center} cy={center} r={maxRadius * r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} stroke="rgba(255,255,255,0.04)" />
      <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} stroke="rgba(255,255,255,0.04)" />

      {sectors.map((sector, i) => {
        const angle = (i / sectors.length) * Math.PI * 2 - Math.PI / 2;
        const magnitude = Math.min(Math.abs(sector.avgChange) / maxChange, 1);
        const radius = Math.max(magnitude * maxRadius, 20);
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const labelX = center + Math.cos(angle) * (maxRadius + 30);
        const labelY = center + Math.sin(angle) * (maxRadius + 30);
        const color = SECTOR_COLORS[sector.name] || "#888";

        return (
          <g key={sector.name}>
            <line x1={center} y1={center} x2={x} y2={y} stroke={color} strokeWidth="2" opacity="0.5" />
            <circle cx={x} cy={y} r={6 + magnitude * 8} fill={color} opacity="0.25">
              <animate attributeName="r" values={`${6 + magnitude * 8};${8 + magnitude * 10};${6 + magnitude * 8}`} dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r={4} fill={color} />
            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="9" fontWeight="bold" fontFamily="Inter">
              {sector.name.length > 12 ? sector.name.slice(0, 12) + "…" : sector.name}
            </text>
            <text x={labelX} y={labelY + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="JetBrains Mono">
              {sector.avgChange >= 0 ? "+" : ""}{Math.abs(sector.avgChange).toFixed(2)}%
            </text>
          </g>
        );
      })}
      <circle cx={center} cy={center} r={3} fill="#00B4D8" opacity="0.8" />
    </svg>
  );
}

function FlowBar({ sector }: { sector: SectorData }) {
  const total = sector.gainers + sector.losers + sector.neutral;
  const gPct = total > 0 ? (sector.gainers / total) * 100 : 0;
  const lPct = total > 0 ? (sector.losers / total) * 100 : 0;
  const color = SECTOR_COLORS[sector.name] || "#888";

  return (
    <div className="mobile-card mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-sm font-bold">{sector.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {sector.momentum === "bullish" ? <ArrowUpRight className="w-4 h-4 text-[#00B4D8]" />
            : sector.momentum === "bearish" ? <ArrowDownRight className="w-4 h-4 text-[#ff4466]" />
            : <Activity className="w-4 h-4 text-[#5a5a7a]" />}
          <span className={`font-mono text-sm font-bold ${sector.avgChange >= 0 ? "text-[#00B4D8]" : "text-[#ff4466]"}`}>
            {sector.avgChange >= 0 ? "+" : ""}{Math.abs(sector.avgChange).toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-2">
        <div className="bg-[#00B4D8] rounded-l-full" style={{ width: `${gPct}%` }} />
        <div className="bg-[#5a5a7a]" style={{ width: `${100 - gPct - lPct}%` }} />
        <div className="bg-[#ff4466] rounded-r-full" style={{ width: `${lPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span className="text-[#00B4D8]">{sector.gainers} up</span>
        <span>Vol: {(sector.totalVolume / 1e6).toFixed(1)}M</span>
        <span className="text-[#ff4466]">{sector.losers} down</span>
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-border">
        <div className="text-[10px]">
          <span className="text-[#00B4D8] font-mono font-bold">{sector.topMover.symbol}</span>
          <span className="text-[#00B4D8] ml-1">{sector.topMover.change >= 0 ? "+" : ""}{Math.abs(sector.topMover.change).toFixed(1)}%</span>
        </div>
        <div className="text-[10px]">
          <span className="text-[#ff4466] font-mono font-bold">{sector.worstMover.symbol}</span>
          <span className="text-[#ff4466] ml-1">{Math.abs(sector.worstMover.change).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function SectorFlow() {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const buildSimulatedSectors = (): SectorData[] => {
    const seed = [
      { name: "Technology", avgChange: 1.42, gainers: 8, losers: 1, neutral: 1, topSymbol: "NVDA", topChange: 3.2, worstSymbol: "INTC", worstChange: -0.8, volume: 2_400_000_000 },
      { name: "Healthcare", avgChange: 0.61, gainers: 6, losers: 2, neutral: 2, topSymbol: "LLY", topChange: 2.1, worstSymbol: "MRNA", worstChange: -0.9, volume: 890_000_000 },
      { name: "Financials", avgChange: 0.38, gainers: 5, losers: 3, neutral: 2, topSymbol: "GS", topChange: 1.4, worstSymbol: "SCHW", worstChange: -0.5, volume: 1_200_000_000 },
      { name: "Consumer Cyclical", avgChange: -0.22, gainers: 4, losers: 5, neutral: 1, topSymbol: "AMZN", topChange: 0.9, worstSymbol: "RIVN", worstChange: -2.1, volume: 1_050_000_000 },
      { name: "Energy", avgChange: -0.84, gainers: 2, losers: 7, neutral: 1, topSymbol: "COP", topChange: 0.3, worstSymbol: "HAL", worstChange: -2.4, volume: 780_000_000 },
      { name: "Industrials", avgChange: 0.17, gainers: 5, losers: 4, neutral: 1, topSymbol: "CAT", topChange: 1.1, worstSymbol: "FDX", worstChange: -0.8, volume: 620_000_000 },
      { name: "Comm Services", avgChange: 0.95, gainers: 7, losers: 2, neutral: 1, topSymbol: "NFLX", topChange: 2.8, worstSymbol: "ZM", worstChange: -0.6, volume: 940_000_000 },
      { name: "Real Estate", avgChange: -0.31, gainers: 3, losers: 6, neutral: 1, topSymbol: "EQIX", topChange: 0.7, worstSymbol: "O", worstChange: -1.2, volume: 340_000_000 },
    ];
    return seed.map(s => ({
      name: s.name,
      avgChange: s.avgChange,
      totalVolume: s.volume,
      gainers: s.gainers,
      losers: s.losers,
      neutral: s.neutral,
      momentum: s.avgChange > 0.3 ? "bullish" : s.avgChange < -0.3 ? "bearish" : "neutral",
      topMover: { symbol: s.topSymbol, change: s.topChange },
      worstMover: { symbol: s.worstSymbol, change: s.worstChange },
      stocks: [],
    })).sort((a, b) => b.avgChange - a.avgChange) as SectorData[];
  };

  const loadData = useCallback(async () => {
    trackEvent("sector_flow_refreshed");
    setSectors(buildSimulatedSectors());
    setLastUpdate("simulated");
    setLoading(false);
    try {
      const allSymbols = Object.values(SECTOR_STOCKS).flat();
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000));
      const snapshots = await Promise.race([fetchAlpacaSnapshots(allSymbols), timeoutPromise]);
      const sectorResults: SectorData[] = [];

      for (const [sectorName, symbols] of Object.entries(SECTOR_STOCKS)) {
        const stocks: { symbol: string; price: number; change: number; volume: number }[] = [];
        for (const sym of symbols) {
          const snap = snapshots[sym];
          if (!snap) continue;
          const price = snap.minuteBar?.c || snap.dailyBar?.c || snap.latestTrade?.p || 0;
          const change = snap.dailyBar ? ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o * 100) : 0;
          const volume = snap.dailyBar?.v || 0;
          stocks.push({ symbol: sym, price, change, volume });
        }
        if (stocks.length === 0) continue;

        const avgChange = stocks.reduce((a, b) => a + b.change, 0) / stocks.length;
        const totalVolume = stocks.reduce((a, b) => a + b.volume, 0);
        const gainers = stocks.filter((s) => s.change > 0.1).length;
        const losers = stocks.filter((s) => s.change < -0.1).length;
        const neutral = stocks.length - gainers - losers;
        const sorted = [...stocks].sort((a, b) => b.change - a.change);
        const topMover = sorted[0] || { symbol: "-", change: 0 };
        const worstMover = sorted[sorted.length - 1] || { symbol: "-", change: 0 };
        const momentum: "bullish" | "bearish" | "neutral" =
          avgChange > 0.3 ? "bullish" : avgChange < -0.3 ? "bearish" : "neutral";

        sectorResults.push({ name: sectorName, avgChange, totalVolume, gainers, losers, neutral, momentum, topMover, worstMover, stocks });
      }
      if (sectorResults.length > 0) {
        sectorResults.sort((a, b) => b.avgChange - a.avgChange);
        setSectors(sectorResults);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch {
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const bullishCount = sectors.filter((s) => s.momentum === "bullish").length;
  const bearishCount = sectors.filter((s) => s.momentum === "bearish").length;
  const overallMomentum = bullishCount > bearishCount ? "Risk-On" : bearishCount > bullishCount ? "Risk-Off" : "Neutral";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">
              Sector <span className="gold-text">Flow Radar</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time money flow between sectors · {sectors.length} sectors · 80 stocks tracked
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && lastUpdate !== "simulated" && <span className="live-dot text-[10px]">LIVE</span>}
            {lastUpdate === "simulated" && <span className="text-[10px] text-muted-foreground/70">SIMULATED DATA</span>}
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="border-primary/30 text-primary hover:bg-primary/10">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {!loading && sectors.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="mobile-card text-center">
              <Activity className="w-5 h-5 mx-auto text-primary mb-1" />
              <div className={`text-lg font-bold ${overallMomentum === "Risk-On" ? "text-[#00B4D8]" : overallMomentum === "Risk-Off" ? "text-[#ff4466]" : "text-[#FFB800]"}`}>
                {overallMomentum}
              </div>
              <div className="text-[9px] text-muted-foreground">Market Regime</div>
            </div>
            <div className="mobile-card text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-[#00B4D8] mb-1" />
              <div className="text-lg font-bold text-[#00B4D8]">{bullishCount}</div>
              <div className="text-[9px] text-muted-foreground">Bullish Sectors</div>
            </div>
            <div className="mobile-card text-center">
              <TrendingDown className="w-5 h-5 mx-auto text-[#ff4466] mb-1" />
              <div className="text-lg font-bold text-[#ff4466]">{bearishCount}</div>
              <div className="text-[9px] text-muted-foreground">Bearish Sectors</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-primary/30 mx-auto mb-3 animate-pulse" />
            <p className="text-muted-foreground">Loading sector data from Alpaca...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-xl p-4">
              <h2 className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wider">Rotation Radar</h2>
              <RadarChart sectors={sectors} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">Sector Breakdown</h2>
              {sectors.map((s) => <FlowBar key={s.name} sector={s} />)}
            </div>
          </div>
        )}
      </div>
      <FinancialDisclaimerBanner pageKey="sector-flow" />
    </Layout>
  );
}
