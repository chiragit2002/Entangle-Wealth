import { BaseAgent } from "./BaseAgent";
import { logger } from "../logger";

let _startFn: (() => void) | null = null;

export function bindApiHealthToAgent(start: () => void): void {
  _startFn = start;
}

export class ApiHealthAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("ApiHealth", "Monitors all API endpoints for availability and performance");
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
      await this.log("start", "ApiHealth agent started");
      logger.info("[ApiHealthAgent] Started");
    } catch (err) {
      this.setStatus("failed");
      this.incrementError();
      await this.log("start", "Failed to start ApiHealth", {}, "error", String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
      this.setStatus("stopped");
      await this.log("stop", "ApiHealth agent stopped");
    } catch (err) {
      logger.warn({ err }, "[ApiHealthAgent] Error during stop");
    }
  }

  async handleEvent(_eventType: string, _payload: unknown): Promise<void> {
    this.heartbeat();
  }
}
