import { http, HttpResponse } from "msw";

export const HDX_CKAN_URL = "https://data.humdata.org/api/3/action/package_search";
export const HAPI_POP_URL = "https://hapi.humdata.org/api/v1/population-social/population";

export const hdxCkanResponse = {
  success: true,
  result: {
    count: 1,
    results: [
      {
        id: "abc",
        name: "lao-roads",
        title: "Lao People's Democratic Republic: Road Surface Data",
        tags: [{ name: "transport" }, { name: "roads" }],
        resources: [{ format: "GeoJSON", url: "https://data.humdata.org/x.geojson" }],
        metadata_modified: "2024-01-01T00:00:00",
        organization: { title: "HeiGIT" },
      },
    ],
  },
};

export const hapiPopResponse = {
  data: [
    {
      population: 7_000_000,
      reference_period_start: "2020-01-01T00:00:00",
      admin1_name: "",
      gender: "all",
      age_range: "all",
    },
    {
      population: 3_500_000,
      reference_period_start: "2020-01-01T00:00:00",
      gender: "female",
    },
  ],
};

export function hdxCkanHandler() {
  return http.get(HDX_CKAN_URL, () => HttpResponse.json(hdxCkanResponse));
}

export function hapiPopHandler(onHit?: () => void) {
  return http.get(HAPI_POP_URL, () => {
    onHit?.();
    return HttpResponse.json(hapiPopResponse);
  });
}
