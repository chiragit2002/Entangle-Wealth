import { BaseAgent } from "./BaseAgent";
import { logger } from "../logger";

let _startFn: (() => void) | null = null;
let _stopFn: (() => void) | null = null;

export function bindAlertEvaluatorToAgent(start: () => void, stop: () => void): void {
  _startFn = start;
  _stopFn = stop;
}

export class AlertEvaluatorAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("AlertEvaluator", "Evaluates price and technical alerts for all active users");
  }

  async init(): Promise<void> {
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    try {
      if (_startFn) _startFn();
      this.setStatus("running");
      this.startedAt = new Date();
      this.heartbeat();
      this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
      await this.log("start", "AlertEvaluator agent started");
      logger.info("[AlertEvaluatorAgent] Started");
    } catch (err) {
      this.setStatus("failed");
      this.incrementError();
      await this.log("start", "Failed to start AlertEvaluator", {}, "error", String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (_stopFn) _stopFn();
      if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
      this.setStatus("stopped");
      await this.log("stop", "AlertEvaluator agent stopped");
    } catch (err) {
      logger.warn({ err }, "[AlertEvaluatorAgent] Error during stop");
    }
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    logger.debug({ eventType, payload }, "[AlertEvaluatorAgent] Received event");
  }
}
