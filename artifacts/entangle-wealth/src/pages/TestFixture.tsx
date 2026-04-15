import { useState } from "react";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { PersonalizedResultScreen } from "@/components/onboarding/PersonalizedResultScreen";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { FinishSetupNudgeUI } from "@/components/FinishSetupNudge";

const GOALS = ["investing", "saving", "tax", "clarity"] as const;
type GoalType = typeof GOALS[number];

function WelcomeModalFixture() {
  const [completed, setCompleted] = useState(false);
  const [goal, setGoalState] = useState<GoalType | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleComplete = (data?: { financialFocus?: string }) => {
    setCompleted(true);
    if (data?.financialFocus) {
      setGoalState(data.financialFocus as GoalType);
      setShowResult(true);
    }
  };

  if (showResult && goal) {
    return (
      <PersonalizedResultScreen
        firstName="Test"
        focus={goal}
        outcome=""
        onContinue={() => {
          setShowResult(false);
          setCompleted(false);
          setGoalState(null);
        }}
      />
    );
  }

  if (!completed) {
    return <WelcomeModal firstName={null} onComplete={handleComplete} />;
  }

  return (
    <div className="p-8 text-white" data-testid="onboarding-complete">
      <h1>Onboarding complete!</h1>
      <p>Goal: {goal}</p>
    </div>
  );
}

function UpgradePromptFixture() {
  const [show, setShow] = useState(true);

  if (!show) {
    return (
      <div className="p-8 text-white" data-testid="upgrade-dismissed">
        <p>Upgrade prompt dismissed</p>
        <button onClick={() => setShow(true)} className="text-[#00B4D8]">Show again</button>
      </div>
    );
  }

  return (
    <UpgradePrompt
      config={{
        limitType: "signals",
        limitLabel: "signals",
        currentUsage: 3,
        maxUsage: 3,
        unlocks: ["Unlimited real-time signals", "Full AI analysis agents"],
      }}
      onClose={() => setShow(false)}
    />
  );
}

const FIXTURE_INCOMPLETE_ITEMS = [
  { id: "run_tax_scan", label: "Run a tax scan", href: "/tax" },
  { id: "set_alert", label: "Set a price alert", href: "/alerts" },
  { id: "join_community", label: "Join a community group", href: "/community" },
];

function FinishSetupNudgeFixture() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="p-8 text-white" data-testid="nudge-dismissed">
        <p>Setup nudge dismissed</p>
        <button onClick={() => setDismissed(false)} className="text-[#00B4D8]">Show again</button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <FinishSetupNudgeUI
        incompleteItems={FIXTURE_INCOMPLETE_ITEMS}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  );
}

type FixtureView = "welcome" | "upgrade" | "setup-nudge" | "result-investing" | "result-saving" | "result-tax" | "result-clarity";

export default function TestFixture() {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get("view") || "welcome") as FixtureView;

  const renderView = () => {
    switch (view) {
      case "welcome":
        return <WelcomeModalFixture />;
      case "upgrade":
        return <UpgradePromptFixture />;
      case "setup-nudge":
        return <FinishSetupNudgeFixture />;
      case "result-investing":
        return (
          <PersonalizedResultScreen
            firstName="Alex"
            focus="investing"
            outcome="growth"
            onContinue={() => window.location.reload()}
          />
        );
      case "result-saving":
        return (
          <PersonalizedResultScreen
            firstName="Taylor"
            focus="saving"
            outcome="stability"
            onContinue={() => window.location.reload()}
          />
        );
      case "result-tax":
        return (
          <PersonalizedResultScreen
            firstName="Morgan"
            focus="tax"
            outcome=""
            onContinue={() => window.location.reload()}
          />
        );
      case "result-clarity":
        return (
          <PersonalizedResultScreen
            firstName="Jordan"
            focus="clarity"
            outcome=""
            onContinue={() => window.location.reload()}
          />
        );
      default:
        return <div className="text-white p-8">Unknown view: {view}</div>;
    }
  };

  return (
    <div className="bg-[#0a0a14] min-h-screen" data-testid="test-fixture">
      {renderView()}
    </div>
  );
}
