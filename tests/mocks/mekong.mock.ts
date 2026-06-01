import { http, HttpResponse } from "msw";

export const MEKONG_BASE = "https://data.laos.opendevelopmentmekong.net/api/3/action";
export const MEKONG_SEARCH_URL = `${MEKONG_BASE}/package_search`;

export const mekongSearchResponse = {
  success: true,
  result: {
    count: 3,
    results: [
      {
        id: "abc-123",
        name: "rice-production-by-province",
        title: "Rice production by province",
        notes: "Annual rice output by province.",
        title_translated: { en: "Rice production by province", lo: "ການຜະລິດເຂົ້າ" },
        tags: [{ name: "agriculture", display_name: "Agriculture" }, { name: "rice" }],
        resources: [
          { format: "CSV", url: "https://example.org/rice.csv" },
          { format: "csv", url: "https://example.org/rice2.csv" },
          { format: "XLSX", url: "https://example.org/rice.xlsx" },
        ],
        metadata_modified: "2023-05-01T00:00:00",
        license_title: "CC-BY-4.0",
      },
      {
        id: "def-456",
        name: "forest-cover",
        title: "Forest cover",
        notes_translated: { en: "Forest cover over time." },
        tags: [{ name: "environment" }],
        resources: [{ format: "XLSX", url: "https://example.org/forest.xlsx" }],
        metadata_modified: "2022-01-01T00:00:00",
        license_title: null,
      },
      {
        // No resources -> downloadUrl should fall back to the dataset page URL.
        id: "ghi-789",
        name: "land-use",
        title: "Land use",
        tags: [],
        resources: [],
        metadata_modified: "2021-01-01T00:00:00",
      },
    ],
  },
};

export function mekongSearchHandler(onHit?: () => void) {
  return http.get(MEKONG_SEARCH_URL, () => {
    onHit?.();
    return HttpResponse.json(mekongSearchResponse);
  });
}
