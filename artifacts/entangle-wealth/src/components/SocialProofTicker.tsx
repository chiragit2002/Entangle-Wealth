import { useState, useEffect, useRef } from "react";
import { TrendingUp, Users, Zap, Award, DollarSign } from "lucide-react";

interface TickerEvent {
  id: number;
  icon: React.ReactNode;
  text: string;
  color: string;
}

interface TickerTemplate {
  icon: React.ReactNode;
  generate: () => string;
  color: string;
}

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

const TICKER_TEMPLATES: TickerTemplate[] = [
  {
    icon: <DollarSign className="w-3 h-3" />,
    generate: () => `A member just recovered $${roundTo(randBetween(400, 3800), 50).toLocaleString()} in missed deductions`,
    color: "#00FF41",
  },
  {
    icon: <Zap className="w-3 h-3" />,
    generate: () => `${randBetween(40, 220)} AI analyses completed in the last hour`,
    color: "#00D4FF",
  },
  {
    icon: <Award className="w-3 h-3" />,
    generate: () => {
      const tiers = ["Silver", "Gold", "Platinum"];
      return `A member reached ${tiers[randBetween(0, tiers.length - 1)]} status today`;
    },
    color: "#FFB800",
  },
  {
    icon: <TrendingUp className="w-3 h-3" />,
    generate: () => `Someone is on a ${randBetween(7, 45)}-day activity streak`,
    color: "#ff6b35",
  },
  {
    icon: <Users className="w-3 h-3" />,
    generate: () => `${randBetween(3, 18)} people joined in the last 30 minutes`,
    color: "#a855f7",
  },
  {
    icon: <Zap className="w-3 h-3" />,
    generate: () => `${randBetween(30, 150)} consensus signals fired in the last hour`,
    color: "#00D4FF",
  },
  {
    icon: <DollarSign className="w-3 h-3" />,
    generate: () => `A member found $${roundTo(randBetween(200, 1200), 10).toLocaleString()} in overlooked receipt deductions`,
    color: "#00FF41",
  },
  {
    icon: <Award className="w-3 h-3" />,
    generate: () => {
      const badges = ["Tax Strategist", "Early Adopter", "Wealth Builder", "Streak Master"];
      return `Someone just earned the ${badges[randBetween(0, badges.length - 1)]} badge`;
    },
    color: "#FFB800",
  },
];

let idCounter = 0;

function generateEvent(): TickerEvent {
  const template = TICKER_TEMPLATES[randBetween(0, TICKER_TEMPLATES.length - 1)];
  return {
    id: ++idCounter,
    icon: template.icon,
    text: template.generate(),
    color: template.color,
  };
}

function getRandomInterval(): number {
  return 4000 + Math.random() * 5000;
}

interface SocialProofTickerProps {
  compact?: boolean;
}

export function SocialProofTicker({ compact = false }: SocialProofTickerProps) {
  const [events, setEvents] = useState<TickerEvent[]>(() => [generateEvent()]);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        setEvents(prev => {
          const next = generateEvent();
          return [...prev.slice(-2), next];
        });
        schedule();
      }, getRandomInterval());
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  const current = events[events.length - 1];

  if (compact) {
    return (
      <div
        key={current.id}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] text-[10px] font-medium animate-in fade-in slide-in-from-bottom-1 duration-300"
        style={{ color: current.color }}
      >
        <span className="flex-shrink-0" style={{ color: current.color }}>{current.icon}</span>
        <span className="truncate max-w-[200px]">{current.text}</span>
        <span className="text-white/25 ml-auto flex-shrink-0">now</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div
        key={current.id}
        className="flex items-center gap-2.5 px-4 py-2.5 border border-white/[0.06] bg-white/[0.02] rounded-lg text-xs animate-in fade-in slide-in-from-top-1 duration-500"
      >
        <div
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: `${current.color}18`, border: `1px solid ${current.color}30`, color: current.color }}
        >
          {current.icon}
        </div>
        <span className="text-white/60 flex-1">{current.text}</span>
        <span className="text-white/25 text-[10px] font-mono flex-shrink-0">just now</span>
        <button
          onClick={() => setVisible(false)}
          className="text-white/20 hover:text-white/40 transition-colors flex-shrink-0 text-xs leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
