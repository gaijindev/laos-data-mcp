import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchMekongDatasets } from "../../src/adapters/mekong.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { MEKONG_SEARCH_URL, mekongSearchHandler } from "../mocks/mekong.mock.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchMekongDatasets", () => {
  it("normalizes CKAN packages into DatasetMetadata", async () => {
    server.use(mekongSearchHandler());
    const datasets = await fetchMekongDatasets("rice");
    expect(datasets).toHaveLength(3);

    const rice = datasets[0]!;
    expect(rice).toMatchObject({
      id: "mekong:rice-production-by-province",
      source: "mekong",
      title: "Rice production by province",
      description: "Annual rice output by province.",
      license: "CC-BY-4.0",
      downloadUrl: "https://example.org/rice.csv",
    });
    expect(rice.topics).toContain("Agriculture");
    // formats deduped + uppercased
    expect([...rice.formats].sort()).toEqual(["CSV", "XLSX"]);
  });

  it("falls back to the dataset page URL when a package has no resources", async () => {
    server.use(mekongSearchHandler());
    const datasets = await fetchMekongDatasets("rice");
    const landUse = datasets.find((d) => d.id === "mekong:land-use");
    expect(landUse?.downloadUrl).toBe(
      "https://data.laos.opendevelopmentmekong.net/dataset/land-use",
    );
    expect(landUse?.formats).toEqual([]);
  });

  it("throws DataParseError when CKAN reports success:false", async () => {
    server.use(http.get(MEKONG_SEARCH_URL, () => HttpResponse.json({ success: false })));
    await expect(fetchMekongDatasets("rice")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(mekongSearchHandler(() => (hits += 1)));
    await fetchMekongDatasets("rice", 10);
    await fetchMekongDatasets("rice", 10);
    expect(hits).toBe(1);
  });
});
