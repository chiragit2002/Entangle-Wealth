import { BaseAgent } from "./BaseAgent";
import { startCrawlScheduler, stopCrawlScheduler } from "../crawlScheduler";
import { logger } from "../logger";

export class CrawlSchedulerAgent extends BaseAgent {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("CrawlScheduler", "Schedules and runs automated site crawls for visual regression testing");
  }

  async init(): Promise<void> {
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    try {
      startCrawlScheduler();
      this.setStatus("running");
      this.startedAt = new Date();
      this.heartbeat();
      this.intervalHandle = setInterval(() => this.heartbeat(), 60_000);
      await this.log("start", "CrawlScheduler agent started");
      logger.info("[CrawlSchedulerAgent] Started");
    } catch (err) {
      this.setStatus("failed");
      this.incrementError();
      await this.log("start", "Failed to start CrawlScheduler", {}, "error", String(err));
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      stopCrawlScheduler();
      if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
      this.setStatus("stopped");
      await this.log("stop", "CrawlScheduler agent stopped");
    } catch (err) {
      logger.warn({ err }, "[CrawlSchedulerAgent] Error during stop");
    }
  }

  async handleEvent(_eventType: string, _payload: unknown): Promise<void> {
    this.heartbeat();
  }
}
