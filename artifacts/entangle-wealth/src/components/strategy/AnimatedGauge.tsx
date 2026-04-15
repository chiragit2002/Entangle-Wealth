import { useEffect, useRef } from "react";

interface AnimatedGaugeProps {
  score: number;
  label?: string;
  size?: number;
  animate?: boolean;
}

export function AnimatedGauge({ score, label = "SCORE", size = 160, animate = true }: AnimatedGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;
  const strokeW = size * 0.065;

  const color = clamped >= 70 ? "#00d4ff" : clamped >= 40 ? "#a78bfa" : "#ff3366";
  const glowColor = clamped >= 70 ? "rgba(0,212,255,0.4)" : clamped >= 40 ? "rgba(167,139,250,0.4)" : "rgba(255,51,102,0.4)";

  const arcPath = (startDeg: number, endDeg: number, radius: number) => {
    const startRad = ((startDeg - 90) * Math.PI) / 180;
    const endRad = ((endDeg - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const fillAngle = (clamped / 100) * 180;
  const needleAngle = clamped / 100;
  const needleRad = ((fillAngle - 90) * Math.PI) / 180;
  const nx = cx + (r - strokeW / 2 - 2) * Math.cos(needleRad);
  const ny = cy + (r - strokeW / 2 - 2) * Math.sin(needleRad);

  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const el = pathRef.current;
    const totalLength = el.getTotalLength();
    el.style.strokeDasharray = `${totalLength}`;
    el.style.strokeDashoffset = `${totalLength}`;
    el.style.transition = "none";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)";
        el.style.strokeDashoffset = "0";
      });
    });
  }, [animate, clamped]);

  const viewH = size * 0.62;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg
        width={size}
        height={viewH}
        viewBox={`0 0 ${size} ${viewH}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`gauge-grad-${label}`} gradientUnits="userSpaceOnUse"
            x1={cx - r} y1={cy} x2={cx + r} y2={cy}>
            <stop offset="0%" stopColor={clamped >= 70 ? "#00d4ff" : clamped >= 40 ? "#a78bfa" : "#ff3366"} />
            <stop offset="100%" stopColor={clamped >= 70 ? "#00ff88" : clamped >= 40 ? "#00d4ff" : "#ff6600"} />
          </linearGradient>
        </defs>

        <path
          d={arcPath(0, 180, r)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {clamped > 0 && (
          <path
            ref={pathRef}
            d={arcPath(0, fillAngle, r)}
            fill="none"
            stroke={`url(#gauge-grad-${label})`}
            strokeWidth={strokeW}
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        )}

        {clamped > 0 && (
          <line
            x1={cx} y1={cy}
            x2={nx} y2={ny}
            stroke={color}
            strokeWidth={size * 0.018}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
          />
        )}
        <circle cx={cx} cy={cy} r={size * 0.03} fill={color} style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />

        <text
          x={cx} y={cy - size * 0.1}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.17}
          fontWeight="bold"
          fontFamily="monospace"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        >
          {clamped.toFixed(0)}
        </text>
        <text
          x={cx} y={cy + size * 0.05}
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize={size * 0.065}
          fontFamily="monospace"
        >
          {label}
        </text>
        <text x={size * 0.07} y={viewH - 2} fill="rgba(255,255,255,0.2)" fontSize={size * 0.055} fontFamily="monospace">0</text>
        <text x={size * 0.93} y={viewH - 2} fill="rgba(255,255,255,0.2)" fontSize={size * 0.055} fontFamily="monospace" textAnchor="end">100</text>
      </svg>
    </div>
  );
}

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
  color?: string;
}

export function ScoreRing({ score, size = 72, label, color }: ScoreRingProps) {
  const pct = Math.min(100, Math.max(0, score));
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const resolvedColor = color ?? (pct >= 70 ? "#00d4ff" : pct >= 40 ? "#a78bfa" : "#ff3366");

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={resolvedColor}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            filter: `drop-shadow(0 0 4px ${resolvedColor}80)`,
          }}
        />
        <text
          x={size / 2} y={size / 2 + 5}
          textAnchor="middle"
          fill={resolvedColor}
          fontSize={size * 0.22}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {Math.round(pct)}
        </text>
      </svg>
      {label && <span className="text-[10px] text-white/40 font-mono text-center leading-tight">{label}</span>}
    </div>
  );
}
