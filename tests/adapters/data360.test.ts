import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchData360Indicator, searchData360Indicators } from "../../src/adapters/data360.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, SourceUnavailableError } from "../../src/utils/errors.js";
import { DATA360_DATA_URL, data360EmptyHandler, data360Handler } from "../mocks/data360.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchData360Indicator", () => {
  it("normalizes Data360 WGI rows for Lao PDR", async () => {
    server.use(data360Handler());
    const records = await fetchData360Indicator("GOV_WGI_RL", 2023, 2024);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      id: "DATA360:WB_WGI:GOV_WGI_RL",
      source: "data360",
      indicatorCode: "GOV_WGI_RL",
      indicatorName: "Rule of law: estimate",
      category: "governance",
      countryCode: "LA",
      countryName: "Lao PDR",
      year: 2024,
      value: -0.636028,
      unit: "-2.5 to 2.5",
    });
    expect(records[0]?.footnote).toContain("breakdown=WGI_EST");
    expect(records[0]?.footnote).toContain("latest data");
    expect(records[1]?.footnote).toContain("standard error omitted");
  });

  it("accepts explicit DATABASE_ID:INDICATOR code form", async () => {
    server.use(data360Handler());
    const records = await fetchData360Indicator("WB_WGI:GOV_WGI_RL", 2024, 2024);
    expect(records[0]?.indicatorCode).toBe("GOV_WGI_RL");
  });

  it("returns [] when the API has no rows", async () => {
    server.use(data360EmptyHandler());
    await expect(fetchData360Indicator("GOV_WGI_RL")).resolves.toEqual([]);
  });

  it("throws DataParseError on malformed response", async () => {
    server.use(http.get(DATA360_DATA_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchData360Indicator("GOV_WGI_RL")).rejects.toBeInstanceOf(DataParseError);
  });

  it("maps transport failures to SourceUnavailableError", async () => {
    server.use(http.get(DATA360_DATA_URL, () => new HttpResponse(null, { status: 503 })));
    await expect(fetchData360Indicator("GOV_WGI_RL")).rejects.toBeInstanceOf(
      SourceUnavailableError,
    );
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(data360Handler(() => (hits += 1)));

    await fetchData360Indicator("GOV_WGI_RL", 2023, 2024);
    await fetchData360Indicator("GOV_WGI_RL", 2023, 2024);

    expect(hits).toBe(1);
  });
});

describe("searchData360Indicators", () => {
  it("returns curated matches by code or name", () => {
    expect(searchData360Indicators("rule")[0]?.code).toBe("GOV_WGI_RL");
    expect(searchData360Indicators("GOV_WGI_CC")[0]?.name).toContain("corruption");
  });

  it("returns [] when no curated indicator matches", () => {
    expect(searchData360Indicators("zzznomatch")).toEqual([]);
  });
});
