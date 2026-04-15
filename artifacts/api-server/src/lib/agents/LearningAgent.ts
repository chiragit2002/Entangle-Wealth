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

const MAX_EPISODE_BUFFER = 5_000;
const CONSOLIDATION_INTERVAL_MS = 5 * 60_000;
const MIN_SAMPLES_FOR_SIGNAL = 3;

export class LearningAgent extends BaseAgent {
  private episodes: EpisodeRecord[] = [];
  private currentRegimes = new Map<string, string>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private consolidationTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Learning", "Aggregates trade outcomes by strategy×regime into long-term insights for adaptive decision-making");
  }

  async init(): Promise<void> {
    eventBus.subscribe("trade_executed", this.name, async (payload) => {
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
    eventBus.unsubscribe("trade_executed", this.name);
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
    if (eventType === "trade_executed") await this.onTradeExecuted(payload as TradeExecutedPayload);
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

      this.episodes.push({
        strategyId,
        regime,
        pnl,
        drawdown,
        timestamp: Date.now(),
      });

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

    const insights = new Map<string, { pnls: number[]; drawdowns: number[] }>();

    for (const ep of snapshot) {
      const key = `${ep.strategyId}|||${ep.regime}`;
      if (!insights.has(key)) {
        insights.set(key, { pnls: [], drawdowns: [] });
      }
      const bucket = insights.get(key)!;
      bucket.pnls.push(ep.pnl);
      bucket.drawdowns.push(ep.drawdown);
    }

    let upserted = 0;

    for (const [key, data] of insights) {
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
        payload: { insightsUpdated: upserted, episodesProcessed: snapshot.length },
      });
    }

    logger.info({ episodes: snapshot.length, insights: upserted, durationMs }, "[LearningAgent] Consolidation complete");
  }

  async getInsight(strategyId: string, regime: string): Promise<{
    avgPnl: number;
    samples: number;
    winRate: number;
    maxDrawdown: number;
    signal: "favorable" | "unfavorable" | "neutral" | "insufficient_data";
  } | null> {
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
      let signal: "favorable" | "unfavorable" | "neutral" | "insufficient_data";

      if (row.samples < MIN_SAMPLES_FOR_SIGNAL) {
        signal = "insufficient_data";
      } else if (row.avgPnl > 0 && row.winRate > 55) {
        signal = "favorable";
      } else if (row.avgPnl < 0 || row.winRate < 40) {
        signal = "unfavorable";
      } else {
        signal = "neutral";
      }

      return {
        avgPnl: row.avgPnl,
        samples: row.samples,
        winRate: row.winRate,
        maxDrawdown: row.maxDrawdown || 0,
        signal,
      };
    } catch (err) {
      logger.warn({ err, strategyId, regime }, "[LearningAgent] Failed to get insight");
      return null;
    }
  }

  async getInsightsForStrategy(strategyId: string): Promise<Array<{
    regime: string;
    avgPnl: number;
    samples: number;
    winRate: number;
    maxDrawdown: number;
  }>> {
    try {
      return await db
        .select({
          regime: strategyRegimeInsightsTable.regime,
          avgPnl: strategyRegimeInsightsTable.avgPnl,
          samples: strategyRegimeInsightsTable.samples,
          winRate: strategyRegimeInsightsTable.winRate,
          maxDrawdown: strategyRegimeInsightsTable.maxDrawdown,
        })
        .from(strategyRegimeInsightsTable)
        .where(eq(strategyRegimeInsightsTable.strategyId, strategyId));
    } catch (err) {
      logger.warn({ err, strategyId }, "[LearningAgent] Failed to get strategy insights");
      return [];
    }
  }

  getEpisodeCount(): number {
    return this.episodes.length;
  }

  getCurrentRegimes(): Record<string, string> {
    return Object.fromEntries(this.currentRegimes);
  }
}
