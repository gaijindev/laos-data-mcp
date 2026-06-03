import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";
import {
  decodeSdmxJson,
  looksLikeSdmx,
  type DecodedObservation,
  type SdmxMessage,
} from "../utils/sdmx.js";

const BASE = SOURCE_META.unicef.baseUrl;
const AGENCY = "UNICEF";
const TOTAL = "_T";

/** Welfare topics exposed by get_laos_welfare_data, mapped to UNICEF dataflows. */
export const TOPIC_DATAFLOWS = {
  education: "EDUCATION",
  nutrition: "NUTRITION",
  health: "MNCH",
  gender: "GENDER",
  wash: "WASH_HOUSEHOLDS",
  demography: "DM",
} as const;

export type WelfareTopic = keyof typeof TOPIC_DATAFLOWS;
export const WELFARE_TOPICS = Object.keys(TOPIC_DATAFLOWS) as WelfareTopic[];

const TOPIC_CATEGORY: Record<WelfareTopic, string> = {
  education: "education",
  nutrition: "nutrition",
  health: "health",
  gender: "gender",
  wash: "wash",
  demography: "demography",
};

/** Category lookup for dataflows that may arrive via get_laos_indicator. */
const FLOW_CATEGORY: Record<string, string> = {
  EDUCATION: "education",
  NUTRITION: "nutrition",
  MNCH: "health",
  IMMUNISATION: "health",
  CME: "health",
  GENDER: "gender",
  WASH_HOUSEHOLDS: "wash",
  DM: "demography",
};

export type Disaggregation = "sex" | "area" | "wealth" | "none";

interface DsdResponse {
  data?: {
    dataStructures?: Array<{
      dataStructureComponents?: {
        dimensionList?: { dimensions?: Array<{ id?: string; position?: number }> };
      };
    }>;
  };
}

/**
 * The ordered series dimensions of a dataflow (excludes TIME_PERIOD), needed to
 * build a correct positional series key. Cached for a week — dimensionality is
 * very stable.
 */
async function fetchDataflowDimensions(flow: string): Promise<string[]> {
  return cache.getOrSet(
    "unicef",
    ["dims", flow],
    async () => {
      const url = `${BASE}/dataflow/${AGENCY}/${flow}/latest`;
      const json = await httpGet<DsdResponse>("unicef", url, {
        params: { references: "datastructure" },
        headers: { Accept: "application/vnd.sdmx.structure+json" },
      });
      const dims =
        json?.data?.dataStructures?.[0]?.dataStructureComponents?.dimensionList?.dimensions;
      if (!Array.isArray(dims) || dims.length === 0) {
        throw new DataParseError("unicef", `No dimensions found for dataflow ${flow}`);
      }
      return [...dims]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((d) => String(d.id ?? ""))
        .filter((id) => id.length > 0);
    },
    7 * 24 * 3600,
  );
}

/** Build a positional series key, filling REF_AREA=LAO and (optionally) INDICATOR. */
function buildSeriesKey(dims: string[], indicatorId?: string): string {
  return dims
    .map((d) => {
      if (d === "REF_AREA") return COUNTRY_CODE === "LA" ? "LAO" : COUNTRY_CODE;
      if (d === "INDICATOR" && indicatorId) return indicatorId;
      return "";
    })
    .join(".");
}

function isTotal(dimensions: DecodedObservation["dimensions"], dimId: string): boolean {
  const v = dimensions[dimId];
  return !v || v.id === TOTAL;
}

/** Keep series that match the requested disaggregation (totals on the other dims). */
function matchesDisaggregation(
  dimensions: DecodedObservation["dimensions"],
  disagg: Disaggregation,
): boolean {
  switch (disagg) {
    case "sex":
      return isTotal(dimensions, "RESIDENCE") && isTotal(dimensions, "WEALTH_QUINTILE");
    case "area":
      return isTotal(dimensions, "SEX") && isTotal(dimensions, "WEALTH_QUINTILE");
    case "wealth":
      return isTotal(dimensions, "SEX") && isTotal(dimensions, "RESIDENCE");
    case "none":
    default:
      return (
        isTotal(dimensions, "SEX") &&
        isTotal(dimensions, "RESIDENCE") &&
        isTotal(dimensions, "WEALTH_QUINTILE")
      );
  }
}

const DISAGG_LABELS: Array<[string, string]> = [
  ["SEX", "sex"],
  ["RESIDENCE", "area"],
  ["WEALTH_QUINTILE", "wealth"],
  ["AGE", "age"],
];

function toRecord(
  o: DecodedObservation,
  flow: string,
  category: string,
  retrievedAt: string,
): IndicatorRecord {
  const labels: string[] = [];
  for (const [dimId, label] of DISAGG_LABELS) {
    const v = o.dimensions[dimId];
    if (v && v.id !== TOTAL) labels.push(`${label}=${v.name || v.id}`);
  }
  const suffix = labels.length ? ` [${labels.join("; ")}]` : "";
  return {
    id: `UNICEF:${flow}:${o.indicatorCode}`,
    source: "unicef",
    indicatorCode: `${flow}:${o.indicatorCode}`,
    indicatorName: `${o.indicatorName}${suffix}`,
    category,
    countryCode: COUNTRY_CODE,
    countryName: COUNTRY_NAME,
    year: o.year,
    value: o.value,
    footnote: labels.length ? labels.join("; ") : undefined,
    retrievedAt,
  };
}

interface UnicefFlowOptions {
  startYear?: number;
  endYear?: number;
  disaggregation?: Disaggregation;
  indicatorId?: string;
  category: string;
}

async function fetchUnicefFlow(flow: string, opts: UnicefFlowOptions): Promise<IndicatorRecord[]> {
  const startYear = opts.startYear ?? 2000;
  const endYear = opts.endYear ?? new Date().getFullYear();
  const disagg = opts.disaggregation ?? "none";
  const indicatorId = opts.indicatorId ?? "";

  return cache.getOrSet(
    "unicef",
    ["flow", flow, indicatorId, startYear, endYear, disagg],
    async () => {
      const dims = await fetchDataflowDimensions(flow);
      const key = buildSeriesKey(dims, indicatorId);
      const url = `${BASE}/data/${AGENCY},${flow},1.0/${key}`;
      const json = await httpGet<SdmxMessage>("unicef", url, {
        params: { format: "sdmx-json", startPeriod: startYear, endPeriod: endYear },
      });
      if (!looksLikeSdmx(json)) {
        throw new DataParseError("unicef", JSON.stringify(json).slice(0, 200));
      }
      const retrievedAt = new Date().toISOString();
      return decodeSdmxJson(json)
        .filter((o) => matchesDisaggregation(o.dimensions, disagg))
        .filter((o) => !indicatorId || o.indicatorCode === indicatorId)
        .map((o) => toRecord(o, flow, opts.category, retrievedAt))
        .sort((a, b) => b.year - a.year);
    },
  );
}

/** Fetch all (or disaggregated) indicators for a welfare topic. */
export async function fetchUnicefWelfare(
  topic: WelfareTopic,
  opts: { startYear?: number; endYear?: number; disaggregation?: Disaggregation } = {},
): Promise<IndicatorRecord[]> {
  return fetchUnicefFlow(TOPIC_DATAFLOWS[topic], {
    ...opts,
    category: TOPIC_CATEGORY[topic],
  });
}

/**
 * Fetch a single UNICEF indicator by "DATAFLOW:INDICATOR" code (used by
 * get_laos_indicator). A bare dataflow id fetches all of its indicators.
 */
export async function fetchUnicefIndicatorByCode(
  code: string,
  startYear?: number,
  endYear?: number,
): Promise<IndicatorRecord[]> {
  const colon = code.indexOf(":");
  const flow = colon > 0 ? code.slice(0, colon) : code.trim();
  const indicatorId = colon > 0 ? code.slice(colon + 1) : undefined;
  return fetchUnicefFlow(flow, {
    startYear,
    endYear,
    indicatorId,
    category: FLOW_CATEGORY[flow] ?? "health",
  });
}

/** Lightweight health check used by get_source_status. */
export async function pingUnicef(): Promise<boolean> {
  try {
    await fetchDataflowDimensions("NUTRITION");
    return true;
  } catch {
    return false;
  }
}
