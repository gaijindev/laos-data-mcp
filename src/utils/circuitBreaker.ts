/**
 * Per-source circuit breaker. After a run of consecutive upstream failures a
 * source's circuit "opens" and further requests fast-fail for a cooldown window
 * instead of repeatedly hammering an API that is down, rate-limiting us, or
 * stuck behind a Cloudflare challenge. Once the cooldown elapses the circuit is
 * "half-open" and admits a single probe request: success closes it, failure
 * reopens it with a fresh cooldown.
 *
 * Only upstream-health failures (network errors, timeouts, HTTP 429/5xx) count
 * toward opening — a 4xx client error means the source is up, so it is treated
 * as a success for breaker purposes. Wiring lives in src/utils/http.ts.
 */
import { SOURCES, type Source } from "../schemas/source.js";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Consecutive upstream failures required to open the circuit. */
  failureThreshold: number;
  /** How long the circuit stays open before admitting a probe, in ms. */
  cooldownMs: number;
}

export interface CircuitSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  /** ISO time the circuit last opened, or null when closed. */
  openedAt: string | null;
  /** ISO time the next probe is allowed, or null when closed. */
  retryAt: string | null;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAtMs: number | null = null;
  private probing = false;

  constructor(private readonly opts: CircuitBreakerOptions) {}

  state(now: number = Date.now()): CircuitState {
    if (this.openedAtMs === null) return "closed";
    return now - this.openedAtMs >= this.opts.cooldownMs ? "half-open" : "open";
  }

  /**
   * Decide whether a request may proceed. Returns false while the circuit is
   * open. In the half-open window it reserves a single probe slot, so only the
   * first caller is admitted until that probe resolves.
   */
  tryAcquire(now: number = Date.now()): boolean {
    const state = this.state(now);
    if (state === "closed") return true;
    if (state === "open") return false;
    if (this.probing) return false; // a half-open probe is already in flight
    this.probing = true;
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAtMs = null;
    this.probing = false;
  }

  recordFailure(now: number = Date.now()): void {
    this.failures += 1;
    this.probing = false;
    if (this.failures >= this.opts.failureThreshold) {
      this.openedAtMs = now; // (re)open and restart the cooldown clock
    }
  }

  snapshot(now: number = Date.now()): CircuitSnapshot {
    return {
      state: this.state(now),
      consecutiveFailures: this.failures,
      openedAt: this.openedAtMs === null ? null : new Date(this.openedAtMs).toISOString(),
      retryAt:
        this.openedAtMs === null
          ? null
          : new Date(this.openedAtMs + this.opts.cooldownMs).toISOString(),
    };
  }

  reset(): void {
    this.failures = 0;
    this.openedAtMs = null;
    this.probing = false;
  }
}

interface BreakerConfig extends CircuitBreakerOptions {
  enabled: boolean;
}

function positiveOr(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveConfig(): BreakerConfig {
  return {
    enabled: process.env.CIRCUIT_BREAKER_ENABLED !== "false",
    failureThreshold: positiveOr(process.env.CIRCUIT_FAILURE_THRESHOLD, 5),
    cooldownMs: positiveOr(process.env.CIRCUIT_COOLDOWN_MS, 30_000),
  };
}

const config = resolveConfig();
const breakers = new Map<Source, CircuitBreaker>();

export function circuitEnabled(): boolean {
  return config.enabled;
}

export function breakerFor(source: Source): CircuitBreaker {
  let breaker = breakers.get(source);
  if (!breaker) {
    breaker = new CircuitBreaker(config);
    breakers.set(source, breaker);
  }
  return breaker;
}

export function circuitSnapshot(source: Source): CircuitSnapshot {
  return breakerFor(source).snapshot();
}

/** Reset every source's breaker. Used between tests. */
export function resetCircuitBreakers(): void {
  for (const source of SOURCES) breakers.get(source)?.reset();
}
