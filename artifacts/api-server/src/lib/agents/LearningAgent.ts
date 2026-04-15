import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { db } from "@workspace/db";
import { strategyRegimeInsightsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";

interface TradeExecutedPayload {
  userId?: string;
  symbol?: string;
  side?: string;
  quantity?: number;
  price?: number;
  pnl?: number;
  strategyId?: string;
  strategy_id?: string;
  regime?: string;
  action?: string;
  result?: {
    pnl?: number;
    drawdown?: number;
  };
  totalCost?: number;
}

interface RegimeDetectedPayload {
  symbol: string;
  regime: string;
  confidence: number;
}

interface EpisodeRecord {
  strategyId: string;
  regime: string;
  pnl: number;
  drawdown: number;
  timestamp: number;
}

export interface StrategyInsight {
  strategy_id: string;
  regime: string;
  insight: string;
  confidence: number;
  samples: number;
  signal: "favorable" | "unfavorable" | "neutral" | "insufficient_data";
  avgPnl: number;
  winRate: number;
  maxDrawdown: number;
}

export interface MemorySnapshot {
  shortTerm: EpisodeRecord[];
  episodes: { count: number; oldestTs: number | null; newestTs: number | null };
  longTerm: Record<string, StrategyInsight>;
}

const SHORT_TERM_LIMIT = 50;
const MAX_EPISODE_BUFFER = 5_000;
const CONSOLIDATION_INTERVAL_MS = 5 * 60_000;
const MIN_SAMPLES_FOR_SIGNAL = 3;
const CONFIDENCE_SAMPLE_CAP = 500;
const MAX_LONG_TERM_CACHE = 500;

function regimeLabel(regime: string): string {
  return regime.replace(/_/g, " ");
}

function computeConfidence(samples: number, winRate: number, avgPnl: number): number {
  if (samples < MIN_SAMPLES_FOR_SIGNAL) return 0;
  const sampleFactor = 1 - 1 / Math.sqrt(Math.min(samples, CONFIDENCE_SAMPLE_CAP));
  const winDeviation = Math.abs(winRate - 50) / 50;
  const pnlStrength = Math.min(Math.abs(avgPnl) / 5, 1);
  const raw = sampleFactor * 0.5 + winDeviation * 0.3 + pnlStrength * 0.2;
  return Math.round(raw * 100) / 100;
}

function generateInsightText(
  strategyId: string,
  regime: string,
  signal: "favorable" | "unfavorable" | "neutral" | "insufficient_data",
  avgPnl: number,
  winRate: number,
  maxDrawdown: number,
): string {
  const r = regimeLabel(regime);

  if (signal === "insufficient_data") {
    return `insufficient data in ${r}`;
  }

  if (signal === "unfavorable") {
    const parts: string[] = [];
    if (avgPnl < -2) parts.push(`avg loss ${avgPnl.toFixed(1)}`);
    if (winRate < 35) parts.push(`${winRate.toFixed(0)}% win rate`);
    if (maxDrawdown < -10) parts.push(`${maxDrawdown.toFixed(1)} max drawdown`);
    const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    return `fails in ${r}${detail}`;
  }

  if (signal === "favorable") {
    const parts: string[] = [];
    if (avgPnl > 2) parts.push(`avg gain +${avgPnl.toFixed(1)}`);
    if (winRate > 65) parts.push(`${winRate.toFixed(0)}% win rate`);
    const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    return `excels in ${r}${detail}`;
  }

  return `mixed results in ${r}`;
}

export class LearningAgent extends BaseAgent {
  private shortTerm: EpisodeRecord[] = [];
  private episodes: EpisodeRecord[] = [];
  private longTermCache = new Map<string, StrategyInsight>();
  private currentRegimes = new Map<string, string>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private consolidationTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Learning", "Aggregates trade outcomes by strategy×regime into long-term insights for adaptive decision-making");
  }

  async init(): Promise<void> {
    eventBus.subscribe("episode_recorded", this.name, async (payload) => {
      await this.onTradeExecuted(payload as TradeExecutedPayload);
    });

    eventBus.subscribe("regime_detected", this.name, async (payload) => {
      this.onRegimeDetected(payload as RegimeDetectedPayload);
    });

    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);

    this.consolidationTimer = setInterval(() => {
      this.consolidateEpisodes().catch(err => {
        logger.warn({ err }, "[LearningAgent] Consolidation cycle failed");
      });
    }, CONSOLIDATION_INTERVAL_MS);

    await this.log("start", "LearningAgent started");
    logger.info("[LearningAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("episode_recorded", this.name);
    eventBus.unsubscribe("regime_detected", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    if (this.consolidationTimer) { clearInterval(this.consolidationTimer); this.consolidationTimer = null; }

    if (this.episodes.length > 0) {
      await this.consolidateEpisodes();
    }

    this.setStatus("stopped");
    await this.log("stop", "LearningAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "episode_recorded") await this.onTradeExecuted(payload as TradeExecutedPayload);
    if (eventType === "regime_detected") this.onRegimeDetected(payload as RegimeDetectedPayload);
  }

  private onRegimeDetected(payload: RegimeDetectedPayload): void {
    if (payload.symbol && payload.regime) {
      this.currentRegimes.set(payload.symbol.toUpperCase(), payload.regime);
      if (this.currentRegimes.size > 1000) {
        const oldest = this.currentRegimes.keys().next().value;
        if (oldest) this.currentRegimes.delete(oldest);
      }
    }
  }

  private async onTradeExecuted(payload: TradeExecutedPayload): Promise<void> {
    try {
      const pnl = payload.result?.pnl ?? payload.pnl;
      if (pnl === undefined || pnl === null) return;

      const strategyId = payload.strategy_id
        || payload.strategyId
        || (payload.side && payload.symbol ? `${payload.side}_${payload.symbol}`.toLowerCase() : "unknown");

      const regime = payload.regime
        || (payload.symbol ? this.currentRegimes.get(payload.symbol.toUpperCase()) : undefined)
        || "unknown";

      const drawdown = payload.result?.drawdown ?? 0;

      const episode: EpisodeRecord = {
        strategyId,
        regime,
        pnl,
        drawdown,
        timestamp: Date.now(),
      };

      this.shortTerm.push(episode);
      if (this.shortTerm.length > SHORT_TERM_LIMIT) {
        this.shortTerm.shift();
      }

      this.episodes.push(episode);
      if (this.episodes.length > MAX_EPISODE_BUFFER) {
        this.episodes = this.episodes.slice(-MAX_EPISODE_BUFFER);
      }

      if (this.episodes.length % 50 === 0) {
        await this.consolidateEpisodes();
      }

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err, payload }, "[LearningAgent] Failed to process trade event");
    }
  }

  async consolidateEpisodes(): Promise<void> {
    if (this.episodes.length === 0) return;

    const t0 = Date.now();
    const snapshot = [...this.episodes];
    this.episodes = [];

    const buckets = new Map<string, { pnls: number[]; drawdowns: number[] }>();

    for (const ep of snapshot) {
      const key = `${ep.strategyId}|||${ep.regime}`;
      if (!buckets.has(key)) {
        buckets.set(key, { pnls: [], drawdowns: [] });
      }
      const bucket = buckets.get(key)!;
      bucket.pnls.push(ep.pnl);
      bucket.drawdowns.push(ep.drawdown);
    }

    let upserted = 0;
    const generatedInsights: StrategyInsight[] = [];

    for (const [key, data] of buckets) {
      const [strategyId, regime] = key.split("|||");
      const { pnls, drawdowns } = data;

      try {
        const existing = await db
          .select()
          .from(strategyRegimeInsightsTable)
          .where(and(
            eq(strategyRegimeInsightsTable.strategyId, strategyId),
            eq(strategyRegimeInsightsTable.regime, regime),
          ))
          .limit(1);

        const prev = existing[0];

        const totalSamples = prev ? prev.samples + pnls.length : pnls.length;
        const totalPnl = (prev?.totalPnl || 0) + pnls.reduce((a, b) => a + b, 0);
        const avgPnl = totalPnl / totalSamples;

        const wins = pnls.filter(p => p > 0);
        const losses = pnls.filter(p => p <= 0);
        const prevWins = prev ? Math.round(prev.winRate * prev.samples / 100) : 0;
        const prevLosses = prev ? prev.samples - prevWins : 0;
        const totalWins = prevWins + wins.length;
        const winRate = (totalWins / totalSamples) * 100;

        const avgWinPnl = wins.length > 0
          ? ((prev?.avgWinPnl || 0) * prevWins + wins.reduce((a, b) => a + b, 0)) / (prevWins + wins.length)
          : prev?.avgWinPnl || 0;
        const avgLossPnl = losses.length > 0
          ? ((prev?.avgLossPnl || 0) * prevLosses + losses.reduce((a, b) => a + b, 0)) / (prevLosses + losses.length)
          : prev?.avgLossPnl || 0;

        const bestPnl = Math.max(prev?.bestPnl || -Infinity, ...pnls);
        const worstDrawdown = Math.min(prev?.maxDrawdown || 0, ...drawdowns);

        if (prev) {
          await db
            .update(strategyRegimeInsightsTable)
            .set({
              avgPnl,
              totalPnl,
              samples: totalSamples,
              winRate,
              avgWinPnl,
              avgLossPnl,
              maxDrawdown: worstDrawdown,
              bestPnl,
              lastUpdated: new Date(),
            })
            .where(eq(strategyRegimeInsightsTable.id, prev.id));
        } else {
          await db.insert(strategyRegimeInsightsTable).values({
            strategyId,
            regime,
            avgPnl,
            totalPnl,
            samples: totalSamples,
            winRate,
            avgWinPnl,
            avgLossPnl,
            maxDrawdown: worstDrawdown,
            bestPnl,
          });
        }

        upserted++;

        const signal = this.classifySignal(totalSamples, avgPnl, winRate);
        const confidence = computeConfidence(totalSamples, winRate, avgPnl);
        const insight = generateInsightText(strategyId, regime, signal, avgPnl, winRate, worstDrawdown);

        const strategyInsight: StrategyInsight = {
          strategy_id: strategyId,
          regime,
          insight,
          confidence,
          samples: totalSamples,
          signal,
          avgPnl,
          winRate,
          maxDrawdown: worstDrawdown,
        };

        generatedInsights.push(strategyInsight);

        const cacheKey = `${strategyId}|||${regime}`;
        this.longTermCache.set(cacheKey, strategyInsight);
        if (this.longTermCache.size > MAX_LONG_TERM_CACHE) {
          const oldest = this.longTermCache.keys().next().value;
          if (oldest) this.longTermCache.delete(oldest);
        }
      } catch (err) {
        logger.warn({ err, strategyId, regime }, "[LearningAgent] Failed to upsert insight");
      }
    }

    const durationMs = Date.now() - t0;
    await this.log("consolidate", `Consolidated ${snapshot.length} episodes into ${upserted} insights`, {
      episodeCount: snapshot.length,
      insightCount: upserted,
    }, "info", undefined, durationMs);

    if (upserted > 0) {
      await eventBus.publish({
        eventType: "learning_updated",
        sourceAgent: this.name,
        payload: {
          insightsUpdated: upserted,
          episodesProcessed: snapshot.length,
          insights: generatedInsights,
        },
      });
    }

    logger.info({ episodes: snapshot.length, insights: upserted, durationMs }, "[LearningAgent] Consolidation complete");
  }

  private classifySignal(
    samples: number,
    avgPnl: number,
    winRate: number,
  ): "favorable" | "unfavorable" | "neutral" | "insufficient_data" {
    if (samples < MIN_SAMPLES_FOR_SIGNAL) return "insufficient_data";
    if (avgPnl > 0 && winRate > 55) return "favorable";
    if (avgPnl < 0 || winRate < 40) return "unfavorable";
    return "neutral";
  }

  async getInsight(strategyId: string, regime: string): Promise<StrategyInsight | null> {
    const cacheKey = `${strategyId}|||${regime}`;
    const cached = this.longTermCache.get(cacheKey);
    if (cached) return cached;

    try {
      const rows = await db
        .select()
        .from(strategyRegimeInsightsTable)
        .where(and(
          eq(strategyRegimeInsightsTable.strategyId, strategyId),
          eq(strategyRegimeInsightsTable.regime, regime),
        ))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0];
      const signal = this.classifySignal(row.samples, row.avgPnl, row.winRate);
      const confidence = computeConfidence(row.samples, row.winRate, row.avgPnl);
      const insight = generateInsightText(strategyId, regime, signal, row.avgPnl, row.winRate, row.maxDrawdown || 0);

      const result: StrategyInsight = {
        strategy_id: strategyId,
        regime,
        insight,
        confidence,
        samples: row.samples,
        signal,
        avgPnl: row.avgPnl,
        winRate: row.winRate,
        maxDrawdown: row.maxDrawdown || 0,
      };

      this.longTermCache.set(cacheKey, result);
      if (this.longTermCache.size > MAX_LONG_TERM_CACHE) {
        const oldest = this.longTermCache.keys().next().value;
        if (oldest) this.longTermCache.delete(oldest);
      }

      return result;
    } catch (err) {
      logger.warn({ err, strategyId, regime }, "[LearningAgent] Failed to get insight");
      return null;
    }
  }

  async getInsightsForStrategy(strategyId: string): Promise<StrategyInsight[]> {
    try {
      const rows = await db
        .select()
        .from(strategyRegimeInsightsTable)
        .where(eq(strategyRegimeInsightsTable.strategyId, strategyId));

      return rows.map(row => {
        const signal = this.classifySignal(row.samples, row.avgPnl, row.winRate);
        const confidence = computeConfidence(row.samples, row.winRate, row.avgPnl);
        const insight = generateInsightText(strategyId, row.regime, signal, row.avgPnl, row.winRate, row.maxDrawdown || 0);

        return {
          strategy_id: strategyId,
          regime: row.regime,
          insight,
          confidence,
          samples: row.samples,
          signal,
          avgPnl: row.avgPnl,
          winRate: row.winRate,
          maxDrawdown: row.maxDrawdown || 0,
        };
      });
    } catch (err) {
      logger.warn({ err, strategyId }, "[LearningAgent] Failed to get strategy insights");
      return [];
    }
  }

  async getAllInsights(): Promise<StrategyInsight[]> {
    try {
      const rows = await db
        .select()
        .from(strategyRegimeInsightsTable);

      return rows.map(row => {
        const signal = this.classifySignal(row.samples, row.avgPnl, row.winRate);
        const confidence = computeConfidence(row.samples, row.winRate, row.avgPnl);
        const insight = generateInsightText(row.strategyId, row.regime, signal, row.avgPnl, row.winRate, row.maxDrawdown || 0);

        return {
          strategy_id: row.strategyId,
          regime: row.regime,
          insight,
          confidence,
          samples: row.samples,
          signal,
          avgPnl: row.avgPnl,
          winRate: row.winRate,
          maxDrawdown: row.maxDrawdown || 0,
        };
      });
    } catch (err) {
      logger.warn({ err }, "[LearningAgent] Failed to get all insights");
      return [];
    }
  }

  getShortTermMemory(): EpisodeRecord[] {
    return [...this.shortTerm];
  }

  getRecentContext(strategyId?: string, regime?: string): EpisodeRecord[] {
    let filtered = this.shortTerm;
    if (strategyId) {
      filtered = filtered.filter(e => e.strategyId === strategyId);
    }
    if (regime) {
      filtered = filtered.filter(e => e.regime === regime);
    }
    return [...filtered];
  }

  getMemorySnapshot(): MemorySnapshot {
    const longTerm: Record<string, StrategyInsight> = {};
    for (const [key, value] of this.longTermCache) {
      longTerm[key.replace("|||", "→")] = value;
    }

    return {
      shortTerm: [...this.shortTerm],
      episodes: {
        count: this.episodes.length,
        oldestTs: this.episodes.length > 0 ? this.episodes[0].timestamp : null,
        newestTs: this.episodes.length > 0 ? this.episodes[this.episodes.length - 1].timestamp : null,
      },
      longTerm,
    };
  }

  getEpisodeCount(): number {
    return this.episodes.length;
  }

  getCurrentRegimes(): Record<string, string> {
    return Object.fromEntries(this.currentRegimes);
  }
}
