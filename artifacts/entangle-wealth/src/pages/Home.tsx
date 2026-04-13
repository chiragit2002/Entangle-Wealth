import { useState, useEffect, useRef, useCallback, Component, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  UserPlus,
  ShieldCheck,
  Lock,
  Star,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  Heart,
  AlertCircle,
  RefreshCw,
  Globe,
  Atom,
  GitBranch,
  Brain,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import { fetchWithRetry } from "@/lib/api";
import { EmailCapture } from "@/components/EmailCapture";
import { trackEvent } from "@/lib/trackEvent";
import { AnniversaryGiveawayBanner } from "@/components/viral/AnniversaryGiveawayBanner";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import { SocialProofTicker } from "@/components/SocialProofTicker";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

interface HeroStats {
  members: number;
  signals: number;
  accuracy: number;
}

interface FetchState<T> {
  data: T | null;
  error: boolean;
  loading: boolean;
}

function useHeroStats(): FetchState<HeroStats> & { defaultStats: HeroStats } {
  const defaultStats: HeroStats = { members: 0, signals: 0, accuracy: 0 };
  const [state, setState] = useState<FetchState<HeroStats>>({
    data: defaultStats,
    error: false,
    loading: false,
  });

  useEffect(() => {
    const fetchStats = () => {
      fetchWithRetry(`${API_BASE}/stats/hero`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => {
          if (d && typeof d.members === "number") {
            setState({ data: d, error: false, loading: false });
          }
        })
        .catch(() => {
        });
    };
    fetchStats();
    const interval = setInterval(() => {
      if (!document.hidden) fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return { ...state, defaultStats };
}

function useRecentSignups(): FetchState<{ name: string; timeLabel: string }[]> {
  const [state, setState] = useState<FetchState<{ name: string; timeLabel: string }[]>>({
    data: null,
    error: false,
    loading: true,
  });
  useEffect(() => {
    fetchWithRetry(`${API_BASE}/stats/recent-signups`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setState({ data: Array.isArray(d) && d.length > 0 ? d : null, error: false, loading: false });
      })
      .catch(() => {
        setState({ data: null, error: true, loading: false });
      });
  }, []);
  return state;
}

function useTestimonials(): FetchState<
  { id: number; name: string; role: string | null; message: string; rating: number }[]
> {
  const [state, setState] = useState<
    FetchState<{ id: number; name: string; role: string | null; message: string; rating: number }[]>
  >({ data: null, error: false, loading: true });

  useEffect(() => {
    fetchWithRetry(`${API_BASE}/viral/testimonials`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setState({ data: Array.isArray(d) ? d : null, error: false, loading: false });
      })
      .catch(() => {
        setState({ data: null, error: true, loading: false });
      });
  }, []);

  return state;
}

function useAnimatedNumber(target: number, duration = 800): number {
  const [displayed, setDisplayed] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    if (start === end) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);
  return displayed;
}

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SectionBridge({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-6 px-4 select-none" aria-hidden="true">
      <div className="w-px h-8 bg-gradient-to-b from-white/5 to-white/15" />
      <p className="mt-3 text-[11px] font-semibold tracking-widest uppercase text-white/25 text-center max-w-xs">
        {children}
      </p>
      <div className="mt-3 w-px h-8 bg-gradient-to-b from-white/15 to-white/5" />
    </div>
  );
}

function InlineError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/40 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-white/30" />
      <span>{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="ml-auto flex items-center gap-1 text-[#FF8C00]/60 hover:text-[#FF8C00] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class HomeErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-white/40" />
          <p className="text-base text-white/50 font-medium">Something went wrong loading this page.</p>
          <p className="text-sm text-white/30">Please refresh to try again.</p>
          <Button
            variant="outline"
            className="border-white/10 text-white/50 hover:bg-white/5"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RecentSignupTicker({
  signups,
  error,
  loading,
}: {
  signups: { name: string; timeLabel: string }[] | null;
  error: boolean;
  loading?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!signups || signups.length === 0) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % signups.length), 3000);
    return () => clearInterval(t);
  }, [signups?.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.06] bg-white/[0.03]" aria-hidden="true">
        <div className="w-3 h-3 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
        <div className="w-36 h-2.5 rounded-full bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (error || !signups || signups.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-transparent bg-transparent" style={{ minHeight: "2rem" }} aria-hidden="true" />
    );
  }
  const s = signups[idx];
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF8C00]/15 bg-[#FF8C00]/5 text-[11px] font-medium text-[#FF8C00]">
      <UserPlus className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      <span>
        {s.name} just joined {s.timeLabel}
      </span>
    </div>
  );
}

const GOAL_OPTIONS = [
  { id: "clarity", label: "I'm flying blind — I need to see the full picture", icon: Lightbulb },
  { id: "invest", label: "My money is just sitting there. That has to stop.", icon: TrendingUp },
  { id: "stress", label: "Money stress is taking up too much of my head", icon: Heart },
];

function GoalSelector({ onSelect }: { onSelect: (goal: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelected(id);
    trackEvent("goal_selected", { goal: id });
    setTimeout(() => onSelect(id), 400);
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-3">
      <p className="text-sm text-white/70 mb-4">What's actually going on for you right now?</p>
      {GOAL_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleSelect(id)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 text-sm font-medium
            ${
              selected === id
                ? "border-[#FF8C00] bg-[#FF8C00]/10 text-white"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.06]"
            }`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${selected === id ? "text-[#FF8C00]" : "text-white/40"}`}
          />
          <span>{label}</span>
          {selected === id && <CheckCircle className="w-4 h-4 text-[#FF8C00] ml-auto" />}
        </button>
      ))}
    </div>
  );
}

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
] as const;

function LanguageSelector() {
  const [selected, setSelected] = useState("en");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ew_lang");
    if (saved) setSelected(saved);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === selected) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-xs font-medium transition-all"
      >
        <Globe className="w-3.5 h-3.5 text-[#FF8C00]" />
        <span>{current.flag}</span>
        <span>{current.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 w-44 bg-[#0A0E1A] border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setSelected(lang.code);
                localStorage.setItem("ew_lang", lang.code);
                setOpen(false);
                trackEvent("language_selected", { language: lang.code });
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                selected === lang.code
                  ? "bg-[#FF8C00]/10 text-[#FF8C00]"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {selected === lang.code && <CheckCircle className="w-3.5 h-3.5 ml-auto text-[#FF8C00]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EDGE_INSIGHTS = [
  {
    id: "quantum",
    icon: Atom,
    iconColor: "#FF8C00",
    borderColor: "rgba(255,140,0,0.25)",
    benefit: "Multi-model consensus — built to catch what single signals miss.",
    headline: "Quantum Consensus Engine",
    body: "6 AI agents cross-check every signal independently, then converge on a verdict. No single model bias — just collective precision your brokerage can't replicate.",
    cta: "See It In Action",
    ctaHref: "/terminal",
    tag: "Terminal",
  },
  {
    id: "timeline",
    icon: GitBranch,
    iconColor: "#FF8C00",
    borderColor: "rgba(255,140,0,0.22)",
    benefit: "See how one decision today branches into radically different futures.",
    headline: "Alternate Timeline Simulator",
    body: "See how a single decision today — save $200 more/month, pay off debt early — branches into radically different futures. No other platform shows you your money's parallel lives.",
    cta: "Explore Your Timelines",
    ctaHref: "/alternate-timeline",
    tag: "Alternate Timeline",
  },
  {
    id: "taxgpt",
    icon: FileSearch,
    iconColor: "#FFB800",
    borderColor: "rgba(245,200,66,0.22)",
    benefit: "Analyzes every trade for deductions in real time.",
    headline: "TaxGPT — Deductions You're Missing",
    body: "An AI trained on IRS publications scans your situation for overlooked deductions, audit risks, and tax strategies most CPAs don't surface in a 30-minute meeting.",
    cta: "Find Your Savings",
    ctaHref: "/taxgpt",
    tag: "TaxGPT",
  },
  {
    id: "coach",
    icon: Brain,
    iconColor: "#a78bfa",
    borderColor: "rgba(167,139,250,0.22)",
    benefit: "63+ AI disciplines applied to your behavioral finance habits.",
    headline: "Behavioral Finance Coach",
    body: "Real-time nudges grounded in behavioral economics — the psychology of why you make money decisions, and how to make better ones. Not just analysis, but actual habit change.",
    cta: "Meet Your Coach",
    ctaHref: "/ai-coach",
    tag: "AI Coach",
  },
];

function EdgeInsightCard({
  insight,
  active,
  onHover,
  onFocus,
  isSignedIn,
  tabIndex,
}: {
  insight: (typeof EDGE_INSIGHTS)[number];
  active: boolean;
  onHover: () => void;
  onFocus: () => void;
  isSignedIn: boolean;
  tabIndex: number;
}) {
  const Icon = insight.icon;
  const [, navigate] = useLocation();
  const ctaHref = isSignedIn
    ? insight.ctaHref
    : `/sign-up?feature=${encodeURIComponent(insight.ctaHref.replace(/^\//, ""))}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      trackEvent("edge_cta_clicked", { insight: insight.id, signed_in: isSignedIn, via: "keyboard" });
      navigate(ctaHref);
    }
  };

  return (
    <div
      role="group"
      aria-label={insight.headline}
      onMouseEnter={onHover}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      className={`relative p-5 flex flex-col gap-3 cursor-default transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
        active ? "scale-[1.01]" : "opacity-80 hover:opacity-100"
      }`}
      style={{
        background: "rgba(10,10,20,0.85)",
        borderTop: `1px solid ${active ? insight.borderColor : "rgba(255,255,255,0.07)"}`,
        borderRight: `1px solid ${active ? insight.borderColor : "rgba(255,255,255,0.07)"}`,
        borderBottom: `1px solid ${active ? insight.borderColor : "rgba(255,255,255,0.07)"}`,
        borderLeft: `3px solid ${active ? insight.iconColor : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.35s ease, opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${insight.iconColor}15`,
            border: `1px solid ${insight.iconColor}30`,
          }}
        >
          <Icon
            className="w-5 h-5 transition-transform duration-300"
            style={{
              color: insight.iconColor,
              transform: active ? "scale(1.15)" : "scale(1)",
            }}
          />
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{
            color: insight.iconColor,
            background: `${insight.iconColor}12`,
            border: `1px solid ${insight.iconColor}25`,
          }}
        >
          {insight.tag}
        </span>
      </div>

      <p
        className="text-xs font-semibold leading-snug"
        style={{ color: insight.iconColor }}
      >
        {insight.benefit}
      </p>

      <div>
        <p className="text-sm font-bold text-white mb-1">{insight.headline}</p>
        <p className="text-xs text-white/50 leading-relaxed">{insight.body}</p>
      </div>

      <Link
        href={ctaHref}
        onClick={() => trackEvent("edge_cta_clicked", { insight: insight.id, signed_in: isSignedIn })}
        aria-label={`${insight.cta} — ${insight.headline}`}
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold transition-all duration-200 group-hover:gap-2"
        style={{ color: insight.iconColor }}
      >
        {insight.cta}
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function YourEdgeSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isSignedIn } = useAuth();
  const gridRef = useRef<HTMLDivElement>(null);

  const startAutoRotate = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % EDGE_INSIGHTS.length);
    }, 3800);
  }, []);

  const stopAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!paused) {
      startAutoRotate();
    } else {
      stopAutoRotate();
    }
    return stopAutoRotate;
  }, [paused, startAutoRotate, stopAutoRotate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % EDGE_INSIGHTS.length);
      setPaused(true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev - 1 + EDGE_INSIGHTS.length) % EDGE_INSIGHTS.length);
      setPaused(true);
    }
  };

  return (
    <section className="py-16 lg:py-24 px-4 border-t border-white/5 relative overflow-hidden">
      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FF8C00]/70 mb-3">
            <Atom className="w-3 h-3" aria-hidden="true" />
            Your Edge
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            Capabilities no one else gives you
          </h2>
          <p className="text-sm text-white/40 mt-3 max-w-lg mx-auto leading-relaxed">
            EntangleWealth combines quantum-inspired consensus AI, timeline simulation, and behavioral coaching into one platform. Here's what sets us apart.
          </p>
        </div>

        <div
          ref={gridRef}
          role="region"
          aria-label="Edge feature highlights"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!gridRef.current?.contains(e.relatedTarget as Node)) {
              setPaused(false);
            }
          }}
          onKeyDown={handleKeyDown}
        >
          {EDGE_INSIGHTS.map((insight, idx) => (
            <EdgeInsightCard
              key={insight.id}
              insight={insight}
              active={activeIdx === idx}
              onHover={() => { setActiveIdx(idx); setPaused(true); }}
              onFocus={() => { setActiveIdx(idx); setPaused(true); }}
              isSignedIn={!!isSignedIn}
              tabIndex={0}
            />
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Edge feature navigation">
          {EDGE_INSIGHTS.map((insight, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={activeIdx === idx}
              aria-label={`View ${insight.headline}`}
              onClick={() => { setActiveIdx(idx); setPaused(true); }}
              className="transition-all duration-300 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40"
              style={{
                width: activeIdx === idx ? "20px" : "6px",
                height: "6px",
                background:
                  activeIdx === idx
                    ? EDGE_INSIGHTS[idx].iconColor
                    : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MicroConversionFlow({ referralCode }: { referralCode?: string }) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"cta" | "goal" | "done">("cta");

  const handleGoalSelect = (goal: string) => {
    setStep("done");
    const signUpUrl = referralCode
      ? `/sign-up?goal=${goal}&ref=${referralCode}`
      : `/sign-up?goal=${goal}`;
    setTimeout(() => navigate(signUpUrl), 600);
  };

  if (step === "cta") {
    return (
      <Button
        size="lg"
        onClick={() => {
          setStep("goal");
          trackEvent("hero_cta_clicked");
        }}
        className="h-11 px-8 bg-[#FF8C00] text-[#0A0E1A] font-mono font-bold hover:opacity-90 active:opacity-80 text-sm tracking-wider shadow-[0_0_20px_rgba(255,140,0,0.20)] transition-all duration-150"
      >
        See exactly where you stand — free
      </Button>
    );
  }

  if (step === "goal") {
    return (
      <div className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
        <GoalSelector onSelect={handleGoalSelect} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[#FF8C00] text-sm font-medium animate-in fade-in duration-300">
      <CheckCircle className="w-5 h-5" />
      <span>Great — taking you there now...</span>
    </div>
  );
}

export default function Home() {
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState(false);
  const signupsState = useRecentSignups();
  const testimonialsState = useTestimonials();
  const heroStatsState = useHeroStats();
  const stats = heroStatsState.data ?? heroStatsState.defaultStats;
  const animatedMembers = useAnimatedNumber(stats.members);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    trackEvent("home_viewed");
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    setReferralError(false);
    authFetch("/viral/referral/code", getToken)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.code) setReferralCode(data.code);
      })
      .catch(() => {
        setReferralError(true);
      });
  }, [isSignedIn, getToken]);

  return (
    <Layout>
      <HomeErrorBoundary>
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center pt-20 pb-24 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          <div className="container relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center space-y-6">
            <RecentSignupTicker signups={signupsState.data} error={signupsState.error} loading={signupsState.loading} />

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
              You shouldn't have to wonder
              <br />
              <span className="text-[#FF8C00]">if you're doing it right.</span>
            </h1>

            <p className="max-w-lg text-base md:text-lg text-white/60 leading-relaxed">
              Most people are one decision away from a completely different financial life. We tell you what that decision is — in plain English.
            </p>

            <MicroConversionFlow referralCode={referralCode || undefined} />

            {isSignedIn && referralError && (
              <InlineError message="Couldn't load your referral link right now." />
            )}

            <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
              <span className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium">
                <Lock className="w-3.5 h-3.5 text-[#FF8C00]" />
                Your data stays yours
              </span>
              {stats.members > 0 && (
                <span className="text-[11px] text-white/30 font-medium">
                  {animatedMembers.toLocaleString()}+ members
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Social proof ticker */}
        <SocialProofTicker />

        {/* Bridge: Hero → Problem */}
        <SectionBridge>Sound familiar?</SectionBridge>

        {/* Problem */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#FF8C00]/60">
                You're not alone
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
                The money guilt is real — and it compounds every month you wait.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    text: "You've got income coming in, but you're still not sure if you're saving enough, investing right, or just bleeding money you can't account for.",
                  },
                  {
                    text: "You've downloaded the apps, read the Reddit threads, watched the YouTube videos. You still don't know what to do with YOUR situation.",
                  },
                  {
                    text: "You keep telling yourself you'll figure it out next month. Next month becomes next year. And the gap keeps growing.",
                  },
                ].map((item, i) => (
                  <RevealSection key={i} delay={i * 80}>
                    <div className="glass-panel rounded-2xl p-5 text-sm text-white/60 leading-relaxed text-left h-full">
                      {item.text}
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Problem → Solution */}
        <SectionBridge>There's a better way</SectionBridge>

        {/* Solution */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#FF8C00]/60">
                Here's the difference
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
                Stop drowning in information. Start getting answers.
              </h2>
              <p className="text-base text-white/50 max-w-lg mx-auto leading-relaxed">
                We look at your actual situation — not some hypothetical average person — and tell you
                exactly what to do next. Specific. Actionable. No degree required.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    title: "Clarity",
                    desc: "See your full financial picture in one place. No more guessing, no more avoidance.",
                    color: "text-[#FF8C00]",
                    border: "border-[#FF8C00]/20",
                  },
                  {
                    title: "Simplicity",
                    desc: "We cut through the noise so you don't have to. Just the next right move — in plain language.",
                    color: "text-[#FF8C00]",
                    border: "border-[#FF8C00]/20",
                  },
                  {
                    title: "Confidence",
                    desc: "Act without the second-guessing. Know why you're doing it, not just what to do.",
                    color: "text-[#f5c842]",
                    border: "border-[#f5c842]/20",
                  },
                ].map((item, i) => (
                  <RevealSection key={item.title} delay={i * 80}>
                    <div className={`glass-panel rounded-2xl p-5 text-left border ${item.border} h-full`}>
                      <p className={`text-base font-bold mb-2 ${item.color}`}>{item.title}</p>
                      <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Solution → How It Works */}
        <SectionBridge>Here's exactly how it works</SectionBridge>

        {/* How It Works */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-3">
                  How it works
                </p>
                <h2 className="text-2xl md:text-4xl font-bold text-white">
                  Three steps. Finally, some answers.
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    num: "1",
                    title: "Tell us where you are",
                    desc: "No 47-question form. No linking accounts. Just the basics — enough to give you something real.",
                    color: "text-[#FF8C00]",
                    bg: "bg-[#FF8C00]/10",
                  },
                  {
                    num: "2",
                    title: "We do the heavy lifting",
                    desc: "Multiple AI models analyze your picture simultaneously. When they agree, we tell you — with confidence scores and clear reasoning.",
                    color: "text-[#FF8C00]",
                    bg: "bg-[#FF8C00]/10",
                  },
                  {
                    num: "3",
                    title: "You move forward",
                    desc: "Not 'consider your options.' An actual next step. The one thing that will make the biggest difference given your specific situation.",
                    color: "text-[#f5c842]",
                    bg: "bg-[#f5c842]/10",
                  },
                ].map((step, i) => (
                  <RevealSection key={step.num} delay={i * 100}>
                    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300 h-full">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${step.bg} ${step.color} text-base font-bold flex-shrink-0`}
                      >
                        {step.num}
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: How It Works → Your Edge */}
        <SectionBridge>See your edge</SectionBridge>

        {/* Your Edge */}
        <RevealSection>
          <YourEdgeSection />
        </RevealSection>

        {/* Bridge: Your Edge → Transformation */}
        <SectionBridge>What changes when you have clarity</SectionBridge>

        {/* Transformation */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-10">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[#FF8C00]/60 mb-3">
                  The shift
                </p>
                <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
                  From overwhelmed to in control
                </h2>
                <p className="mt-3 text-sm text-white/50 max-w-md mx-auto leading-relaxed">
                  Here's what members tell us changes once they have a clear next step.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <RevealSection delay={0}>
                  <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] h-full">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-5">Before</p>
                    <div className="space-y-4">
                      {[
                        "Avoiding bank statements because they spike anxiety",
                        "Saving random amounts with no idea if it's enough",
                        "Second-guessing every financial decision for weeks",
                        "Feeling behind compared to everyone else",
                      ].map((text) => (
                        <div key={text} className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-full border border-white/15 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-white/40 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealSection>

                <RevealSection delay={120}>
                  <div className="glass-panel rounded-2xl p-6 border border-[#FF8C00]/20 h-full">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF8C00]/60 mb-5">After</p>
                    <div className="space-y-4">
                      {[
                        "A clear, specific action to take this week",
                        "Knowing exactly how much to save and where",
                        "Decisions made with confidence, not guesswork",
                        "A plan that fits your life — not someone else's",
                      ].map((text) => (
                        <div key={text} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-[#FF8C00] flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-white/70 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealSection>
              </div>

              <RevealSection delay={200}>
                <div className="mt-6 flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <ArrowRight className="w-4 h-4 text-[#FF8C00] flex-shrink-0" />
                  <p className="text-sm text-white/50 leading-relaxed">
                    Most members report feeling noticeably clearer within their first session.
                  </p>
                </div>
              </RevealSection>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Transformation → Testimonials */}
        <SectionBridge>Don't just take our word for it</SectionBridge>

        {/* Testimonials */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                  What members are saying
                </h2>
                <p className="text-sm text-white/50">Real experiences from Entangled Wealth users.</p>
              </div>

              {testimonialsState.error && (
                <InlineError message="Couldn't load member reviews right now. Please refresh to try again." />
              )}

              {!testimonialsState.error && !testimonialsState.loading && testimonialsState.data === null && (
                <p className="text-center text-sm text-white/30">No reviews yet — be the first!</p>
              )}

              {testimonialsState.data && testimonialsState.data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testimonialsState.data.slice(0, 6).map((t, i) => (
                    <RevealSection key={t.id} delay={i * 60}>
                      <div className="glass-panel rounded-xl p-5 flex flex-col gap-3 h-full">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star
                              key={j}
                              className={`w-3.5 h-3.5 ${
                                j < t.rating
                                  ? "text-[#FFD700] fill-[#FFD700]"
                                  : "text-white/10 fill-white/10"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed flex-1">"{t.message}"</p>
                        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                          <div className="w-7 h-7 rounded-full bg-[#FF8C00]/20 flex items-center justify-center text-xs font-bold text-[#FF8C00]">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{t.name}</p>
                            {t.role && <p className="text-[10px] text-white/30">{t.role}</p>}
                          </div>
                        </div>
                      </div>
                    </RevealSection>
                  ))}
                </div>
              )}
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Testimonials → Trust */}
        <SectionBridge>Why we're different</SectionBridge>

        {/* Trust */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-3">
                Why people trust us
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-white">
                Built to simplify, not overwhelm.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 text-left">
                {[
                  {
                    icon: CheckCircle,
                    color: "text-[#FF8C00]",
                    title: "No confusing financial jargon",
                    desc: "Every piece of guidance is written for real people, not finance professionals.",
                  },
                  {
                    icon: ShieldCheck,
                    color: "text-[#FF8C00]",
                    title: "Your privacy is protected",
                    desc: "Your data is encrypted and never sold. You're a person, not a product.",
                  },
                  {
                    icon: Lock,
                    color: "text-[#f5c842]",
                    title: "No pressure, no upsells",
                    desc: "Start free and upgrade only if you want more. No gotchas, no dark patterns.",
                  },
                  {
                    icon: Heart,
                    color: "text-[#ff8888]",
                    title: "Designed for your peace of mind",
                    desc: "We measure success by how much clearer and calmer you feel about your finances.",
                  },
                ].map((item, i) => (
                  <RevealSection key={item.title} delay={i * 70}>
                    <div className="glass-panel rounded-2xl p-5 flex gap-4 h-full">
                      <item.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.color}`} />
                      <div>
                        <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                        <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-white/30 font-medium">
                <span>{stats.accuracy}% guidance accuracy</span>
                <span>·</span>
                <span>{animatedMembers.toLocaleString()}+ members</span>
                <span>·</span>
                <span>Free forever tier</span>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Trust → Email Capture */}
        <SectionBridge>Stay in the loop</SectionBridge>

        {/* Email Capture */}
        <EmailCapture />

        {/* Anniversary Giveaway */}
        <section className="py-8 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <AnniversaryGiveawayBanner />
            </div>
          </RevealSection>
        </section>

        {testimonialsState.data && testimonialsState.data.length > 0 && (
        <section className="py-16 lg:py-24 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                What members are saying
              </h2>
              <p className="text-sm text-white/50">Real experiences from Entangled Wealth users.</p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testimonialsState.data.slice(0, 6).map((t) => (
                  <div key={t.id} className="bloomberg-panel p-5 flex flex-col gap-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < t.rating
                              ? "text-[#FFB800] fill-[#FFB800]"
                              : "text-white/10 fill-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed flex-1">"{t.message}"</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      <div className="w-7 h-7 rounded-full bg-[#FF8C00]/20 flex items-center justify-center text-xs font-bold text-[#FF8C00]">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{t.name}</p>
                        {t.role && <p className="text-[10px] text-white/30">{t.role}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        </section>
        )}
        {/* Final CTA */}
        <section className="py-20 lg:py-28 px-4 border-t border-white/5">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center flex flex-col items-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#FF8C00]/60">
                You came here unsure. Now you know your next step.
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
                Stop guessing. Start knowing.
              </h2>
              <p className="text-base text-white/50 max-w-md leading-relaxed">
                Answer three quick questions and get a clear, specific recommendation — no credit card, no commitment. In under 60 seconds.
              </p>

              <MicroConversionFlow referralCode={referralCode || undefined} />

              <p className="text-[11px] text-white/25 max-w-xs leading-relaxed">
                For guidance and education. Not a substitute for professional financial advice.
              </p>
            </div>
          </RevealSection>
        </section>
      </HomeErrorBoundary>
    </Layout>
  );
}
