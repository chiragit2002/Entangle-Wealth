import { useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, useSearch } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorFallback from "@/components/ErrorFallback";
import NotFound from "@/pages/not-found";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";
import { PageSkeleton, ChartSkeleton, TableSkeleton } from "@/components/pwa/PageSkeleton";
import { captureReferralCode } from "@/lib/referral";
import { trackEvent } from "@/lib/trackEvent";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { Info } from "lucide-react";
import { AuthErrorHandler } from "@/components/AuthErrorHandler";
import { AuthTokenError } from "@/lib/authFetch";

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
const Travel = lazy(() => import("@/pages/Travel"));
const TaxGPT = lazy(() => import("@/pages/TaxGPT"));
const Resume = lazy(() => import("@/pages/Resume"));
const Profile = lazy(() => import("@/pages/Profile"));
const TechnicalAnalysis = lazy(() => import("@/pages/TechnicalAnalysis"));
const MarketOverview = lazy(() => import("@/pages/MarketOverview"));
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

const clerkAppearance = {
  variables: {
    colorPrimary: "#00D4FF",
    colorBackground: "#0a0a14",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.5)",
    colorInputBackground: "rgba(255,255,255,0.05)",
    colorInputText: "#ffffff",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    card: "bg-[#0a0a14] border border-white/10 shadow-2xl shadow-[#00D4FF]/5",
    headerTitle: "text-white",
    headerSubtitle: "text-white/50",
    socialButtonsBlockButton: "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] font-medium",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-white/70",
    formFieldInput: "bg-white/[0.05] border-white/10 text-white placeholder:text-white/30",
    formButtonPrimary: "bg-[#00D4FF] text-black font-bold hover:bg-[#00D4FF]/90",
    footerActionLink: "text-[#00D4FF] hover:text-[#00D4FF]/80",
    dividerLine: "bg-white/10",
    dividerText: "text-white/30",
    identityPreviewEditButton: "text-[#00D4FF]",
    formFieldAction: "text-[#00D4FF]",
    alert: "bg-red-500/10 border-red-500/20 text-red-300",
    alertText: "text-red-300",
  },
};

function SignInPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectReason = params.get("reason");

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {redirectReason === "protected" && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-sm max-w-md w-full">
          <Info className="w-4 h-4 shrink-0" />
          <span>Sign in to access this page</span>
        </div>
      )}
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        appearance={clerkAppearance}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
        appearance={clerkAppearance}
      />
    </div>
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
        const provider = accounts.length > 0 ? accounts[0].provider : "email";
        if (provider === "google" || provider === "oauth_google") {
          trackEvent("login_oauth_google");
        } else if (provider === "github" || provider === "oauth_github") {
          trackEvent("login_oauth_github");
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthErrorHandler />
        <TooltipProvider>
          <Switch>
            <Route path="/">{() => <LazyPage component={Home} />}</Route>
            <Route path="/dashboard">{() => <LazyPage component={Dashboard} />}</Route>
            <Route path="/earn">{() => <LazyPage component={Earn} />}</Route>
            <Route path="/options">{() => <LazyPage component={Options} />}</Route>
            <Route path="/stocks">{() => <LazyTable component={Stocks} />}</Route>
            <Route path="/jobs">{() => <LazyTable component={Jobs} />}</Route>
            <Route path="/gigs">{() => <LazyTable component={Gigs} />}</Route>
            <Route path="/community">{() => <LazyPage component={Community} />}</Route>
            <Route path="/tax">{() => <LazyPage component={Tax} />}</Route>
            <Route path="/receipts">{() => <LazyPage component={Receipts} />}</Route>
            <Route path="/travel">{() => <LazyPage component={Travel} />}</Route>
            <Route path="/tax-strategy">{() => <LazyPage component={TaxStrategy} />}</Route>
            <Route path="/taxgpt">{() => <LazyPage component={TaxGPT} />}</Route>
            <Route path="/technical">{() => <LazyChart component={TechnicalAnalysis} />}</Route>
            <Route path="/charts">{() => <LazyChart component={Charts} />}</Route>
            <Route path="/market-overview">{() => <LazyChart component={MarketOverview} />}</Route>
            <Route path="/screener">{() => <LazyTable component={Screener} />}</Route>
            <Route path="/terminal">{() => <LazyPage component={Terminal} />}</Route>
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
            <Route path="/leaderboard">{() => <LazyPage component={Leaderboard} />}</Route>
            <Route path="/achievements">{() => <LazyPage component={Achievements} />}</Route>
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
            <Route component={NotFound} />
          </Switch>
          <OnboardingProvider />
          <CookieConsentBanner />
          <InstallPrompt />
          <NotificationPrompt />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    captureReferralCode();
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;
