import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeModal } from "./WelcomeModal";
import { GettingStartedChecklist } from "./GettingStartedChecklist";
import { FirstVisitTooltips } from "./FirstVisitTooltips";
import { PersonalizedResultScreen } from "./PersonalizedResultScreen";

export function OnboardingProvider() {
  const { state, loading, markWelcomeComplete, dismissResultScreen, showResultScreen, isSignedIn } = useOnboarding();

  if (!isSignedIn || loading || !state) return null;

  const showWelcome = !state.onboardingCompleted;

  return (
    <>
      {showWelcome && (
        <WelcomeModal
          firstName={state.firstName}
          onComplete={(resultData) => markWelcomeComplete(resultData)}
        />
      )}
      {showResultScreen && !showWelcome && (
        <PersonalizedResultScreen
          firstName={state.firstName}
          occupationName={state.occupationName}
          focus={state.financialFocus || ""}
          outcome={state.desiredOutcome || ""}
          onContinue={dismissResultScreen}
        />
      )}
      {!showWelcome && !showResultScreen && <GettingStartedChecklist />}
      {!showWelcome && !showResultScreen && <FirstVisitTooltips />}
    </>
  );
}
