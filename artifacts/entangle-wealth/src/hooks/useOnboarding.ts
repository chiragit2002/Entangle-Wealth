import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

interface OnboardingState {
  onboardingCompleted: boolean;
  interests: string[];
  checklist: Record<string, boolean>;
  firstName: string | null;
  daysSinceSignup: number;
  financialFocus?: string;
  desiredOutcome?: string;
  occupationId?: string;
  occupationName?: string;
}

export function useOnboarding() {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch("/onboarding", getToken);
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
    }
    setLoading(false);
  }, [getToken, isSignedIn]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const markWelcomeComplete = useCallback((resultData?: { financialFocus?: string; desiredOutcome?: string; occupationId?: string; occupationName?: string }) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        onboardingCompleted: true,
        financialFocus: resultData?.financialFocus || prev.financialFocus,
        desiredOutcome: resultData?.desiredOutcome || prev.desiredOutcome,
        occupationId: resultData?.occupationId || prev.occupationId,
        occupationName: resultData?.occupationName || prev.occupationName,
      };
    });
  }, []);

  return { state, loading, markWelcomeComplete, isSignedIn: isSignedIn ?? false };
}
