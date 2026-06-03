import { http, HttpResponse } from "msw";

export const UN_SDG_INDICATOR_DATA_URL = "https://unstats.un.org/SDGAPI/v1/sdg/Indicator/Data";
export const UN_SDG_SERIES_DATA_URL = "https://unstats.un.org/SDGAPI/v1/sdg/Series/Data";

export const unSdgHousingResponse = {
  size: 2,
  totalElements: 3,
  totalPages: 2,
  pageNumber: 1,
  attributes: [
    {
      id: "Nature",
      codes: [
        { code: "G", description: "Global monitoring data" },
        { code: "C", description: "Country data" },
      ],
    },
    {
      id: "Units",
      codes: [
        { code: "PERCENT", description: "Percentage" },
        { code: "NUMBER", description: "Number" },
      ],
    },
  ],
  dimensions: [
    {
      id: "Location",
      codes: [
        { code: "URBAN", description: "Urban" },
        { code: "ALLAREA", description: "All areas" },
      ],
    },
    {
      id: "Reporting Type",
      codes: [
        { code: "G", description: "Global" },
        { code: "N", description: "National" },
      ],
    },
  ],
  data: [
    {
      goal: ["11"],
      target: ["11.1"],
      indicator: ["11.1.1"],
      series: "EN_LND_SLUM",
      seriesDescription: "Proportion of urban population living in slums (%)",
      geoAreaCode: "418",
      geoAreaName: "Lao People's Democratic Republic",
      timePeriodStart: 2020.0,
      value: "31.4",
      source: "United Nations Human Settlements Programme (UN-HABITAT)",
      footnotes: [""],
      attributes: { Nature: "G", Units: "PERCENT" },
      dimensions: { Location: "URBAN", "Reporting Type": "G" },
    },
    {
      goal: ["11"],
      target: ["11.1"],
      indicator: ["11.1.1"],
      series: "EN_LND_SLUM",
      seriesDescription: "Proportion of urban population living in slums (%)",
      geoAreaCode: "418",
      geoAreaName: "Lao People's Democratic Republic",
      timePeriodStart: 2018.0,
      value: "34.1",
      source: "United Nations Human Settlements Programme (UN-HABITAT)",
      footnotes: ["Modelled estimate"],
      attributes: { Nature: "G", Units: "PERCENT" },
      dimensions: { Location: "URBAN", "Reporting Type": "G" },
    },
  ],
};

export const unSdgHousingPage2Response = {
  ...unSdgHousingResponse,
  size: 1,
  pageNumber: 2,
  data: [
    {
      goal: ["11"],
      target: ["11.1"],
      indicator: ["11.1.1"],
      series: "EN_LND_SLUM",
      seriesDescription: "Proportion of urban population living in slums (%)",
      geoAreaCode: "418",
      geoAreaName: "Lao People's Democratic Republic",
      timePeriodStart: 2016.0,
      value: "37.2",
      source: "United Nations Human Settlements Programme (UN-HABITAT)",
      footnotes: [""],
      attributes: { Nature: "G", Units: "PERCENT" },
      dimensions: { Location: "URBAN", "Reporting Type": "G" },
    },
  ],
};

export const unSdgSeriesResponse = {
  ...unSdgHousingResponse,
  totalElements: 1,
  totalPages: 1,
  data: [
    {
      goal: ["16"],
      target: ["16.2"],
      indicator: ["16.2.2"],
      series: "VC_HTF_DETV",
      seriesDescription: "Detected victims of human trafficking (number)",
      geoAreaCode: "418",
      geoAreaName: "Lao People's Democratic Republic",
      timePeriodStart: "2022",
      value: "42",
      source: "United Nations Office on Drugs and Crime (UNODC)",
      footnotes: ["Detected victims only"],
      attributes: { Nature: "C", Units: "NUMBER" },
      dimensions: { "Reporting Type": "N" },
    },
  ],
};

export const unSdgEmptyResponse = {
  size: 0,
  totalElements: 0,
  totalPages: 0,
  pageNumber: 1,
  attributes: [],
  dimensions: [],
  data: [],
};

export function unSdgDataHandler(onHit?: () => void) {
  return http.get(UN_SDG_INDICATOR_DATA_URL, ({ request }) => {
    onHit?.();
    const url = new URL(request.url);
    const page = url.searchParams.get("page");
    return HttpResponse.json(page === "2" ? unSdgHousingPage2Response : unSdgHousingResponse);
  });
}

export function unSdgSeriesHandler(onHit?: () => void) {
  return http.get(UN_SDG_SERIES_DATA_URL, () => {
    onHit?.();
    return HttpResponse.json(unSdgSeriesResponse);
  });
}

export function unSdgEmptyHandler() {
  return http.get(UN_SDG_INDICATOR_DATA_URL, () => HttpResponse.json(unSdgEmptyResponse));
}
