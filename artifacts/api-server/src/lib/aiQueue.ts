import { logger } from "./logger";

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  enqueuedAt: number;
}

export class AIQueueOverflowError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("AI queue is at capacity. Please retry later.");
    this.name = "AIQueueOverflowError";
  }
}

class AIRequestQueue {
  private queue: QueuedTask<unknown>[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly maxWaiting: number;
  private totalProcessed = 0;
  private totalFailed = 0;
  private totalRejected = 0;

  constructor(maxConcurrent = 5, maxWaiting = 20) {
    this.maxConcurrent = maxConcurrent;
    this.maxWaiting = maxWaiting;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    if (this.queue.length >= this.maxWaiting) {
      this.totalRejected++;
      logger.warn(
        { active: this.activeCount, queued: this.queue.length, maxWaiting: this.maxWaiting },
        "AI queue overflow — rejecting request"
      );
      return Promise.reject(new AIQueueOverflowError(30));
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now(),
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) return;

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;
    const waitTime = Date.now() - task.enqueuedAt;
    if (waitTime > 1000) {
      logger.info({ waitTime, queueDepth: this.queue.length }, "AI request dequeued after wait");
    }

    try {
      const result = await task.fn();
      this.totalProcessed++;
      task.resolve(result);
    } catch (err) {
      this.totalFailed++;
      task.reject(err);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  getStatus() {
    return {
      active: this.activeCount,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxWaiting: this.maxWaiting,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      totalRejected: this.totalRejected,
    };
  }
}

export const aiQueue = new AIRequestQueue(5, 20);
