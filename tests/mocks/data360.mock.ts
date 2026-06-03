import { http, HttpResponse } from "msw";

export const DATA360_DATA_URL = "https://data360api.worldbank.org/data360/data";

export const data360RuleOfLawResponse = {
  count: 3,
  value: [
    {
      OBS_VALUE: "-0.636028",
      UNIT_MULT: 0,
      COMMENT_OBS: null,
      OBS_STATUS: "A",
      LATEST_DATA: true,
      DATABASE_ID: "WB_WGI",
      INDICATOR: "GOV_WGI_RL",
      REF_AREA: "LAO",
      COMP_BREAKDOWN_1: "WGI_EST",
      TIME_PERIOD: "2024",
      UNIT_MEASURE: "U",
    },
    {
      OBS_VALUE: "-0.700001",
      UNIT_MULT: 0,
      COMMENT_OBS: "standard error omitted",
      OBS_STATUS: "A",
      LATEST_DATA: false,
      DATABASE_ID: "WB_WGI",
      INDICATOR: "GOV_WGI_RL",
      REF_AREA: "LAO",
      COMP_BREAKDOWN_1: "WGI_EST",
      TIME_PERIOD: "2023",
      UNIT_MEASURE: "U",
    },
    {
      OBS_VALUE: "100",
      UNIT_MULT: -2,
      COMMENT_OBS: null,
      OBS_STATUS: "A",
      LATEST_DATA: false,
      DATABASE_ID: "WB_WGI",
      INDICATOR: "GOV_WGI_RL",
      REF_AREA: "THA",
      COMP_BREAKDOWN_1: "WGI_EST",
      TIME_PERIOD: "2024",
      UNIT_MEASURE: "U",
    },
  ],
};

export const data360EmptyResponse = {
  count: 0,
  value: [],
};

export function data360Handler(onHit?: () => void) {
  return http.get(DATA360_DATA_URL, () => {
    onHit?.();
    return HttpResponse.json(data360RuleOfLawResponse);
  });
}

export function data360EmptyHandler() {
  return http.get(DATA360_DATA_URL, () => HttpResponse.json(data360EmptyResponse));
}
