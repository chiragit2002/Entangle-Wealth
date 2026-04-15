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

function stripBase(p: string) { return basePath && p.startsWith(basePath) ? p.slice(basePath.length) || "/" : p; }
function createQC() { return new QueryClient({ defaultOptions: { queries: { retry: (n, e) => !(e instanceof AuthTokenError) && n < 3 } } }); }
function useClerkAppearance() { const { resolvedTheme } = useTheme(); return resolvedTheme === "dark" ? clerkAppearanceDark : clerkAppearanceLight; }

function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const searchString = useSearch();
  const reason = mode === "sign-in" ? new URLSearchParams(searchString).get("reason") : null;
  const a = useClerkAppearance();
  const Comp = mode === "sign-in" ? SignIn : SignUp;
  return (
    <TerminalAuthShell reason={reason} mode={mode}>
      <Comp routing="path" path={`${basePath}/${mode}`} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/dashboard`} appearance={a} />
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

function Protected({ component: C }: { component: React.ComponentType }) {
  const [loc] = useLocation();
  return <><Show when="signed-in"><C /></Show><Show when="signed-out"><Redirect to={`/sign-in?reason=protected&redirect_url=${encodeURIComponent(loc)}`} /></Show></>;
}
function LP({ component: C }: { component: React.ComponentType }) { return <Suspense fallback={<PageSkeleton />}><C /></Suspense>; }
function LC({ component: C }: { component: React.ComponentType }) { return <Suspense fallback={<ChartSkeleton />}><C /></Suspense>; }
function LT({ component: C }: { component: React.ComponentType }) { return <Suspense fallback={<TableSkeleton />}><C /></Suspense>; }
function LPr({ component: C }: { component: React.ComponentType }) { return <Suspense fallback={<PageSkeleton />}><Protected component={C} /></Suspense>; }
function Tracker() { usePageTracking(); useUxTracker(); return null; }

function ClerkProviderWithRoutes() {
  const [, nav] = useLocation();
  const qc = useMemo(createQC, []);
  const a = useClerkAppearance();
  return (
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} routerPush={(to) => nav(stripBase(to))} routerReplace={(to) => nav(stripBase(to), { replace: true })} appearance={a}>
      <QueryClientProvider client={qc}>
        <CacheInvalidator /><Tracker /><AuthErrorHandler />
        <TooltipProvider>
          <AuditErrorBoundary>
          <Switch>
            <Route path="/">{() => <LP component={Home} />}</Route>
            <Route path="/about">{() => <LP component={About} />}</Route>
            <Route path="/pricing">{() => <LP component={Pricing} />}</Route>
            <Route path="/stocks">{() => <LT component={Stocks} />}</Route>
            <Route path="/status">{() => <LP component={StatusPage} />}</Route>
            <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} />
            <Route path="/dashboard">{() => <LPr component={Dashboard} />}</Route>
            <Route path="/charts">{() => <LC component={Charts} />}</Route>
            <Route path="/technical">{() => <LC component={TechnicalAnalysis} />}</Route>
            <Route path="/screener">{() => <LT component={Screener} />}</Route>
            <Route path="/terminal">{() => <LPr component={Terminal} />}</Route>
            <Route path="/options">{() => <LPr component={Options} />}</Route>
            <Route path="/alerts">{() => <LPr component={AlertsPage} />}</Route>
            <Route path="/tax">{() => <LPr component={Tax} />}</Route>
            <Route path="/taxgpt">{() => <LPr component={TaxGPT} />}</Route>
            <Route path="/tax-strategy">{() => <LPr component={TaxStrategy} />}</Route>
            <Route path="/receipts">{() => <LPr component={Receipts} />}</Route>
            <Route path="/leaderboard">{() => <LPr component={Leaderboard} />}</Route>
            <Route path="/achievements">{() => <LPr component={Achievements} />}</Route>
            <Route path="/gamification">{() => <LPr component={GamificationPage} />}</Route>
            <Route path="/wallet">{() => <LPr component={TokenWallet} />}</Route>
            <Route path="/profile">{() => <LPr component={Profile} />}</Route>
            <Route path="/help">{() => <LP component={HelpPage} />}</Route>
            <Route path="/submit-ticket">{() => <LPr component={SubmitTicketPage} />}</Route>
            <Route path="/terms">{() => <LP component={Terms} />}</Route>
            <Route path="/privacy">{() => <LP component={Privacy} />}</Route>
            <Route path="/cookies">{() => <LP component={CookiesPage} />}</Route>
            <Route path="/disclaimer">{() => <LP component={DisclaimerPage} />}</Route>
            <Route path="/dmca">{() => <LP component={DmcaPage} />}</Route>
            <Route path="/accessibility">{() => <LP component={AccessibilityPage} />}</Route>
            <Route path="/admin/:rest*">{() => <LPr component={AdminHubPage} />}</Route>
            <Route path="/admin">{() => <LPr component={AdminHubPage} />}</Route>
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
