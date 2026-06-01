import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchHdxHapi, searchHdxDatasets } from "../../src/adapters/hdx.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, SourceUnavailableError } from "../../src/utils/errors.js";
import { HAPI_POP_URL, hapiPopHandler, hdxCkanHandler } from "../mocks/hdx.mock.js";

const server = setupServer();
const prevAppId = process.env.HDX_APP_ID;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  if (prevAppId === undefined) delete process.env.HDX_APP_ID;
  else process.env.HDX_APP_ID = prevAppId;
});
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("searchHdxDatasets (CKAN, no auth)", () => {
  it("normalizes HDX datasets", async () => {
    server.use(hdxCkanHandler());
    const datasets = await searchHdxDatasets("roads");
    expect(datasets[0]).toMatchObject({ id: "hdx:lao-roads", source: "hdx" });
    expect(datasets[0]?.formats).toContain("GEOJSON");
  });
});

describe("fetchHdxHapi (HAPI, needs app id)", () => {
  it("throws SourceUnavailableError when HDX_APP_ID is not set", async () => {
    delete process.env.HDX_APP_ID;
    await expect(fetchHdxHapi("population")).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("normalizes HAPI rows when HDX_APP_ID is set", async () => {
    process.env.HDX_APP_ID = "test-app-id";
    server.use(hapiPopHandler());
    const records = await fetchHdxHapi("population");
    expect(records).toHaveLength(2);
    const total = records.find((r) => r.footnote === undefined);
    expect(total).toMatchObject({
      source: "hdx",
      category: "demography",
      countryCode: "LA",
      year: 2020,
      value: 7_000_000,
    });
    const female = records.find((r) => r.footnote?.includes("gender=female"));
    expect(female?.value).toBe(3_500_000);
  });

  it("throws DataParseError on a malformed HAPI response", async () => {
    process.env.HDX_APP_ID = "test-app-id";
    server.use(http.get(HAPI_POP_URL, () => HttpResponse.json({ nope: true })));
    await expect(fetchHdxHapi("population")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical HAPI call from cache", async () => {
    process.env.HDX_APP_ID = "test-app-id";
    let hits = 0;
    server.use(hapiPopHandler(() => (hits += 1)));
    await fetchHdxHapi("population");
    await fetchHdxHapi("population");
    expect(hits).toBe(1);
  });
});
