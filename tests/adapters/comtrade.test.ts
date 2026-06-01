import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  fetchComtradeIndicator,
  fetchComtradePartners,
  pingComtrade,
} from "../../src/adapters/comtrade.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, InvalidIndicatorError } from "../../src/utils/errors.js";
import {
  COMTRADE_URL,
  comtradeTotalExportsHandler,
  comtradePartnersHandler,
} from "../mocks/comtrade.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

// ---------------------------------------------------------------------------
// fetchComtradeIndicator — TOTAL flow (time series)
// ---------------------------------------------------------------------------

describe("fetchComtradeIndicator — LA_TOTAL_EXPORTS", () => {
  it("normalizes rows: year, value USD, indicatorCode LA_TOTAL_EXPORTS, sorted desc", async () => {
    server.use(comtradeTotalExportsHandler());
    const records = await fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022);

    expect(records).toHaveLength(2);
    // Sorted descending by year
    expect(records[0]!.year).toBe(2022);
    expect(records[1]!.year).toBe(2021);

    const rec2022 = records[0]!;
    expect(rec2022).toMatchObject({
      source: "comtrade",
      indicatorCode: "LA_TOTAL_EXPORTS",
      indicatorName: "Total merchandise exports, Lao PDR (USD)",
      category: "trade",
      countryCode: "LA",
      countryName: "Lao PDR",
      year: 2022,
      value: 8_123_456_789,
      unit: "USD",
    });
    // isReported=true → no estimated footnote
    expect(rec2022.footnote).toBeUndefined();
  });

  it("adds estimated footnote when isReported is false", async () => {
    server.use(comtradeTotalExportsHandler());
    const records = await fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022);

    const rec2021 = records.find((r) => r.year === 2021);
    expect(rec2021).toBeDefined();
    expect(rec2021!.footnote).toMatch(/estimated/i);
  });

  it("id is prefixed COMTRADE:<indicatorCode>", async () => {
    server.use(comtradeTotalExportsHandler());
    const records = await fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022);
    expect(records[0]!.id).toBe("COMTRADE:LA_TOTAL_EXPORTS");
  });

  it("returns [] when data array is empty", async () => {
    server.use(
      http.get(COMTRADE_URL, () => HttpResponse.json({ count: 0, data: [], error: "" })),
    );
    const records = await fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022);
    expect(records).toEqual([]);
  });

  it("throws DataParseError when response is malformed (no data array)", async () => {
    server.use(http.get(COMTRADE_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022)).rejects.toBeInstanceOf(
      DataParseError,
    );
  });

  it("throws DataParseError when response is not an object", async () => {
    server.use(http.get(COMTRADE_URL, () => HttpResponse.json(null)));
    await expect(fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022)).rejects.toBeInstanceOf(
      DataParseError,
    );
  });

  it("serves the second identical call from cache (handler called only once)", async () => {
    let hits = 0;
    server.use(comtradeTotalExportsHandler(() => (hits += 1)));

    await fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022);
    await fetchComtradeIndicator("LA_TOTAL_EXPORTS", 2021, 2022);
    expect(hits).toBe(1);
  });

  it("throws InvalidIndicatorError for unknown indicator codes", async () => {
    // No server handler needed — the error is thrown before any HTTP call
    await expect(fetchComtradeIndicator("UNKNOWN_CODE")).rejects.toBeInstanceOf(
      InvalidIndicatorError,
    );
  });
});

describe("fetchComtradeIndicator — LA_TOTAL_IMPORTS", () => {
  it("normalizes import rows with indicatorCode LA_TOTAL_IMPORTS", async () => {
    server.use(comtradeTotalExportsHandler()); // handler branches on flowCode=M
    const records = await fetchComtradeIndicator("LA_TOTAL_IMPORTS", 2021, 2022);

    expect(records).toHaveLength(2);
    expect(records[0]!.indicatorCode).toBe("LA_TOTAL_IMPORTS");
    expect(records[0]!.indicatorName).toContain("imports");
    expect(records[0]!.year).toBe(2022);
    expect(records[0]!.value).toBe(5_987_654_321);
  });
});

// ---------------------------------------------------------------------------
// fetchComtradePartners — partner breakdown
// ---------------------------------------------------------------------------

describe("fetchComtradePartners", () => {
  it("returns partner records sorted by value descending, skipping partnerCode=0", async () => {
    server.use(comtradePartnersHandler());
    const records = await fetchComtradePartners("X", 2022);

    // partnerCode=0 (World aggregate) should be excluded
    expect(records.every((r) => r.footnote?.includes("partner="))).toBe(true);
    expect(records.some((r) => r.footnote?.includes("World"))).toBe(false);

    // Should be sorted by value desc
    expect(records[0]!.value).toBeGreaterThanOrEqual(records[1]!.value!);
    expect(records[0]!.value).toBe(3_500_000_000); // China
    expect(records[1]!.value).toBe(2_200_000_000); // Thailand
    expect(records[2]!.value).toBe(1_100_000_000); // Viet Nam
  });

  it("includes partner name in footnote", async () => {
    server.use(comtradePartnersHandler());
    const records = await fetchComtradePartners("X", 2022);

    const china = records.find((r) => r.footnote?.includes("China"));
    expect(china).toBeDefined();
    expect(china!.indicatorCode).toBe("LA_EXPORTS_BY_PARTNER");
    expect(china!.indicatorName).toContain("China");
  });

  it("adds [estimated] tag in footnote when isReported is false", async () => {
    server.use(comtradePartnersHandler());
    const records = await fetchComtradePartners("X", 2022);

    const thailand = records.find((r) => r.footnote?.includes("Thailand"));
    expect(thailand).toBeDefined();
    expect(thailand!.footnote).toContain("[estimated]");
  });

  it("all records have source=comtrade, category=trade, countryCode=LA, unit=USD", async () => {
    server.use(comtradePartnersHandler());
    const records = await fetchComtradePartners("X", 2022);

    for (const r of records) {
      expect(r.source).toBe("comtrade");
      expect(r.category).toBe("trade");
      expect(r.countryCode).toBe("LA");
      expect(r.countryName).toBe("Lao PDR");
      expect(r.unit).toBe("USD");
    }
  });

  it("keeps at most 15 results", async () => {
    server.use(comtradePartnersHandler());
    const records = await fetchComtradePartners("X", 2022);
    expect(records.length).toBeLessThanOrEqual(15);
  });

  it("returns [] when data is empty", async () => {
    server.use(
      http.get(COMTRADE_URL, () => HttpResponse.json({ count: 0, data: [], error: "" })),
    );
    const records = await fetchComtradePartners("X", 2022);
    expect(records).toEqual([]);
  });

  it("throws DataParseError on malformed response", async () => {
    server.use(http.get(COMTRADE_URL, () => HttpResponse.json({ malformed: "yes" })));
    await expect(fetchComtradePartners("X", 2022)).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(comtradePartnersHandler(() => (hits += 1)));

    await fetchComtradePartners("X", 2022);
    await fetchComtradePartners("X", 2022);
    expect(hits).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// pingComtrade
// ---------------------------------------------------------------------------

describe("pingComtrade", () => {
  it("returns true when data array is present", async () => {
    server.use(comtradeTotalExportsHandler());
    const ok = await pingComtrade();
    expect(ok).toBe(true);
  });

  it("returns false when the endpoint throws", async () => {
    server.use(http.get(COMTRADE_URL, () => HttpResponse.error()));
    const ok = await pingComtrade();
    expect(ok).toBe(false);
  });

  it("returns false when response is malformed", async () => {
    server.use(http.get(COMTRADE_URL, () => HttpResponse.json({ bad: "data" })));
    const ok = await pingComtrade();
    expect(ok).toBe(false);
  });
});
