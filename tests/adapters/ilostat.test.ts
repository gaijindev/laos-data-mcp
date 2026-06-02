import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchIlostatIndicator, searchIlostatIndicators } from "../../src/adapters/ilostat.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import {
  ilostat404Handler,
  ilostatLfprHandler,
  ilostatMalformedHandler,
  ILOSTAT_BASE,
  ILOSTAT_LFPR_DATAFLOW,
} from "../mocks/ilostat.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("fetchIlostatIndicator", () => {
  it("normalizes SDMX-JSON observations: year, value, unit %, country LA", async () => {
    server.use(ilostatLfprHandler());
    const records = await fetchIlostatIndicator(ILOSTAT_LFPR_DATAFLOW);

    expect(records.length).toBeGreaterThanOrEqual(2);

    const rec2022 = records.find((r) => r.year === 2022);
    expect(rec2022).toBeDefined();
    expect(rec2022).toMatchObject({
      source: "ilostat",
      category: "labor",
      countryCode: "LA",
      countryName: "Lao PDR",
      value: 76.8,
      unit: "%",
      indicatorCode: ILOSTAT_LFPR_DATAFLOW,
    });
    expect(rec2022?.indicatorName).toContain("Labour force participation rate");

    const rec2021 = records.find((r) => r.year === 2021);
    expect(rec2021).toBeDefined();
    expect(rec2021?.value).toBe(77.2);
    expect(rec2021?.unit).toBe("%");

    // should be sorted descending by year
    expect(records[0]!.year).toBeGreaterThanOrEqual(records[1]!.year);
  });

  it("returns [] when the upstream responds with HTTP 404", async () => {
    server.use(ilostat404Handler());
    await expect(fetchIlostatIndicator(ILOSTAT_LFPR_DATAFLOW)).resolves.toEqual([]);
  });

  it("throws DataParseError on a malformed SDMX response (missing data.structure)", async () => {
    server.use(ilostatMalformedHandler());
    await expect(fetchIlostatIndicator(ILOSTAT_LFPR_DATAFLOW)).rejects.toBeInstanceOf(
      DataParseError,
    );
  });

  it("serves the second identical call from cache (handler called only once)", async () => {
    let hits = 0;
    server.use(ilostatLfprHandler(() => (hits += 1)));
    await fetchIlostatIndicator(ILOSTAT_LFPR_DATAFLOW);
    await fetchIlostatIndicator(ILOSTAT_LFPR_DATAFLOW);
    expect(hits).toBe(1);
  });

  it("falls back to default key when an unknown code is requested", async () => {
    server.use(
      http.get(new RegExp(`${ILOSTAT_BASE}/data/ILO,UNKNOWN_CODE,1\\.0/`), () =>
        HttpResponse.json({
          data: {
            dataSets: [{ series: {} }],
            structure: {
              name: "Unknown Indicator",
              dimensions: {
                series: [{ id: "REF_AREA", values: [{ id: "LAO", name: "Lao PDR" }] }],
                observation: [{ id: "TIME_PERIOD", values: [] }],
              },
              attributes: { series: [], observation: [] },
            },
          },
        }),
      ),
    );
    const records = await fetchIlostatIndicator("UNKNOWN_CODE");
    expect(Array.isArray(records)).toBe(true);
  });
});

describe("searchIlostatIndicators", () => {
  it("returns matching indicators for a case-insensitive query", async () => {
    const results = await searchIlostatIndicators("unemployment");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toMatchObject({ code: expect.any(String), name: expect.any(String) });
    expect(results[0]!.name.toLowerCase()).toContain("unemployment");
  });

  it("returns matching indicators when searching by partial code", async () => {
    const results = await searchIlostatIndicators("DF_EAP");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.code.includes("DF_EAP"))).toBe(true);
  });

  it("returns [] when no indicators match", async () => {
    const results = await searchIlostatIndicators("zzznomatch");
    expect(results).toEqual([]);
  });
});
