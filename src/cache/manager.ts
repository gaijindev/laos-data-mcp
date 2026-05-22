import NodeCache from "node-cache";
import { createHash } from "node:crypto";
import { SOURCE_META, SOURCES, type Source } from "../schemas/source.js";
import { logger } from "../utils/logger.js";

interface SourceCounter {
  hits: number;
  misses: number;
  /** ISO timestamp of the most recent fresh write (≈ last successful fetch). */
  lastFetch: string | null;
}

export interface SourceCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  lastFetch: string | null;
}

export interface CacheStats {
  enabled: boolean;
  keys: number;
  hits: number;
  misses: number;
  hitRate: number;
  perSource: Record<Source, SourceCacheStats>;
}

export interface CacheOptions {
  enabled?: boolean;
  maxKeys?: number;
}

/**
 * TTL cache around node-cache. Keys are namespaced by source ("{source}:{hash}")
 * so we can expire or measure one source at a time. TTL defaults to the source's
 * policy in SOURCE_META unless overridden per call.
 */
export class CacheManager {
  private readonly cache: NodeCache;
  private readonly enabled: boolean;
  private hits = 0;
  private misses = 0;
  private readonly perSource: Record<Source, SourceCounter>;

  constructor(opts: CacheOptions = {}) {
    this.enabled = opts.enabled ?? process.env.CACHE_ENABLED !== "false";
    const maxKeys = opts.maxKeys ?? Number(process.env.CACHE_MAX_KEYS ?? 1000);
    this.cache = new NodeCache({
      stdTTL: 0,
      checkperiod: 120,
      maxKeys: maxKeys > 0 ? maxKeys : 0,
      useClones: true,
    });
    this.perSource = Object.fromEntries(
      SOURCES.map((s) => [s, { hits: 0, misses: 0, lastFetch: null } satisfies SourceCounter]),
    ) as Record<Source, SourceCounter>;
  }

  /** Build a stable cache key: "{source}:{sha1(parts)[0:16]}". */
  key(source: Source, ...parts: unknown[]): string {
    const hash = createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
    return `${source}:${hash}`;
  }

  private sourceOf(key: string): Source | undefined {
    const prefix = key.split(":", 1)[0] ?? "";
    return (SOURCES as readonly string[]).includes(prefix) ? (prefix as Source) : undefined;
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;
    const value = this.cache.get<T>(key);
    const src = this.sourceOf(key);
    if (value !== undefined) {
      this.hits++;
      if (src) this.perSource[src].hits++;
    } else {
      this.misses++;
      if (src) this.perSource[src].misses++;
    }
    return value;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    if (!this.enabled) return;
    const src = this.sourceOf(key);
    const ttl = ttlSeconds ?? (src ? SOURCE_META[src].cacheTtlSeconds : 0);
    try {
      this.cache.set(key, value, ttl);
      if (src) this.perSource[src].lastFetch = new Date().toISOString();
    } catch (err) {
      // maxKeys overflow etc. — degrade to no-cache rather than crash a request.
      logger.warn(`cache set failed for ${key}:`, err instanceof Error ? err.message : err);
    }
  }

  /** Cache-aside: return the cached value or run `fetcher`, store, and return it. */
  async getOrSet<T>(
    source: Source,
    keyParts: unknown[],
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    const cacheKey = this.key(source, ...keyParts);
    const cached = this.get<T>(cacheKey);
    if (cached !== undefined) {
      logger.debug(`cache hit ${cacheKey}`);
      return cached;
    }
    logger.debug(`cache miss ${cacheKey}`);
    const value = await fetcher();
    this.set(cacheKey, value, ttlSeconds);
    return value;
  }

  invalidate(key: string): void {
    this.cache.del(key);
  }

  /** Drop every key for one source. Returns how many keys were removed. */
  invalidateSource(source: Source): number {
    const keys = this.cache.keys().filter((k) => k.startsWith(`${source}:`));
    this.cache.del(keys);
    return keys.length;
  }

  stats(): CacheStats {
    const perSource = {} as Record<Source, SourceCacheStats>;
    for (const s of SOURCES) {
      const c = this.perSource[s];
      const total = c.hits + c.misses;
      perSource[s] = {
        hits: c.hits,
        misses: c.misses,
        hitRate: total ? c.hits / total : 0,
        lastFetch: c.lastFetch,
      };
    }
    const total = this.hits + this.misses;
    return {
      enabled: this.enabled,
      keys: this.cache.keys().length,
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? this.hits / total : 0,
      perSource,
    };
  }

  /** Clear all entries and reset counters (used by tests). */
  reset(): void {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
    for (const s of SOURCES) {
      this.perSource[s] = { hits: 0, misses: 0, lastFetch: null };
    }
  }
}

/** Process-wide cache shared by all adapters. */
export const cache = new CacheManager();
