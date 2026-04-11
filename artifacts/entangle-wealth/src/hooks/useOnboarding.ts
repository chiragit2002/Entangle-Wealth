import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

interface OnboardingState {
  onboardingCompleted: boolean;
  interests: string[];
  checklist: Record<string, boolean>;
  firstName: string | null;
  daysSinceSignup: number;
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

  const markWelcomeComplete = useCallback(() => {
    setState((prev) => (prev ? { ...prev, onboardingCompleted: true } : prev));
  }, []);

  return { state, loading, markWelcomeComplete, isSignedIn: isSignedIn ?? false };
}
