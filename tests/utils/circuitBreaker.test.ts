import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "../../src/utils/circuitBreaker.js";

const OPTS = { failureThreshold: 3, cooldownMs: 1_000 };

describe("CircuitBreaker", () => {
  it("starts closed and admits requests", () => {
    const b = new CircuitBreaker(OPTS);
    expect(b.state(0)).toBe("closed");
    expect(b.tryAcquire(0)).toBe(true);
  });

  it("opens after the failure threshold and fast-fails", () => {
    const b = new CircuitBreaker(OPTS);
    for (let i = 0; i < 3; i++) {
      expect(b.tryAcquire(0)).toBe(true);
      b.recordFailure(0);
    }
    expect(b.state(0)).toBe("open");
    expect(b.tryAcquire(0)).toBe(false); // fast-fail while open
  });

  it("does not open below the threshold", () => {
    const b = new CircuitBreaker(OPTS);
    b.recordFailure(0);
    b.recordFailure(0);
    expect(b.state(0)).toBe("closed");
    expect(b.tryAcquire(0)).toBe(true);
  });

  it("resets the failure run on success", () => {
    const b = new CircuitBreaker(OPTS);
    b.recordFailure(0);
    b.recordFailure(0);
    b.recordSuccess();
    b.recordFailure(0);
    expect(b.state(0)).toBe("closed");
    expect(b.snapshot(0).consecutiveFailures).toBe(1);
  });

  it("becomes half-open after the cooldown and admits a single probe", () => {
    const b = new CircuitBreaker(OPTS);
    for (let i = 0; i < 3; i++) b.recordFailure(0);
    expect(b.state(999)).toBe("open"); // still cooling down
    expect(b.state(1_000)).toBe("half-open"); // cooldown elapsed

    expect(b.tryAcquire(1_000)).toBe(true); // first caller gets the probe slot
    expect(b.tryAcquire(1_000)).toBe(false); // second caller is rejected
  });

  it("closes when the half-open probe succeeds", () => {
    const b = new CircuitBreaker(OPTS);
    for (let i = 0; i < 3; i++) b.recordFailure(0);
    expect(b.tryAcquire(1_000)).toBe(true);
    b.recordSuccess();
    expect(b.state(1_000)).toBe("closed");
    expect(b.tryAcquire(1_000)).toBe(true);
  });

  it("reopens with a fresh cooldown when the half-open probe fails", () => {
    const b = new CircuitBreaker(OPTS);
    for (let i = 0; i < 3; i++) b.recordFailure(0);
    expect(b.tryAcquire(1_000)).toBe(true); // probe admitted
    b.recordFailure(1_000); // probe fails
    expect(b.state(1_000)).toBe("open");
    expect(b.snapshot(1_000).retryAt).toBe(new Date(2_000).toISOString());
  });

  it("reports a snapshot reflecting open state and retry time", () => {
    const b = new CircuitBreaker(OPTS);
    expect(b.snapshot(0)).toMatchObject({ state: "closed", openedAt: null, retryAt: null });
    for (let i = 0; i < 3; i++) b.recordFailure(0);
    expect(b.snapshot(0)).toMatchObject({
      state: "open",
      consecutiveFailures: 3,
      openedAt: new Date(0).toISOString(),
      retryAt: new Date(1_000).toISOString(),
    });
  });

  it("reset() returns the breaker to closed", () => {
    const b = new CircuitBreaker(OPTS);
    for (let i = 0; i < 3; i++) b.recordFailure(0);
    b.reset();
    expect(b.state(0)).toBe("closed");
    expect(b.snapshot(0).consecutiveFailures).toBe(0);
  });
});
