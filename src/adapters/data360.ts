import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.data360.baseUrl;
const LAO_ISO3 = "LAO";

export interface Data360IndicatorMeta {
  code: string;
  name: string;
  databaseId: string;
  unit?: string;
}

/** Curated World Bank Data360 governance indicators with confirmed Lao coverage. */
export const KEY_DATA360_INDICATORS: Data360IndicatorMeta[] = [
  {
    code: "GOV_WGI_VA",
    name: "Voice and accountability: estimate",
    databaseId: "WB_WGI",
    unit: "-2.5 to 2.5",
  },
  {
    code: "GOV_WGI_PS",
    name: "Political stability and absence of violence/terrorism: estimate",
    databaseId: "WB_WGI",
    unit: "-2.5 to 2.5",
  },
  {
    code: "GOV_WGI_GE",
    name: "Government effectiveness: estimate",
    databaseId: "WB_WGI",
    unit: "-2.5 to 2.5",
  },
  {
    code: "GOV_WGI_RQ",
    name: "Regulatory quality: estimate",
    databaseId: "WB_WGI",
    unit: "-2.5 to 2.5",
  },
  {
    code: "GOV_WGI_RL",
    name: "Rule of law: estimate",
    databaseId: "WB_WGI",
    unit: "-2.5 to 2.5",
  },
  {
    code: "GOV_WGI_CC",
    name: "Control of corruption: estimate",
    databaseId: "WB_WGI",
    unit: "-2.5 to 2.5",
  },
];

interface Data360Row {
  OBS_VALUE?: string | number | null;
  UNIT_MULT?: string | number | null;
  COMMENT_OBS?: string | null;
  OBS_STATUS?: string | null;
  LATEST_DATA?: boolean;
  DATABASE_ID?: string;
  INDICATOR?: string;
  REF_AREA?: string;
  COMP_BREAKDOWN_1?: string;
  TIME_PERIOD?: string | number;
  UNIT_MEASURE?: string | null;
}

interface Data360Response {
  count?: number;
  value?: Data360Row[];
}

function indicatorMeta(code: string): Data360IndicatorMeta | undefined {
  return KEY_DATA360_INDICATORS.find((indicator) => indicator.code === code);
}

function parseCode(raw: string): { databaseId: string; indicatorCode: string } {
  const trimmed = raw.trim().toUpperCase();
  const [head, rest] = trimmed.split(":", 2);
  if (head && rest) return { databaseId: head, indicatorCode: rest };
  const meta = indicatorMeta(trimmed);
  return { databaseId: meta?.databaseId ?? "WB_WGI", indicatorCode: trimmed };
}

function parseValue(row: Data360Row): number | null {
  const raw = row.OBS_VALUE;
  const value =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))
        ? Number(raw)
        : null;
  if (value === null) return null;

  const multiplier =
    typeof row.UNIT_MULT === "number"
      ? row.UNIT_MULT
      : typeof row.UNIT_MULT === "string" && Number.isFinite(Number(row.UNIT_MULT))
        ? Number(row.UNIT_MULT)
        : 0;
  return value * 10 ** multiplier;
}

function footnoteFor(row: Data360Row): string | undefined {
  const parts = [
    row.COMP_BREAKDOWN_1 && row.COMP_BREAKDOWN_1 !== "_Z"
      ? `breakdown=${row.COMP_BREAKDOWN_1}`
      : undefined,
    row.OBS_STATUS ? `status=${row.OBS_STATUS}` : undefined,
    row.LATEST_DATA ? "latest data" : undefined,
    row.COMMENT_OBS ?? undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join("; ") : undefined;
}

/** Fetch a World Bank Data360 governance indicator for Lao PDR. */
export async function fetchData360Indicator(
  code: string,
  startYear = 2000,
  endYear = new Date().getFullYear(),
): Promise<IndicatorRecord[]> {
  const { databaseId, indicatorCode } = parseCode(code);
  const meta = indicatorMeta(indicatorCode);

  return cache.getOrSet(
    "data360",
    ["data", databaseId, indicatorCode, startYear, endYear],
    async () => {
      const data = await httpGet<Data360Response>("data360", `${BASE}/data`, {
        params: {
          DATABASE_ID: databaseId,
          INDICATOR: indicatorCode,
          REF_AREA: LAO_ISO3,
          COMP_BREAKDOWN_1: "WGI_EST",
          timePeriodFrom: startYear,
          timePeriodTo: endYear,
        },
      });

      if (!data || typeof data !== "object" || !Array.isArray(data.value)) {
        throw new DataParseError("data360", JSON.stringify(data).slice(0, 200));
      }

      const retrievedAt = new Date().toISOString();
      const records: IndicatorRecord[] = [];

      for (const row of data.value) {
        if (row.REF_AREA !== LAO_ISO3) continue;
        const year = Number(row.TIME_PERIOD);
        if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
        if (year < startYear || year > endYear) continue;

        records.push({
          id: `DATA360:${databaseId}:${indicatorCode}`,
          source: "data360",
          indicatorCode,
          indicatorName: meta?.name ?? indicatorCode,
          category: "governance",
          countryCode: COUNTRY_CODE,
          countryName: COUNTRY_NAME,
          year,
          value: parseValue(row),
          unit: meta?.unit ?? row.UNIT_MEASURE ?? undefined,
          footnote: footnoteFor(row),
          retrievedAt,
        });
      }

      records.sort((a, b) => b.year - a.year);
      return records;
    },
  );
}

/** Search the curated Data360 indicator list by code/name. */
export function searchData360Indicators(query: string): Data360IndicatorMeta[] {
  const q = query.trim().toLowerCase();
  return KEY_DATA360_INDICATORS.filter(
    (indicator) =>
      indicator.code.toLowerCase().includes(q) || indicator.name.toLowerCase().includes(q),
  ).slice(0, 25);
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingData360(): Promise<boolean> {
  try {
    const records = await fetchData360Indicator("GOV_WGI_RL", 2024, 2024);
    return Array.isArray(records);
  } catch {
    return false;
  }
}
