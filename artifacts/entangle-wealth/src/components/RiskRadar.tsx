import { riskDimensions } from "@/lib/mock-data";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

export function RiskRadar() {
  const avgRisk = Math.round(riskDimensions.reduce((a, d) => a + d.value, 0) / riskDimensions.length);
  const riskLevel = avgRisk > 75 ? "HIGH" : avgRisk > 50 ? "MODERATE" : "LOW";
  const riskColor = avgRisk > 75 ? "#ff4444" : avgRisk > 50 ? "#FFB800" : "#FF8C00";

  return (
    <div className="glass-panel rounded-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: riskColor }} />
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk Radar</h4>
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: riskColor }}>{riskLevel}</span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={riskDimensions} outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "JetBrains Mono" }}
            />
            <Radar
              dataKey="value"
              stroke="#FF8C00"
              fill="#FF8C00"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        {riskDimensions.map((dim) => (
          <div key={dim.dimension} className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{dim.dimension}</span>
            <span className={`font-mono font-bold ${dim.value > 75 ? "text-red-400" : dim.value > 50 ? "text-secondary" : "text-primary"}`}>
              {dim.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
