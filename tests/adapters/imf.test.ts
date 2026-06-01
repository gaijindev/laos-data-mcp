import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchImfIndicator } from "../../src/adapters/imf.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { IMF_NGDP_URL, imfHandler } from "../mocks/imf.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchImfIndicator", () => {
  it("extracts LAO values and normalizes them", async () => {
    server.use(imfHandler());
    const records = await fetchImfIndicator("NGDP_RPCH", { startYear: 2000, endYear: 2026 });
    expect(records[0]).toMatchObject({
      id: "IMF:NGDP_RPCH",
      source: "imf",
      indicatorCode: "NGDP_RPCH",
      indicatorName: "Real GDP growth",
      category: "economy",
      countryCode: "LA",
      year: 2022,
      value: 4.4,
      unit: "Annual percent change",
    });
  });

  it("drops forecast years beyond 2030 (schema cap)", async () => {
    server.use(imfHandler());
    const records = await fetchImfIndicator("NGDP_RPCH", { startYear: 2000, endYear: 2030 });
    expect(records.every((r) => r.year <= 2030)).toBe(true);
    expect(records.some((r) => r.year === 2031)).toBe(false);
  });

  it("returns [] when LAO is absent from the values", async () => {
    server.use(
      http.get(IMF_NGDP_URL, () =>
        HttpResponse.json({ indicators: {}, values: { NGDP_RPCH: {} } }),
      ),
    );
    await expect(fetchImfIndicator("NGDP_RPCH")).resolves.toEqual([]);
  });

  it("throws DataParseError when the response has no values block", async () => {
    server.use(http.get(IMF_NGDP_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchImfIndicator("NGDP_RPCH")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(imfHandler(() => (hits += 1)));
    await fetchImfIndicator("NGDP_RPCH", { startYear: 2000, endYear: 2026 });
    await fetchImfIndicator("NGDP_RPCH", { startYear: 2000, endYear: 2026 });
    expect(hits).toBe(1);
  });
});
