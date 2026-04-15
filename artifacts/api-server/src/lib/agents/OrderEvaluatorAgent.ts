import { BaseAgent } from "./BaseAgent";
import { logger } from "../logger";

let _startFn: (() => void) | null = null;
let _stopFn: (() => void) | null = null;

export function bindOrderEvaluatorToAgent(start: () => void, stop: () => void): void {
  _startFn = start;
  _stopFn = stop;
}

export class OrderEvaluatorAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("OrderEvaluator", "Evaluates pending limit/stop orders against live prices every 15s");
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
      await this.log("start", "OrderEvaluator agent started");
      logger.info("[OrderEvaluatorAgent] Started");
    } catch (err) {
      this.setStatus("failed");
      this.incrementError();
      await this.log("start", "Failed to start OrderEvaluator", {}, "error", String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (_stopFn) _stopFn();
      if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
      this.setStatus("stopped");
      await this.log("stop", "OrderEvaluator agent stopped");
    } catch (err) {
      logger.warn({ err }, "[OrderEvaluatorAgent] Error during stop");
    }
  }

  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    this.heartbeat();
    logger.debug({ eventType, payload }, "[OrderEvaluatorAgent] Received event");
  }
}
