export interface RawStrategy {
  symbol: string;
  action: "buy" | "sell" | "hold";
  price: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  volume?: number;
  avgVolume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
  priceHistory?: number[];
  volumeHistory?: number[];
  highHistory?: number[];
  lowHistory?: number[];
  indicatorTriggers?: string[];
  confidence?: number;
  sector?: string;
  capTier?: string;
  sourceAgent?: string;
}

export interface NormalizedStrategy {
  strategy_id: string;
  symbol: string;
  action: "buy" | "sell" | "hold";
  price: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerLower: number;
  volume: number;
  avgVolume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  priceHistory: number[];
  volumeHistory: number[];
  highHistory: number[];
  lowHistory: number[];
  indicatorTriggers: string[];
  confidence: number;
  sector: string;
  capTier: string;
  sourceAgent: string;
  ingestedAt: string;
}

export interface ModelScore {
  modelId: "M1" | "M2" | "M3" | "M4" | "M5" | "M6";
  modelName: string;
  score: number;
  confidence: number;
  details: Record<string, unknown>;
}

export interface StressScenario {
  scenarioId: string;
  scenarioName: string;
  description: string;
  impactScore: number;
  survived: boolean;
  penalty: number;
}

export interface StressResult {
  strategy_id: string;
  scenarios: StressScenario[];
  resilienceScore: number;
  totalPenalty: number;
  failedScenarios: number;
}

export interface RefinementIteration {
  iteration: number;
  adjustments: Record<string, unknown>;
  scoresBefore: Record<string, number>;
  scoresAfter: Record<string, number>;
  compositeBefore: number;
  compositeAfter: number;
  improved: boolean;
}

export interface RefinementResult {
  strategy_id: string;
  iterations: RefinementIteration[];
  finalScore: number;
  totalIterations: number;
  improved: boolean;
}

export interface ModelScores {
  M1: number;
  M2: number;
  M3: number;
  M4: number;
  M5: number;
  M6: number;
}

export interface EvaluatedStrategy {
  strategy_id: string;
  symbol: string;
  action: "buy" | "sell" | "hold";
  price: number;
  sector: string;
  score_total: number;
  scores: ModelScores;
  confidence: number;
  modelDetails: ModelScore[];
  stressResult: StressResult | null;
  refinementResult: RefinementResult | null;
  rank?: number;
  evaluatedAt: string;
}

export const STRESS_SCENARIOS = [
  {
    scenarioId: "flash_crash",
    scenarioName: "Flash Crash",
    description: "Sudden 10-20% price drop within minutes",
    maxDrawdown: -0.15,
  },
  {
    scenarioId: "sustained_drawdown",
    scenarioName: "Sustained Drawdown",
    description: "Prolonged 30%+ decline over weeks",
    maxDrawdown: -0.3,
  },
  {
    scenarioId: "liquidity_drought",
    scenarioName: "Liquidity Drought",
    description: "Volume drops 80%, wide bid/ask spreads",
    volumeReduction: 0.8,
  },
  {
    scenarioId: "volatility_spike",
    scenarioName: "Volatility Spike",
    description: "VIX-like spike doubling daily price ranges",
    volatilityMultiplier: 2.0,
  },
  {
    scenarioId: "sector_rotation",
    scenarioName: "Sector Rotation",
    description: "Capital flows out of sector, 15% underperformance",
    sectorPenalty: -0.15,
  },
] as const;

export const MODEL_WEIGHTS: Record<keyof ModelScores, number> = {
  M1: 0.20,
  M2: 0.15,
  M3: 0.20,
  M4: 0.25,
  M5: 0.10,
  M6: 0.10,
};

export const REFINEMENT_FLOOR = 50;
export const REFINEMENT_CEILING = 70;
export const MAX_REFINEMENT_ITERATIONS = 3;
