import { useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeModal } from "./WelcomeModal";
import { PersonalizedResultScreen } from "./PersonalizedResultScreen";
import { GettingStartedChecklist } from "./GettingStartedChecklist";
import { FirstVisitTooltips } from "./FirstVisitTooltips";
import { JourneyMap } from "@/components/journey/JourneyMap";

export function OnboardingProvider() {
  const { state, loading, markWelcomeComplete, isSignedIn } = useOnboarding();
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{
    financialFocus?: string;
    desiredOutcome?: string;
    occupationId?: string;
    occupationName?: string;
  } | null>(null);

  if (!isSignedIn || loading || !state) return null;

  const showWelcome = !state.onboardingCompleted && !showResult;

  const handleWelcomeComplete = (data?: {
    financialFocus?: string;
    desiredOutcome?: string;
    occupationId?: string;
    occupationName?: string;
  }) => {
    markWelcomeComplete(data);
    if (data?.financialFocus || data?.desiredOutcome) {
      setResultData(data ?? null);
      setShowResult(true);
    }
  };

  const handleResultContinue = () => {
    setShowResult(false);
    setResultData(null);
  };

  return (
    <>
      {showWelcome && (
        <WelcomeModal
          firstName={state.firstName}
          onComplete={handleWelcomeComplete}
        />
      )}
      {showResult && resultData && (
        <PersonalizedResultScreen
          firstName={state.firstName}
          occupationName={resultData.occupationName}
          focus={resultData.financialFocus || ""}
          outcome={resultData.desiredOutcome || ""}
          onContinue={handleResultContinue}
        />
      )}
      {!showWelcome && !showResult && <GettingStartedChecklist />}
      {!showWelcome && !showResult && <FirstVisitTooltips />}
      {!showWelcome && !showResult && <JourneyMap />}
    </>
  );
}
