import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchUisIndicator, searchUisIndicators } from "../../src/adapters/uis.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { UIS_INDICATORS_URL, uisDataHandler, uisEmptyResponse } from "../mocks/uis.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchUisIndicator", () => {
  it("normalizes UIS records: year, value, unit from metadata name, qualifier→footnote, country LA", async () => {
    server.use(uisDataHandler());
    const records = await fetchUisIndicator("LR.AG15T99");
    // Should have 3 records (including the NA one which maps to null value)
    expect(records).toHaveLength(3);

    // Records should be sorted by year descending
    expect(records[0]!.year).toBe(2021);
    expect(records[1]!.year).toBe(2015);
    expect(records[2]!.year).toBe(2005);

    // Check 2021 record (qualifier UIS_EST → footnote)
    const rec2021 = records[0]!;
    expect(rec2021).toMatchObject({
      source: "uis",
      category: "education",
      countryCode: "LA",
      countryName: "Lao PDR",
      indicatorCode: "LR.AG15T99",
      indicatorName: "Adult literacy rate, population 15+ years, both sexes (%)",
      year: 2021,
      value: 84.7,
      unit: "%",
      footnote: "UIS estimate",
    });
    expect(rec2021.id).toBe("UIS:LR.AG15T99");

    // 2015 record: no qualifier, no footnote
    const rec2015 = records[1]!;
    expect(rec2015.value).toBe(79.9);
    expect(rec2015.footnote).toBeUndefined();

    // 2005 record: magnitude "NA" → value forced to null
    const rec2005 = records[2]!;
    expect(rec2005.value).toBeNull();
  });

  it("returns [] when records array is empty", async () => {
    server.use(http.get(UIS_INDICATORS_URL, () => HttpResponse.json(uisEmptyResponse)));
    await expect(fetchUisIndicator("INVALID")).resolves.toEqual([]);
  });

  it("returns [] when records is empty and no hints", async () => {
    server.use(
      http.get(UIS_INDICATORS_URL, () =>
        HttpResponse.json({ records: [], hints: [], indicatorMetadata: [] }),
      ),
    );
    await expect(fetchUisIndicator("UNKNOWN")).resolves.toEqual([]);
  });

  it("throws DataParseError on a malformed response (missing records array)", async () => {
    server.use(http.get(UIS_INDICATORS_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchUisIndicator("LR.AG15T99")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache (MSW handler hit count stays at 1)", async () => {
    let hits = 0;
    server.use(uisDataHandler(() => (hits += 1)));
    await fetchUisIndicator("LR.AG15T99");
    await fetchUisIndicator("LR.AG15T99");
    expect(hits).toBe(1);
  });
});

describe("searchUisIndicators", () => {
  it("returns matching indicators for a case-insensitive substring query", async () => {
    const matches = await searchUisIndicators("literacy");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0]).toMatchObject({ code: "LR.AG15T99" });
  });

  it("returns empty array when no indicators match", async () => {
    const matches = await searchUisIndicators("zzznomatch");
    expect(matches).toEqual([]);
  });

  it("matches on code as well as name", async () => {
    const matches = await searchUisIndicators("NERT");
    expect(matches.every((m) => m.code.startsWith("NERT"))).toBe(true);
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});
