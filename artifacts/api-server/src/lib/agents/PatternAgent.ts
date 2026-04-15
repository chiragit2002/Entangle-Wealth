import { BaseAgent } from "./BaseAgent";
import { eventBus } from "./EventBus";
import { agentRegistry } from "./AgentRegistry";
import { LearningAgent, type StrategyInsight } from "./LearningAgent";
import { logger } from "../logger";

export interface FailurePattern {
  strategy_id: string;
  regime: string;
  avgPnl: number;
  winRate: number;
  maxDrawdown: number;
  samples: number;
  confidence: number;
  severity: "critical" | "warning";
  description: string;
}

export interface StreakPattern {
  strategy_id: string;
  regime: string;
  streak: number;
  direction: "win" | "loss";
}

export interface RegimeVulnerability {
  regime: string;
  failingStrategies: string[];
  avgPnl: number;
  description: string;
}

export interface PatternReport {
  failures: FailurePattern[];
  streaks: StreakPattern[];
  regimeVulnerabilities: RegimeVulnerability[];
  timestamp: number;
}

const SCAN_INTERVAL_MS = 5 * 60_000;
const MIN_SAMPLES_FOR_PATTERN = 5;
const CRITICAL_PNL_THRESHOLD = -3;
const WARNING_PNL_THRESHOLD = 0;
const CRITICAL_WIN_RATE = 30;
const MAX_REPORT_CACHE = 100;

export class PatternAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private latestReport: PatternReport | null = null;
  private reportHistory: PatternReport[] = [];

  constructor() {
    super("Pattern", "Detects failure patterns, streaks, and regime vulnerabilities from LearningAgent memory");
  }

  async init(): Promise<void> {
    eventBus.subscribe("learning_updated", this.name, async (payload) => {
      await this.onLearningUpdated(payload);
    });

    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.heartbeatHandle = setInterval(() => this.heartbeat(), 60_000);

    this.intervalHandle = setInterval(() => {
      this.scan().catch(err => {
        logger.warn({ err }, "[PatternAgent] Scan cycle failed");
      });
    }, SCAN_INTERVAL_MS);

    await this.log("start", "PatternAgent started");
    logger.info("[PatternAgent] Started");
  }

  async stop(): Promise<void> {
    eventBus.unsubscribe("learning_updated", this.name);
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    if (this.heartbeatHandle) { clearInterval(this.heartbeatHandle); this.heartbeatHandle = null; }

    this.setStatus("stopped");
    await this.log("stop", "PatternAgent stopped");
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    if (eventType === "learning_updated") await this.onLearningUpdated(payload);
  }

  private async onLearningUpdated(payload: unknown): Promise<void> {
    try {
      await this.scan();
      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.warn({ err }, "[PatternAgent] Failed to process learning_updated");
    }
  }

  async scan(): Promise<PatternReport> {
    const t0 = Date.now();
    const learning = this.getLearningAgent();

    if (!learning) {
      logger.warn("[PatternAgent] LearningAgent not available, skipping scan");
      return this.emptyReport();
    }

    const allInsights = await learning.getAllInsights();
    const shortTerm = learning.getShortTermMemory();

    const failures = this.detectFailures(allInsights);
    const streaks = this.detectStreaks(shortTerm);
    const regimeVulnerabilities = this.detectRegimeVulnerabilities(allInsights);

    const report: PatternReport = {
      failures,
      streaks,
      regimeVulnerabilities,
      timestamp: Date.now(),
    };

    this.latestReport = report;
    this.reportHistory.push(report);
    if (this.reportHistory.length > MAX_REPORT_CACHE) {
      this.reportHistory = this.reportHistory.slice(-MAX_REPORT_CACHE);
    }

    const durationMs = Date.now() - t0;

    if (failures.length > 0 || regimeVulnerabilities.length > 0) {
      await eventBus.publish({
        eventType: "pattern_detected",
        sourceAgent: this.name,
        payload: report,
      });
    }

    await this.log("scan", `Scan complete: ${failures.length} failures, ${streaks.length} streaks, ${regimeVulnerabilities.length} vulnerable regimes`, {
      failureCount: failures.length,
      streakCount: streaks.length,
      vulnerabilityCount: regimeVulnerabilities.length,
    }, "info", undefined, durationMs);

    logger.info({
      failures: failures.length,
      streaks: streaks.length,
      vulnerabilities: regimeVulnerabilities.length,
      durationMs,
    }, "[PatternAgent] Scan complete");

    return report;
  }

  private detectFailures(insights: StrategyInsight[]): FailurePattern[] {
    const failures: FailurePattern[] = [];

    for (const insight of insights) {
      if (insight.samples < MIN_SAMPLES_FOR_PATTERN) continue;
      if (insight.avgPnl >= WARNING_PNL_THRESHOLD && insight.winRate >= 40) continue;

      const isCritical =
        insight.avgPnl < CRITICAL_PNL_THRESHOLD ||
        insight.winRate < CRITICAL_WIN_RATE ||
        insight.maxDrawdown < -15;

      const severity = isCritical ? "critical" : "warning";

      const parts: string[] = [];
      if (insight.avgPnl < -2) parts.push(`avg PnL ${insight.avgPnl.toFixed(1)}`);
      if (insight.winRate < 40) parts.push(`${insight.winRate.toFixed(0)}% win rate`);
      if (insight.maxDrawdown < -10) parts.push(`${insight.maxDrawdown.toFixed(1)} drawdown`);
      const regime = insight.regime.replace(/_/g, " ");
      const description = parts.length > 0
        ? `fails in ${regime} (${parts.join(", ")})`
        : `underperforms in ${regime}`;

      failures.push({
        strategy_id: insight.strategy_id,
        regime: insight.regime,
        avgPnl: insight.avgPnl,
        winRate: insight.winRate,
        maxDrawdown: insight.maxDrawdown,
        samples: insight.samples,
        confidence: insight.confidence,
        severity,
        description,
      });
    }

    failures.sort((a, b) => a.avgPnl - b.avgPnl);

    return failures;
  }

  private detectStreaks(
    shortTerm: Array<{ strategyId: string; regime: string; pnl: number; timestamp: number }>,
  ): StreakPattern[] {
    const streaks: StreakPattern[] = [];
    if (shortTerm.length === 0) return streaks;

    const grouped = new Map<string, Array<{ pnl: number; timestamp: number }>>();

    for (const ep of shortTerm) {
      const key = `${ep.strategyId}|||${ep.regime}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ pnl: ep.pnl, timestamp: ep.timestamp });
    }

    for (const [key, events] of grouped) {
      events.sort((a, b) => a.timestamp - b.timestamp);

      let currentStreak = 1;
      let currentDir: "win" | "loss" = events[events.length - 1].pnl > 0 ? "win" : "loss";

      for (let i = events.length - 2; i >= 0; i--) {
        const dir = events[i].pnl > 0 ? "win" : "loss";
        if (dir === currentDir) {
          currentStreak++;
        } else {
          break;
        }
      }

      if (currentStreak >= 3) {
        const [strategyId, regime] = key.split("|||");
        streaks.push({
          strategy_id: strategyId,
          regime,
          streak: currentStreak,
          direction: currentDir,
        });
      }
    }

    streaks.sort((a, b) => b.streak - a.streak);

    return streaks;
  }

  private detectRegimeVulnerabilities(insights: StrategyInsight[]): RegimeVulnerability[] {
    const regimeMap = new Map<string, { strategies: string[]; pnls: number[] }>();

    for (const insight of insights) {
      if (insight.samples < MIN_SAMPLES_FOR_PATTERN) continue;
      if (insight.avgPnl >= 0) continue;

      if (!regimeMap.has(insight.regime)) {
        regimeMap.set(insight.regime, { strategies: [], pnls: [] });
      }

      const bucket = regimeMap.get(insight.regime)!;
      bucket.strategies.push(insight.strategy_id);
      bucket.pnls.push(insight.avgPnl);
    }

    const vulnerabilities: RegimeVulnerability[] = [];

    for (const [regime, data] of regimeMap) {
      if (data.strategies.length < 2) continue;

      const avgPnl = data.pnls.reduce((a, b) => a + b, 0) / data.pnls.length;
      const r = regime.replace(/_/g, " ");

      vulnerabilities.push({
        regime,
        failingStrategies: data.strategies,
        avgPnl,
        description: `${data.strategies.length} strategies fail in ${r} (avg PnL ${avgPnl.toFixed(1)})`,
      });
    }

    vulnerabilities.sort((a, b) => a.avgPnl - b.avgPnl);

    return vulnerabilities;
  }

  private getLearningAgent(): LearningAgent | null {
    const agent = agentRegistry.get("Learning");
    if (agent instanceof LearningAgent) return agent;
    return null;
  }

  private emptyReport(): PatternReport {
    return { failures: [], streaks: [], regimeVulnerabilities: [], timestamp: Date.now() };
  }

  getLatestReport(): PatternReport | null {
    return this.latestReport;
  }

  getReportHistory(): PatternReport[] {
    return [...this.reportHistory];
  }
}
