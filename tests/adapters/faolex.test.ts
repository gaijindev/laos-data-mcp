import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { searchFaolexLegalTexts } from "../../src/adapters/faolex.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError, SourceUnavailableError } from "../../src/utils/errors.js";
import { FAOLEX_QUERY_URL, faolexEmptyHandler, faolexHandler } from "../mocks/faolex.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("searchFaolexLegalTexts", () => {
  it("normalizes FAOLEX legal-text search results to DatasetMetadata", async () => {
    server.use(faolexHandler());
    const datasets = await searchFaolexLegalTexts("mining", "legislation", 5);

    expect(datasets).toHaveLength(1);
    expect(datasets[0]).toMatchObject({
      id: "faolex:LEX-FAOC040791",
      source: "faolex",
      title: "Mining Law, Law No. 04/97/NA.",
      topics: ["Legislation", "Mineral resources", "mining", "Minerals and mining"],
      formats: ["PDF"],
      downloadUrl: "https://faolex.fao.org/docs/pdf/lao40791.pdf",
      lastUpdated: "2022-02-26",
    });
    expect(datasets[0]?.description).toContain("mining management");
  });

  it("scopes and sanitizes the upstream query body", async () => {
    let sent = "";
    server.use(faolexHandler((body) => (sent = body)));

    await searchFaolexLegalTexts('mining") OR country:("THA', "regulation", 3);

    expect(sent).toContain('country:(\\"LAO\\")');
    expect(sent).toContain('typeOfTextEn:(\\"Regulation\\")');
    expect(sent).not.toContain("THA");
  });

  it("returns [] when no legal texts match", async () => {
    server.use(faolexEmptyHandler());
    await expect(searchFaolexLegalTexts("zzznomatch")).resolves.toEqual([]);
  });

  it("throws DataParseError on malformed response", async () => {
    server.use(http.post(FAOLEX_QUERY_URL, () => HttpResponse.json({ nope: true })));
    await expect(searchFaolexLegalTexts("mining")).rejects.toBeInstanceOf(DataParseError);
  });

  it("maps transport failures to SourceUnavailableError", async () => {
    server.use(http.post(FAOLEX_QUERY_URL, () => new HttpResponse(null, { status: 503 })));
    await expect(searchFaolexLegalTexts("mining")).rejects.toBeInstanceOf(SourceUnavailableError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(faolexHandler(() => (hits += 1)));

    await searchFaolexLegalTexts("mining", "all", 10);
    await searchFaolexLegalTexts("mining", "all", 10);

    expect(hits).toBe(1);
  });
});
