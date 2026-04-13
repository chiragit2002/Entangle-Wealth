import { fearGreedData } from "@/lib/mock-data";

export function FearGreedGauge() {
  const { value, label, previousClose, components } = fearGreedData;
  const angle = (value / 100) * 180 - 90;
  const circumference = Math.PI * 80;
  const filled = (value / 100) * circumference;

  const getColor = (v: number) => {
    if (v <= 25) return "#ff4444";
    if (v <= 45) return "#ff8844";
    if (v <= 55) return "#888888";
    if (v <= 75) return "#44bb44";
    return "#00D4FF";
  };

  return (
    <div className="glass-panel rounded-sm p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fear & Greed Index</h4>
      </div>

      <div className="flex items-center justify-center mb-3">
        <div className="relative">
          <svg width="160" height="90" viewBox="0 0 160 90">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff4444" />
                <stop offset="25%" stopColor="#ff8844" />
                <stop offset="50%" stopColor="#888888" />
                <stop offset="75%" stopColor="#44bb44" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <path
              d="M 10 85 A 70 70 0 0 1 150 85"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 10 85 A 70 70 0 0 1 150 85"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`}
              style={{ animation: "gauge-fill 1.5s ease-out" }}
            />
            <line
              x1="80" y1="85"
              x2={80 + 50 * Math.cos((angle * Math.PI) / 180)}
              y2={85 + 50 * Math.sin((angle * Math.PI) / 180)}
              stroke={getColor(value)}
              strokeWidth="2"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${getColor(value)})` }}
            />
            <circle cx="80" cy="85" r="4" fill={getColor(value)} />
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-2xl font-mono font-bold stat-value" style={{ color: getColor(value) }}>{value}</div>
          </div>
        </div>
      </div>

      <div className="text-center mb-3">
        <span className="text-sm font-bold" style={{ color: getColor(value) }}>{label}</span>
        <span className="text-xs text-muted-foreground ml-2">
          (prev: {previousClose})
        </span>
      </div>

      <div className="space-y-1.5 border-t border-white/5 pt-3">
        {components.map((c) => (
          <div key={c.name} className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{c.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.value}%`, backgroundColor: getColor(c.value) }} />
              </div>
              <span className="font-mono w-6 text-right" style={{ color: getColor(c.value) }}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
