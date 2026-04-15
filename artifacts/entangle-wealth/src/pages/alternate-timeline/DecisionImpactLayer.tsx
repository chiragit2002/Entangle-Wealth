import { motion } from "framer-motion";
import { Layers, ArrowRight } from "lucide-react";
import { type CompareResult, fmt } from "./types";

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const formatted = abs >= 1_000_000
    ? `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
    ? `${sign}${prefix}${(abs / 1_000).toFixed(0)}k`
    : `${sign}${prefix}${abs.toFixed(0)}`;
  return <>{formatted}</>;
}

export function DecisionImpactLayer({ compareResult, selectedHorizon }: {
  compareResult: CompareResult | null;
  selectedHorizon: string;
}) {
  if (!compareResult) return null;

  const delta = compareResult.deltas.find(d => d.horizon === selectedHorizon);
  const s = compareResult.summary;

  const impactMessages: string[] = [];
  if (s.deltaNetWorth5yr > 1000) impactMessages.push(`In 5 years, the better path gives you ${fmt(s.deltaNetWorth5yr)} more flexibility`);
  if (s.deltaNetWorth10yr > 1000) impactMessages.push(`At 10 years, the difference compounds to ${fmt(s.deltaNetWorth10yr)}`);
  if (s.deltaNetWorth20yr > 5000) impactMessages.push(`Over 20 years, you're looking at a ${fmt(s.deltaNetWorth20yr)} divergence`);
  if (s.deltaStress > 5) impactMessages.push(`The better path reduces financial stress by ${s.deltaStress.toFixed(0)} points`);
  if (s.deltaOpportunity > 5) impactMessages.push(`Your opportunity window grows by ${s.deltaOpportunity.toFixed(0)} points`);

  const selectedDelta = delta?.deltaNetWorth || 0;
  const isPositive = selectedDelta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm p-4 space-y-3"
      style={{ background: "rgba(8,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
      aria-label="Decision Impact Layer"
    >
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="font-bold text-sm">Decision Impact</span>
        <span className="text-[10px] text-white/50 ml-auto font-mono">@ {selectedHorizon}</span>
      </div>

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-2 h-2 rounded-full bg-[#00B4D8]" />
          <div className="text-[9px] text-white/40 font-mono">Current Path</div>
        </div>
        <div className="flex-1 relative h-2 flex items-center">
          <div className="absolute inset-0 flex items-center">
            <motion.div
              className="h-px w-full"
              style={{ background: isPositive ? "linear-gradient(to right, #00B4D8, #00B4D8)" : "linear-gradient(to right, #00B4D8, #ef4444)" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <motion.div
            className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-black font-mono px-1.5 py-0.5 rounded-full ${isPositive ? "bg-emerald-400/20 text-emerald-400" : "bg-red-400/20 text-red-400"}`}
            key={selectedDelta}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ top: "50%" }}
          >
            {isPositive ? "+" : ""}{fmt(selectedDelta)}
          </motion.div>
        </div>
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <div className="text-[9px] text-white/40 font-mono">Better Path</div>
          <div className="w-2 h-2 rounded-full bg-[#00B4D8]" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: isPositive ? "rgba(0,180,216,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${isPositive ? "rgba(0,180,216,0.15)" : "rgba(239,68,68,0.15)"}` }}>
        <div className="text-xs text-white/50 font-mono">Path difference @ {selectedHorizon}</div>
        <motion.div
          key={selectedDelta}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-lg font-black font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}
          aria-live="polite"
          aria-label={`Path difference at ${selectedHorizon}: ${isPositive ? "+" : ""}${fmt(selectedDelta)}`}
        >
          {isPositive ? "+" : ""}<AnimatedNumber value={selectedDelta} prefix="$" />
        </motion.div>
      </div>

      {impactMessages.length > 0 && (
        <div className="space-y-1.5">
          {impactMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 text-[11px] text-white/60"
            >
              <ArrowRight className="w-3 h-3 text-primary/60 mt-0.5 shrink-0" aria-hidden="true" />
              {msg}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
