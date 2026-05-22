import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchAdbDatasets } from "../../src/adapters/adb.js";
import { cache } from "../../src/cache/manager.js";
import { SourceUnavailableError } from "../../src/utils/errors.js";

const ADB_SEARCH_URL = "https://data.adb.org/api/3/action/package_search";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchAdbDatasets (Cloudflare-protected)", () => {
  it("maps a Cloudflare HTML interstitial (HTTP 200) to SourceUnavailableError", async () => {
    server.use(
      http.get(ADB_SEARCH_URL, () =>
        HttpResponse.html(
          "<!DOCTYPE html><html><head><title>Just a moment...</title></head><body></body></html>",
        ),
      ),
    );
    await expect(fetchAdbDatasets("agriculture")).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("maps an HTTP 403 challenge to SourceUnavailableError", async () => {
    server.use(http.get(ADB_SEARCH_URL, () => new HttpResponse(null, { status: 403 })));
    await expect(fetchAdbDatasets("agriculture")).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("normalizes results on the rare occasion the JSON API is reachable", async () => {
    server.use(
      http.get(ADB_SEARCH_URL, () =>
        HttpResponse.json({
          success: true,
          result: {
            count: 1,
            results: [
              {
                id: "key-ind",
                name: "lao-pdr-key-indicators",
                title: "Lao PDR Key Indicators",
                tags: [{ name: "economy" }],
                resources: [{ format: "CSV", url: "https://data.adb.org/x.csv" }],
                metadata_modified: "2024-01-01T00:00:00",
              },
            ],
          },
        }),
      ),
    );
    const datasets = await fetchAdbDatasets("key indicators");
    expect(datasets[0]).toMatchObject({ id: "adb:lao-pdr-key-indicators", source: "adb" });
  });
});
