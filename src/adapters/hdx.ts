import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import type { DatasetMetadata } from "../schemas/dataset.js";
import { DataParseError, SourceUnavailableError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";
import { ckanPackageSearch, ckanPing, type CkanConfig } from "./ckan.js";

// HDX has two APIs: CKAN (dataset catalog, no auth) and HAPI (indicator values,
// needs a free app_identifier). They live on different hosts.
const CKAN_CONFIG: CkanConfig = {
  source: "hdx",
  baseUrl: "https://data.humdata.org/api/3/action",
};
const HAPI_BASE = "https://hapi.humdata.org/api/v1";

/** HAPI topics -> endpoint path + record category. */
export const HAPI_TOPICS = {
  population: { path: "population-social/population", category: "demography" },
  "food-security": { path: "food-security-nutrition-poverty/food-security", category: "nutrition" },
  poverty: { path: "food-security-nutrition-poverty/poverty-rate", category: "poverty" },
  "operational-presence": {
    path: "coordination-context/operational-presence",
    category: "humanitarian",
  },
  funding: { path: "coordination-context/funding", category: "humanitarian" },
  conflict: { path: "coordination-context/conflict-event", category: "humanitarian" },
} as const;

export type HdxTopic = keyof typeof HAPI_TOPICS;
export const HDX_TOPICS = Object.keys(HAPI_TOPICS) as HdxTopic[];

/** Search the HDX dataset catalog (CKAN), biased toward Lao PDR. */
export function searchHdxDatasets(query: string, maxResults = 10): Promise<DatasetMetadata[]> {
  const trimmed = query.trim();
  const scoped = /\blao\b/i.test(trimmed) ? trimmed : trimmed ? `${trimmed} Lao` : "Lao PDR";
  return ckanPackageSearch(CKAN_CONFIG, scoped, maxResults);
}

export function hdxAppId(): string | undefined {
  const id = process.env.HDX_APP_ID;
  return id && id.trim().length > 0 ? id.trim() : undefined;
}

type HapiRow = Record<string, unknown>;
interface HapiResponse {
  data?: HapiRow[];
}

function firstNumeric(row: HapiRow, keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

const VALUE_KEYS = [
  "population",
  "value",
  "number",
  "percentage",
  "proportion",
  "mpi",
  "headcount_ratio",
  "amount_usd",
  "events",
  "fatalities",
];

function normalizeHapiRow(
  row: HapiRow,
  topic: HdxTopic,
  retrievedAt: string,
): IndicatorRecord | null {
  const start = String(row["reference_period_start"] ?? row["reference_period"] ?? "");
  const year = Number(start.slice(0, 4));
  if (!Number.isInteger(year) || year < 1960 || year > 2030) return null;
  const value = firstNumeric(row, VALUE_KEYS);
  if (value === null) return null;

  const descriptors = [
    String(row["admin1_name"] ?? ""),
    row["gender"] && row["gender"] !== "all" ? `gender=${String(row["gender"])}` : "",
    row["age_range"] && row["age_range"] !== "all" ? `age=${String(row["age_range"])}` : "",
    String(row["sector_name"] ?? row["org_name"] ?? ""),
  ].filter((s) => s.length > 0);
  const footnote = descriptors.length ? descriptors.join("; ") : undefined;

  return {
    id: `HDX:${topic}`,
    source: "hdx",
    indicatorCode: `HAPI:${topic}`,
    indicatorName: footnote ? `${topic} [${footnote}]` : topic,
    category: HAPI_TOPICS[topic].category,
    countryCode: COUNTRY_CODE,
    countryName: COUNTRY_NAME,
    year,
    value,
    footnote,
    retrievedAt,
  };
}

/**
 * Fetch HAPI indicator values for a topic for Lao PDR. Requires HDX_APP_ID
 * (free, no login). Throws SourceUnavailableError when it is not configured.
 */
export async function fetchHdxHapi(topic: HdxTopic, limit = 1000): Promise<IndicatorRecord[]> {
  const appId = hdxAppId();
  if (!appId) {
    throw new SourceUnavailableError(
      "hdx",
      "HAPI requires a free HDX_APP_ID. Generate one (no login) at https://hapi.humdata.org/docs and set HDX_APP_ID. Meanwhile, search_laos_humanitarian_datasets works without it.",
    );
  }
  return cache.getOrSet("hdx", ["hapi", topic, limit], async () => {
    const url = `${HAPI_BASE}/${HAPI_TOPICS[topic].path}`;
    const data = await httpGet<HapiResponse>("hdx", url, {
      params: {
        location_code: "LAO",
        output_format: "json",
        app_identifier: appId,
        limit,
      },
    });
    if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
      throw new DataParseError("hdx", JSON.stringify(data).slice(0, 200));
    }
    const retrievedAt = new Date().toISOString();
    const records = data.data
      .map((row) => normalizeHapiRow(row, topic, retrievedAt))
      .filter((r): r is IndicatorRecord => r !== null);
    records.sort((a, b) => b.year - a.year);
    return records;
  });
}

/** Reachability via the public CKAN catalog (HAPI needs an app id). */
export function pingHdx(): Promise<boolean> {
  return ckanPing(CKAN_CONFIG);
}
