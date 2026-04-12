import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  secondaryLabel,
  secondaryHref,
  onSecondaryClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/10">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">{description}</p>
      {(ctaLabel || secondaryLabel) && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {ctaLabel && (
            ctaHref ? (
              <Link href={ctaHref}>
                <Button size="sm">{ctaLabel}</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={onCtaClick}>{ctaLabel}</Button>
            )
          )}
          {secondaryLabel && (
            secondaryHref ? (
              <Link href={secondaryHref}>
                <Button variant="outline" size="sm">{secondaryLabel}</Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" onClick={onSecondaryClick}>{secondaryLabel}</Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
