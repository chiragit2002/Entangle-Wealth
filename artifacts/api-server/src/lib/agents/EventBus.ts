import { pool } from "@workspace/db";
import { logger } from "../logger";

export type EventHandler = (payload: unknown) => Promise<void>;

export interface AgentEvent {
  eventType: string;
  sourceAgent: string;
  payload: unknown;
}

class EventBus {
  private subscribers = new Map<string, Array<{ agentName: string; handler: EventHandler }>>();

  subscribe(eventType: string, agentName: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push({ agentName, handler });
  }

  unsubscribe(eventType: string, agentName: string): void {
    const subs = this.subscribers.get(eventType);
    if (!subs) return;
    this.subscribers.set(
      eventType,
      subs.filter((s) => s.agentName !== agentName)
    );
  }

  async publish(event: AgentEvent): Promise<void> {
    const { eventType, sourceAgent, payload } = event;
    const processedBy: string[] = [];

    const subs = this.subscribers.get(eventType) || [];
    await Promise.all(
      subs.map(async ({ agentName, handler }) => {
        try {
          await handler(payload);
          processedBy.push(agentName);
        } catch (err) {
          logger.error({ err, eventType, sourceAgent, agentName }, "[EventBus] Handler failed");
        }
      })
    );

    this.persistEvent(eventType, sourceAgent, payload, processedBy).catch((err) =>
      logger.warn({ err, eventType }, "[EventBus] Failed to persist event (non-fatal)")
    );
  }

  private async persistEvent(eventType: string, sourceAgent: string, payload: unknown, processedBy: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO agent_events (event_type, source_agent, payload, processed_by)
         VALUES ($1, $2, $3, $4)`,
        [
          eventType,
          sourceAgent,
          payload ? JSON.stringify(payload) : null,
          JSON.stringify(processedBy),
        ]
      );
    } finally {
      client.release();
    }
  }

  getSubscriberCount(eventType: string): number {
    return this.subscribers.get(eventType)?.length ?? 0;
  }

  getAllEventTypes(): string[] {
    return [...this.subscribers.keys()];
  }
}

export const eventBus = new EventBus();
