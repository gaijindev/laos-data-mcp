import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchUnSdgIndicator, searchUnSdgIndicators } from "../../src/adapters/unSdg.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, SourceUnavailableError } from "../../src/utils/errors.js";
import {
  UN_SDG_INDICATOR_DATA_URL,
  unSdgDataHandler,
  unSdgEmptyHandler,
  unSdgSeriesHandler,
} from "../mocks/unSdg.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchUnSdgIndicator", () => {
  it("normalizes paginated UN SDG indicator records for Lao PDR", async () => {
    server.use(unSdgDataHandler());
    const records = await fetchUnSdgIndicator("11.1.1", 2016, 2020);

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      id: "UN_SDG:EN_LND_SLUM",
      source: "un_sdg",
      indicatorCode: "11.1.1",
      indicatorName: "Proportion of urban population living in slums (%)",
      category: "infrastructure",
      countryCode: "LA",
      countryName: "Lao PDR",
      year: 2020,
      value: 31.4,
      unit: "Percentage",
    });
    expect(records[0]?.footnote).toContain("Location: Urban");
    expect(records[0]?.footnote).toContain("Nature: Global monitoring data");
    expect(records[1]?.footnote).toContain("Modelled estimate");
    expect(records.map((record) => record.year)).toEqual([2020, 2018, 2016]);
  });

  it("normalizes raw UN SDG series-code requests", async () => {
    server.use(unSdgSeriesHandler());
    const records = await fetchUnSdgIndicator("VC_HTF_DETV");

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: "UN_SDG:VC_HTF_DETV",
      source: "un_sdg",
      indicatorCode: "16.2.2",
      indicatorName: "Detected victims of human trafficking (number)",
      category: "governance",
      year: 2022,
      value: 42,
      unit: "Number",
    });
    expect(records[0]?.footnote).toContain("Detected victims only");
  });

  it("accepts dash-normalized SDG indicator codes", async () => {
    server.use(unSdgDataHandler());
    const records = await fetchUnSdgIndicator("11-1-1");
    expect(records[0]?.indicatorCode).toBe("11.1.1");
  });

  it("returns [] when the UN SDG API has no Lao records for an indicator", async () => {
    server.use(unSdgEmptyHandler());
    await expect(fetchUnSdgIndicator("16.1.1")).resolves.toEqual([]);
  });

  it("throws DataParseError on malformed response", async () => {
    server.use(http.get(UN_SDG_INDICATOR_DATA_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchUnSdgIndicator("11.1.1")).rejects.toBeInstanceOf(DataParseError);
  });

  it("maps transport failures to SourceUnavailableError", async () => {
    server.use(http.get(UN_SDG_INDICATOR_DATA_URL, () => new HttpResponse(null, { status: 503 })));
    await expect(fetchUnSdgIndicator("11.1.1")).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(unSdgDataHandler(() => (hits += 1)));

    await fetchUnSdgIndicator("11.1.1", 2016, 2020);
    await fetchUnSdgIndicator("11.1.1", 2016, 2020);

    // Two page fetches on the first call, then no network call on the second.
    expect(hits).toBe(2);
  });

  it("uses the series endpoint for non-indicator codes", async () => {
    let hits = 0;
    server.use(unSdgSeriesHandler(() => (hits += 1)));
    await fetchUnSdgIndicator("VC_HTF_DETV");
    expect(hits).toBe(1);
  });
});

describe("searchUnSdgIndicators", () => {
  it("returns curated matches by name/category/code", () => {
    expect(searchUnSdgIndicators("housing")[0]?.code).toBe("11.1.1");
    expect(searchUnSdgIndicators("crime").length).toBeGreaterThanOrEqual(1);
    expect(searchUnSdgIndicators("16.2.2")[0]?.name).toContain("trafficking");
  });

  it("returns [] when no curated indicator matches", () => {
    expect(searchUnSdgIndicators("zzznomatch")).toEqual([]);
  });
});
