import { http, HttpResponse } from "msw";

export const UNICEF_BASE = "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest";

/** DSD with 5 ordered series dimensions (REF_AREA first). */
export const nutritionDsd = {
  data: {
    dataStructures: [
      {
        dataStructureComponents: {
          dimensionList: {
            dimensions: [
              { id: "REF_AREA", position: 1 },
              { id: "INDICATOR", position: 2 },
              { id: "SEX", position: 3 },
              { id: "RESIDENCE", position: 4 },
              { id: "WEALTH_QUINTILE", position: 5 },
            ],
          },
        },
      },
    ],
  },
};

/**
 * SDMX-JSON data: 2 indicators, with SEX=F and RESIDENCE=R disaggregations.
 * TIME_PERIOD values are intentionally unsorted so tests prove obs-index→year
 * mapping (index 0 → "2021", index 1 → "2020").
 */
export const nutritionData = {
  meta: { id: "TEST", prepared: "2026-05-22T00:00:00", sender: { id: "UNICEF" } },
  data: {
    structure: {
      dimensions: {
        series: [
          { id: "REF_AREA", name: "Geographic area", values: [{ id: "LAO", name: "Lao PDR" }] },
          {
            id: "INDICATOR",
            name: "Indicator",
            values: [
              { id: "NT_ANT_HAZ_NE2", name: "Stunting" },
              { id: "NT_BF_EXBF", name: "Exclusive breastfeeding" },
            ],
          },
          {
            id: "SEX",
            name: "Sex",
            values: [
              { id: "_T", name: "Total" },
              { id: "F", name: "Female" },
              { id: "M", name: "Male" },
            ],
          },
          {
            id: "RESIDENCE",
            name: "Residence",
            values: [
              { id: "_T", name: "Total" },
              { id: "R", name: "Rural" },
            ],
          },
          { id: "WEALTH_QUINTILE", name: "Wealth Quintile", values: [{ id: "_T", name: "Total" }] },
        ],
        observation: [
          { id: "TIME_PERIOD", name: "Time period", values: [{ id: "2021" }, { id: "2020" }] },
        ],
      },
    },
    dataSets: [
      {
        series: {
          // stunting, all totals
          "0:0:0:0:0": { observations: { "0": ["33.1", 0], "1": ["33.0", 0] } },
          // stunting, female
          "0:0:1:0:0": { observations: { "0": ["32.0", 0] } },
          // stunting, rural
          "0:0:0:1:0": { observations: { "0": ["40.0", 0] } },
          // breastfeeding, all totals
          "0:1:0:0:0": { observations: { "0": ["45.0", 0] } },
        },
      },
    ],
  },
};

export const DSD_URL = `${UNICEF_BASE}/dataflow/UNICEF/*`;
export const DATA_URL = `${UNICEF_BASE}/data/*`;

export function unicefHandlers(opts: { onData?: () => void; data?: unknown } = {}) {
  return [
    http.get(DSD_URL, () => HttpResponse.json(nutritionDsd)),
    http.get(DATA_URL, () => {
      opts.onData?.();
      return HttpResponse.json(opts.data ?? nutritionData);
    }),
  ];
}
