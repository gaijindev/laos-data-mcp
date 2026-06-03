import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchWfpFoodPrices, resetWfpToken } from "../../src/adapters/wfp.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, SourceUnavailableError } from "../../src/utils/errors.js";
import { WFP_PRICES_URL, wfpPricesHandler, wfpTokenHandler } from "../mocks/wfp.mock.js";

const server = setupServer();
const prevId = process.env.WFP_CLIENT_ID;
const prevSecret = process.env.WFP_CLIENT_SECRET;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  cache.reset();
  resetWfpToken();
  process.env.WFP_CLIENT_ID = "test-id";
  process.env.WFP_CLIENT_SECRET = "test-secret";
});
afterEach(() => {
  server.resetHandlers();
  if (prevId === undefined) delete process.env.WFP_CLIENT_ID;
  else process.env.WFP_CLIENT_ID = prevId;
  if (prevSecret === undefined) delete process.env.WFP_CLIENT_SECRET;
  else process.env.WFP_CLIENT_SECRET = prevSecret;
});
afterAll(() => server.close());

describe("fetchWfpFoodPrices", () => {
  it("throws SourceUnavailableError without credentials", async () => {
    delete process.env.WFP_CLIENT_ID;
    delete process.env.WFP_CLIENT_SECRET;
    resetWfpToken();
    await expect(fetchWfpFoodPrices()).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("authenticates then normalizes price rows", async () => {
    server.use(wfpTokenHandler(), wfpPricesHandler());
    const records = await fetchWfpFoodPrices();
    expect(records).toHaveLength(2);
    const rice = records.find((r) => r.indicatorName.includes("Rice"));
    expect(rice).toMatchObject({
      source: "wfp",
      category: "economy",
      countryCode: "LA",
      year: 2023,
      value: 8500,
      unit: "LAK/KG",
    });
    expect(rice?.footnote).toContain("market=Vientiane");
  });

  it("filters by commodity", async () => {
    server.use(wfpTokenHandler(), wfpPricesHandler());
    const records = await fetchWfpFoodPrices({ commodity: "rice" });
    expect(records).toHaveLength(1);
    expect(records[0]?.indicatorName).toContain("Rice");
  });

  it("reuses a cached token across different queries", async () => {
    let tokenHits = 0;
    let dataHits = 0;
    server.use(
      wfpTokenHandler(() => (tokenHits += 1)),
      wfpPricesHandler(() => (dataHits += 1)),
    );
    await fetchWfpFoodPrices({ commodity: "rice" });
    await fetchWfpFoodPrices({ commodity: "maize" });
    expect(tokenHits).toBe(1);
    expect(dataHits).toBe(2);
  });

  it("refreshes the token when it has expired", async () => {
    let tokenHits = 0;
    server.use(
      wfpTokenHandler(() => (tokenHits += 1), 0),
      wfpPricesHandler(),
    );
    await fetchWfpFoodPrices({ commodity: "rice" });
    await fetchWfpFoodPrices({ commodity: "maize" });
    expect(tokenHits).toBe(2);
  });

  it("throws DataParseError on an unrecognized price payload", async () => {
    server.use(
      wfpTokenHandler(),
      http.get(WFP_PRICES_URL, () => HttpResponse.json({ nope: 1 })),
    );
    await expect(fetchWfpFoodPrices()).rejects.toBeInstanceOf(DataParseError);
  });
});
