import { http, HttpResponse } from "msw";

export const WHO_LIFEEXP_URL = "https://ghoapi.azureedge.net/api/WHOSIS_000001";
export const WHO_INDICATOR_URL = "https://ghoapi.azureedge.net/api/Indicator";

export const whoLifeExpResponse = {
  value: [
    {
      IndicatorCode: "WHOSIS_000001",
      TimeDimType: "YEAR",
      TimeDim: 2019,
      Dim1Type: "SEX",
      Dim1: "SEX_BTSX",
      NumericValue: 65.3,
    },
    {
      IndicatorCode: "WHOSIS_000001",
      TimeDimType: "YEAR",
      TimeDim: 2019,
      Dim1Type: "SEX",
      Dim1: "SEX_FMLE",
      NumericValue: 67.0,
    },
    {
      IndicatorCode: "WHOSIS_000001",
      TimeDimType: "YEAR",
      TimeDim: 2009,
      Dim1Type: "SEX",
      Dim1: "SEX_BTSX",
      NumericValue: 62.0,
    },
  ],
};

export const whoSearchResponse = {
  value: [
    { IndicatorCode: "WHOSIS_000001", IndicatorName: "Life expectancy at birth (years)" },
    { IndicatorCode: "WHOSIS_000015", IndicatorName: "Life expectancy at age 60 (years)" },
  ],
};

export function whoDataHandler(onHit?: () => void) {
  return http.get(WHO_LIFEEXP_URL, () => {
    onHit?.();
    return HttpResponse.json(whoLifeExpResponse);
  });
}

export function whoSearchHandler() {
  return http.get(WHO_INDICATOR_URL, () => HttpResponse.json(whoSearchResponse));
}
