import { pool } from "@workspace/db";
import { logger } from "../logger";

export type AgentStatus = "idle" | "running" | "stopped" | "failed" | "degraded";

export interface AgentHealthReport {
  name: string;
  status: AgentStatus;
  lastHeartbeat: Date | null;
  errorCount: number;
  startedAt: Date | null;
  uptime: number;
  description: string;
}

export abstract class BaseAgent {
  readonly name: string;
  readonly description: string;
  protected status: AgentStatus = "idle";
  protected lastHeartbeat: Date | null = null;
  protected errorCount = 0;
  protected startedAt: Date | null = null;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  abstract init(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract handleEvent(eventType: string, payload: unknown): Promise<void>;

  async healthCheck(): Promise<AgentHealthReport> {
    return {
      name: this.name,
      status: this.status,
      lastHeartbeat: this.lastHeartbeat,
      errorCount: this.errorCount,
      startedAt: this.startedAt,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      description: this.description,
    };
  }

  protected heartbeat(): void {
    this.lastHeartbeat = new Date();
  }

  protected setStatus(s: AgentStatus): void {
    this.status = s;
  }

  protected incrementError(): void {
    this.errorCount++;
  }

  protected resetErrors(): void {
    this.errorCount = 0;
  }

  async log(action: string, message: string, metadata?: Record<string, unknown>, status = "info", errorMessage?: string, durationMs?: number): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO agent_logs (agent_name, action, status, message, metadata, error_message, duration_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            this.name,
            action,
            status,
            message,
            metadata ? JSON.stringify(metadata) : null,
            errorMessage || null,
            durationMs || null,
          ]
        );
      } finally {
        client.release();
      }
    } catch (err) {
      logger.warn({ err, agentName: this.name, action }, "Failed to write agent log (non-fatal)");
    }
  }
}
