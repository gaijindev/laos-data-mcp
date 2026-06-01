import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  fetchLsbSdgGoal,
  fetchLsbSdgIndicator,
  listLsbSdgIndicators,
  pingLsbSdg,
} from "../../src/adapters/lsbSdg.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, InvalidIndicatorError } from "../../src/utils/errors.js";
import {
  LSB_SDG_311_URL,
  LSB_SDG_HEADLINE_311_URL,
  lsbSdg411Csv,
  lsbSdg311Handler,
  lsbSdg411Handler,
  lsbSdgPingHandler,
} from "../mocks/lsbSdg.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchLsbSdgIndicator", () => {
  it("normalizes official LSB SDG CSV rows into IndicatorRecord[]", async () => {
    server.use(lsbSdg311Handler());
    const records = await fetchLsbSdgIndicator("3.1.1", 2016, 2019);
    expect(records).toHaveLength(4);
    expect(records[0]).toMatchObject({
      source: "lsb_sdg",
      indicatorCode: "3-1-1",
      indicatorName: "Maternal mortality ratio [3.1.1]",
      category: "health",
      countryCode: "LA",
      countryName: "Lao PDR",
      year: 2019,
      value: 70,
      unit: "Per 100,000 population",
    });
  });

  it("adds CSV disaggregation columns to the footnote and indicator name", async () => {
    server.use(lsbSdg411Handler());
    const records = await fetchLsbSdgIndicator("4-1-1");
    expect(records).toHaveLength(2);
    expect(records[0]?.footnote).toBe("Sex=Female");
    expect(records[0]?.indicatorName).toContain("[Sex=Female]");
  });

  it("throws InvalidIndicatorError for unknown indicator codes", async () => {
    await expect(fetchLsbSdgIndicator("99.9.9")).rejects.toBeInstanceOf(InvalidIndicatorError);
  });

  it("throws DataParseError on a malformed CSV", async () => {
    server.use(http.get(LSB_SDG_311_URL, () => HttpResponse.text("not,a,valid,shape\n1,2,3,4")));
    await expect(fetchLsbSdgIndicator("3-1-1")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(lsbSdg311Handler(() => (hits += 1)));
    await fetchLsbSdgIndicator("3-1-1");
    await fetchLsbSdgIndicator("3-1-1");
    expect(hits).toBe(1);
  });
});

describe("fetchLsbSdgGoal", () => {
  it("fetches all indicators for a goal", async () => {
    server.use(
      http.get("https://sdg-laos.github.io/data-production/en/data/:file", ({ params }) =>
        HttpResponse.text(
          params.file === "4-1-1.csv" ? lsbSdg411Csv : "Year,SERIES,UNIT_MEASURE,Value\n",
          { headers: { "content-type": "text/csv" } },
        ),
      ),
    );
    const records = await fetchLsbSdgGoal(4);
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.indicatorCode === "4-1-1")).toBe(true);
  });
});

describe("listLsbSdgIndicators", () => {
  it("filters by goal and search text", () => {
    const matches = listLsbSdgIndicators({ goal: 18, search: "UXO" });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.code.startsWith("18-"))).toBe(true);
  });
});

describe("pingLsbSdg", () => {
  it("checks the public headline CSV", async () => {
    server.use(lsbSdgPingHandler());
    await expect(pingLsbSdg()).resolves.toBe(true);
  });

  it("returns false when the headline CSV is unavailable", async () => {
    server.use(http.get(LSB_SDG_HEADLINE_311_URL, () => new HttpResponse(null, { status: 503 })));
    await expect(pingLsbSdg()).resolves.toBe(false);
  });
});
