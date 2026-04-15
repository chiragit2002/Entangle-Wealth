import { logger } from "../logger";
import { RegimeAgent } from "./RegimeAgent";
import { VolatilityAgent } from "./VolatilityAgent";
import { LiquidityAgent } from "./LiquidityAgent";
import { StrategyAgent } from "./StrategyAgent";
import { RiskAgent } from "./RiskAgent";
import { ExecutionAgent } from "./ExecutionAgent";
import { KillSwitchAgent } from "./KillSwitchAgent";
import { DriftAgent } from "./DriftAgent";
import { EnsembleAgent } from "./EnsembleAgent";
import { AllocationAgent } from "./AllocationAgent";
import { LearningAgent } from "./LearningAgent";
import { PatternAgent } from "./PatternAgent";
import { agentRegistry } from "./AgentRegistry";
import { eventBus } from "./EventBus";
import type { ExecutionDecision } from "./ExecutionAgent";
import type { AllocationDecision } from "./AllocationAgent";
import type { RegimeResult } from "./RegimeAgent";
import type { VolatilityMetrics } from "./VolatilityAgent";
import type { LiquidityScore } from "./LiquidityAgent";
import type { KillSwitchResult } from "./KillSwitchAgent";
import { runStressEngine } from "../quant/stressEngine";
import { runAllModels } from "../quant/models";
import { ingestStrategy } from "../quant/ingest";
import type { OHLCVData } from "../quantEngine/strategyGenerator";

export interface OrchestratorInput {
  strategyId: string;
  symbol: string;
  timeframe: string;
  action: "buy" | "sell" | "hold";
  ohlcv: OHLCVData;
  strategyConfig?: Record<string, unknown>;
}

export interface OrchestratorResult {
  strategyId: string;
  symbol: string;
  timeframe: string;
  decision: ExecutionDecision;
  killSwitch: KillSwitchResult;
  allocation: AllocationDecision | null;
  marketContext: {
    regime: RegimeResult;
    volatility: VolatilityMetrics;
    liquidity: LiquidityScore;
  };
  ensembleConsensus: string;
  driftRecommendation: string;
  learnedBlock: boolean;
  learnedInsight: string | null;
  stageTimings: {
    marketAnalysisMs: number;
    evaluationMs: number;
    riskMs: number;
    executionMs: number;
    killSwitchMs: number;
    totalMs: number;
  };
}

export class Orchestrator {
  private regimeAgent: RegimeAgent;
  private volatilityAgent: VolatilityAgent;
  private liquidityAgent: LiquidityAgent;
  private strategyAgent: StrategyAgent;
  private riskAgent: RiskAgent;
  private executionAgent: ExecutionAgent;
  private killSwitchAgent: KillSwitchAgent;
  private driftAgent: DriftAgent;
  private ensembleAgent: EnsembleAgent;
  private allocationAgent: AllocationAgent;
  constructor(
    regimeAgent: RegimeAgent,
    volatilityAgent: VolatilityAgent,
    liquidityAgent: LiquidityAgent,
    strategyAgent: StrategyAgent,
    riskAgent: RiskAgent,
    executionAgent: ExecutionAgent,
    killSwitchAgent: KillSwitchAgent,
    driftAgent: DriftAgent,
    ensembleAgent: EnsembleAgent,
    allocationAgent: AllocationAgent,
  ) {
    this.regimeAgent = regimeAgent;
    this.volatilityAgent = volatilityAgent;
    this.liquidityAgent = liquidityAgent;
    this.strategyAgent = strategyAgent;
    this.riskAgent = riskAgent;
    this.executionAgent = executionAgent;
    this.killSwitchAgent = killSwitchAgent;
    this.driftAgent = driftAgent;
    this.ensembleAgent = ensembleAgent;
    this.allocationAgent = allocationAgent;
  }

  private getLearning(): LearningAgent | null {
    const a = agentRegistry.get("Learning");
    return a instanceof LearningAgent ? a : null;
  }

  private getPattern(): PatternAgent | null {
    const a = agentRegistry.get("Pattern");
    return a instanceof PatternAgent ? a : null;
  }

  async runCycle(input: OrchestratorInput): Promise<OrchestratorResult> {
    const totalStart = Date.now();
    const { strategyId, symbol, timeframe, action, ohlcv } = input;

    // Step 1: Parallel market analysis — Regime, Volatility, Liquidity
    const t1 = Date.now();
    const [regime, volatility, liquidity] = await Promise.all([
      Promise.resolve(this.regimeAgent.analyzeRegime(ohlcv.closes, ohlcv.highs, ohlcv.lows, symbol)),
      Promise.resolve(this.volatilityAgent.computeMetrics(ohlcv.closes, ohlcv.highs, ohlcv.lows, symbol)),
      Promise.resolve(this.liquidityAgent.analyzeLiquidity(ohlcv.closes, ohlcv.highs, ohlcv.lows, ohlcv.volumes, symbol)),
    ]);
    const marketAnalysisMs = Date.now() - t1;

    // Step 1.5: Check learned failure patterns before evaluation
    let learnedBlock = false;
    let learnedInsight: string | null = null;
    const patternAgent = this.getPattern();
    const learningAgent = this.getLearning();

    if (patternAgent) {
      const report = patternAgent.getLatestReport();
      if (report) {
        const failure = report.failures.find(
          f => f.strategy_id === strategyId && f.regime === regime.regime,
        );
        if (failure && failure.severity === "critical") {
          learnedBlock = true;
          learnedInsight = failure.description;
          logger.info({
            strategyId,
            regime: regime.regime,
            insight: failure.description,
            confidence: failure.confidence,
          }, "[Orchestrator] Blocking decision due to learned failure pattern");
        }
      }
    }

    if (!learnedBlock && learningAgent) {
      const insight = await learningAgent.getInsight(strategyId, regime.regime);
      if (insight && insight.signal === "unfavorable" && insight.confidence >= 0.7 && insight.samples >= 10) {
        learnedBlock = true;
        learnedInsight = insight.insight;
        logger.info({
          strategyId,
          regime: regime.regime,
          insight: insight.insight,
          confidence: insight.confidence,
          samples: insight.samples,
        }, "[Orchestrator] Blocking decision due to high-confidence unfavorable insight");
      }
    }

    // Step 2: Parallel — StrategyAgent evaluation + runAllModels + StressEngine
    const t2 = Date.now();
    const rawStrategy: Parameters<typeof ingestStrategy>[0] = {
      symbol,
      action,
      price: ohlcv.closes[ohlcv.closes.length - 1] ?? 0,
      priceHistory: ohlcv.closes,
      volumeHistory: ohlcv.volumes,
      highHistory: ohlcv.highs,
      lowHistory: ohlcv.lows,
      volume: ohlcv.volumes[ohlcv.volumes.length - 1] ?? 0,
      sourceAgent: "Orchestrator",
    };
    const normalized = ingestStrategy(rawStrategy);
    if (!normalized) {
      throw new Error(`[Orchestrator] Failed to normalize strategy ${strategyId}:${symbol}`);
    }

    const [strategySignal, modelDetails, stressResult] = await Promise.all([
      Promise.resolve(this.strategyAgent.evaluateFromOHLCV(symbol, ohlcv.closes, ohlcv.highs, ohlcv.lows)),
      runAllModels(normalized),
      Promise.resolve(runStressEngine(normalized)),
    ]);

    // EnsembleAgent: rank model votes + StrategyAgent signal for weighted consensus
    const modelVotes = [
      ...modelDetails.map(m => ({ modelId: m.modelId, score: m.score, weight: 1 / (modelDetails.length + 1) })),
      { modelId: "strategyAgent", score: strategySignal.score, weight: 1 / (modelDetails.length + 1) },
    ];
    const ensembleRanking = this.ensembleAgent.rankWithConsensus(strategyId, symbol, modelVotes);

    // Blend ensemble score with strategyAgent signal
    const evalScore = ensembleRanking.ensembleScore > 0 ? ensembleRanking.ensembleScore
      : modelDetails.reduce((acc, m) => acc + m.score, 0) / modelDetails.length;
    const modelConfidence = modelDetails.reduce((acc, m) => acc + m.confidence, 0) / modelDetails.length;
    const evalConfidence = (modelConfidence + strategySignal.confidence) / 2;
    const evaluationMs = Date.now() - t2;

    // Step 3: RiskAgent assesses risk from stress and market context inputs
    const t3 = Date.now();
    const riskAssessment = this.riskAgent.assessFromInputs({
      failedScenarios: stressResult.failedScenarios,
      resilienceScore: stressResult.resilienceScore,
      volatilityRegime: volatility.regime,
      liquidityTier: liquidity.liquidityTier,
    });
    const { riskLevel } = riskAssessment;
    const riskMs = Date.now() - t3;

    // Step 4: Execution decision
    const t4 = Date.now();
    const decision = this.executionAgent.decide({
      strategyId,
      symbol,
      evaluationScore: evalScore,
      confidence: evalConfidence,
      action,
      stressResilienceScore: stressResult.resilienceScore,
      riskLevel,
      regime: regime.regime,
      liquidityTier: liquidity.liquidityTier,
      volatilityRegime: volatility.regime,
      stressScore: stressResult.totalPenalty,
    });
    const executionMs = Date.now() - t4;

    // Step 5: Kill switch override — always forces EXIT regardless of prior action
    const t5 = Date.now();
    const killSwitch = this.killSwitchAgent.evaluate({
      stressScore: stressResult.totalPenalty,
      failedScenarios: stressResult.failedScenarios,
      resilienceScore: stressResult.resilienceScore,
      regime: regime.regime,
      volatilityRegime: volatility.regime,
      liquidityTier: liquidity.liquidityTier,
    });

    if (killSwitch.triggered) {
      decision.action = "EXIT";
      decision.rationale = `[KILL SWITCH] ${killSwitch.reasons.join("; ")} | Original: ${decision.rationale}`;
      decision.score = 0;
    }
    const killSwitchMs = Date.now() - t5;

    // Step 5.5: Learned failure block — override to HOLD
    if (learnedBlock && decision.action !== "EXIT") {
      const originalAction = decision.action;
      const originalRationale = decision.rationale;
      decision.action = "HOLD";
      decision.rationale = `[LEARNED BLOCK] ${learnedInsight} | Original ${originalAction}: ${originalRationale}`;
      decision.score = 0;
      decision.confidence = 0;
    }

    // DriftAgent: record score and check for drift
    const driftReport = this.driftAgent.recordScore(strategyId, decision.score);

    // AllocationAgent: compute position sizing (skip if EXIT or low score)
    let allocation: AllocationDecision | null = null;
    if (decision.action !== "EXIT" && decision.action !== "HOLD") {
      allocation = this.allocationAgent.allocate({
        strategyId,
        symbol,
        score: decision.score,
        confidence: decision.confidence,
        riskLevel,
      });
    }

    // Step 6: Store episode in LearningAgent memory via EventBus
    eventBus.publish({
      eventType: "trade_executed",
      sourceAgent: "Orchestrator",
      payload: {
        strategy_id: strategyId,
        symbol,
        regime: regime.regime,
        action: decision.action,
        result: {
          pnl: decision.score,
          drawdown: stressResult.totalPenalty ? -Math.abs(stressResult.totalPenalty) : 0,
        },
      },
    }).catch(err => {
      logger.warn({ err }, "[Orchestrator] Failed to publish trade_executed episode");
    });

    return {
      strategyId,
      symbol,
      timeframe,
      decision,
      killSwitch,
      allocation,
      marketContext: { regime, volatility, liquidity },
      ensembleConsensus: ensembleRanking.consensusLevel,
      driftRecommendation: driftReport.recommendation,
      learnedBlock,
      learnedInsight,
      stageTimings: {
        marketAnalysisMs,
        evaluationMs,
        riskMs,
        executionMs,
        killSwitchMs,
        totalMs: Date.now() - totalStart,
      },
    };
  }

  async runMulti(inputs: OrchestratorInput[]): Promise<OrchestratorResult[]> {
    logger.info({ count: inputs.length }, "[Orchestrator] Running multi-strategy orchestration");
    this.allocationAgent.resetBudget();
    const results = await Promise.all(
      inputs.map(input =>
        this.runCycle(input).catch(err => {
          logger.error({ err, strategyId: input.strategyId, symbol: input.symbol }, "[Orchestrator] Cycle failed");
          return null;
        }),
      ),
    );
    return results.filter((r): r is OrchestratorResult => r !== null);
  }

  async runMultiTimeframe(
    strategyId: string,
    symbol: string,
    timeframes: string[],
    ohlcvByTimeframe: Map<string, OHLCVData>,
    action: "buy" | "sell" | "hold",
  ): Promise<OrchestratorResult[]> {
    const inputs: OrchestratorInput[] = timeframes
      .filter(tf => ohlcvByTimeframe.has(tf))
      .map(tf => ({
        strategyId,
        symbol,
        timeframe: tf,
        action,
        ohlcv: ohlcvByTimeframe.get(tf)!,
      }));

    return this.runMulti(inputs);
  }
}
