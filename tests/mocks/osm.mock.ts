import { http, HttpResponse } from "msw";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const overpassHospitalsResponse = {
  version: 0.6,
  generator: "Overpass API",
  elements: [
    {
      type: "node",
      id: 1,
      lat: 17.9552,
      lon: 102.6208,
      tags: { amenity: "hospital", name: "ໂຮງໝໍ 5 ເມສາ", "name:en": "5 April Hospital" },
    },
    {
      type: "way",
      id: 2,
      center: { lat: 17.97, lon: 102.61 },
      tags: { amenity: "hospital", name: "Mahosot Hospital" },
    },
    // No coordinates -> must be filtered out.
    { type: "node", id: 3, tags: { amenity: "hospital" } },
  ],
};

export function overpassHandler(onHit?: () => void) {
  return http.post(OVERPASS_URL, () => {
    onHit?.();
    return HttpResponse.json(overpassHospitalsResponse);
  });
}
