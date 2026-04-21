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
      <div className="w-px h-8 bg-gradient-to-b from-transparent to-border" />
      <p className="mt-3 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/40 text-center max-w-xs">
        {children}
      </p>
      <div className="mt-3 w-px h-8 bg-gradient-to-b from-border to-transparent" />
    </div>
  );
}

function InlineError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground/70 px-3 py-2 rounded-lg border border-border bg-muted/30">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/50" />
      <span>{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="ml-auto flex items-center gap-1 text-[#00B4D8]/60 hover:text-[#00B4D8] transition-colors"
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
          <AlertCircle className="w-10 h-10 text-muted-foreground/70" />
          <p className="text-base text-muted-foreground font-medium">Something went wrong loading this page.</p>
          <p className="text-sm text-muted-foreground/50">Please refresh to try again.</p>
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted/50"
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
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/50" aria-hidden="true">
        <div className="w-3 h-3 rounded-full bg-muted animate-pulse flex-shrink-0" />
        <div className="w-36 h-2.5 rounded-full bg-muted animate-pulse" />
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
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#00B4D8]/15 bg-[#00B4D8]/5 text-[11px] font-medium text-[#00B4D8]">
      <UserPlus className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      <span>
        {s.name} just joined {s.timeLabel}
      </span>
    </div>
  );
}

const GOAL_OPTIONS = [
  { id: "clarity", label: "I have no idea where I actually stand financially", icon: Lightbulb },
  { id: "invest", label: "My money is sitting idle and I'm losing ground", icon: TrendingUp },
  { id: "stress", label: "Money anxiety is wrecking my focus and sleep", icon: Heart },
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
      <p className="text-sm text-foreground/70 mb-4">What's the real problem right now?</p>
      {GOAL_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleSelect(id)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 text-sm font-medium
            ${
              selected === id
                ? "border-[#00B4D8] bg-[#00B4D8]/10 text-foreground"
                : "border-border bg-muted/50 text-foreground/80 hover:border-border hover:bg-muted"
            }`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${selected === id ? "text-[#00B4D8]" : "text-muted-foreground/70"}`}
          />
          <span>{label}</span>
          {selected === id && <CheckCircle className="w-4 h-4 text-[#00B4D8] ml-auto" />}
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground/70 hover:text-foreground text-xs font-medium transition-all"
      >
        <Globe className="w-3.5 h-3.5 text-[#00B4D8]" />
        <span>{current.flag}</span>
        <span>{current.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
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
                  ? "bg-[#00B4D8]/10 text-[#00B4D8]"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {selected === lang.code && <CheckCircle className="w-3.5 h-3.5 ml-auto text-[#00B4D8]" />}
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
    iconColor: "#00B4D8",
    borderColor: "rgba(0,180,216,0.25)",
    benefit: "Six AI agents vote on every signal. Consensus only. No noise.",
    headline: "Quantum Consensus Engine",
    body: "6 independent AI models analyze the same signal simultaneously. When they disagree, you hear nothing. When they converge, you get a verdict with confidence score and hard reasoning — not a colored arrow.",
    cta: "Watch It Work",
    ctaHref: "/terminal",
    tag: "Terminal",
  },
  {
    id: "timeline",
    icon: GitBranch,
    iconColor: "#00B4D8",
    borderColor: "rgba(0,180,216,0.22)",
    benefit: "One decision today. Radically different futures tomorrow.",
    headline: "Alternate Timeline Simulator",
    body: "Save $200 more a month. Pay off that card six months early. The simulator shows you exactly how one choice branches your financial life — in dollars and years, not percentages and jargon.",
    cta: "See Your Futures",
    ctaHref: "/alternate-timeline",
    tag: "Alternate Timeline",
  },
  {
    id: "taxgpt",
    icon: FileSearch,
    iconColor: "#FFB800",
    borderColor: "rgba(245,200,66,0.22)",
    benefit: "You're leaving money on the table. We find exactly where.",
    headline: "TaxGPT — Deductions You're Missing",
    body: "An AI built on IRS publications scans your situation for every deduction, audit risk, and tax strategy your CPA skips in a 30-minute meeting. Most users find thousands they didn't know they had.",
    cta: "Find What You're Missing",
    ctaHref: "/taxgpt",
    tag: "TaxGPT",
  },
  {
    id: "coach",
    icon: Brain,
    iconColor: "#a78bfa",
    borderColor: "rgba(167,139,250,0.22)",
    benefit: "Why you make bad money decisions — and how to stop.",
    headline: "Behavioral Finance Coach",
    body: "63 disciplines of behavioral economics applied to your actual spending and decision patterns. Real-time nudges that interrupt the habits costing you money before you repeat them.",
    cta: "Start Unlearning",
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
      className={`relative p-5 flex flex-col gap-3 cursor-default transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 bg-card border border-border rounded-lg ${
        active ? "scale-[1.01]" : "opacity-80 hover:opacity-100"
      }`}
      style={{
        borderTopColor: active ? insight.borderColor : undefined,
        borderRightColor: active ? insight.borderColor : undefined,
        borderBottomColor: active ? insight.borderColor : undefined,
        borderLeftWidth: "3px",
        borderLeftColor: active ? insight.iconColor : undefined,
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
        <p className="text-sm font-bold text-foreground mb-1">{insight.headline}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
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
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#00B4D8]/70 mb-3">
            <Atom className="w-3 h-3" aria-hidden="true" />
            Your Edge
          </span>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
            Tools your brokerage doesn't want you to have
          </h2>
          <p className="text-sm text-muted-foreground/70 mt-3 max-w-lg mx-auto leading-relaxed">
            We built what we couldn't find anywhere else — consensus AI that kills single-model bias, timeline simulation no other platform offers, and behavioral coaching that actually changes habits.
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
              className="transition-all duration-300 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground/40"
              style={{
                width: activeIdx === idx ? "20px" : "6px",
                height: "6px",
                background:
                  activeIdx === idx
                    ? EDGE_INSIGHTS[idx].iconColor
                    : "hsl(var(--muted-foreground) / 0.25)",
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
        className="h-11 px-8 bg-[#00B4D8] text-[#0A0E1A] font-mono font-bold hover:opacity-90 active:opacity-80 text-sm tracking-wider shadow-[0_0_20px_rgba(0,180,216,0.20)] transition-all duration-150"
      >
        Get my financial picture — free
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
    <div className="flex items-center gap-2 text-[#00B4D8] text-sm font-medium animate-in fade-in duration-300">
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

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
              Stop guessing with
              <br />
              <span className="text-[#00B4D8]">your financial future.</span>
            </h1>

            <p className="max-w-lg text-base md:text-lg text-muted-foreground leading-relaxed">
              Most people have the income. What they're missing is clarity. We built the tool that tells you exactly what to do next — not eventually, right now.
            </p>

            <MicroConversionFlow referralCode={referralCode || undefined} />

            {isSignedIn && referralError && (
              <InlineError message="Couldn't load your referral link right now." />
            )}

            <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
                <Lock className="w-3.5 h-3.5 text-[#00B4D8]" />
                Your data stays yours
              </span>
              {stats.members > 0 && (
                <span className="text-[11px] text-muted-foreground/50 font-medium">
                  {animatedMembers.toLocaleString()}+ members
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Social proof ticker */}
        <SocialProofTicker />

        {/* Bridge: Hero → Problem */}
        <SectionBridge>Be honest with yourself</SectionBridge>

        {/* Problem */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00B4D8]/60">
                The real problem
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-snug">
                The information isn't the problem. The paralysis is.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    text: "Money is coming in. You just can't tell if it's going to the right places — or silently evaporating into a life that looks fine from the outside.",
                  },
                  {
                    text: "You've read the articles. Watched the videos. Opened the apps. None of it told you what to do with your specific income, your specific debt, your specific situation.",
                  },
                  {
                    text: "You keep waiting for the right moment to get serious. That moment doesn't come. The gap between where you are and where you should be quietly widens.",
                  },
                ].map((item, i) => (
                  <RevealSection key={i} delay={i * 80}>
                    <div className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground leading-relaxed text-left h-full">
                      {item.text}
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Problem → Solution */}
        <SectionBridge>Here's what's different</SectionBridge>

        {/* Solution */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00B4D8]/60">
                The fix
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-snug">
                Not more information. Your next move.
              </h2>
              <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
                We analyze your actual situation — not a generic user profile — and surface one clear, specific action. Not a list of options. Not "it depends." The thing to do next.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                {[
                  {
                    title: "Clarity",
                    desc: "Your full financial picture, in one place, right now. No spreadsheets. No avoidance. Just the truth.",
                    color: "text-[#00B4D8]",
                    border: "border-[#00B4D8]/20",
                  },
                  {
                    title: "Simplicity",
                    desc: "We cut every piece of noise between you and the answer. One next step, in plain language, no degree required.",
                    color: "text-[#00B4D8]",
                    border: "border-[#00B4D8]/20",
                  },
                  {
                    title: "Confidence",
                    desc: "Know why you're making the move, not just what it is. That's the difference between executing and hesitating.",
                    color: "text-[#f5c842]",
                    border: "border-[#f5c842]/20",
                  },
                ].map((item, i) => (
                  <RevealSection key={item.title} delay={i * 80}>
                    <div className={`glass-panel rounded-2xl p-5 text-left border ${item.border} h-full`}>
                      <p className={`text-base font-bold mb-2 ${item.color}`}>{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Solution → How It Works */}
        <SectionBridge>Simple by design</SectionBridge>

        {/* How It Works */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-12">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-3">
                  How it works
                </p>
                <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                  Three steps. Zero guessing.
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    num: "1",
                    title: "Tell us what you're working with",
                    desc: "No 47-question form. No linking accounts you don't trust. Just enough to give you something real in under two minutes.",
                    color: "text-[#00B4D8]",
                    bg: "bg-[#00B4D8]/10",
                  },
                  {
                    num: "2",
                    title: "Six AI models go to work",
                    desc: "Multiple models analyze your situation in parallel. When they converge on the same answer, we surface it — with confidence scores and the actual reasoning.",
                    color: "text-[#00B4D8]",
                    bg: "bg-[#00B4D8]/10",
                  },
                  {
                    num: "3",
                    title: "You get the one thing to do next",
                    desc: "Not 'explore your options.' Not 'consider consulting a professional.' One specific action, calibrated to your situation. Do it. Move on.",
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
                      <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: How It Works → Your Edge */}
        <SectionBridge>This is what the edge looks like</SectionBridge>

        {/* Your Edge */}
        <RevealSection>
          <YourEdgeSection />
        </RevealSection>

        {/* Bridge: Your Edge → Transformation */}
        <SectionBridge>What clarity actually does</SectionBridge>

        {/* Transformation */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-10">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00B4D8]/60 mb-3">
                  The shift
                </p>
                <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-snug">
                  From frozen to moving
                </h2>
                <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Here's the difference one clear next step makes — according to people who actually used it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <RevealSection delay={0}>
                  <div className="glass-panel rounded-2xl p-6 border border-border h-full">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-5">Before</p>
                    <div className="space-y-4">
                      {[
                        "Avoiding your bank app because you don't want to know",
                        "Saving whatever's left — which is usually nothing",
                        "Lying awake running financial scenarios you can't solve",
                        "Watching others build wealth while you stall",
                      ].map((text) => (
                        <div key={text} className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-full border border-white/15 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground/70 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealSection>

                <RevealSection delay={120}>
                  <div className="glass-panel rounded-2xl p-6 border border-[#00B4D8]/20 h-full">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#00B4D8]/60 mb-5">After</p>
                    <div className="space-y-4">
                      {[
                        "One specific action you can execute this week",
                        "A savings target you understand, built around your reality",
                        "Decisions made once, with conviction, and moved on from",
                        "A financial trajectory you can actually explain to yourself",
                      ].map((text) => (
                        <div key={text} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-[#00B4D8] flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground/70 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealSection>
              </div>

              <RevealSection delay={200}>
                <div className="mt-6 flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-muted/50 border border-border">
                  <ArrowRight className="w-4 h-4 text-[#00B4D8] flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Members consistently report that the first session is the moment something finally clicks.
                  </p>
                </div>
              </RevealSection>
            </div>
          </RevealSection>
        </section>

        {/* Bridge: Transformation → Testimonials */}
        <SectionBridge>Hear it from them, not us</SectionBridge>

        {/* Testimonials */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-3xl">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                  Real members. Real clarity.
                </h2>
                <p className="text-sm text-muted-foreground">Unfiltered experiences from people who were exactly where you are now.</p>
              </div>

              {testimonialsState.error && (
                <InlineError message="Couldn't load member reviews right now. Please refresh to try again." />
              )}

              {!testimonialsState.error && !testimonialsState.loading && testimonialsState.data === null && (
                <p className="text-center text-sm text-muted-foreground/50">No reviews yet — be the first!</p>
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
                                  : "text-muted-foreground/20 fill-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-foreground/70 leading-relaxed flex-1">"{t.message}"</p>
                        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                          <div className="w-7 h-7 rounded-full bg-[#00B4D8]/20 flex items-center justify-center text-xs font-bold text-[#00B4D8]">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{t.name}</p>
                            {t.role && <p className="text-[10px] text-muted-foreground/50">{t.role}</p>}
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
        <SectionBridge>Why it's built this way</SectionBridge>

        {/* Trust */}
        <section className="py-16 lg:py-24 px-4">
          <RevealSection>
            <div className="container mx-auto max-w-2xl text-center space-y-6">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/50 mb-3">
                Built with intention
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                No tricks. No jargon. No excuses.
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 text-left">
                {[
                  {
                    icon: CheckCircle,
                    color: "text-[#00B4D8]",
                    title: "Plain language, always",
                    desc: "If you need a finance degree to understand our output, we failed. Every insight is written for a real person with real things to do.",
                  },
                  {
                    icon: ShieldCheck,
                    color: "text-[#00B4D8]",
                    title: "Your data is yours, full stop",
                    desc: "Encrypted. Never sold. Never used to train models without consent. You're not the product here.",
                  },
                  {
                    icon: Lock,
                    color: "text-[#f5c842]",
                    title: "Free tier that's actually useful",
                    desc: "Start free and get real value. Upgrade when you're ready. No countdown timers, no fake urgency.",
                  },
                  {
                    icon: Heart,
                    color: "text-[#ff8888]",
                    title: "We built this because we were frustrated",
                    desc: "Institutional-grade analysis has always been behind a paywall that would eat your entire trading account. That's what we're fixing.",
                  },
                ].map((item, i) => (
                  <RevealSection key={item.title} delay={i * 70}>
                    <div className="glass-panel rounded-2xl p-5 flex gap-4 h-full">
                      <item.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.color}`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-muted-foreground/50 font-medium">
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
        <SectionBridge>Don't go in blind</SectionBridge>

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
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
                Real members. Real clarity.
              </h2>
              <p className="text-sm text-muted-foreground">Unfiltered experiences from people who were exactly where you are now.</p>
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
                              : "text-muted-foreground/20 fill-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed flex-1">"{t.message}"</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      <div className="w-7 h-7 rounded-full bg-[#00B4D8]/20 flex items-center justify-center text-xs font-bold text-[#00B4D8]">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{t.name}</p>
                        {t.role && <p className="text-[10px] text-muted-foreground/50">{t.role}</p>}
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
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00B4D8]/60">
                You already know something has to change.
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground leading-snug">
                Start with one honest look.
              </h2>
              <p className="text-base text-muted-foreground max-w-md leading-relaxed">
                Two minutes. Zero credit card. A real, specific recommendation for your situation — not a template. Do it now.
              </p>

              <MicroConversionFlow referralCode={referralCode || undefined} />

              <p className="text-[11px] text-muted-foreground/40 max-w-xs leading-relaxed">
                For guidance and education. Not a substitute for professional financial advice.
              </p>
            </div>
          </RevealSection>
        </section>
      </HomeErrorBoundary>
    </Layout>
  );
}
