import { useState, memo, useEffect } from "react";

interface SectorEntry {
  sector: string;
  ticker: string;
  change: number;
  weight: number;
  volume: string;
}

const SECTOR_ETFS: { sector: string; ticker: string; weight: number }[] = [
  { sector: "Technology", ticker: "XLK", weight: 32 },
  { sector: "Healthcare", ticker: "XLV", weight: 14 },
  { sector: "Financials", ticker: "XLF", weight: 12 },
  { sector: "Energy", ticker: "XLE", weight: 8 },
  { sector: "Consumer Disc.", ticker: "XLY", weight: 11 },
  { sector: "Industrials", ticker: "XLI", weight: 9 },
  { sector: "Real Estate", ticker: "XLRE", weight: 5 },
  { sector: "Utilities", ticker: "XLU", weight: 4 },
  { sector: "Materials", ticker: "XLB", weight: 3 },
  { sector: "Telecom", ticker: "XLC", weight: 2 },
];

function volumeLabel(v: number): string {
  if (v > 5_000_000) return "High";
  if (v > 1_000_000) return "Normal";
  return "Low";
}

function SectorHeatmapBase() {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [sectorData, setSectorData] = useState<SectorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeatColor = (change: number) => {
    if (change >= 2) return "rgba(0,180,216, 0.35)";
    if (change >= 1) return "rgba(0,180,216, 0.2)";
    if (change >= 0) return "rgba(0,180,216, 0.08)";
    if (change >= -1) return "rgba(255, 68, 68, 0.12)";
    return "rgba(255, 68, 68, 0.25)";
  };

  const getBorderColor = (change: number) => {
    if (change >= 1) return "rgba(0,180,216, 0.3)";
    if (change >= 0) return "rgba(255, 255, 255, 0.08)";
    return "rgba(255, 68, 68, 0.2)";
  };

  useEffect(() => {
    const symbols = SECTOR_ETFS.map(s => s.ticker).join(",");
    fetch(`/api/alpaca/snapshots?symbols=${encodeURIComponent(symbols)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: Record<string, any> | null) => {
        if (!data) return;
        const entries: SectorEntry[] = SECTOR_ETFS.map(etf => {
          const snap = data[etf.ticker];
          const change = snap?.dailyBar
            ? ((snap.dailyBar.c - snap.dailyBar.o) / snap.dailyBar.o) * 100
            : 0;
          const vol = snap?.dailyBar?.v || 0;
          return {
            sector: etf.sector,
            ticker: etf.ticker,
            change: parseFloat(change.toFixed(2)),
            weight: etf.weight,
            volume: volumeLabel(vol),
          };
        });
        setSectorData(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-panel rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sector Performance</h4>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {SECTOR_ETFS.map(s => (
            <div key={s.ticker} className="bg-muted/50 rounded-lg animate-pulse" style={{ minHeight: 60 }} />
          ))}
        </div>
      </div>
    );
  }

  const maxWeight = Math.max(...SECTOR_ETFS.map(s => s.weight));

  return (
    <div className="glass-panel rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sector Performance</h4>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(0,180,216,0.3)" }} /> Bullish</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(255,68,68,0.25)" }} /> Bearish</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {sectorData.map((sector) => {
          const isHovered = hoveredSector === sector.sector;
          const sizeRatio = sector.weight / maxWeight;
          return (
            <div
              key={sector.sector}
              className="relative rounded-lg p-2.5 cursor-pointer transition-all duration-300"
              style={{
                background: getHeatColor(sector.change),
                border: `1px solid ${getBorderColor(sector.change)}`,
                transform: isHovered ? "scale(1.05)" : "scale(1)",
                minHeight: `${50 + sizeRatio * 30}px`,
              }}
              onMouseEnter={() => setHoveredSector(sector.sector)}
              onMouseLeave={() => setHoveredSector(null)}
              onFocus={() => setHoveredSector(sector.sector)}
              onBlur={() => setHoveredSector(null)}
              tabIndex={0}
              role="button"
              aria-label={`${sector.sector}: ${sector.change >= 0 ? "+" : ""}${Math.abs(sector.change).toFixed(1)}% change, ${sector.weight}% weight`}
            >
              <div className="flex flex-col h-full justify-between">
                <span className="text-[9px] text-muted-foreground leading-tight">{sector.sector}</span>
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground/70">{sector.ticker}</span>
                  <div className={`text-sm font-mono font-bold ${sector.change >= 0 ? "text-primary" : "text-red-400"}`}>
                    {sector.change >= 0 ? "+" : ""}{Math.abs(sector.change).toFixed(1)}%
                  </div>
                </div>
              </div>
              {isHovered && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-50 bg-black/95 border border-border rounded-lg p-2.5 text-[10px] whitespace-nowrap shadow-xl">
                  <div className="font-bold text-foreground mb-1">{sector.sector}</div>
                  <div className="text-muted-foreground">Weight: {sector.weight}%</div>
                  <div className="text-muted-foreground">Volume: {sector.volume}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const SectorHeatmap = memo(SectorHeatmapBase);
