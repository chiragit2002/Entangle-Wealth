import { ReferenceArea } from "recharts";
import { type CompareResult, DISPLAY_HORIZONS } from "./types";

export function DivergenceBands({ compareResult }: { compareResult: CompareResult | null }) {
  if (!compareResult) return null;
  return (
    <>
      {DISPLAY_HORIZONS.slice(0, -1).map((h, i) => {
        const curr = compareResult.deltas.find(d => d.horizon === h);
        const next = compareResult.deltas.find(d => d.horizon === DISPLAY_HORIZONS[i + 1]);
        if (!curr || !next) return null;
        const isPositive = curr.deltaNetWorth >= 0;
        const fill = isPositive ? "rgba(0,255,65,0.10)" : "rgba(239,68,68,0.10)";
        return (
          <ReferenceArea
            key={h}
            x1={h}
            x2={DISPLAY_HORIZONS[i + 1]}
            fill={fill}
            stroke="none"
          />
        );
      })}
    </>
  );
}
