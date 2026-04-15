import { BaseAgent, type AgentHealthReport } from "./BaseAgent";
import { logger } from "../logger";

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RESTART_ATTEMPTS = 3;
const REGISTRY_CHECK_INTERVAL_MS = 60 * 1000;

interface RegistryEntry {
  agent: BaseAgent;
  restartCount: number;
  lastRestartAt: Date | null;
}

class AgentRegistry {
  private agents = new Map<string, RegistryEntry>();
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  register(agent: BaseAgent): void {
    this.agents.set(agent.name, { agent, restartCount: 0, lastRestartAt: null });
    logger.info({ agentName: agent.name }, "[AgentRegistry] Agent registered");
  }

  async startAll(): Promise<void> {
    for (const [name, entry] of this.agents) {
      try {
        await entry.agent.init();
        await entry.agent.start();
        logger.info({ agentName: name }, "[AgentRegistry] Agent started");
      } catch (err) {
        logger.error({ err, agentName: name }, "[AgentRegistry] Failed to start agent");
      }
    }
    this.startHealthCheck();
  }

  async stopAll(): Promise<void> {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    for (const [name, entry] of this.agents) {
      try {
        await entry.agent.stop();
        logger.info({ agentName: name }, "[AgentRegistry] Agent stopped");
      } catch (err) {
        logger.error({ err, agentName: name }, "[AgentRegistry] Failed to stop agent");
      }
    }
  }

  get(name: string): BaseAgent | undefined {
    return this.agents.get(name)?.agent;
  }

  async getStatus(): Promise<Array<AgentHealthReport & { restartCount: number; lastRestartAt: Date | null }>> {
    const results = [];
    for (const [, entry] of this.agents) {
      const health = await entry.agent.healthCheck();
      results.push({
        ...health,
        restartCount: entry.restartCount,
        lastRestartAt: entry.lastRestartAt,
      });
    }
    return results;
  }

  private startHealthCheck(): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => {
      this.checkHeartbeats().catch((err) =>
        logger.error({ err }, "[AgentRegistry] Health check error")
      );
    }, REGISTRY_CHECK_INTERVAL_MS);
  }

  private async checkHeartbeats(): Promise<void> {
    const now = Date.now();
    for (const [name, entry] of this.agents) {
      const health = await entry.agent.healthCheck();
      const stale =
        health.lastHeartbeat &&
        now - health.lastHeartbeat.getTime() > HEARTBEAT_TIMEOUT_MS;

      if (health.status === "failed" || (health.status === "running" && stale)) {
        logger.warn({ agentName: name, status: health.status, stale }, "[AgentRegistry] Agent unhealthy — attempting restart");
        await this.restartAgent(name, entry);
      }
    }
  }

  private async restartAgent(name: string, entry: RegistryEntry): Promise<void> {
    if (entry.restartCount >= MAX_RESTART_ATTEMPTS) {
      logger.error({ agentName: name, restartCount: entry.restartCount }, "[AgentRegistry] Max restart attempts reached — agent left in failed state");
      return;
    }

    try {
      await entry.agent.stop().catch(() => undefined);
      await entry.agent.init();
      await entry.agent.start();
      entry.restartCount++;
      entry.lastRestartAt = new Date();
      logger.info({ agentName: name, restartCount: entry.restartCount }, "[AgentRegistry] Agent restarted successfully");
      await entry.agent.log("restart", `Auto-restarted (attempt ${entry.restartCount})`, {}, "warn");
    } catch (err) {
      logger.error({ err, agentName: name }, "[AgentRegistry] Failed to restart agent");
    }
  }
}

export const agentRegistry = new AgentRegistry();
