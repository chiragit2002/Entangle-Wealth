import { logger } from "./logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class BoundedRateLimitMap {
  private map = new Map<string, RateLimitEntry>();
  private readonly maxSize: number;
  private readonly label: string;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxSize: number = 10_000, label: string = "rateLimit", cleanupIntervalMs: number = 60_000) {
    this.maxSize = maxSize;
    this.label = label;
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  get(key: string): RateLimitEntry | undefined {
    return this.map.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    if (!this.map.has(key) && this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, entry);
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.map) {
      if (now >= entry.resetAt) {
        this.map.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug({ label: this.label, removed, remaining: this.map.size }, "BoundedRateLimitMap cleanup");
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.map.clear();
  }
}

interface TimestampEntry {
  [key: string]: number;
}

export class BoundedCooldownMap {
  private map = new Map<string, Map<string, number>>();
  private readonly maxUsers: number;
  private readonly ttlMs: number;
  private readonly label: string;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxUsers: number = 10_000, ttlMs: number = 300_000, label: string = "cooldown") {
    this.maxUsers = maxUsers;
    this.ttlMs = ttlMs;
    this.label = label;
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    this.cleanupTimer.unref();
  }

  getUserMap(userId: string): Map<string, number> {
    let userMap = this.map.get(userId);
    if (!userMap) {
      if (this.map.size >= this.maxUsers) {
        const oldest = this.map.keys().next().value;
        if (oldest !== undefined) this.map.delete(oldest);
      }
      userMap = new Map();
      this.map.set(userId, userMap);
    }
    return userMap;
  }

  check(userId: string, action: string, cooldownMs: number): boolean {
    const now = Date.now();
    const userMap = this.getUserMap(userId);
    const lastAt = userMap.get(action) ?? 0;
    if (now - lastAt < cooldownMs) return false;
    userMap.set(action, now);
    return true;
  }

  get size(): number {
    return this.map.size;
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.ttlMs;
    let removedUsers = 0;
    for (const [userId, userMap] of this.map) {
      for (const [action, ts] of userMap) {
        if (ts < cutoff) userMap.delete(action);
      }
      if (userMap.size === 0) {
        this.map.delete(userId);
        removedUsers++;
      }
    }
    if (removedUsers > 0) {
      logger.debug({ label: this.label, removedUsers, remaining: this.map.size }, "BoundedCooldownMap cleanup");
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.map.clear();
  }
}

export class BoundedTimestampMap {
  private map = new Map<string, number>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly label: string;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxSize: number = 10_000, ttlMs: number = 300_000, label: string = "timestamps") {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.label = label;
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    this.cleanupTimer.unref();
  }

  get(key: string): number | undefined {
    return this.map.get(key);
  }

  set(key: string, value: number): void {
    if (!this.map.has(key) && this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get size(): number {
    return this.map.size;
  }

  entries(): IterableIterator<[string, number]> {
    return this.map.entries();
  }

  keys(): IterableIterator<string> {
    return this.map.keys();
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.ttlMs;
    let removed = 0;
    for (const [key, ts] of this.map) {
      if (ts < cutoff) {
        this.map.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug({ label: this.label, removed, remaining: this.map.size }, "BoundedTimestampMap cleanup");
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.map.clear();
  }
}
