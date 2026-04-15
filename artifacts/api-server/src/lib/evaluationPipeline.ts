import { db } from "@workspace/db";
import { strategyEvaluationsTable, customStrategiesTable, strategyVersionsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "./logger.js";
import {
  sma, ema, emaArray, rsi, macd, stochastic, bollinger,
  atr, obv, williamsr, cci, roc, cmf, adx, stdDev,
} from "./quantEngine/indicators.js";
import { fetchStockUniverse } from "./quantEngine/executionEngine.js";
import { runCustomStrategyBacktest, buildCustomEvaluator } from "./quantEngine/strategyBridge.js";
import type { CustomStrategyConfig } from "./quantEngine/strategyBridge.js";
import type { OHLCVData } from "./quantEngine/strategyGenerator.js";

export interface EvalScores {
  M1: number;
  M2: number;
  M3: number;
  M4: number;
  M5: number;
  M6: number;
}

export interface StressResult {
  scenario: string;
  score: number;
  max_drawdown: number;
  failure: boolean;
}

export interface RefinementSuggestion {
  param: string;
  old: number;
  new: number;
  impact: string;
}

export interface EvalResult {
  score_total: number;
  scores: EvalScores;
  confidence: number;
  stress: {
    worst_drawdown: number;
    failure_regimes: string[];
    recovery_time: string;
  };
  refinements: RefinementSuggestion[];
}

export interface EvalSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  best_conditions: string[];
  break_conditions: string[];
  score_drivers: Record<string, string>;
}

export interface DecisionResult {
  status: "ACTIVE" | "LIMITED" | "BLOCKED";
  reason: string;
}

export interface FailureSurfaceCondition {
  regime: string;
  confidence: number;
}

export interface FailureSurface {
  conditions: FailureSurfaceCondition[];
}

export interface StrategyProfile {
  type: "trend_follower" | "mean_reverter" | "momentum" | "balanced";
  speed: "fast" | "medium" | "slow";
  risk: "low" | "moderate" | "moderate_high" | "high";
  dependency: "momentum" | "volume" | "mean_reversion";
}

export interface EnrichedRefinement {
  before_score: number;
  after_score: number;
  change: number;
  reason: string;
  status: "ACCEPTED" | "REJECTED";
  suggestions: RefinementSuggestion[];
}

export type EvalMode = "fast" | "deep";

const MODEL_NAMES: Record<string, string> = {
  M1: "Trend Alignment",
  M2: "Mean Reversion",
  M3: "Momentum Quality",
  M4: "Volatility Adaptation",
  M5: "Volume Confirmation",
  M6: "Signal Consistency",
};

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function scoreM1_Trend(data: OHLCVData, params: Record<string, number>): number {
  const { closes } = data;
  if (closes.length < 50) return 50;

  const fastPeriod = params.ema_fast ?? params.fast ?? 10;
  const slowPeriod = params.ema_slow ?? params.slow ?? 26;
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);
  const sma50 = sma(closes, 50);
  const sma20 = sma(closes, 20);
  const price = closes[closes.length - 1];
  const adxVal = adx(data.highs, data.lows, closes, 14);

  let score = 50;
  if (fastEma > slowEma) score += 15;
  if (price > sma50) score += 10;
  if (price > sma20) score += 5;
  if (adxVal > 25) score += 10;
  if (adxVal > 40) score += 10;

  return clamp(score);
}

function scoreM2_MeanReversion(data: OHLCVData, params: Record<string, number>): number {
  const { closes } = data;
  if (closes.length < 30) return 50;

  const rsiVal = rsi(closes, params.rsi_period ?? 14);
  const boll = bollinger(closes, 20, 2);
  const willR = williamsr(data.highs, data.lows, closes, 14);

  let score = 50;
  if (rsiVal < 30 || rsiVal > 70) score += 15;
  if (boll.pctB < 10 || boll.pctB > 90) score += 15;
  if (willR < -80 || willR > -20) score += 10;
  score += clamp(Math.abs(50 - rsiVal) / 2, 0, 10);

  return clamp(score);
}

function scoreM3_Momentum(data: OHLCVData, params: Record<string, number>): number {
  const { closes } = data;
  if (closes.length < 30) return 50;

  const m = macd(closes);
  const rocVal = roc(closes, 10);
  const cciVal = cci(data.highs, data.lows, closes, 20);
  const stoch = stochastic(data.highs, data.lows, closes, 14);

  let score = 50;
  if (m.histogram > 0) score += 12;
  if (Math.abs(rocVal) > 2) score += 10;
  if (Math.abs(cciVal) > 100) score += 8;
  if (stoch > 80 || stoch < 20) score += 10;
  score += clamp(Math.abs(m.histogram) * 5, 0, 10);

  return clamp(score);
}

function scoreM4_Volatility(data: OHLCVData, params: Record<string, number>): number {
  const { closes } = data;
  if (closes.length < 20) return 50;

  const atrVal = atr(data.highs, data.lows, closes, 14);
  const price = closes[closes.length - 1];
  const atrPct = price > 0 ? (atrVal / price) * 100 : 0;
  const sd = stdDev(closes, 20);
  const sdPct = price > 0 ? (sd / price) * 100 : 0;
  const boll = bollinger(closes, 20, 2);
  const bw = price > 0 ? ((boll.upper - boll.lower) / price) * 100 : 0;

  let score = 60;
  if (atrPct > 1 && atrPct < 5) score += 15;
  else if (atrPct >= 5) score -= 10;
  if (sdPct < 3) score += 10;
  if (bw > 2 && bw < 8) score += 10;
  score += clamp(5 - Math.abs(atrPct - 2.5), 0, 5);

  return clamp(score);
}

function scoreM5_Volume(data: OHLCVData, _params: Record<string, number>): number {
  const { volumes, closes } = data;
  if (volumes.length < 20) return 50;

  const avgVol = sma(volumes, 20);
  const currVol = volumes[volumes.length - 1];
  const volRatio = avgVol > 0 ? currVol / avgVol : 1;
  const obvVal = obv(closes, volumes);
  const cmfVal = cmf(data.highs, data.lows, closes, volumes, 20);

  let score = 50;
  if (volRatio > 1.2) score += 15;
  if (volRatio > 2.0) score += 5;
  if (obvVal > 0) score += 10;
  if (cmfVal > 0.05) score += 10;
  else if (cmfVal < -0.05) score -= 5;
  score += clamp(volRatio * 3, 0, 10);

  return clamp(score);
}

function scoreM6_SignalConsistency(data: OHLCVData, config: CustomStrategyConfig): number {
  const { closes } = data;
  if (closes.length < 80) return 50;

  const evaluate = buildCustomEvaluator(config);
  let signals = 0;
  let consistent = 0;
  let lastAction = "HOLD";

  for (let i = 60; i < closes.length; i += 5) {
    const slice: OHLCVData = {
      opens: data.opens.slice(0, i + 1),
      highs: data.highs.slice(0, i + 1),
      lows: data.lows.slice(0, i + 1),
      closes: closes.slice(0, i + 1),
      volumes: data.volumes.slice(0, i + 1),
    };
    const action = evaluate(slice);
    if (action !== "HOLD") {
      signals++;
      if (action === lastAction && lastAction !== "HOLD") consistent++;
      lastAction = action;
    }
  }

  if (signals < 3) return 50;

  const consistencyRatio = consistent / signals;
  const signalFreq = signals / ((closes.length - 60) / 5);
  let score = 50;
  score += clamp(consistencyRatio * 30, 0, 30);
  if (signalFreq > 0.1 && signalFreq < 0.6) score += 15;
  else if (signalFreq >= 0.6) score -= 10;

  return clamp(score);
}

function computeModelScores(data: OHLCVData, config: CustomStrategyConfig): EvalScores {
  return {
    M1: Math.round(scoreM1_Trend(data, config.parameters)),
    M2: Math.round(scoreM2_MeanReversion(data, config.parameters)),
    M3: Math.round(scoreM3_Momentum(data, config.parameters)),
    M4: Math.round(scoreM4_Volatility(data, config.parameters)),
    M5: Math.round(scoreM5_Volume(data, config.parameters)),
    M6: Math.round(scoreM6_SignalConsistency(data, config)),
  };
}

const MODEL_WEIGHTS = { M1: 0.20, M2: 0.15, M3: 0.20, M4: 0.15, M5: 0.10, M6: 0.20 };

function totalScore(scores: EvalScores): number {
  return +(
    scores.M1 * MODEL_WEIGHTS.M1 +
    scores.M2 * MODEL_WEIGHTS.M2 +
    scores.M3 * MODEL_WEIGHTS.M3 +
    scores.M4 * MODEL_WEIGHTS.M4 +
    scores.M5 * MODEL_WEIGHTS.M5 +
    scores.M6 * MODEL_WEIGHTS.M6
  ).toFixed(1);
}

function computeConfidence(scores: EvalScores): number {
  const vals = Object.values(scores);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  const spread = Math.sqrt(variance);
  return +(Math.max(0.5, Math.min(0.99, (mean / 100) * (1 - spread / 100)))).toFixed(2);
}

function syntheticStressData(data: OHLCVData, scenario: string): OHLCVData {
  const len = data.closes.length;
  const result: OHLCVData = {
    opens: [...data.opens],
    highs: [...data.highs],
    lows: [...data.lows],
    closes: [...data.closes],
    volumes: [...data.volumes],
  };

  switch (scenario) {
    case "high_volatility":
      for (let i = 0; i < len; i++) {
        const swing = (Math.random() - 0.5) * 0.08 * result.closes[i];
        result.highs[i] += Math.abs(swing) * 1.5;
        result.lows[i] -= Math.abs(swing) * 1.5;
        result.closes[i] += swing;
      }
      break;
    case "low_liquidity":
      for (let i = 0; i < len; i++) {
        result.volumes[i] = Math.max(1, Math.floor(result.volumes[i] * 0.15));
      }
      break;
    case "range_bound":
    case "sideways":
      const mid = data.closes.reduce((a, b) => a + b, 0) / len;
      for (let i = 0; i < len; i++) {
        const noise = (Math.random() - 0.5) * mid * 0.02;
        result.closes[i] = mid + noise;
        result.opens[i] = mid + noise * 0.8;
        result.highs[i] = mid + Math.abs(noise) * 1.2;
        result.lows[i] = mid - Math.abs(noise) * 1.2;
      }
      break;
    case "flash_crash":
      const crashStart = Math.floor(len * 0.6);
      for (let i = crashStart; i < Math.min(crashStart + 10, len); i++) {
        const drop = 0.03 * (i - crashStart + 1);
        result.closes[i] *= (1 - drop);
        result.lows[i] *= (1 - drop * 1.3);
        result.volumes[i] *= 5;
      }
      break;
    case "trend_reversal":
      const revPoint = Math.floor(len * 0.5);
      for (let i = revPoint; i < len; i++) {
        const decay = 0.001 * (i - revPoint);
        result.closes[i] *= (1 - decay);
        result.opens[i] *= (1 - decay * 0.8);
      }
      break;
  }

  return result;
}

export function runStressTest(
  data: OHLCVData,
  config: CustomStrategyConfig,
  scenarios: string[],
): StressResult[] {
  return scenarios.map(scenario => {
    const stressedData = syntheticStressData(data, scenario);
    const bt = runCustomStrategyBacktest(config, stressedData);
    const scores = computeModelScores(stressedData, config);
    const score = totalScore(scores);
    return {
      scenario,
      score: Math.round(score),
      max_drawdown: -bt.maxDrawdown,
      failure: score < 60 || bt.maxDrawdown > 25,
    };
  });
}

export function runRefinement(
  data: OHLCVData,
  config: CustomStrategyConfig,
  constraints: { max_complexity?: number; min_score?: number },
): { changes: RefinementSuggestion[]; score_delta: number; new_version: string } {
  const baseScores = computeModelScores(data, config);
  const baseTotal = totalScore(baseScores);
  const tunable = Object.keys(config.parameters);
  const changes: RefinementSuggestion[] = [];
  let bestTotal = baseTotal;
  let bestParams = { ...config.parameters };

  for (const param of tunable) {
    const origVal = config.parameters[param];
    const offsets = [
      Math.max(1, Math.round(origVal * 0.8)),
      Math.max(1, Math.round(origVal * 0.9)),
      Math.round(origVal * 1.1),
      Math.round(origVal * 1.2),
    ];

    for (const candidate of offsets) {
      if (candidate === origVal) continue;
      const trialConfig = { ...config, parameters: { ...bestParams, [param]: candidate } };
      const trialScores = computeModelScores(data, trialConfig);
      const trialTotal = totalScore(trialScores);

      if (trialTotal > bestTotal) {
        const minScore = constraints.min_score ?? 0;
        if (trialTotal >= minScore) {
          changes.push({
            param,
            old: origVal,
            new: candidate,
            impact: `+${(trialTotal - baseTotal).toFixed(1)} score`,
          });
          bestTotal = trialTotal;
          bestParams = { ...bestParams, [param]: candidate };
        }
      }
    }
  }

  const versionParts = (config.metadata?.version as string ?? "1.0").split(".");
  const minor = parseInt(versionParts[1] ?? "0") + 1;
  return {
    changes,
    score_delta: +(bestTotal - baseTotal).toFixed(1),
    new_version: `${versionParts[0]}.${minor}.0`,
  };
}

export function generateSummary(scores: EvalScores, stressResults: StressResult[]): EvalSummary {
  const entries = Object.entries(scores) as [keyof EvalScores, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const score_drivers: Record<string, string> = {};

  for (const [model, val] of sorted) {
    const name = MODEL_NAMES[model];
    if (val >= 75) {
      strengths.push(name.toLowerCase());
      score_drivers[model] = `high due to strong ${name.toLowerCase()}`;
    } else if (val < 60) {
      weaknesses.push(name.toLowerCase());
      score_drivers[model] = `lower due to weak ${name.toLowerCase()}`;
    } else {
      score_drivers[model] = `moderate ${name.toLowerCase()} performance`;
    }
  }

  const failedScenarios = stressResults.filter(s => s.failure).map(s => s.scenario);
  const passedScenarios = stressResults.filter(s => !s.failure).map(s => s.scenario);

  const best_conditions: string[] = [];
  const break_conditions: string[] = [];

  if (scores.M1 >= 70) best_conditions.push("high momentum", "clear direction");
  if (scores.M2 >= 70) best_conditions.push("mean reversion setups");
  if (scores.M4 >= 70) best_conditions.push("moderate volatility");
  if (best_conditions.length === 0) best_conditions.push("neutral market conditions");

  break_conditions.push(...failedScenarios.map(s => s.replace(/_/g, " ")));
  if (break_conditions.length === 0) break_conditions.push("extreme tail events");

  const topStr = strengths.length > 0 ? strengths.slice(0, 2).join(" and ") : "balanced metrics";
  const weakStr = weaknesses.length > 0 ? weaknesses.slice(0, 2).join(" and ") : "no major weaknesses";
  const summary = `Strong in ${topStr}. ${weakStr === "no major weaknesses" ? "No major weaknesses detected." : `Weaker in ${weakStr}.`}${failedScenarios.length > 0 ? ` Fails under ${failedScenarios.join(", ").replace(/_/g, " ")}.` : ""}`;

  return { summary, strengths, weaknesses, best_conditions, break_conditions, score_drivers };
}

export function computeDecision(
  scoreTotal: number,
  confidence: number,
  stressResults: StressResult[],
): DecisionResult {
  const failureRegimes = stressResults.filter(s => s.failure).map(s => s.scenario);
  const worstDD = stressResults.length > 0 ? Math.min(...stressResults.map(s => s.max_drawdown)) : 0;

  if (scoreTotal < 60 || failureRegimes.length > 1 || worstDD < -25) {
    const reasons: string[] = [];
    if (scoreTotal < 60) reasons.push(`score ${scoreTotal.toFixed(1)} below threshold`);
    if (failureRegimes.length > 1) reasons.push(`fails in ${failureRegimes.length} regimes`);
    if (worstDD < -25) reasons.push(`${Math.abs(worstDD).toFixed(1)}% max drawdown detected`);
    return { status: "BLOCKED", reason: reasons.join("; ") };
  }

  if (scoreTotal >= 75 && confidence >= 0.75 && failureRegimes.length === 0) {
    return {
      status: "ACTIVE",
      reason: `High confidence (${(confidence * 100).toFixed(0)}%) with no failure regimes detected`,
    };
  }

  const reasons: string[] = [];
  if (scoreTotal < 75) reasons.push(`moderate score ${scoreTotal.toFixed(1)}`);
  if (confidence < 0.75) reasons.push(`confidence ${(confidence * 100).toFixed(0)}%`);
  if (failureRegimes.length === 1) reasons.push(`1 failure regime (${failureRegimes[0]!.replace(/_/g, " ")})`);
  if (worstDD < -15) reasons.push(`drawdown risk ${Math.abs(worstDD).toFixed(1)}%`);
  return { status: "LIMITED", reason: reasons.join("; ") || "moderate performance indicators" };
}

export function computeFailureSurface(stressResults: StressResult[]): FailureSurface {
  const failedResults = stressResults.filter(s => s.failure);
  const conditions: FailureSurfaceCondition[] = failedResults.map(r => {
    const ddSeverity = Math.min(1.0, Math.abs(r.max_drawdown) / 30);
    const scoreSeverity = Math.min(1.0, Math.max(0, (60 - r.score) / 30));
    const confidence = +(Math.min(0.99, (ddSeverity + scoreSeverity) / 2)).toFixed(2);
    return { regime: r.scenario, confidence };
  });
  return { conditions };
}

export function computeStrategyProfile(
  scores: EvalScores,
  config: CustomStrategyConfig,
): StrategyProfile {
  const { M1, M2, M3, M4, M5 } = scores;

  let type: StrategyProfile["type"];
  if (M1 >= 70 && M3 >= 65) {
    type = "trend_follower";
  } else if (M2 >= 70) {
    type = "mean_reverter";
  } else if (M3 >= 70) {
    type = "momentum";
  } else {
    type = "balanced";
  }

  const timeframe = (config.timeframes[0] ?? "1Day").toLowerCase();
  let speed: StrategyProfile["speed"];
  if (timeframe.includes("min") || timeframe.includes("1h")) {
    speed = "fast";
  } else if (timeframe.includes("day") || timeframe.includes("1d")) {
    speed = "medium";
  } else {
    speed = "slow";
  }

  let risk: StrategyProfile["risk"];
  if (M4 >= 75) {
    risk = "low";
  } else if (M4 >= 60) {
    risk = "moderate";
  } else if (M4 >= 45) {
    risk = "moderate_high";
  } else {
    risk = "high";
  }

  let dependency: StrategyProfile["dependency"];
  if (M5 >= M1 && M5 >= M2) {
    dependency = "volume";
  } else if (M2 >= M1) {
    dependency = "mean_reversion";
  } else {
    dependency = "momentum";
  }

  return { type, speed, risk, dependency };
}

export function computeEnrichedRefinement(
  beforeScore: number,
  changes: RefinementSuggestion[],
  scoreDelta: number,
  baseStressResults: StressResult[],
  refinedStressResults: StressResult[],
): EnrichedRefinement {
  const afterScore = +(beforeScore + scoreDelta).toFixed(1);

  if (changes.length === 0) {
    return {
      before_score: beforeScore,
      after_score: beforeScore,
      change: 0,
      reason: "No parameter changes found — insufficient parameter variation",
      status: "REJECTED",
      suggestions: [],
    };
  }

  if (scoreDelta < 1.0) {
    return {
      before_score: beforeScore,
      after_score: afterScore,
      change: scoreDelta,
      reason: `Score improvement of ${scoreDelta.toFixed(1)} is below minimum threshold (1.0) — low robustness`,
      status: "REJECTED",
      suggestions: changes,
    };
  }

  const baseFailures = baseStressResults.filter(s => s.failure).length;
  const refinedFailures = refinedStressResults.filter(s => s.failure).length;
  const avgBaseDD = baseStressResults.length > 0
    ? baseStressResults.reduce((s, r) => s + r.max_drawdown, 0) / baseStressResults.length : 0;
  const avgRefinedDD = refinedStressResults.length > 0
    ? refinedStressResults.reduce((s, r) => s + r.max_drawdown, 0) / refinedStressResults.length : 0;
  const drawdownWorsened = avgRefinedDD < avgBaseDD - 3;
  const moreFailures = refinedFailures > baseFailures;

  if (drawdownWorsened || moreFailures) {
    return {
      before_score: beforeScore,
      after_score: afterScore,
      change: scoreDelta,
      reason: `Score improved but stress results worsened — possible overfit (drawdown delta: ${(avgRefinedDD - avgBaseDD).toFixed(1)}%)`,
      status: "REJECTED",
      suggestions: changes,
    };
  }

  return {
    before_score: beforeScore,
    after_score: afterScore,
    change: scoreDelta,
    reason: `${changes.length} parameter${changes.length > 1 ? "s" : ""} optimized with verified stress improvement`,
    status: "ACCEPTED",
    suggestions: changes,
  };
}

const ENGINE_VERSION = "2.1.0";

const runningJobs = new Map<string, boolean>();

export async function executeEvaluation(jobId: string): Promise<void> {
  if (runningJobs.has(jobId)) return;
  runningJobs.set(jobId, true);

  try {
    const [job] = await db
      .select()
      .from(strategyEvaluationsTable)
      .where(eq(strategyEvaluationsTable.jobId, jobId))
      .limit(1);

    if (!job || job.status !== "queued") return;

    await db
      .update(strategyEvaluationsTable)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(strategyEvaluationsTable.jobId, jobId));

    const [strategy] = await db
      .select()
      .from(customStrategiesTable)
      .where(eq(customStrategiesTable.id, job.strategyId!))
      .limit(1);

    if (!strategy) {
      await db
        .update(strategyEvaluationsTable)
        .set({ status: "failed", errorMessage: "Strategy not found", completedAt: new Date() })
        .where(eq(strategyEvaluationsTable.jobId, jobId));
      return;
    }

    const config: CustomStrategyConfig = {
      id: strategy.id,
      name: strategy.name,
      type: strategy.type,
      assets: (strategy.assets as string[]) ?? [],
      timeframes: (strategy.timeframes as string[]) ?? ["1Day"],
      parameters: (strategy.parameters as Record<string, number>) ?? {},
      logic: (strategy.logic as { entry: string[]; exit: string[] }) ?? { entry: [], exit: [] },
      metadata: (strategy.metadata as Record<string, unknown>) ?? {},
    };

    const timeframe = config.timeframes[0] ?? "1Day";
    const symbol = config.assets[0] ?? "AAPL";
    let stockDataMap: Map<string, OHLCVData>;

    try {
      stockDataMap = await fetchStockUniverse([symbol], timeframe);
    } catch (err) {
      logger.error({ err, jobId }, "Failed to fetch stock data for evaluation");
      await db
        .update(strategyEvaluationsTable)
        .set({ status: "failed", errorMessage: "Failed to fetch market data", completedAt: new Date() })
        .where(eq(strategyEvaluationsTable.jobId, jobId));
      return;
    }

    const data = stockDataMap.get(symbol);
    if (!data || data.closes.length < 30) {
      await db
        .update(strategyEvaluationsTable)
        .set({ status: "failed", errorMessage: "Insufficient market data", completedAt: new Date() })
        .where(eq(strategyEvaluationsTable.jobId, jobId));
      return;
    }

    const scores = computeModelScores(data, config);
    const scoreT = totalScore(scores);
    const confidence = computeConfidence(scores);

    const mode: EvalMode = (!job.runStress && !job.runRefinement) ? "fast" : "deep";

    let stressResults: StressResult[] = [];
    let stressJson: Record<string, unknown> | null = null;
    let enrichedRefinement: EnrichedRefinement | null = null;
    let refinementsJson: RefinementSuggestion[] | null = null;

    if (job.runStress) {
      const scenarios = ["high_volatility", "low_liquidity", "range_bound"];
      stressResults = runStressTest(data, config, scenarios);
      const worstDD = Math.min(...stressResults.map(s => s.max_drawdown));
      const failureRegimes = stressResults.filter(s => s.failure).map(s => s.scenario);
      const recoveryBars = Math.ceil(Math.abs(worstDD) / 5);
      stressJson = {
        worst_drawdown: +worstDD.toFixed(1),
        failure_regimes: failureRegimes,
        recovery_time: `${recoveryBars}d`,
        results: stressResults,
      };
    }

    if (job.runRefinement) {
      const baseScoreT = scoreT;
      const baseStress = job.runStress ? stressResults : runStressTest(data, config, ["high_volatility", "low_liquidity", "range_bound"]);
      const refResult = runRefinement(data, config, { min_score: 85 });
      refinementsJson = refResult.changes;

      const refinedParams = { ...config.parameters };
      for (const c of refResult.changes) refinedParams[c.param] = c.new;
      const refinedConfig = { ...config, parameters: refinedParams };
      const refinedStress = runStressTest(data, refinedConfig, ["high_volatility", "low_liquidity", "range_bound"]);

      enrichedRefinement = computeEnrichedRefinement(
        baseScoreT,
        refResult.changes,
        refResult.score_delta,
        baseStress,
        refinedStress,
      );
    }

    const decision = computeDecision(scoreT, confidence, stressResults);
    const failureSurface = computeFailureSurface(stressResults);
    const strategyProfile = computeStrategyProfile(scores, config);

    const latestVersion = await db
      .select()
      .from(strategyVersionsTable)
      .where(eq(strategyVersionsTable.strategyId, job.strategyId!))
      .orderBy(desc(strategyVersionsTable.createdAt))
      .limit(1);

    const versionRecord = latestVersion[0] ?? null;

    const summaryResult = generateSummary(scores, stressResults);

    const unifiedEnvelope = {
      strategy_id: job.strategyId,
      version: versionRecord?.version ?? null,
      version_hash: versionRecord?.versionHash ?? null,
      score: {
        total: scoreT,
        breakdown: scores,
        confidence,
      },
      decision,
      stress: stressJson ?? null,
      failure_surface: failureSurface,
      refinement: enrichedRefinement,
      strategy_profile: strategyProfile,
      metadata: {
        mode,
        timestamp: new Date().toISOString(),
        engine_version: ENGINE_VERSION,
      },
      summary: summaryResult,
    };

    await db
      .update(strategyEvaluationsTable)
      .set({
        status: "completed",
        scoreTotal: scoreT,
        confidence,
        scoresJson: scores,
        stressJson,
        refinementsJson,
        summaryJson: unifiedEnvelope as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(strategyEvaluationsTable.jobId, jobId));

    logger.info({ jobId, scoreTotal: scoreT, confidence, mode }, "Evaluation completed");
  } catch (err) {
    logger.error({ err, jobId }, "Evaluation pipeline error");
    await db
      .update(strategyEvaluationsTable)
      .set({ status: "failed", errorMessage: String(err), completedAt: new Date() })
      .where(eq(strategyEvaluationsTable.jobId, jobId));
  } finally {
    runningJobs.delete(jobId);
  }
}

export { computeModelScores, totalScore, computeConfidence, MODEL_NAMES, MODEL_WEIGHTS };
