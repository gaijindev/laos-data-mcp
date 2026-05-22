import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchWorldBankIndicator, isWorldBankCode } from "../../src/adapters/worldbank.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, InvalidIndicatorError, RateLimitError } from "../../src/utils/errors.js";
import {
  WB_INDICATOR_URL,
  wbEmptyResponse,
  wbInvalidResponse,
  wbSuccessHandler,
} from "../mocks/worldbank.mock.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchWorldBankIndicator", () => {
  it("normalizes observations into IndicatorRecord[] (newest first)", async () => {
    server.use(wbSuccessHandler());
    const records = await fetchWorldBankIndicator({
      indicatorCode: "SP.POP.TOTL",
      startYear: 2020,
      endYear: 2022,
    });
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      id: "WB:SP.POP.TOTL",
      source: "worldbank",
      indicatorCode: "SP.POP.TOTL",
      indicatorName: "Population, total",
      category: "demography",
      countryCode: "LA",
      countryName: "Lao PDR",
      year: 2022,
      value: 7_559_007,
    });
    expect(records[0]?.year).toBeGreaterThan(records[2]!.year);
  });

  it("preserves null values for gap years and drops empty units", async () => {
    server.use(wbSuccessHandler());
    const records = await fetchWorldBankIndicator({ indicatorCode: "SP.POP.TOTL" });
    const gap = records.find((r) => r.year === 2020);
    expect(gap?.value).toBeNull();
    expect(records[0]?.unit).toBeUndefined();
  });

  it("throws InvalidIndicatorError for an unknown code", async () => {
    server.use(http.get(WB_INDICATOR_URL, () => HttpResponse.json(wbInvalidResponse)));
    await expect(fetchWorldBankIndicator({ indicatorCode: "NOT.A.CODE" })).rejects.toBeInstanceOf(
      InvalidIndicatorError,
    );
  });

  it("returns [] when the indicator has no observations", async () => {
    server.use(http.get(WB_INDICATOR_URL, () => HttpResponse.json(wbEmptyResponse)));
    await expect(fetchWorldBankIndicator({ indicatorCode: "SP.POP.TOTL" })).resolves.toEqual([]);
  });

  it("throws DataParseError on a malformed (non-array) response", async () => {
    server.use(http.get(WB_INDICATOR_URL, () => HttpResponse.json({ unexpected: true })));
    await expect(fetchWorldBankIndicator({ indicatorCode: "SP.POP.TOTL" })).rejects.toBeInstanceOf(
      DataParseError,
    );
  });

  it("maps HTTP 429 to RateLimitError after retries", async () => {
    server.use(http.get(WB_INDICATOR_URL, () => new HttpResponse(null, { status: 429 })));
    await expect(fetchWorldBankIndicator({ indicatorCode: "SP.POP.TOTL" })).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("serves the second identical call from cache (no second HTTP request)", async () => {
    let hits = 0;
    server.use(wbSuccessHandler(() => (hits += 1)));
    const args = { indicatorCode: "SP.POP.TOTL", startYear: 2020, endYear: 2022 };
    await fetchWorldBankIndicator(args);
    await fetchWorldBankIndicator(args);
    expect(hits).toBe(1);
  });
});

describe("isWorldBankCode", () => {
  it("recognizes WDI-style codes", () => {
    expect(isWorldBankCode("SP.POP.TOTL")).toBe(true);
    expect(isWorldBankCode("NY.GDP.PCAP.CD")).toBe(true);
  });
  it("rejects non-WDI strings", () => {
    expect(isWorldBankCode("NUTRITION:stunting")).toBe(false);
    expect(isWorldBankCode("population")).toBe(false);
  });
});
