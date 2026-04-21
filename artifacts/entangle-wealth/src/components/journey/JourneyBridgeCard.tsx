import { Link } from "wouter";
import { ArrowRight, Map } from "lucide-react";

interface JourneyBridgeCardProps {
  title: string;
  desc: string;
  href: string;
  phaseColor?: string;
  cta?: string;
}

export function JourneyBridgeCard({ title, desc, href, phaseColor = "#0099cc", cta = "Continue your journey" }: JourneyBridgeCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-300"
      style={{
        background: `${phaseColor}08`,
        border: `1px solid ${phaseColor}25`,
        borderLeft: `3px solid ${phaseColor}`,
      }}
      role="complementary"
      aria-label="Journey nudge"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${phaseColor}12`, border: `1px solid ${phaseColor}25` }}
      >
        <Map className="w-4 h-4" style={{ color: phaseColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: phaseColor }}>
          Next Step · Your Journey
        </div>
        <p className="text-sm font-bold text-foreground/90 mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground mb-2">{desc}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: `${phaseColor}15`, color: phaseColor, border: `1px solid ${phaseColor}30` }}
        >
          {cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
