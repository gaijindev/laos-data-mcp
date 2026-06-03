import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchUnicefWelfare } from "../../src/adapters/unicef.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { decodeSdmxJson, type SdmxMessage } from "../../src/utils/sdmx.js";
import {
  DATA_URL,
  nutritionData,
  nutritionDsd,
  UNICEF_BASE,
  unicefHandlers,
} from "../mocks/unicef.mock.js";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

describe("decodeSdmxJson", () => {
  it("maps observation indices to the right (unsorted) years", () => {
    const obs = decodeSdmxJson(nutritionData as unknown as SdmxMessage);
    const stuntingTotal = obs.filter(
      (o) =>
        o.indicatorCode === "NT_ANT_HAZ_NE2" &&
        o.dimensions.SEX?.id === "_T" &&
        o.dimensions.RESIDENCE?.id === "_T",
    );
    expect(stuntingTotal.find((o) => o.year === 2021)?.value).toBe(33.1);
    expect(stuntingTotal.find((o) => o.year === 2020)?.value).toBe(33.0);
  });

  it("returns [] for a structure-less message", () => {
    expect(decodeSdmxJson({} as SdmxMessage)).toEqual([]);
  });
});

describe("fetchUnicefWelfare", () => {
  it("returns national totals only for disaggregation=none", async () => {
    server.use(...unicefHandlers());
    const records = await fetchUnicefWelfare("nutrition", { disaggregation: "none" });
    // stunting (2 years) + breastfeeding (1 year) = 3 total-only records
    expect(records).toHaveLength(3);
    const stunting2021 = records.find(
      (r) => r.indicatorCode === "NUTRITION:NT_ANT_HAZ_NE2" && r.year === 2021,
    );
    expect(stunting2021).toMatchObject({
      id: "UNICEF:NUTRITION:NT_ANT_HAZ_NE2",
      source: "unicef",
      category: "nutrition",
      countryCode: "LA",
      countryName: "Lao PDR",
      value: 33.1,
    });
    // no disaggregated rows leaked in
    expect(records.every((r) => r.footnote === undefined)).toBe(true);
  });

  it("includes sex breakdowns (with footnote) for disaggregation=sex", async () => {
    server.use(...unicefHandlers());
    const records = await fetchUnicefWelfare("nutrition", { disaggregation: "sex" });
    const female = records.find((r) => r.footnote?.includes("sex=Female"));
    expect(female).toBeDefined();
    expect(female?.indicatorName).toContain("[sex=Female]");
    // rural row (RESIDENCE=R) must be excluded under sex disaggregation
    expect(records.some((r) => r.footnote?.includes("area=Rural"))).toBe(false);
  });

  it("caches: a repeated identical call makes no second data request", async () => {
    let dataHits = 0;
    server.use(...unicefHandlers({ onData: () => (dataHits += 1) }));
    await fetchUnicefWelfare("nutrition", { disaggregation: "none" });
    await fetchUnicefWelfare("nutrition", { disaggregation: "none" });
    expect(dataHits).toBe(1);
  });

  it("throws DataParseError when the data response is not SDMX", async () => {
    server.use(
      http.get(`${UNICEF_BASE}/dataflow/UNICEF/*`, () => HttpResponse.json(nutritionDsd)),
      http.get(DATA_URL, () => HttpResponse.json({ error: "boom" })),
    );
    await expect(fetchUnicefWelfare("nutrition")).rejects.toBeInstanceOf(DataParseError);
  });
});
