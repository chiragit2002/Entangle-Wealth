import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Earn from "@/pages/Earn";
import Options from "@/pages/Options";
import About from "@/pages/About";
import Terminal from "@/pages/Terminal";
import Stocks from "@/pages/Stocks";
import Jobs from "@/pages/Jobs";
import Gigs from "@/pages/Gigs";
import Community from "@/pages/Community";
import Tax from "@/pages/Tax";
import Receipts from "@/pages/Receipts";
import Travel from "@/pages/Travel";
import TaxGPT from "@/pages/TaxGPT";
import Resume from "@/pages/Resume";
import Profile from "@/pages/Profile";
import TechnicalAnalysis from "@/pages/TechnicalAnalysis";
import MarketOverview from "@/pages/MarketOverview";
import Screener from "@/pages/Screener";

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

const queryClient = new QueryClient();

function SignInPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
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
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/earn" component={Earn} />
            <Route path="/options" component={Options} />
            <Route path="/stocks" component={Stocks} />
            <Route path="/jobs" component={Jobs} />
            <Route path="/gigs" component={Gigs} />
            <Route path="/community" component={Community} />
            <Route path="/tax" component={Tax} />
            <Route path="/receipts" component={Receipts} />
            <Route path="/travel" component={Travel} />
            <Route path="/taxgpt" component={TaxGPT} />
            <Route path="/technical" component={TechnicalAnalysis} />
            <Route path="/market-overview" component={MarketOverview} />
            <Route path="/screener" component={Screener} />
            <Route path="/terminal" component={Terminal} />
            <Route path="/about" component={About} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/resume">{() => <ProtectedRoute component={Resume} />}</Route>
            <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
