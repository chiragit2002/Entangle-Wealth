import { BaseAgent } from "./BaseAgent";
import { logger } from "../logger";

let _startFn: (() => void) | null = null;
let _stopFn: (() => void) | null = null;

export function bindEmailDigestToAgent(start: () => void, stop: () => void): void {
  _startFn = start;
  _stopFn = stop;
}

export class EmailDigestAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("EmailDigest", "Sends daily and weekly alert digest emails to subscribed users");
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
      await this.log("start", "EmailDigest agent started");
      logger.info("[EmailDigestAgent] Started");
    } catch (err) {
      this.setStatus("failed");
      this.incrementError();
      await this.log("start", "Failed to start EmailDigest", {}, "error", String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (_stopFn) _stopFn();
      if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
      this.setStatus("stopped");
      await this.log("stop", "EmailDigest agent stopped");
    } catch (err) {
      logger.warn({ err }, "[EmailDigestAgent] Error during stop");
    }
  }

  async handleEvent(_eventType: string, _payload: unknown): Promise<void> {
    this.heartbeat();
  }
}
