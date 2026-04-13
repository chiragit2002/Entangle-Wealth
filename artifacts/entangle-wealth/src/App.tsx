import { useEffect, useRef, useMemo, lazy, Suspense, useState, useCallback } from "react";
import { Switch, Route, Link, useLocation, Router as WouterRouter, Redirect, useSearch } from "wouter";
import logoImg from "@assets/Gemini_Generated_Image_nso2qnso2qnso2qn_1775900950533.png";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import * as SentryReact from "@sentry/react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorFallback from "@/components/ErrorFallback";
import NotFound from "@/pages/not-found";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";
import { PageSkeleton, ChartSkeleton, TableSkeleton } from "@/components/pwa/PageSkeleton";
import { captureReferralCode } from "@/lib/referral";
import { trackEvent } from "@/lib/trackEvent";
import { usePageTracking } from "@/hooks/usePageTracking";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { TerminalAuthShell } from "@/components/TerminalAuthShell";
import { Info } from "lucide-react";
import { AuthErrorHandler } from "@/components/AuthErrorHandler";
import { AuthTokenError } from "@/lib/authFetch";
import { BootSequence } from "@/components/BootSequence";
import { QuantumPageTransition } from "@/components/QuantumPageTransition";
import { AuditErrorBoundary } from "@/components/AuditErrorBoundary";
import { useUxTracker } from "@/hooks/useUxTracker";
const MilestoneCelebrationModal = lazy(() =>
  import("@/components/viral/MilestoneCelebrationModal").then((m) => ({ default: m.MilestoneCelebrationModal }))
);
import { ProfileCompletionGate } from "@/components/ProfileCompletionGate";
import { PopupQueueProvider } from "@/components/PopupQueue";

const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Earn = lazy(() => import("@/pages/Earn"));
const Options = lazy(() => import("@/pages/Options"));
const About = lazy(() => import("@/pages/About"));
const Terminal = lazy(() => import("@/pages/Terminal"));
const Stocks = lazy(() => import("@/pages/Stocks"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const Gigs = lazy(() => import("@/pages/Gigs"));
const Community = lazy(() => import("@/pages/Community"));
const Tax = lazy(() => import("@/pages/Tax"));
const Receipts = lazy(() => import("@/pages/Receipts"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const Travel = lazy(() => import("@/pages/Travel"));
const TaxGPT = lazy(() => import("@/pages/TaxGPT"));
const Resume = lazy(() => import("@/pages/Resume"));
const Profile = lazy(() => import("@/pages/Profile"));
const TechnicalAnalysis = lazy(() => import("@/pages/TechnicalAnalysis"));
const Screener = lazy(() => import("@/pages/Screener"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Research = lazy(() => import("@/pages/Research"));
const TimeMachine = lazy(() => import("@/pages/TimeMachine"));
const SectorFlow = lazy(() => import("@/pages/SectorFlow"));
const VolatilityLab = lazy(() => import("@/pages/VolatilityLab"));
const CompetitiveAnalysis = lazy(() => import("@/pages/CompetitiveAnalysis"));
const OpenSourceIntel = lazy(() => import("@/pages/OpenSourceIntel"));
const CaseStudy = lazy(() => import("@/pages/CaseStudy"));
const Charts = lazy(() => import("@/pages/Charts"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const TokenWallet = lazy(() => import("@/pages/TokenWallet"));
const TravelMarketplace = lazy(() => import("@/pages/TravelMarketplace"));
const RewardHistory = lazy(() => import("@/pages/RewardHistory"));
const TokenAdmin = lazy(() => import("@/pages/TokenAdmin"));
const TaxStrategy = lazy(() => import("@/pages/TaxStrategy"));
const MarketingCenter = lazy(() => import("@/pages/MarketingCenter"));
const ContentCalendar = lazy(() => import("@/pages/ContentCalendar"));
const RedditEngine = lazy(() => import("@/pages/RedditEngine"));
const SeoEngine = lazy(() => import("@/pages/SeoEngine"));
const BlogIndex = lazy(() => import("@/pages/BlogIndex"));
const BlogPostPage = lazy(() => import("@/pages/BlogPost"));
const AlertsPage = lazy(() => import("@/pages/Alerts"));
const AnalyticsPage = lazy(() => import("@/pages/Analytics"));
const CookiesPage = lazy(() => import("@/pages/Cookies"));
const DisclaimerPage = lazy(() => import("@/pages/Disclaimer"));
const DmcaPage = lazy(() => import("@/pages/Dmca"));
const AccessibilityPage = lazy(() => import("@/pages/Accessibility"));
const HelpPage = lazy(() => import("@/pages/Help"));
const SubmitTicketPage = lazy(() => import("@/pages/SubmitTicket"));
const StatusPage = lazy(() => import("@/pages/Status"));
const AdminTicketsPage = lazy(() => import("@/pages/AdminTickets"));
const AdminStatusPage = lazy(() => import("@/pages/AdminStatus"));
const AdminScalabilityPage = lazy(() => import("@/pages/AdminScalability"));
const LaunchReadinessPage = lazy(() => import("@/pages/LaunchReadiness"));
const GamificationPage = lazy(() => import("@/pages/Gamification"));
const GiveawayPage = lazy(() => import("@/pages/Giveaway"));
const DailyContentPage = lazy(() => import("@/pages/DailyContent"));
const AdminKycPage = lazy(() => import("@/pages/AdminKyc"));
const WealthSimPage = lazy(() => import("@/pages/WealthSim"));
const AlternateTimeline = lazy(() => import("@/pages/AlternateTimeline"));
const HabitsDashboard = lazy(() => import("@/pages/HabitsDashboard"));
const LifeOutcomes = lazy(() => import("@/pages/LifeOutcomes"));
const AICoach = lazy(() => import("@/pages/AICoach"));
const EvolutionDashboard = lazy(() => import("@/pages/EvolutionDashboard"));
const AdminMonitoringPage = lazy(() => import("@/pages/AdminMonitoring"));
const AdminAuditPage = lazy(() => import("@/pages/AdminAudit"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));

const IS_DEV = import.meta.env.MODE !== "production";
const TestFixture = IS_DEV ? lazy(() => import("@/pages/TestFixture")) : null;

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof AuthTokenError) return false;
          return failureCount < 3;
        },
      },
    },
  });
}

const clerkAppearanceDark = {
  variables: {
    colorPrimary: "#00FF41",
    colorBackground: "#0D1321",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.4)",
    colorInputBackground: "#0A0E1A",
    colorInputText: "#ffffff",
    borderRadius: "0.25rem",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  },
  elements: {
    card: "!bg-[#0D1321] border border-[#1a3a2a] !shadow-none !rounded-[4px]",
    headerTitle: "!text-[#00FF41] uppercase !tracking-[0.12em] !text-sm",
    headerSubtitle: "!text-white/35 !text-xs !tracking-[0.04em]",
    socialButtonsBlockButton: "!border-[#1a3a2a] !bg-[#0A0E1A] !text-[#00FF41]/80 hover:!bg-[#111827] !rounded-[4px] !font-normal !tracking-wide",
    socialButtonsBlockButtonText: "!text-[#00FF41]/80 !font-normal !text-xs !tracking-wider",
    socialButtonsBlockButtonArrow: "!text-[#00FF41]/60",
    formFieldLabel: "!text-white/50 uppercase !text-[10px] !tracking-[0.1em]",
    formFieldInput: "!bg-[#0A0E1A] !border-0 !border-b !border-b-[#1a3a2a] !text-white placeholder:!text-white/20 !rounded-none focus:!border-b-[#00FF41]",
    formButtonPrimary: "!bg-[#00FF41] !text-black !font-bold hover:!bg-[#00FF41]/90 uppercase !tracking-[0.1em] !rounded-[4px]",
    footerActionLink: "!text-[#00FF41]/60 hover:!text-[#00FF41]/80",
    footerAction: "!text-white/30",
    dividerLine: "!bg-[#1a3a2a]",
    dividerText: "!text-white/20 !text-[10px] !tracking-[0.08em]",
    identityPreviewEditButton: "!text-[#00FF41]/60",
    formFieldAction: "!text-[#00FF41]/60",
    alert: "!bg-red-500/10 !border-red-500/20 !text-red-300 !rounded-[4px]",
    alertText: "!text-red-300",
    logoBox: "hidden",
    internal: "!bg-transparent",
    rootBox: "!bg-transparent !shadow-none",
    cardBox: "!bg-transparent !shadow-none",
    badge: "hidden",
    tagPrimaryButton: "hidden",
    devModeNotice: "hidden",
  },
};

const clerkAppearanceLight = {
  variables: {
    colorPrimary: "#0099CC",
    colorBackground: "#ffffff",
    colorText: "#1a1a2e",
    colorTextSecondary: "rgba(0,0,0,0.5)",
    colorInputBackground: "rgba(0,0,0,0.03)",
    colorInputText: "#1a1a2e",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    card: "bg-white border border-black/10 shadow-xl",
    headerTitle: "text-gray-900",
    headerSubtitle: "text-gray-500",
    socialButtonsBlockButton: "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium",
    socialButtonsBlockButtonText: "text-gray-700 font-medium",
    formFieldLabel: "text-gray-600",
    formFieldInput: "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400",
    formButtonPrimary: "bg-[#0099CC] text-white font-bold hover:bg-[#0099CC]/90",
    footerActionLink: "text-[#0099CC] hover:text-[#0099CC]/80",
    dividerLine: "bg-gray-200",
    dividerText: "text-gray-400",
    identityPreviewEditButton: "text-[#0099CC]",
    formFieldAction: "text-[#0099CC]",
    alert: "bg-red-50 border-red-200 text-red-600",
    alertText: "text-red-600",
  },
};

function useFacebookOAuth() {
  const clerk = useClerk();
  const signInWithFacebook = async () => {
    await clerk.client?.signIn.authenticateWithRedirect({
      strategy: "oauth_facebook",
      redirectUrl: `${window.location.origin}${basePath}/sso-callback`,
      redirectUrlComplete: `${window.location.origin}${basePath}/dashboard`,
    });
  };
  return { signInWithFacebook };
}


function useClerkAppearance() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? clerkAppearanceDark : clerkAppearanceLight;
}

function SignInPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectReason = params.get("reason");
  const { signInWithFacebook } = useFacebookOAuth();
  const clerkAppearance = useClerkAppearance();

  return (
    <TerminalAuthShell reason={redirectReason} mode="sign-in">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        appearance={clerkAppearance}
      />
      <button
        type="button"
        onClick={signInWithFacebook}
        className="sr-only"
        aria-label="Sign in with Facebook"
      >
        Continue with Facebook
      </button>
    </TerminalAuthShell>
  );
}

function SignUpPage() {
  const { signInWithFacebook } = useFacebookOAuth();
  const clerkAppearance = useClerkAppearance();

  return (
    <TerminalAuthShell mode="sign-up">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        appearance={clerkAppearance}
      />
      <button
        type="button"
        onClick={signInWithFacebook}
        className="sr-only"
        aria-label="Sign up with Facebook"
      >
        Continue with Facebook
      </button>
    </TerminalAuthShell>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      if (userId && prevUserIdRef.current === null) {
        const accounts = user?.externalAccounts || [];
        const provider = accounts.length > 0 ? accounts[0].provider : null;

        const hasPasskeys = (user?.passkeys?.length ?? 0) > 0;
        const isOAuthLogin = accounts.length > 0;

        if (hasPasskeys && !isOAuthLogin) {
          trackEvent("login_passkey");
        } else if (provider === "google") {
          trackEvent("login_oauth_google");
        } else if (provider === "github") {
          trackEvent("login_oauth_github");
        } else if (provider === "apple") {
          trackEvent("login_oauth_apple");
        } else if (provider === "facebook") {
          trackEvent("login_oauth_facebook");
        } else {
          trackEvent("login_email");
        }
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location] = useLocation();
  const returnUrl = encodeURIComponent(location);
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to={`/sign-in?reason=protected&redirect_url=${returnUrl}`} />
      </Show>
    </>
  );
}

function LazyPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  );
}

function LazyChart({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Component />
    </Suspense>
  );
}

function LazyTable({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Component />
    </Suspense>
  );
}

function LazyProtected({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProtectedRoute component={Component} />
    </Suspense>
  );
}

function LazyProtectedChart({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ProtectedRoute component={Component} />
    </Suspense>
  );
}

function PageTracker() {
  usePageTracking();
  return null;
}

function UxTrackerInit() {
  useUxTracker();
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const queryClient = useMemo(() => createQueryClient(), []);
  const clerkAppearance = useClerkAppearance();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      appearance={clerkAppearance}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <PageTracker />
        <UxTrackerInit />
        <AuthErrorHandler />
        <TooltipProvider>
          <PopupQueueProvider>
          <AuditErrorBoundary>
          <ProfileCompletionGate>
          <Switch>
            <Route path="/">{() => <LazyPage component={Home} />}</Route>
            <Route path="/dashboard">{() => <LazyProtected component={Dashboard} />}</Route>
            <Route path="/earn">{() => <LazyProtected component={Earn} />}</Route>
            <Route path="/options">{() => <LazyProtected component={Options} />}</Route>
            <Route path="/stocks">{() => <LazyTable component={Stocks} />}</Route>
            <Route path="/jobs">{() => <LazyTable component={Jobs} />}</Route>
            <Route path="/gigs">{() => <LazyTable component={Gigs} />}</Route>
            <Route path="/community">{() => <LazyProtected component={Community} />}</Route>
            <Route path="/tax">{() => <LazyProtected component={Tax} />}</Route>
            <Route path="/receipts">{() => <LazyProtected component={Receipts} />}</Route>
            <Route path="/integrations">{() => <LazyProtected component={Integrations} />}</Route>
            <Route path="/travel">{() => <LazyPage component={Travel} />}</Route>
            <Route path="/tax-strategy">{() => <LazyProtected component={TaxStrategy} />}</Route>
            <Route path="/taxgpt">{() => <LazyProtected component={TaxGPT} />}</Route>
            <Route path="/technical">{() => <LazyChart component={TechnicalAnalysis} />}</Route>
            <Route path="/charts">{() => <LazyChart component={Charts} />}</Route>
            <Route path="/screener">{() => <LazyTable component={Screener} />}</Route>
            <Route path="/terminal">{() => <LazyProtected component={Terminal} />}</Route>
            <Route path="/about">{() => <LazyPage component={About} />}</Route>
            <Route path="/terms">{() => <LazyPage component={Terms} />}</Route>
            <Route path="/privacy">{() => <LazyPage component={Privacy} />}</Route>
            <Route path="/pricing">{() => <LazyPage component={Pricing} />}</Route>
            <Route path="/research">{() => <LazyPage component={Research} />}</Route>
            <Route path="/time-machine">{() => <LazyChart component={TimeMachine} />}</Route>
            <Route path="/sector-flow">{() => <LazyChart component={SectorFlow} />}</Route>
            <Route path="/volatility">{() => <LazyChart component={VolatilityLab} />}</Route>
            <Route path="/competitive-intel">{() => <LazyPage component={CompetitiveAnalysis} />}</Route>
            <Route path="/open-source-intel">{() => <LazyPage component={OpenSourceIntel} />}</Route>
            <Route path="/case-study">{() => <LazyPage component={CaseStudy} />}</Route>
            <Route path="/leaderboard">{() => <LazyProtected component={Leaderboard} />}</Route>
            <Route path="/achievements">{() => <LazyProtected component={Achievements} />}</Route>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/resume">{() => <LazyProtected component={Resume} />}</Route>
            <Route path="/profile">{() => <LazyProtected component={Profile} />}</Route>
            <Route path="/wallet">{() => <LazyProtected component={TokenWallet} />}</Route>
            <Route path="/marketplace">{() => <LazyProtected component={TravelMarketplace} />}</Route>
            <Route path="/rewards">{() => <LazyProtected component={RewardHistory} />}</Route>
            <Route path="/token-admin">{() => <LazyProtected component={TokenAdmin} />}</Route>
            <Route path="/marketing">{() => <LazyProtected component={MarketingCenter} />}</Route>
            <Route path="/content-calendar">{() => <LazyProtected component={ContentCalendar} />}</Route>
            <Route path="/reddit-engine">{() => <LazyProtected component={RedditEngine} />}</Route>
            <Route path="/seo">{() => <LazyProtected component={SeoEngine} />}</Route>
            <Route path="/alerts">{() => <LazyProtected component={AlertsPage} />}</Route>
            <Route path="/analytics">{() => <LazyProtected component={AnalyticsPage} />}</Route>
            <Route path="/blog">{() => <LazyPage component={BlogIndex} />}</Route>
            <Route path="/blog/:slug">{() => <LazyPage component={BlogPostPage} />}</Route>
            <Route path="/cookies">{() => <LazyPage component={CookiesPage} />}</Route>
            <Route path="/disclaimer">{() => <LazyPage component={DisclaimerPage} />}</Route>
            <Route path="/dmca">{() => <LazyPage component={DmcaPage} />}</Route>
            <Route path="/accessibility">{() => <LazyPage component={AccessibilityPage} />}</Route>
            <Route path="/help">{() => <LazyPage component={HelpPage} />}</Route>
            <Route path="/submit-ticket">{() => <LazyProtected component={SubmitTicketPage} />}</Route>
            <Route path="/status">{() => <LazyPage component={StatusPage} />}</Route>
            <Route path="/admin/tickets">{() => <LazyProtected component={AdminTicketsPage} />}</Route>
            <Route path="/admin/status">{() => <LazyProtected component={AdminStatusPage} />}</Route>
            <Route path="/admin/scalability">{() => <LazyProtected component={AdminScalabilityPage} />}</Route>
            <Route path="/launch">{() => <LazyProtected component={LaunchReadinessPage} />}</Route>
            <Route path="/daily-content">{() => <LazyProtected component={DailyContentPage} />}</Route>
            <Route path="/gamification">{() => <LazyProtected component={GamificationPage} />}</Route>
            <Route path="/giveaway">{() => <LazyPage component={GiveawayPage} />}</Route>
            <Route path="/admin/kyc">{() => <LazyProtected component={AdminKycPage} />}</Route>
            <Route path="/wealth-sim">{() => <LazyProtectedChart component={WealthSimPage} />}</Route>
            <Route path="/alternate-timeline">{() => <LazyProtectedChart component={AlternateTimeline} />}</Route>
            <Route path="/habits">{() => <LazyProtected component={HabitsDashboard} />}</Route>
            <Route path="/life-outcomes">{() => <LazyProtectedChart component={LifeOutcomes} />}</Route>
            <Route path="/ai-coach">{() => <LazyProtected component={AICoach} />}</Route>
            <Route path="/admin/evolution">{() => <LazyProtected component={EvolutionDashboard} />}</Route>
            <Route path="/admin/monitoring">{() => <LazyProtected component={AdminMonitoringPage} />}</Route>
            <Route path="/admin/audit">{() => <LazyProtected component={AdminAuditPage} />}</Route>
            <Route path="/command-center">{() => <LazyProtected component={CommandCenter} />}</Route>
            <Route path="/__test">{() => <Suspense fallback={null}>{IS_DEV && TestFixture ? <TestFixture /> : null}</Suspense>}</Route>
            <Route component={NotFound} />
          </Switch>
          </ProfileCompletionGate>
          </AuditErrorBoundary>
          <OnboardingProvider />
          <Suspense fallback={null}>
            <MilestoneCelebrationModal />
          </Suspense>
          <CookieConsentBanner />
          <InstallPrompt />
          <NotificationPrompt />
          <Toaster />
          <SonnerToaster position="bottom-right" theme="dark" />
          </PopupQueueProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  const isAuthPage = typeof window !== "undefined" && (window.location.pathname.includes("/sign-in") || window.location.pathname.includes("/sign-up"));
  const [bootDone, setBootDone] = useState(isAuthPage);

  useEffect(() => {
    captureReferralCode();
  }, []);

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="ew-theme">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error, info) => {
        SentryReact.withScope((scope) => {
          scope.setExtras({ componentStack: info.componentStack });
          SentryReact.captureException(error);
        });
      }}>
        {!bootDone && <BootSequence onComplete={handleBootComplete} />}
        <WouterRouter base={basePath}>
          <QuantumPageTransition />
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
