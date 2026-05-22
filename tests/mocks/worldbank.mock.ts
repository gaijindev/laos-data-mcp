import { http, HttpResponse } from "msw";

export const WB_INDICATOR_URL = "https://api.worldbank.org/v2/country/LA/indicator/:code";

/** Shape mirrors the live World Bank response: [paging, observations]. */
export const wbPopulationResponse = [
  { page: 1, pages: 1, per_page: 1000, total: 3, sourceid: "2", lastupdated: "2026-04-08" },
  [
    {
      indicator: { id: "SP.POP.TOTL", value: "Population, total" },
      country: { id: "LA", value: "Lao PDR" },
      countryiso3code: "LAO",
      date: "2022",
      value: 7_559_007,
      unit: "",
      obs_status: "",
      decimal: 0,
    },
    {
      indicator: { id: "SP.POP.TOTL", value: "Population, total" },
      country: { id: "LA", value: "Lao PDR" },
      countryiso3code: "LAO",
      date: "2021",
      value: 7_453_194,
      unit: "",
      obs_status: "",
      decimal: 0,
    },
    {
      indicator: { id: "SP.POP.TOTL", value: "Population, total" },
      country: { id: "LA", value: "Lao PDR" },
      countryiso3code: "LAO",
      date: "2020",
      value: null,
      unit: "",
      obs_status: "",
      decimal: 0,
    },
  ],
];

/** World Bank's envelope for an unknown indicator code. */
export const wbInvalidResponse = [
  { message: [{ id: "120", key: "Invalid value", value: "The provided parameter value is not valid" }] },
];

/** Valid indicator, but no observations in range. */
export const wbEmptyResponse = [{ page: 1, pages: 0, per_page: 1000, total: 0 }, null];

/** Success handler that optionally counts how many times it was hit. */
export function wbSuccessHandler(onHit?: () => void) {
  return http.get(WB_INDICATOR_URL, () => {
    onHit?.();
    return HttpResponse.json(wbPopulationResponse);
  });
}
