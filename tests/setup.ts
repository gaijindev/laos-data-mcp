import { beforeEach } from "vitest";
import { cache } from "../src/cache/manager.js";
import { resetCircuitBreakers } from "../src/utils/circuitBreaker.js";

// Keep shared module-level state (the cache and per-source circuit breakers)
// from leaking between tests, regardless of what each test file does locally.
beforeEach(() => {
  cache.reset();
  resetCircuitBreakers();
});
