import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { httpGet } from "../../src/utils/http.js";
import { SourceUnavailableError } from "../../src/utils/errors.js";

// A host that isn't a real source base URL — we only exercise the shared client.
const TEST_URL = "https://api.worldbank.org/v2/_circuit_probe";

let hits = 0;
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  hits = 0;
});
afterAll(() => server.close());

describe("httpGet circuit breaker", () => {
  it(
    "opens after repeated upstream failures and fast-fails without hitting the network",
    { timeout: 30_000 },
    async () => {
      server.use(
        http.get(TEST_URL, () => {
          hits++;
          return new HttpResponse(null, { status: 503 });
        }),
      );

      // Default threshold is 5 consecutive upstream failures.
      for (let i = 0; i < 5; i++) {
        await expect(httpGet("worldbank", TEST_URL)).rejects.toBeInstanceOf(SourceUnavailableError);
      }
      const hitsWhileClosed = hits;
      expect(hitsWhileClosed).toBeGreaterThan(0);

      // Circuit is now open: the next call must fast-fail with no new request.
      await expect(httpGet("worldbank", TEST_URL)).rejects.toThrow(/circuit open/i);
      expect(hits).toBe(hitsWhileClosed);
    },
  );

  it("does not open the circuit on 4xx client errors (source is healthy)", async () => {
    server.use(
      http.get(TEST_URL, () => {
        hits++;
        return new HttpResponse(null, { status: 404 });
      }),
    );

    // Far more than the threshold — 404 means the source answered, so no trip.
    for (let i = 0; i < 8; i++) {
      await expect(httpGet("worldbank", TEST_URL)).rejects.toBeInstanceOf(SourceUnavailableError);
    }
    // Every call reached the network; none were short-circuited.
    expect(hits).toBe(8);
  });

  it("recovers: a success after the failure run keeps the circuit closed", async () => {
    server.use(
      http.get(TEST_URL, () => {
        hits++;
        return HttpResponse.json({ ok: true });
      }),
    );

    const body = await httpGet<{ ok: boolean }>("worldbank", TEST_URL);
    expect(body).toEqual({ ok: true });
    expect(hits).toBe(1);
  });
});
