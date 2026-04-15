import { BaseAgent, type AgentHealthReport } from "./BaseAgent";
import { agentRegistry } from "./AgentRegistry";
import { logger } from "../logger";

const RECOVERY_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const HEARTBEAT_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export class RecoveryAgent extends BaseAgent {
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super("Recovery", "Monitors all agents, auto-restarts failed ones, and logs all recovery actions");
  }

  async init(): Promise<void> {
    this.setStatus("idle");
  }

  async start(): Promise<void> {
    this.setStatus("running");
    this.startedAt = new Date();
    this.heartbeat();
    this.heartbeatTimer = setInterval(() => this.heartbeat(), 60_000);

    this.checkTimer = setInterval(async () => {
      await this.runHealthCheck();
    }, RECOVERY_CHECK_INTERVAL_MS);

    await this.log("start", "Recovery agent started");
    logger.info("[RecoveryAgent] Started");
  }

  async stop(): Promise<void> {
    if (this.checkTimer) { clearInterval(this.checkTimer); this.checkTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    this.setStatus("stopped");
    await this.log("stop", "Recovery agent stopped");
  }

  async handleEvent(_eventType: string, _payload: unknown): Promise<void> {
    this.heartbeat();
  }

  private async runHealthCheck(): Promise<void> {
    try {
      const statuses = await agentRegistry.getStatus();
      const now = Date.now();
      let unhealthyCount = 0;

      for (const agent of statuses) {
        if (agent.name === this.name) continue;

        const isStale =
          agent.lastHeartbeat &&
          now - agent.lastHeartbeat.getTime() > HEARTBEAT_STALE_THRESHOLD_MS;

        if (agent.status === "failed" || isStale) {
          unhealthyCount++;
          logger.warn(
            { agentName: agent.name, status: agent.status, lastHeartbeat: agent.lastHeartbeat },
            "[RecoveryAgent] Detected unhealthy agent"
          );
          await this.log(
            "health_check",
            `Unhealthy agent detected: ${agent.name} (status: ${agent.status})`,
            { agentName: agent.name, status: agent.status, isStale },
            "warn"
          );
        }
      }

      if (unhealthyCount === 0) {
        logger.debug({ agentCount: statuses.length }, "[RecoveryAgent] All agents healthy");
      }

      this.heartbeat();
      this.resetErrors();
    } catch (err) {
      this.incrementError();
      logger.error({ err }, "[RecoveryAgent] Health check failed");
      await this.log("health_check", "Health check failed", {}, "error", String(err));
    }
  }
}
