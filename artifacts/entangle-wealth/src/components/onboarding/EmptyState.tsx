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
  quantumVariant?: boolean;
}

const QUANTUM_PHRASES: Record<string, string> = {
  "No results found": "No signals in this dimension.",
  "No data": "No data in this dimension.",
  "Nothing here": "This sector of the quantum field is empty.",
  "Empty": "The data stream is silent here.",
};

function getQuantumTitle(title: string): string {
  for (const [key, val] of Object.entries(QUANTUM_PHRASES)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return title;
}

function getQuantumDescription(desc: string): string {
  const replacements: [RegExp, string][] = [
    [/something went wrong/gi, "the signal was interrupted"],
    [/no results/gi, "no signals detected in this dimension"],
    [/no data/gi, "no data in this dimension"],
    [/nothing to show/gi, "this sector of the quantum field is empty"],
    [/try again/gi, "re-establish the connection"],
  ];
  let result = desc;
  replacements.forEach(([from, to]) => {
    result = result.replace(from, to);
  });
  return result;
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
  quantumVariant = true,
}: EmptyStateProps) {
  const displayTitle = quantumVariant ? getQuantumTitle(title) : title;
  const displayDesc = quantumVariant ? getQuantumDescription(description) : description;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 relative"
        style={{
          background: "rgba(0,180,216,0.06)",
          border: "1px solid rgba(0,180,216,0.12)",
        }}
      >
        <Icon className="w-6 h-6" style={{ color: "rgba(0,180,216,0.7)" }} />
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(0,180,216,0.06), transparent 70%)",
          }}
        />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">{displayDesc}</p>
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
