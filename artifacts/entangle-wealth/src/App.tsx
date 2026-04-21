// ── React core & code-splitting primitives ──
import { useEffect, useRef, useMemo, lazy, Suspense } from "react";

// ── Routing (wouter – lightweight alternative to react-router) ──
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, useSearch } from "wouter";

// ── Authentication (Clerk) ──
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { ui } from "@clerk/ui";

// ── Server-state management (React Query) ──
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

// ── Error handling & monitoring ──
import { ErrorBoundary } from "react-error-boundary";
import * as SentryReact from "@sentry/react";

// ── Theming (dark/light mode via next-themes) ──
import { ThemeProvider, useTheme } from "next-themes";

// ── UI primitives ──
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorFallback from "@/components/ErrorFallback";
import NotFound from "@/pages/not-found";
import { PageSkeleton, ChartSkeleton, TableSkeleton } from "@/components/pwa/PageSkeleton";

// ── Analytics, tracking & referral ──
import { captureReferralCode } from "@/lib/referral";
import { trackEvent } from "@/lib/trackEvent";
import { usePageTracking } from "@/hooks/usePageTracking";

// ── App-level contexts ──
import { JourneyProvider } from "@/contexts/JourneyContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { LivePriceProvider } from "@/contexts/LivePriceContext";

// ── Auth-related components & utilities ──
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { TerminalAuthShell } from "@/components/TerminalAuthShell";
import { AuthErrorHandler } from "@/components/AuthErrorHandler";
import { AuthTokenError } from "@/lib/authFetch";
import { useUxTracker } from "@/hooks/useUxTracker";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { clerkAppearanceDark, clerkAppearanceLight } from "@/lib/clerkAppearance";

// ── Lazy-loaded page components ──
// Each page is code-split into its own chunk and only downloaded when the user
// navigates to that route, keeping the initial bundle small.
const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Options = lazy(() => import("@/pages/Options"));
const Stocks = lazy(() => import("@/pages/Stocks"));
const Tax = lazy(() => import("@/pages/Tax"));
const TaxGPT = lazy(() => import("@/pages/TaxGPT"));
const TaxStrategy = lazy(() => import("@/pages/TaxStrategy"));
const Receipts = lazy(() => import("@/pages/Receipts"));
const Profile = lazy(() => import("@/pages/Profile"));
const TechnicalAnalysis = lazy(() => import("@/pages/TechnicalAnalysis"));
const Screener = lazy(() => import("@/pages/Screener"));
const Charts = lazy(() => import("@/pages/Charts"));
const Terminal = lazy(() => import("@/pages/Terminal"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const TokenWallet = lazy(() => import("@/pages/TokenWallet"));
const GamificationPage = lazy(() => import("@/pages/Gamification"));
const AlertsPage = lazy(() => import("@/pages/Alerts"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const About = lazy(() => import("@/pages/About"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const CookiesPage = lazy(() => import("@/pages/Cookies"));
const DisclaimerPage = lazy(() => import("@/pages/Disclaimer"));
const DmcaPage = lazy(() => import("@/pages/Dmca"));
const AccessibilityPage = lazy(() => import("@/pages/Accessibility"));
const HelpPage = lazy(() => import("@/pages/Help"));
const SubmitTicketPage = lazy(() => import("@/pages/SubmitTicket"));
const StatusPage = lazy(() => import("@/pages/Status"));
const AdminHubPage = lazy(() => import("@/pages/AdminHub"));
const QuantSignalsPage = lazy(() => import("@/pages/QuantSignals"));
const StrategyBuilderPage = lazy(() => import("@/pages/StrategyBuilder"));
const StrategyEvaluatorPage = lazy(() => import("@/pages/StrategyEvaluator"));
const EvalPipelinePage = lazy(() => import("@/pages/EvalPipeline"));
const WealthSim = lazy(() => import("@/pages/WealthSim"));
const TimeMachine = lazy(() => import("@/pages/TimeMachine"));
const AlternateTimeline = lazy(() => import("@/pages/AlternateTimeline"));
const AICoach = lazy(() => import("@/pages/AICoach"));
const HabitsDashboard = lazy(() => import("@/pages/HabitsDashboard"));
const LifeOutcomes = lazy(() => import("@/pages/LifeOutcomes"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const Giveaway = lazy(() => import("@/pages/Giveaway"));
const Resume = lazy(() => import("@/pages/Resume"));
const RewardHistory = lazy(() => import("@/pages/RewardHistory"));
const TravelMarketplace = lazy(() => import("@/pages/TravelMarketplace"));
const TaxYearSummary = lazy(() => import("@/pages/TaxYearSummary"));
const BlogIndex = lazy(() => import("@/pages/BlogIndex"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const Research = lazy(() => import("@/pages/Research"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Travel = lazy(() => import("@/pages/Travel"));
const TrophyCase = lazy(() => import("@/pages/TrophyCase"));
const Community = lazy(() => import("@/pages/Community"));
const Earn = lazy(() => import("@/pages/Earn"));
const VolatilityLab = lazy(() => import("@/pages/VolatilityLab"));
const MarketOverview = lazy(() => import("@/pages/MarketOverview"));
const SectorFlow = lazy(() => import("@/pages/SectorFlow"));
const OpenSourceIntel = lazy(() => import("@/pages/OpenSourceIntel"));
const Gigs = lazy(() => import("@/pages/Gigs"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const CaseStudy = lazy(() => import("@/pages/CaseStudy"));

// ── Environment config ──
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
// Remove trailing slash from Vite's BASE_URL so route paths stay clean
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

// Clerk navigation callbacks include the basePath; strip it so wouter sees clean paths
function stripBasePath(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

// Factory for React Query client – disables retries on auth token errors (401s)
// so the user is redirected to sign-in immediately instead of retrying 3 times
function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: (count, error) => !(error instanceof AuthTokenError) && count < 3 } } });
}

// Returns the Clerk theme matching the current dark/light mode
function useClerkAppearance() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? clerkAppearanceDark : clerkAppearanceLight;
}

// Renders the Clerk sign-in or sign-up form inside a terminal-themed shell.
// Reads ?reason= from the URL to show a contextual message (e.g. "protected route").
function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const searchString = useSearch();
  const reason = mode === "sign-in" ? new URLSearchParams(searchString).get("reason") : null;
  const appearance = useClerkAppearance();
  const AuthComponent = mode === "sign-in" ? SignIn : SignUp;
  return (
    <TerminalAuthShell reason={reason} mode={mode}>
      <AuthComponent routing="path" path={`${basePath}/${mode}`} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/dashboard`} appearance={appearance} />
    </TerminalAuthShell>
  );
}

// Listens for Clerk user-state changes (login/logout).
// 1. Clears the React Query cache on user switch so stale data from
//    a previous user is never shown to the new one.
// 2. Fires a login analytics event (login_passkey / login_oauth_* / login_email)
//    when a user signs in.
function CacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      // User changed → clear stale cached data
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      // Went from signed-out to signed-in → track login method
      if (id && prev.current === null) {
        const accts = user?.externalAccounts || [];
        const p = accts[0]?.provider;
        trackEvent((user?.passkeys?.length ?? 0) > 0 && !accts.length ? "login_passkey" : p ? `login_oauth_${p}` : "login_email");
      }
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null; // Render-less component – only runs the side-effect
}

type Wrap = { component: React.ComponentType };

// ── Route guards ──

// Shows the page if signed in; redirects to sign-in (with return URL) if not
function RequireAuth({ component: Component }: Wrap) {
  const [location] = useLocation();
  return (
    <>
      <Show when="signed-in"><Component /></Show>
      <Show when="signed-out"><Redirect to={`/sign-in?reason=protected&redirect_url=${encodeURIComponent(location)}`} replace /></Show>
    </>
  );
}

// Shows the page only for admin users; redirects others to /dashboard
function RequireAdmin({ component: Component }: Wrap) {
  const isAdmin = useIsAdmin();
  if (isAdmin === null) return <PageSkeleton />; // Still loading admin status
  return isAdmin ? <Component /> : <Redirect to="/dashboard" replace />;
}

// ── Lazy wrappers ──
// Each wraps a code-split page in <Suspense> with an appropriate skeleton.
// LazyProtected additionally requires authentication; LazyAdmin requires admin role.
function LazyPage({ component: Component }: Wrap) { return <Suspense fallback={<PageSkeleton />}><Component /></Suspense>; }
function LazyChart({ component: Component }: Wrap) { return <Suspense fallback={<ChartSkeleton />}><Component /></Suspense>; }
function LazyTable({ component: Component }: Wrap) { return <Suspense fallback={<TableSkeleton />}><Component /></Suspense>; }
function LazyProtected({ component: Component }: Wrap) { return <Suspense fallback={<PageSkeleton />}><RequireAuth component={Component} /></Suspense>; }
function LazyAdmin({ component: Component }: Wrap) { return <Suspense fallback={<PageSkeleton />}><RequireAuth component={() => <RequireAdmin component={Component} />} /></Suspense>; }

// Render-less component that runs page-view analytics and UX signal hooks
function PageTracker() { usePageTracking(); useUxTracker(); return null; }

// ── Main app shell: providers + route table ──
// Wraps the entire route tree with Clerk auth, React Query, Journey context,
// and global utilities (cache invalidation, page tracking, auth error handling).
function ClerkProviderWithRoutes() {
  const [, navigate] = useLocation();
  const queryClient = useMemo(createQueryClient, []); // Stable across re-renders
  const appearance = useClerkAppearance();
  return (
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} routerPush={(to) => navigate(stripBasePath(to))} routerReplace={(to) => navigate(stripBasePath(to), { replace: true })} appearance={appearance} ui={ui}>
      <QueryClientProvider client={queryClient}>
        <JourneyProvider>
        <CacheInvalidator /><PageTracker /><AuthErrorHandler />
        <TooltipProvider>
          {/* ── Route table ── */}
          <Switch>
            <Route path="/">{() => <LazyPage component={Home} />}</Route>
            <Route path="/about">{() => <LazyPage component={About} />}</Route>
            <Route path="/pricing">{() => <LazyPage component={Pricing} />}</Route>
            <Route path="/stocks">{() => <LazyTable component={Stocks} />}</Route>
            <Route path="/status">{() => <LazyPage component={StatusPage} />}</Route>
            <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
            <Route path="/dashboard">{() => <LazyProtected component={Dashboard} />}</Route>
            <Route path="/charts">{() => <LazyChart component={Charts} />}</Route>
            <Route path="/technical">{() => <LazyChart component={TechnicalAnalysis} />}</Route>
            <Route path="/screener">{() => <LazyTable component={Screener} />}</Route>
            <Route path="/terminal">{() => <LazyProtected component={Terminal} />}</Route>
            <Route path="/quant-signals">{() => <Redirect to="/quant" replace />}</Route>
            <Route path="/quant">{() => <LazyProtected component={QuantSignalsPage} />}</Route>
            <Route path="/options">{() => <LazyProtected component={Options} />}</Route>
            <Route path="/alerts">{() => <LazyProtected component={AlertsPage} />}</Route>
            <Route path="/tax">{() => <LazyProtected component={Tax} />}</Route>
            <Route path="/taxgpt">{() => <LazyProtected component={TaxGPT} />}</Route>
            <Route path="/tax-strategy">{() => <LazyProtected component={TaxStrategy} />}</Route>
            <Route path="/receipts">{() => <LazyProtected component={Receipts} />}</Route>
            <Route path="/leaderboard">{() => <LazyProtected component={Leaderboard} />}</Route>
            <Route path="/achievements">{() => <LazyProtected component={Achievements} />}</Route>
            <Route path="/gamification">{() => <LazyProtected component={GamificationPage} />}</Route>
            <Route path="/wallet">{() => <LazyProtected component={TokenWallet} />}</Route>
            <Route path="/profile">{() => <LazyProtected component={Profile} />}</Route>
            <Route path="/help">{() => <LazyPage component={HelpPage} />}</Route>
            <Route path="/submit-ticket">{() => <LazyProtected component={SubmitTicketPage} />}</Route>
            <Route path="/terms">{() => <LazyPage component={Terms} />}</Route>
            <Route path="/privacy">{() => <LazyPage component={Privacy} />}</Route>
            <Route path="/cookies">{() => <LazyPage component={CookiesPage} />}</Route>
            <Route path="/disclaimer">{() => <LazyPage component={DisclaimerPage} />}</Route>
            <Route path="/dmca">{() => <LazyPage component={DmcaPage} />}</Route>
            <Route path="/accessibility">{() => <LazyPage component={AccessibilityPage} />}</Route>
            <Route path="/strategy-builder">{() => <LazyProtected component={StrategyBuilderPage} />}</Route>
            <Route path="/evaluate">{() => <LazyPage component={StrategyEvaluatorPage} />}</Route>
            <Route path="/evaluator">{() => <Redirect to="/evaluate" replace />}</Route>
            <Route path="/eval-pipeline">{() => <LazyProtected component={EvalPipelinePage} />}</Route>
            <Route path="/admin/:rest*">{() => <LazyAdmin component={AdminHubPage} />}</Route>
            <Route path="/admin">{() => <LazyAdmin component={AdminHubPage} />}</Route>
            <Route path="/wealth-sim">{() => <LazyProtected component={WealthSim} />}</Route>
            <Route path="/time-machine">{() => <LazyPage component={TimeMachine} />}</Route>
            <Route path="/alternate-timeline">{() => <LazyPage component={AlternateTimeline} />}</Route>
            <Route path="/ai-coach">{() => <LazyProtected component={AICoach} />}</Route>
            <Route path="/habits">{() => <LazyProtected component={HabitsDashboard} />}</Route>
            <Route path="/life-outcomes">{() => <LazyPage component={LifeOutcomes} />}</Route>
            <Route path="/integrations">{() => <LazyProtected component={Integrations} />}</Route>
            <Route path="/giveaway">{() => <LazyPage component={Giveaway} />}</Route>
            <Route path="/resume">{() => <LazyPage component={Resume} />}</Route>
            <Route path="/rewards">{() => <LazyProtected component={RewardHistory} />}</Route>
            <Route path="/marketplace">{() => <LazyPage component={TravelMarketplace} />}</Route>
            <Route path="/tax-summary">{() => <LazyProtected component={TaxYearSummary} />}</Route>
            <Route path="/blog">{() => <LazyPage component={BlogIndex} />}</Route>
            <Route path="/blog/:slug">{() => <LazyPage component={BlogPost} />}</Route>
            <Route path="/research">{() => <LazyPage component={Research} />}</Route>
            <Route path="/command-center">{() => <LazyProtected component={CommandCenter} />}</Route>
            <Route path="/travel">{() => <LazyPage component={Travel} />}</Route>
            <Route path="/trophy-case">{() => <LazyProtected component={TrophyCase} />}</Route>
            <Route path="/community">{() => <LazyPage component={Community} />}</Route>
            <Route path="/earn">{() => <LazyProtected component={Earn} />}</Route>
            <Route path="/volatility-lab">{() => <LazyPage component={VolatilityLab} />}</Route>
            <Route path="/market-overview">{() => <LazyPage component={MarketOverview} />}</Route>
            <Route path="/sector-flow">{() => <LazyPage component={SectorFlow} />}</Route>
            <Route path="/osint">{() => <LazyPage component={OpenSourceIntel} />}</Route>
            <Route path="/gigs">{() => <LazyPage component={Gigs} />}</Route>
            <Route path="/jobs">{() => <LazyPage component={Jobs} />}</Route>
            <Route path="/case-study/:slug">{() => <LazyPage component={CaseStudy} />}</Route>
            <Route path="/case-study">{() => <Redirect to="/case-study/platform-comparison" replace />}</Route>
            {/* Catch-all: any unmatched path → 404 */}
            <Route component={NotFound} />
          </Switch>
          <CookieConsentBanner /> {/* GDPR/cookie consent bar (always mounted) */}
          <Toaster /> {/* Global toast notifications */}
        </TooltipProvider>
        </JourneyProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ── Root component ──
// Provider nesting order (outermost → innermost):
//   ThemeProvider → ConnectionProvider → LivePriceProvider → ErrorBoundary → Router → Clerk + routes
export default function App() {
  // Capture ?ref= referral code from the URL on first mount (once)
  useEffect(() => { captureReferralCode(); }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="ew-theme">
      <ConnectionProvider> {/* Tracks online/offline network status */}
        <LivePriceProvider> {/* WebSocket feed for real-time stock/crypto prices */}
          {/* Global error boundary – catches any unhandled React error and reports to Sentry */}
          <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error, info) => {
            SentryReact.withScope((scope) => { scope.setExtras({ componentStack: info.componentStack }); SentryReact.captureException(error); });
          }}>
            <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>
          </ErrorBoundary>
        </LivePriceProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
}
