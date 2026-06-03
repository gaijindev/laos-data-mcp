import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchFaostatDomain } from "../../src/adapters/faostat.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { FAOSTAT_DATA_URL, faostatHandler } from "../mocks/faostat.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchFaostatDomain", () => {
  it("normalizes FAOSTAT rows into IndicatorRecord[] (newest first)", async () => {
    server.use(faostatHandler());
    const records = await fetchFaostatDomain("QCL", { startYear: 2021, endYear: 2022 });
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      id: "FAOSTAT:QCL:27:5510",
      source: "faostat",
      indicatorCode: "QCL:5510:27",
      category: "agriculture",
      countryCode: "LA",
      countryName: "Lao PDR",
      year: 2022,
      value: 3_500_000,
      unit: "t",
    });
    expect(records[0]?.indicatorName).toContain("Rice");
  });

  it("filters by item name client-side", async () => {
    server.use(faostatHandler());
    const records = await fetchFaostatDomain("QCL", { item: "maize" });
    expect(records).toHaveLength(1);
    expect(records[0]?.indicatorName).toContain("Maize");
  });

  it("throws DataParseError when the response lacks a data array", async () => {
    server.use(http.get(FAOSTAT_DATA_URL, () => HttpResponse.json({ oops: true })));
    await expect(fetchFaostatDomain("QCL")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(faostatHandler(() => (hits += 1)));
    await fetchFaostatDomain("QCL", { startYear: 2021, endYear: 2022 });
    await fetchFaostatDomain("QCL", { startYear: 2021, endYear: 2022 });
    expect(hits).toBe(1);
  });
});
