import { useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, useSearch } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import * as SentryReact from "@sentry/react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorFallback from "@/components/ErrorFallback";
import NotFound from "@/pages/not-found";
import { PageSkeleton, ChartSkeleton, TableSkeleton } from "@/components/pwa/PageSkeleton";
import { captureReferralCode } from "@/lib/referral";
import { trackEvent } from "@/lib/trackEvent";
import { usePageTracking } from "@/hooks/usePageTracking";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { TerminalAuthShell } from "@/components/TerminalAuthShell";
import { AuthErrorHandler } from "@/components/AuthErrorHandler";
import { AuthTokenError } from "@/lib/authFetch";
import { AuditErrorBoundary } from "@/components/AuditErrorBoundary";
import { useUxTracker } from "@/hooks/useUxTracker";
import { clerkAppearanceDark, clerkAppearanceLight } from "@/lib/clerkAppearance";

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

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

function stripBasePath(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: (count, error) => !(error instanceof AuthTokenError) && count < 3 },
    },
  });
}

function useClerkAppearance() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? clerkAppearanceDark : clerkAppearanceLight;
}

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

function CacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      if (id && prev.current === null) {
        const accts = user?.externalAccounts || [];
        const p = accts[0]?.provider;
        trackEvent((user?.passkeys?.length ?? 0) > 0 && !accts.length ? "login_passkey" : p ? `login_oauth_${p}` : "login_email");
      }
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function RequireAuth({ component: Component }: { component: React.ComponentType }) {
  const [location] = useLocation();
  return (
    <>
      <Show when="signed-in"><Component /></Show>
      <Show when="signed-out">
        <Redirect to={`/sign-in?reason=protected&redirect_url=${encodeURIComponent(location)}`} />
      </Show>
    </>
  );
}

function LazyPage({ component: Component }: { component: React.ComponentType }) {
  return <Suspense fallback={<PageSkeleton />}><Component /></Suspense>;
}

function LazyChart({ component: Component }: { component: React.ComponentType }) {
  return <Suspense fallback={<ChartSkeleton />}><Component /></Suspense>;
}

function LazyTable({ component: Component }: { component: React.ComponentType }) {
  return <Suspense fallback={<TableSkeleton />}><Component /></Suspense>;
}

function LazyProtected({ component: Component }: { component: React.ComponentType }) {
  return <Suspense fallback={<PageSkeleton />}><RequireAuth component={Component} /></Suspense>;
}

function PageTracker() {
  usePageTracking();
  useUxTracker();
  return null;
}

function ClerkProviderWithRoutes() {
  const [, navigate] = useLocation();
  const queryClient = useMemo(createQueryClient, []);
  const appearance = useClerkAppearance();
  return (
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} routerPush={(to) => navigate(stripBasePath(to))} routerReplace={(to) => navigate(stripBasePath(to), { replace: true })} appearance={appearance}>
      <QueryClientProvider client={queryClient}>
        <CacheInvalidator /><PageTracker /><AuthErrorHandler />
        <TooltipProvider>
          <AuditErrorBoundary>
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
            <Route path="/admin/:rest*">{() => <LazyProtected component={AdminHubPage} />}</Route>
            <Route path="/admin">{() => <LazyProtected component={AdminHubPage} />}</Route>
            <Route component={NotFound} />
          </Switch>
          </AuditErrorBoundary>
          <CookieConsentBanner />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  useEffect(() => { captureReferralCode(); }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="ew-theme">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error, info) => {
        SentryReact.withScope((scope) => { scope.setExtras({ componentStack: info.componentStack }); SentryReact.captureException(error); });
      }}>
        <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
