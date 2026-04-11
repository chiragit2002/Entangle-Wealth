import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  color?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  color = "#00D4FF",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-6">{description}</p>
      {ctaLabel &&
        (ctaHref ? (
          <Link href={ctaHref}>
            <button className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 transition-opacity">
              {ctaLabel}
            </button>
          </Link>
        ) : (
          <button
            onClick={onCtaClick}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00D4FF] to-[#0099cc] text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            {ctaLabel}
          </button>
        ))}
    </div>
  );
}
