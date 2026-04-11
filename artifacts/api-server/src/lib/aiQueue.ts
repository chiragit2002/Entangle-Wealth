import { logger } from "./logger";

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  enqueuedAt: number;
}

class AIRequestQueue {
  private queue: QueuedTask<unknown>[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private totalProcessed = 0;
  private totalFailed = 0;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
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
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
    };
  }
}

export const aiQueue = new AIRequestQueue(5);
