import { http, HttpResponse } from "msw";

export const UIS_INDICATORS_URL = "https://api.uis.unesco.org/api/public/data/indicators";

export const uisLiteracyResponse = {
  records: [
    {
      indicatorId: "LR.AG15T99",
      geoUnit: "LAO",
      year: 2021,
      value: 84.7,
      magnitude: null,
      qualifier: "UIS_EST",
    },
    {
      indicatorId: "LR.AG15T99",
      geoUnit: "LAO",
      year: 2015,
      value: 79.9,
      magnitude: null,
      qualifier: null,
    },
    {
      indicatorId: "LR.AG15T99",
      geoUnit: "LAO",
      year: 2005,
      value: null,
      magnitude: "NA",
      qualifier: null,
    },
  ],
  hints: [],
  indicatorMetadata: [
    {
      indicatorCode: "LR.AG15T99",
      name: "Adult literacy rate, population 15+ years, both sexes (%)",
      theme: "EDUCATION",
    },
  ],
};

export const uisEmptyResponse = {
  records: [],
  hints: [{ message: "Indicator code 'INVALID' not found." }],
  indicatorMetadata: [],
};

export function uisDataHandler(onHit?: () => void) {
  return http.get(UIS_INDICATORS_URL, () => {
    onHit?.();
    return HttpResponse.json(uisLiteracyResponse);
  });
}
