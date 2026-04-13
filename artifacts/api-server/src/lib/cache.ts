interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class TTLCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  private maxEntries: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  readonly label: string;

  constructor(defaultTTLMs: number = 60_000, maxEntries: number = 500, label = "cache") {
    this.defaultTTL = defaultTTLMs;
    this.maxEntries = maxEntries;
    this.label = label;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      this.evictions++;
      return undefined;
    }

    this.hits++;
    // LRU: move accessed entry to end of Map so it is evicted last
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    const isNew = !this.store.has(key);

    // LRU eviction: only needed when adding a brand-new key past capacity
    if (isNew && this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
        this.evictions++;
      }
    }

    // Delete existing entry first so the key moves to end of insertion order
    if (!isNew) this.store.delete(key);

    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  getStats(): { label: string; size: number; maxEntries: number; hits: number; misses: number; hitRate: number; evictions: number } {
    const total = this.hits + this.misses;
    return {
      label: this.label,
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 10000) / 100 : 0,
      evictions: this.evictions,
    };
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        this.evictions++;
        removed++;
      }
    }
    return removed;
  }
}

export const stockCache = new TTLCache(2 * 60 * 1000, 200, "stocks");
export const newsCache = new TTLCache(5 * 60 * 1000, 50, "news");
