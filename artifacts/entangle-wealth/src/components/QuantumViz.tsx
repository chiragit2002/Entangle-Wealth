import { useState, useEffect, memo } from "react";
import { quantumNodes } from "@/lib/mock-data";

function QuantumVizBase() {
  const [activeConnections, setActiveConnections] = useState<number[]>([0, 2, 4]);
  const [consensusValue, setConsensusValue] = useState(87);
  const [pulsingNode, setPulsingNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveConnections(prev => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * 15);
        if (next.includes(idx)) {
          next.splice(next.indexOf(idx), 1);
        } else if (next.length < 8) {
          next.push(idx);
        }
        return next;
      });
      setPulsingNode(p => (p + 1) % 6);
      setConsensusValue(85 + Math.floor(Math.random() * 10));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const cx = 200, cy = 160, r = 110;
  const nodePositions = quantumNodes.map((_, i) => ({
    x: cx + r * Math.cos((i * Math.PI * 2) / 6 - Math.PI / 2),
    y: cy + r * Math.sin((i * Math.PI * 2) / 6 - Math.PI / 2),
  }));

  const connections: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      connections.push([i, j]);
    }
  }

  return (
    <div className="glass-panel rounded-sm p-6 relative overflow-hidden">
      <div className="absolute inset-0 scan-line pointer-events-none" />
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Signal Consensus</h3>
          </div>
          <p className="text-xs text-muted-foreground/60 mb-4">
            6 independent analysis models cross-checking in real time. Signal fires only on consensus.
          </p>
          <svg viewBox="0 0 400 320" className="w-full max-w-[400px] mx-auto" style={{ filter: "drop-shadow(0 0 10px rgba(255,140,0,0.1))" }}>
            {connections.map(([a, b], i) => {
              const isActive = activeConnections.includes(i);
              return (
                <line
                  key={`conn-${i}`}
                  x1={nodePositions[a].x}
                  y1={nodePositions[a].y}
                  x2={nodePositions[b].x}
                  y2={nodePositions[b].y}
                  stroke={isActive ? "#FF8C00" : "rgba(255,255,255,0.05)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  strokeDasharray={isActive ? "none" : "4 4"}
                  style={{
                    transition: "all 0.8s ease",
                    filter: isActive ? "drop-shadow(0 0 4px rgba(255,140,0,0.6))" : "none"
                  }}
                />
              );
            })}

            <circle cx={cx} cy={cy} r="35" fill="rgba(255,140,0,0.05)" stroke="rgba(255,140,0,0.2)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="25" fill="rgba(255,140,0,0.08)" stroke="rgba(255,140,0,0.3)" strokeWidth="1" />
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#FF8C00" fontSize="18" fontFamily="JetBrains Mono" fontWeight="bold">
              {consensusValue}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="JetBrains Mono" style={{ textTransform: "uppercase" }}>
              CONSENSUS
            </text>

            {quantumNodes.map((node, i) => {
              const pos = nodePositions[i];
              const isPulsing = pulsingNode === i;
              const color = node.status === "warning" ? "#FFB800" : "#FF8C00";
              return (
                <g key={node.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isPulsing ? 22 : 18}
                    fill={`${color}08`}
                    stroke={color}
                    strokeWidth={isPulsing ? 1.5 : 0.8}
                    style={{
                      transition: "all 0.5s ease",
                      filter: isPulsing ? `drop-shadow(0 0 8px ${color})` : "none"
                    }}
                  />
                  <circle cx={pos.x} cy={pos.y} r="3" fill={color} opacity={isPulsing ? 1 : 0.6}
                    style={{ transition: "all 0.5s ease" }} />
                  <text x={pos.x} y={pos.y + (i < 3 ? -28 : 32)} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="JetBrains Mono">
                    {node.label.toUpperCase()}
                  </text>
                  <text x={pos.x} y={pos.y + (i < 3 ? -19 : 42)} textAnchor="middle" fill={color} fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                    {node.confidence}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="lg:w-48 flex flex-col gap-3 w-full lg:border-l lg:border-white/5 lg:pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Model Status</p>
          {quantumNodes.map((node) => (
            <div key={node.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${node.status === "active" ? "bg-primary" : "bg-secondary"}`} />
                <span className="text-xs text-white/70">{node.label}</span>
              </div>
              <span className={`text-xs font-mono font-bold ${node.status === "active" ? "text-primary" : "text-secondary"}`}>{node.confidence}%</span>
            </div>
          ))}
          <div className="border-t border-white/5 pt-3 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground">Consensus</span>
              <span className="text-sm font-mono font-bold text-primary stat-value">{consensusValue}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000" style={{ width: `${consensusValue}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const QuantumViz = memo(QuantumVizBase);
