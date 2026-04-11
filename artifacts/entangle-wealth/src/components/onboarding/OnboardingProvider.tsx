import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeModal } from "./WelcomeModal";
import { GettingStartedChecklist } from "./GettingStartedChecklist";
import { FirstVisitTooltips } from "./FirstVisitTooltips";

export function OnboardingProvider() {
  const { state, loading, markWelcomeComplete, isSignedIn } = useOnboarding();

  if (!isSignedIn || loading || !state) return null;

  const showWelcome = !state.onboardingCompleted;

  return (
    <>
      {showWelcome && (
        <WelcomeModal firstName={state.firstName} onComplete={markWelcomeComplete} />
      )}
      {!showWelcome && <GettingStartedChecklist />}
      {!showWelcome && <FirstVisitTooltips />}
    </>
  );
}
