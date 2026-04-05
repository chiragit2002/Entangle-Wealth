import { sectorData } from "@/lib/mock-data";
import { useState } from "react";

export function SectorHeatmap() {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const maxWeight = Math.max(...sectorData.map(s => s.weight));

  const getHeatColor = (change: number) => {
    if (change >= 2) return "rgba(0, 212, 255, 0.35)";
    if (change >= 1) return "rgba(0, 212, 255, 0.2)";
    if (change >= 0) return "rgba(0, 212, 255, 0.08)";
    if (change >= -1) return "rgba(255, 68, 68, 0.12)";
    return "rgba(255, 68, 68, 0.25)";
  };

  const getBorderColor = (change: number) => {
    if (change >= 1) return "rgba(0, 212, 255, 0.3)";
    if (change >= 0) return "rgba(255, 255, 255, 0.08)";
    return "rgba(255, 68, 68, 0.2)";
  };

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sector Performance</h4>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "rgba(0,212,255,0.3)" }} /> Bullish</span>
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
              aria-label={`${sector.sector}: ${sector.change >= 0 ? "+" : ""}${sector.change.toFixed(1)}% change, ${sector.weight}% weight`}
            >
              <div className="flex flex-col h-full justify-between">
                <span className="text-[9px] text-white/60 leading-tight">{sector.sector}</span>
                <div>
                  <span className="text-[10px] font-mono text-white/40">{sector.ticker}</span>
                  <div className={`text-sm font-mono font-bold ${sector.change >= 0 ? "text-primary" : "text-red-400"}`}>
                    {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(1)}%
                  </div>
                </div>
              </div>
              {isHovered && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-50 bg-black/95 border border-white/10 rounded-lg p-2.5 text-[10px] whitespace-nowrap shadow-xl">
                  <div className="font-bold text-white mb-1">{sector.sector}</div>
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
