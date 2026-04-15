import { type ReactNode } from "react";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StaleDataWrapperProps {
  children: ReactNode;
  isStale?: boolean;
  lastUpdated?: number | null;
  className?: string;
}

export function StaleDataWrapper({ children, isStale, lastUpdated, className = "" }: StaleDataWrapperProps) {
  if (!isStale) {
    return <div className={className}>{children}</div>;
  }

  const ago = lastUpdated
    ? formatDistanceToNow(lastUpdated, { addSuffix: true })
    : null;

  return (
    <div className={`relative ${className}`} style={{ opacity: 0.85 }}>
      {children}
      <div
        className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 font-mono z-10"
        style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          backdropFilter: "blur(4px)",
        }}
      >
        <Clock className="w-2.5 h-2.5" style={{ color: "rgba(245,158,11,0.7)" }} />
        <span className="text-[8px] tracking-wider uppercase" style={{ color: "rgba(245,158,11,0.6)" }}>
          {ago ? `cached ${ago}` : "stale"}
        </span>
      </div>
    </div>
  );
}
