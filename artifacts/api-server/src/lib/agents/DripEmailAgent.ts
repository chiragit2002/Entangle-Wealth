import { BaseAgent } from "./BaseAgent";
import { logger } from "../logger";

let _startFn: (() => void) | null = null;
let _stopFn: (() => void) | null = null;

export function bindDripEmailToAgent(start: () => void, stop: () => void): void {
  _startFn = start;
  _stopFn = stop;
}

export class DripEmailAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("DripEmail", "Manages and sends drip email sequences for new subscribers");
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
      await this.log("start", "DripEmail agent started");
      logger.info("[DripEmailAgent] Started");
    } catch (err) {
      this.setStatus("failed");
      this.incrementError();
      await this.log("start", "Failed to start DripEmail", {}, "error", String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (_stopFn) _stopFn();
      if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
      this.setStatus("stopped");
      await this.log("stop", "DripEmail agent stopped");
    } catch (err) {
      logger.warn({ err }, "[DripEmailAgent] Error during stop");
    }
  }

  async handleEvent(_eventType: string, _payload: unknown): Promise<void> {
    this.heartbeat();
  }
}
