import { http, HttpResponse } from "msw";

export const ILOSTAT_BASE = "https://sdmx.ilo.org/rest";
export const ILOSTAT_LFPR_DATAFLOW = "DF_EAP_DWAP_SEX_AGE_RT";
export const ILOSTAT_LFPR_URL = `${ILOSTAT_BASE}/data/ILO,${ILOSTAT_LFPR_DATAFLOW},1.0/LAO.A..SEX_T.AGE_YTHADULT_YGE15`;

/**
 * Realistic SDMX-JSON 1.0 payload for ILOSTAT DF_EAP_DWAP_SEX_AGE_RT (Lao PDR LFPR).
 * Contains 2 observations across 2 years (2021, 2022) with UNIT_MEASURE "PT" (%).
 */
export const ilostatLfprResponse = {
  meta: {
    schema:
      "https://raw.githubusercontent.com/sdmx-twg/sdmx-json/master/data-message/tools/schemas/1.0/sdmx-json-data-schema.json",
    id: "ilo_response",
    prepared: "2024-01-01T00:00:00",
    sender: { id: "ILO" },
  },
  data: {
    dataSets: [
      {
        series: {
          // seriesKey: REF_AREA:0, FREQ:0, MEASURE:0, SEX:0, AGE:0
          "0:0:0:0:0": {
            attributes: [
              0, // UNIT_MEASURE index 0 → "PT"
              0, // UNIT_MULT index 0 → "0" (no multiplication)
            ],
            observations: {
              // obsKey 0 → TIME_PERIOD index 0 → "2021"
              "0": [77.2, null],
              // obsKey 1 → TIME_PERIOD index 1 → "2022"
              "1": [76.8, null],
            },
          },
        },
      },
    ],
    structure: {
      name: "Labour force participation rate by sex and age",
      dimensions: {
        series: [
          {
            id: "REF_AREA",
            name: "Reference area",
            values: [{ id: "LAO", name: "Lao PDR" }],
          },
          {
            id: "FREQ",
            name: "Frequency",
            values: [{ id: "A", name: "Annual" }],
          },
          {
            id: "MEASURE",
            name: "Measure",
            values: [{ id: "EAP_DWAP_RT", name: "Labour force participation rate" }],
          },
          {
            id: "SEX",
            name: "Sex",
            values: [{ id: "SEX_T", name: "Total" }],
          },
          {
            id: "AGE",
            name: "Age",
            values: [{ id: "AGE_YTHADULT_YGE15", name: "15+" }],
          },
        ],
        observation: [
          {
            id: "TIME_PERIOD",
            name: "Time period",
            values: [
              { id: "2021", name: "2021" },
              { id: "2022", name: "2022" },
            ],
          },
        ],
      },
      attributes: {
        series: [
          {
            id: "UNIT_MEASURE",
            name: "Unit of measure",
            values: [{ id: "PT", name: "Percentage" }],
          },
          {
            id: "UNIT_MULT",
            name: "Unit multiplier",
            values: [{ id: "0", name: "Units" }],
          },
        ],
        observation: [],
      },
    },
  },
};

/** A malformed SDMX response (missing data.structure). */
export const ilostatMalformedResponse = {
  data: {
    dataSets: [{ series: {} }],
    // structure is intentionally missing
  },
};

/** MSW handler for a successful ILOSTAT LFPR request. */
export function ilostatLfprHandler(onHit?: () => void) {
  return http.get(new RegExp(`${ILOSTAT_BASE}/data/ILO,${ILOSTAT_LFPR_DATAFLOW},1\\.0/`), () => {
    onHit?.();
    return HttpResponse.json(ilostatLfprResponse);
  });
}

/** MSW handler that returns HTTP 404 (no data). */
export function ilostat404Handler() {
  return http.get(new RegExp(`${ILOSTAT_BASE}/data/ILO,${ILOSTAT_LFPR_DATAFLOW},1\\.0/`), () => {
    return new HttpResponse("Not Found", { status: 404 });
  });
}

/** MSW handler that returns a malformed JSON body. */
export function ilostatMalformedHandler() {
  return http.get(new RegExp(`${ILOSTAT_BASE}/data/ILO,${ILOSTAT_LFPR_DATAFLOW},1\\.0/`), () => {
    return HttpResponse.json(ilostatMalformedResponse);
  });
}
