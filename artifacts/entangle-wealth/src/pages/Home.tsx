import { useState, useEffect, useRef, Component, ReactNode } from "react";
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
} from "lucide-react";
import { EmailCapture } from "@/components/EmailCapture";
import { AnniversaryGiveawayBanner } from "@/components/viral/AnniversaryGiveawayBanner";
import { trackEvent } from "@/lib/trackEvent";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

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
  const defaultStats: HeroStats = { members: 4891, signals: 1247, accuracy: 87 };
  const [state, setState] = useState<FetchState<HeroStats>>({
    data: defaultStats,
    error: false,
    loading: false,
  });

  useEffect(() => {
    const fetchStats = () => {
      setState((prev) => ({ ...prev, loading: true, error: false }));
      fetch(`${API_BASE}/stats/hero`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => {
          if (d && typeof d.members === "number") {
            setState({ data: d, error: false, loading: false });
          } else {
            setState((prev) => ({ ...prev, loading: false }));
          }
        })
        .catch(() => {
          setState((prev) => ({ ...prev, loading: false, error: true }));
        });
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
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
    fetch(`${API_BASE}/stats/recent-signups`)
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
    fetch(`${API_BASE}/viral/testimonials`)
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

function InlineError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/40 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-white/30" />
      <span>{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="ml-auto flex items-center gap-1 text-[#00c8f8]/60 hover:text-[#00c8f8] transition-colors"
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
          <AlertCircle className="w-10 h-10 text-white/20" />
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
}: {
  signups: { name: string; timeLabel: string }[] | null;
  error: boolean;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!signups || signups.length === 0) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % signups.length), 3000);
    return () => clearInterval(t);
  }, [signups?.length]);

  if (error) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] text-white/25">
        <AlertCircle className="w-3 h-3" />
        <span>Live activity unavailable</span>
      </div>
    );
  }

  if (!signups || signups.length === 0) return null;
  const s = signups[idx];
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#00ff88]/15 bg-[#00ff88]/5 text-[11px] font-medium text-[#00ff88]">
      <UserPlus className="w-3 h-3 flex-shrink-0" />
      <span>
        {s.name} just joined {s.timeLabel}
      </span>
    </div>
  );
}

const GOAL_OPTIONS = [
  { id: "clarity", label: "Get clarity on my finances", icon: Lightbulb },
  { id: "invest", label: "Start investing smarter", icon: TrendingUp },
  { id: "stress", label: "Reduce money stress", icon: Heart },
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
      <p className="text-sm text-white/70 mb-4">What brings you here?</p>
      {GOAL_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleSelect(id)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200 text-sm font-medium
            ${
              selected === id
                ? "border-[#00c8f8] bg-[#00c8f8]/10 text-white"
                : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.06]"
            }`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 ${selected === id ? "text-[#00c8f8]" : "text-white/40"}`}
          />
          <span>{label}</span>
          {selected === id && <CheckCircle className="w-4 h-4 text-[#00c8f8] ml-auto" />}
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
        <Globe className="w-3.5 h-3.5 text-[#00c8f8]" />
        <span>{current.flag}</span>
        <span>{current.label}</span>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 w-44 bg-[#0a0a0f] border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
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
                  ? "bg-[#00c8f8]/10 text-[#00c8f8]"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {selected === lang.code && <CheckCircle className="w-3.5 h-3.5 ml-auto text-[#00c8f8]" />}
            </button>
          ))}
        </div>
      )}
    </div>
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
        className="h-12 px-8 bg-gradient-to-r from-[#00c8f8] to-[#0088cc] text-black font-bold hover:opacity-90 text-base rounded-full shadow-[0_0_24px_rgba(0,200,248,0.25)]"
      >
        Get clarity — it's free
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
    <div className="flex items-center gap-2 text-[#00e676] text-sm font-medium animate-in fade-in duration-300">
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
            <RecentSignupTicker signups={signupsState.data} error={signupsState.error} />

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
              Stop guessing what to do
              <br />
              <span className="text-[#00c8f8]">with your money.</span>
            </h1>

            <p className="max-w-lg text-base md:text-lg text-white/60 leading-relaxed">
              Plain-language guidance on your finances — no jargon, no charts to decode. Just clear
              answers you can act on.
            </p>

            <MicroConversionFlow referralCode={referralCode || undefined} />

            {isSignedIn && referralError && (
              <InlineError message="Couldn't load your referral link right now." />
            )}

            <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
              <span className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00e676]" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium">
                <Lock className="w-3.5 h-3.5 text-[#00c8f8]" />
                Private by default
              </span>
              {!heroStatsState.error && stats.members > 0 && (
                <span className="text-[11px] text-white/30 font-medium">
                  {animatedMembers.toLocaleString()}+ members
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Anniversary Giveaway Banner */}
        <div className="container mx-auto px-4 max-w-3xl pb-4">
          <AnniversaryGiveawayBanner />
        </div>

        {/* Problem */}
        <section className="py-16 lg:py-24 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-2xl text-center space-y-6">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00c8f8]/60">
              Sound familiar?
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
              Most people feel lost with money — and it's not their fault.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                {
                  text: "You know you should be doing something with your money. You just don't know what.",
                },
                {
                  text: "You've tried apps and articles, but the advice is confusing, conflicting, or just not for you.",
                },
                {
                  text: "Every time you think about it, you feel overwhelmed — so you put it off again.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-2xl p-5 text-sm text-white/60 leading-relaxed text-left"
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="py-16 lg:py-24 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-2xl text-center space-y-6">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[#00e676]/60">
              Here's the difference
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
              Entangled Wealth makes the complicated simple.
            </h2>
            <p className="text-base text-white/50 max-w-lg mx-auto leading-relaxed">
              We take your financial picture, apply smart analysis behind the scenes, and give you
              clear, actionable guidance — in plain English. No expertise required.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                {
                  title: "Clarity",
                  desc: "Know exactly where you stand and what to focus on next.",
                  color: "text-[#00c8f8]",
                  border: "border-[#00c8f8]/20",
                },
                {
                  title: "Simplicity",
                  desc: "No charts, no jargon. Just the guidance you need.",
                  color: "text-[#00e676]",
                  border: "border-[#00e676]/20",
                },
                {
                  title: "Confidence",
                  desc: "Make financial decisions without the second-guessing.",
                  color: "text-[#f5c842]",
                  border: "border-[#f5c842]/20",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`glass-panel rounded-2xl p-5 text-left border ${item.border}`}
                >
                  <p className={`text-base font-bold mb-2 ${item.color}`}>{item.title}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 lg:py-24 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-white/30 mb-3">
                How it works
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-white">
                Three steps to feeling in control
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  num: "1",
                  title: "Understand your situation",
                  desc: "Tell us a bit about where you are financially. No forms, no complexity — just the basics.",
                  color: "text-[#00c8f8]",
                  bg: "bg-[#00c8f8]/10",
                },
                {
                  num: "2",
                  title: "Get clear guidance",
                  desc: "We analyze your picture and give you simple, specific next steps — no financial degree needed.",
                  color: "text-[#00e676]",
                  bg: "bg-[#00e676]/10",
                },
                {
                  num: "3",
                  title: "Make better decisions",
                  desc: "Act with confidence. Whether you're saving, investing, or just getting organized — you'll know what to do.",
                  color: "text-[#f5c842]",
                  bg: "bg-[#f5c842]/10",
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="glass-panel p-6 rounded-2xl flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${step.bg} ${step.color} text-base font-bold flex-shrink-0`}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <EmailCapture />

        {/* Trust */}
        <section className="py-16 lg:py-24 px-4 border-t border-white/5">
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
                  color: "text-[#00e676]",
                  title: "No confusing financial jargon",
                  desc: "Every piece of guidance is written for real people, not finance professionals.",
                },
                {
                  icon: ShieldCheck,
                  color: "text-[#00c8f8]",
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
              ].map((item) => (
                <div key={item.title} className="glass-panel rounded-2xl p-5 flex gap-4">
                  <item.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.color}`} />
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-white/30 font-medium">
              {heroStatsState.error ? (
                <InlineError message="Live stats unavailable right now." />
              ) : (
                <>
                  <span>{stats.accuracy}% guidance accuracy</span>
                  <span>·</span>
                  <span>{animatedMembers.toLocaleString()}+ members</span>
                  <span>·</span>
                  <span>Free forever tier</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 lg:py-24 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
                What members are saying
              </h2>
              <p className="text-sm text-white/40">Real experiences from Entangled Wealth users.</p>
            </div>

            {testimonialsState.error && (
              <InlineError message="Couldn't load member reviews right now. Please refresh to try again." />
            )}

            {!testimonialsState.error && !testimonialsState.loading && testimonialsState.data === null && (
              <p className="text-center text-sm text-white/30">No reviews yet — be the first!</p>
            )}

            {testimonialsState.data && testimonialsState.data.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testimonialsState.data.slice(0, 6).map((t) => (
                  <div key={t.id} className="glass-panel rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < t.rating
                              ? "text-[#FFD700] fill-[#FFD700]"
                              : "text-white/10 fill-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed flex-1">"{t.message}"</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                      <div className="w-7 h-7 rounded-full bg-[#00c8f8]/20 flex items-center justify-center text-xs font-bold text-[#00c8f8]">
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
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-28 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-2xl text-center flex flex-col items-center space-y-6">
            <h2 className="text-2xl md:text-4xl font-bold text-white leading-snug">
              Ready to feel good about your money?
            </h2>
            <p className="text-base text-white/50 max-w-md leading-relaxed">
              It starts with a single step. No commitment, no credit card, no overwhelm — just
              clarity.
            </p>

            <MicroConversionFlow referralCode={referralCode || undefined} />

            <p className="text-[11px] text-white/25 max-w-xs leading-relaxed">
              This is a financial guidance tool. It won't guarantee outcomes — nothing can. But it
              will help you feel more informed and in control.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <Link href="/pricing">
                <button className="flex items-center gap-1 hover:text-white/60 transition-colors">
                  See what's included <ChevronRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </HomeErrorBoundary>
    </Layout>
  );
}
