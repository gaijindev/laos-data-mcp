import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fetchOsmInfrastructure } from "../../src/adapters/osm.js";
import { cache } from "../../src/cache/manager.js";
import { DataParseError } from "../../src/utils/errors.js";
import { OVERPASS_URL, overpassHandler, overpassHospitalsResponse } from "../mocks/osm.mock.js";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => cache.reset());

/** Capture the Overpass query that the adapter posts. */
function capturingHandler(ref: { query: string }) {
  return http.post(OVERPASS_URL, async ({ request }) => {
    const body = await request.text();
    ref.query = new URLSearchParams(body).get("data") ?? "";
    return HttpResponse.json(overpassHospitalsResponse);
  });
}

describe("fetchOsmInfrastructure", () => {
  it("normalizes nodes and ways, dropping features without coordinates", async () => {
    server.use(overpassHandler());
    const result = await fetchOsmInfrastructure("hospital");
    expect(result.featureType).toBe("hospital");
    expect(result.area).toBe("Lao PDR");
    expect(result.count).toBe(2);
    expect(result.features[0]).toMatchObject({ id: 1, osmType: "node", lat: 17.9552 });
    expect(result.features[1]).toMatchObject({ id: 2, osmType: "way", lat: 17.97 });
  });

  it("scopes to a province via a fixed template", async () => {
    const ref = { query: "" };
    server.use(capturingHandler(ref));
    const result = await fetchOsmInfrastructure("school", "Vientiane");
    expect(result.area).toBe("Vientiane");
    expect(ref.query).toContain('["admin_level"="4"]["name"~"Vientiane",i]');
    expect(ref.query).toContain('["amenity"="school"]');
  });

  it("sanitizes province input to prevent Overpass QL injection", async () => {
    const ref = { query: "" };
    server.use(capturingHandler(ref));
    await fetchOsmInfrastructure("hospital", 'Vientiane"];out;//evil');
    // Quotes/brackets/semicolons stripped — the injection can't break the template.
    expect(ref.query).not.toContain('"];out;');
    expect(ref.query).toContain('"Vientianeoutevil"'); // letters kept, specials removed
  });

  it("throws DataParseError when elements are missing", async () => {
    server.use(http.post(OVERPASS_URL, () => HttpResponse.json({ version: 0.6 })));
    await expect(fetchOsmInfrastructure("hospital")).rejects.toBeInstanceOf(DataParseError);
  });

  it("serves the second identical call from cache", async () => {
    let hits = 0;
    server.use(overpassHandler(() => (hits += 1)));
    await fetchOsmInfrastructure("hospital");
    await fetchOsmInfrastructure("hospital");
    expect(hits).toBe(1);
  });
});
