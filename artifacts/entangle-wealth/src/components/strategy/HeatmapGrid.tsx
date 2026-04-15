interface HeatmapCellProps {
  label: string;
  score: number;
  drawdown: number;
  failure: boolean;
}

function drawdownColor(dd: number, failure: boolean): string {
  if (failure) return "rgba(255,51,102,0.8)";
  if (dd > 20) return "rgba(255,140,0,0.7)";
  if (dd > 10) return "rgba(255,200,0,0.5)";
  return "rgba(0,212,255,0.4)";
}

export function HeatmapCell({ label, score, drawdown, failure }: HeatmapCellProps) {
  const bg = drawdownColor(Math.abs(drawdown), failure);
  const textCol = failure ? "#ff3366" : Math.abs(drawdown) > 20 ? "#ff8c00" : "#00d4ff";

  return (
    <div
      className="relative rounded-xl p-4 border transition-all hover:scale-[1.02] cursor-default"
      style={{
        background: `${bg.replace("0.8", "0.08").replace("0.7", "0.07").replace("0.5", "0.05").replace("0.4", "0.04")}`,
        borderColor: bg.replace("0.8", "0.3").replace("0.7", "0.3").replace("0.5", "0.25").replace("0.4", "0.2"),
      }}
    >
      <div
        className="absolute inset-0 rounded-xl opacity-40"
        style={{
          background: `linear-gradient(135deg, ${bg.replace(/[\d.]+\)$/, "0.15)")} 0%, transparent 60%)`,
        }}
      />
      <div className="relative z-10">
        <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider mb-2 truncate">
          {label.replace(/_/g, " ")}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-white/40 mb-0.5">Score</div>
            <div className="text-lg font-bold font-mono" style={{ color: textCol }}>
              {score.toFixed(0)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40 mb-0.5">Max DD</div>
            <div className="text-sm font-semibold font-mono" style={{ color: textCol }}>
              {drawdown.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, score)}%`, background: bg }}
          />
        </div>
        <div
          className="mt-2 text-[10px] font-mono font-semibold text-center px-2 py-0.5 rounded"
          style={{
            background: `${bg.replace(/[\d.]+\)$/, "0.1)")}`,
            color: textCol,
          }}
        >
          {failure ? "FAILED" : "PASSED"}
        </div>
      </div>
    </div>
  );
}

interface HeatmapGridProps {
  results: { scenario: string; score: number; max_drawdown: number; failure: boolean }[];
}

export function HeatmapGrid({ results }: HeatmapGridProps) {
  if (results.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {results.map((r) => (
        <HeatmapCell
          key={r.scenario}
          label={r.scenario}
          score={r.score}
          drawdown={r.max_drawdown}
          failure={r.failure}
        />
      ))}
    </div>
  );
}
