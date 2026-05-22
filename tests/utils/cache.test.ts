import { describe, it, expect, beforeEach, vi } from "vitest";
import { CacheManager } from "../../src/cache/manager.js";

describe("CacheManager", () => {
  let cache: CacheManager;
  beforeEach(() => {
    cache = new CacheManager({ enabled: true, maxKeys: 100 });
  });

  it("returns undefined on miss and the stored value on hit", () => {
    const key = cache.key("worldbank", "SP.POP.TOTL", 2000, 2020);
    expect(cache.get(key)).toBeUndefined();
    cache.set(key, [1, 2, 3]);
    expect(cache.get(key)).toEqual([1, 2, 3]);
  });

  it("derives stable, source-namespaced keys", () => {
    const a = cache.key("unicef", "x", 1);
    const b = cache.key("unicef", "x", 1);
    expect(a).toBe(b);
    expect(a.startsWith("unicef:")).toBe(true);
  });

  it("getOrSet runs the fetcher once, then serves from cache", async () => {
    const fetcher = vi.fn(async () => "value");
    const first = await cache.getOrSet("worldbank", ["k"], fetcher);
    const second = await cache.getOrSet("worldbank", ["k"], fetcher);
    expect(first).toBe("value");
    expect(second).toBe("value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("invalidateSource removes only that source's keys", () => {
    cache.set(cache.key("worldbank", "a"), 1);
    cache.set(cache.key("unicef", "b"), 2);
    const removed = cache.invalidateSource("worldbank");
    expect(removed).toBe(1);
    expect(cache.get(cache.key("unicef", "b"))).toBe(2);
  });

  it("tracks hit/miss stats globally and per source", () => {
    const key = cache.key("worldbank", "a");
    cache.get(key); // miss
    cache.set(key, 1);
    cache.get(key); // hit
    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
    expect(stats.perSource.worldbank.hits).toBe(1);
    expect(stats.perSource.worldbank.lastFetch).not.toBeNull();
  });

  it("when disabled, always calls the fetcher", async () => {
    const disabled = new CacheManager({ enabled: false });
    const fetcher = vi.fn(async () => "v");
    await disabled.getOrSet("worldbank", ["k"], fetcher);
    await disabled.getOrSet("worldbank", ["k"], fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
