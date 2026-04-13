import { Link } from "wouter";
import { ChevronRight, GitBranch, Zap } from "lucide-react";
import type { EntanglementInsight } from "@/lib/entanglementEngine";
import { trackEvent } from "@/lib/trackEvent";

interface EntanglementCardProps {
  insight: EntanglementInsight;
  compact?: boolean;
  className?: string;
}

const DOMAIN_LABELS: Record<string, string> = {
  portfolio: "Portfolio",
  tax: "TaxGPT",
  career: "Career",
  simulation: "Simulator",
  coaching: "Coach",
};

export function EntanglementCard({ insight, compact = false, className = "" }: EntanglementCardProps) {
  const color = insight.accentColor;

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{ border: `1px solid ${color}25` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)`,
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />

      <div className={`relative ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <div className="flex items-start gap-2.5">
          <div
            className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}
          >
            <GitBranch className="w-3 h-3" style={{ color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>
                Entangled
              </span>
              <span className="text-[9px] text-white/25">·</span>
              <span className="text-[9px] text-white/35 font-mono">
                {DOMAIN_LABELS[insight.sourceDomain]} → {DOMAIN_LABELS[insight.targetDomain]}
              </span>
            </div>
            <p className={`text-white/70 leading-snug ${compact ? "text-[11px]" : "text-xs"}`}>
              {insight.message}
            </p>
          </div>

          <Link
            href={insight.actionHref}
            onClick={() => trackEvent("entanglement_card_clicked", { insightId: insight.id, sourceDomain: insight.sourceDomain, targetDomain: insight.targetDomain })}
            className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-all whitespace-nowrap"
            style={{
              color,
              background: `${color}10`,
              border: `1px solid ${color}25`,
            }}
          >
            {insight.actionLabel}
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 w-16 h-px"
        style={{ background: `linear-gradient(90deg, ${color}50, transparent)` }}
      />
    </div>
  );
}

interface EntangledInsightsFeedProps {
  insights: EntanglementInsight[];
  title?: string;
  maxItems?: number;
  className?: string;
}

export function EntangledInsightsFeed({ insights, title = "Entangled Insights", maxItems = 5, className = "" }: EntangledInsightsFeedProps) {
  const visible = insights.slice(0, maxItems);

  if (visible.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: "rgba(0,200,248,0.12)", border: "1px solid rgba(0,200,248,0.25)" }}
        >
          <Zap className="w-3.5 h-3.5 text-[#00c8f8]" />
        </div>
        <span className="text-sm font-semibold text-white/70">{title}</span>
        <span className="text-[10px] text-white/25 ml-auto font-mono">{visible.length} connections active</span>
      </div>
      <div className="space-y-2">
        {visible.map((insight) => (
          <EntanglementCard key={insight.id} insight={insight} compact />
        ))}
      </div>
    </div>
  );
}
