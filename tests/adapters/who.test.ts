import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchWhoIndicator, searchWhoIndicators } from "../../src/adapters/who.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { WHO_LIFEEXP_URL, whoDataHandler, whoSearchHandler } from "../mocks/who.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchWhoIndicator", () => {
  it("normalizes GHO rows, mapping TimeDim->year and Dim1->footnote", async () => {
    server.use(whoDataHandler());
    const records = await fetchWhoIndicator("WHOSIS_000001");
    expect(records).toHaveLength(3);

    const total2019 = records.find((r) => r.year === 2019 && r.footnote === undefined);
    expect(total2019).toMatchObject({
      source: "who",
      category: "health",
      countryCode: "LA",
      value: 65.3,
      indicatorName: "Life expectancy at birth (years)",
    });

    const female = records.find((r) => r.footnote === "sex=Female");
    expect(female?.indicatorName).toContain("[sex=Female]");
    expect(female?.value).toBe(67.0);
  });

  it("returns [] when there is no Laos data", async () => {
    server.use(http.get(WHO_LIFEEXP_URL, () => HttpResponse.json({ value: [] })));
    await expect(fetchWhoIndicator("WHOSIS_000001")).resolves.toEqual([]);
  });

  it("throws DataParseError on a malformed response", async () => {
    server.use(http.get(WHO_LIFEEXP_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchWhoIndicator("WHOSIS_000001")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(whoDataHandler(() => (hits += 1)));
    await fetchWhoIndicator("WHOSIS_000001");
    await fetchWhoIndicator("WHOSIS_000001");
    expect(hits).toBe(1);
  });
});

describe("searchWhoIndicators", () => {
  it("returns matching indicator codes and names", async () => {
    server.use(whoSearchHandler());
    const matches = await searchWhoIndicators("life expectancy");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0]).toEqual({
      code: "WHOSIS_000001",
      name: "Life expectancy at birth (years)",
    });
  });
});
