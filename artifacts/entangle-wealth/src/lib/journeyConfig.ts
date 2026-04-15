export interface JourneyMilestone {
  id: string;
  label: string;
  desc: string;
  href: string;
  eventKey: string;
}

export interface JourneyPhase {
  id: string;
  index: number;
  name: string;
  theme: string;
  desc: string;
  color: string;
  xpReward: number;
  identityStage: string;
  milestones: JourneyMilestone[];
}

export const JOURNEY_PHASES: JourneyPhase[] = [
  {
    id: "discover",
    index: 0,
    name: "Discover",
    theme: "Chapter 1",
    desc: "Get your bearings and explore the platform.",
    color: "#FF8C00",
    xpReward: 100,
    identityStage: "Explorer",
    milestones: [
      { id: "view_signal", label: "View a signal", desc: "See what the market is saying", href: "/dashboard", eventKey: "view_signal" },
      { id: "run_tax_scan", label: "Run a tax scan", desc: "Find hidden savings", href: "/tax", eventKey: "run_tax_scan" },
      { id: "set_alert", label: "Set a price alert", desc: "Stay ahead of the market", href: "/alerts", eventKey: "set_alert" },
      { id: "join_community", label: "Join the community", desc: "Connect with other investors", href: "/community", eventKey: "join_community" },
    ],
  },
  {
    id: "analyze",
    index: 1,
    name: "Analyze",
    theme: "Chapter 2",
    desc: "Run simulations and explore your financial future.",
    color: "#0099cc",
    xpReward: 200,
    identityStage: "Analyst",
    milestones: [
      { id: "run_simulation", label: "Run a WealthSim projection", desc: "See your wealth trajectory", href: "/wealth-sim", eventKey: "simulation_run" },
      { id: "save_snapshot", label: "Save a simulation snapshot", desc: "Bookmark your best scenario", href: "/wealth-sim", eventKey: "snapshot_saved" },
      { id: "run_backtest", label: "Run a Time Machine backtest", desc: "Learn from market history", href: "/time-machine", eventKey: "backtest_run" },
    ],
  },
  {
    id: "optimize",
    index: 2,
    name: "Optimize",
    theme: "Chapter 3",
    desc: "Sharpen your strategy and cut unnecessary costs.",
    color: "#FFB800",
    xpReward: 300,
    identityStage: "Strategist",
    milestones: [
      { id: "setup_taxflow", label: "Set up TaxFlow", desc: "Connect your tax profile", href: "/tax", eventKey: "taxflow_setup" },
      { id: "explore_alternate", label: "Explore an Alternate Timeline", desc: "See how one decision changes everything", href: "/alternate-timeline", eventKey: "alternate_timeline_run" },
      { id: "set_financial_focus", label: "Set your financial focus", desc: "Define what you're working toward", href: "/profile", eventKey: "financial_focus_set" },
    ],
  },
  {
    id: "grow",
    index: 3,
    name: "Grow",
    theme: "Chapter 4",
    desc: "Put insights into action and build real momentum.",
    color: "#00D4FF",
    xpReward: 500,
    identityStage: "Builder",
    milestones: [
      { id: "execute_trade", label: "Execute a paper trade", desc: "Practice with real market data", href: "/dashboard", eventKey: "trade_executed" },
      { id: "complete_habits", label: "Build a financial habit", desc: "Consistency is the edge", href: "/habits", eventKey: "habit_completed" },
      { id: "view_ai_coach", label: "Talk to your AI Coach", desc: "Get personalized guidance", href: "/ai-coach", eventKey: "coach_visited" },
    ],
  },
];

export const JOURNEY_EVENTS_TO_MILESTONES: Record<string, { phaseId: string; milestoneId: string }> = {
  view_signal: { phaseId: "discover", milestoneId: "view_signal" },
  dashboard_viewed: { phaseId: "discover", milestoneId: "view_signal" },
  signal_viewed: { phaseId: "discover", milestoneId: "view_signal" },
  run_tax_scan: { phaseId: "discover", milestoneId: "run_tax_scan" },
  taxflow_scan: { phaseId: "discover", milestoneId: "run_tax_scan" },
  set_alert: { phaseId: "discover", milestoneId: "set_alert" },
  alert_created: { phaseId: "discover", milestoneId: "set_alert" },
  join_community: { phaseId: "discover", milestoneId: "join_community" },
  community_post: { phaseId: "discover", milestoneId: "join_community" },
  simulation_run: { phaseId: "analyze", milestoneId: "run_simulation" },
  wealthsim_run: { phaseId: "analyze", milestoneId: "run_simulation" },
  snapshot_saved: { phaseId: "analyze", milestoneId: "save_snapshot" },
  backtest_run: { phaseId: "analyze", milestoneId: "run_backtest" },
  time_machine_run: { phaseId: "analyze", milestoneId: "run_backtest" },
  taxflow_setup: { phaseId: "optimize", milestoneId: "setup_taxflow" },
  alternate_timeline_run: { phaseId: "optimize", milestoneId: "explore_alternate" },
  financial_focus_set: { phaseId: "optimize", milestoneId: "set_financial_focus" },
  onboarding_momentum_completed: { phaseId: "optimize", milestoneId: "set_financial_focus" },
  trade_executed: { phaseId: "grow", milestoneId: "execute_trade" },
  paper_trade: { phaseId: "grow", milestoneId: "execute_trade" },
  habit_completed: { phaseId: "grow", milestoneId: "complete_habits" },
  coach_visited: { phaseId: "grow", milestoneId: "view_ai_coach" },
};

export interface JourneyState {
  completedMilestones: Record<string, boolean>;
  completedPhases: string[];
  phaseCompletedAt: Record<string, string>;
  currentPhaseId: string;
  updatedAt?: string;
}

export function getDefaultJourneyState(): JourneyState {
  return {
    completedMilestones: {},
    completedPhases: [],
    phaseCompletedAt: {},
    currentPhaseId: "discover",
  };
}

export function computeCurrentPhase(state: JourneyState): JourneyPhase {
  for (let i = JOURNEY_PHASES.length - 1; i >= 0; i--) {
    const phase = JOURNEY_PHASES[i];
    if (!state.completedPhases.includes(phase.id)) continue;
  }
  const currentIdx = Math.min(state.completedPhases.length, JOURNEY_PHASES.length - 1);
  return JOURNEY_PHASES[currentIdx];
}

export function isPhaseComplete(phase: JourneyPhase, completedMilestones: Record<string, boolean>): boolean {
  return phase.milestones.every(m => completedMilestones[m.id]);
}

export function getNextMilestone(state: JourneyState): { phase: JourneyPhase; milestone: JourneyMilestone } | null {
  for (const phase of JOURNEY_PHASES) {
    for (const milestone of phase.milestones) {
      if (!state.completedMilestones[milestone.id]) {
        return { phase, milestone };
      }
    }
  }
  return null;
}
