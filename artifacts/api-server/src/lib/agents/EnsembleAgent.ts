import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { logger } from "../logger";

export interface EnsembleRanking {
  strategyId: string;
  symbol: string;
  ensembleScore: number;
  consensusLevel: "strong" | "moderate" | "weak" | "divergent";
  modelVotes: Record<string, number>;
  weightedAvg: number;
  agreement: number;
  rank: number;
}

export interface ModelVote {
  modelId: string;
  score: number;
  weight: number;
}

interface EvaluationPayload {
  strategyId: string;
  symbol: string;
  modelVotes: ModelVote[];
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  trend: 0.25,
  momentum: 0.25,
  meanReversion: 0.20,
  volatility: 0.15,
  volume: 0.15,
};

export class EnsembleAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private rankings: Map<string, EnsembleRanking> = new Map();

  constructor() {
    super("Ensemble", "Ranks strategies using multi-model consensus scoring");
  }

  async init(): Promise<void> {
    eventBus.subscribe("model_votes_ready", this.name, async (payload) => {
      await this.onModelVotesReady(payload as EvaluationPayload);
    });
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
    await this.log("start", "EnsembleAgent started");
    logger.info("[EnsembleAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("model_votes_ready", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    this.setStatus("stopped");
    await this.log("stop", "EnsembleAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "model_votes_ready") {
      await this.onModelVotesReady(payload as EvaluationPayload);
    }
  }

  rankWithConsensus(strategyId: string, symbol: string, modelVotes: ModelVote[]): EnsembleRanking {
    if (modelVotes.length === 0) {
      const empty: EnsembleRanking = {
        strategyId,
        symbol,
        ensembleScore: 0,
        consensusLevel: "divergent",
        modelVotes: {},
        weightedAvg: 0,
        agreement: 0,
        rank: 999,
      };
      return empty;
    }

    const votesMap: Record<string, number> = {};
    let totalWeight = 0;
    let weightedSum = 0;

    for (const vote of modelVotes) {
      votesMap[vote.modelId] = vote.score;
      const w = vote.weight ?? DEFAULT_WEIGHTS[vote.modelId] ?? (1 / modelVotes.length);
      weightedSum += vote.score * w;
      totalWeight += w;
    }

    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;

    const scores = modelVotes.map(v => v.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const agreement = Math.max(0, 100 - stdDev);

    let consensusLevel: "strong" | "moderate" | "weak" | "divergent";
    if (agreement >= 85) consensusLevel = "strong";
    else if (agreement >= 70) consensusLevel = "moderate";
    else if (agreement >= 55) consensusLevel = "weak";
    else consensusLevel = "divergent";

    const ensembleScore = weightedAvg * (agreement / 100) * 0.4 + weightedAvg * 0.6;

    const ranking: EnsembleRanking = {
      strategyId,
      symbol,
      ensembleScore: Math.round(ensembleScore * 100) / 100,
      consensusLevel,
      modelVotes: votesMap,
      weightedAvg: Math.round(weightedAvg * 100) / 100,
      agreement: Math.round(agreement * 10) / 10,
      rank: 0,
    };

    this.rankings.set(`${strategyId}:${symbol}`, ranking);

    const allRankings = [...this.rankings.values()]
      .sort((a, b) => b.ensembleScore - a.ensembleScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    for (const r of allRankings) {
      this.rankings.set(`${r.strategyId}:${r.symbol}`, r);
    }

    return this.rankings.get(`${strategyId}:${symbol}`)!;
  }

  getTopRankings(limit = 10): EnsembleRanking[] {
    return [...this.rankings.values()]
      .sort((a, b) => b.ensembleScore - a.ensembleScore)
      .slice(0, limit);
  }

  private async onModelVotesReady(payload: EvaluationPayload): Promise<void> {
    try {
      const { strategyId, symbol, modelVotes } = payload;
      const ranking = this.rankWithConsensus(strategyId, symbol, modelVotes);

      await eventBus.publish({
        eventType: "ensemble_ranked",
        sourceAgent: this.name,
        payload: ranking,
      });

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[EnsembleAgent] Failed to rank strategies");
    }
  }
}
