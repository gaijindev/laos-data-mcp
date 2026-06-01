import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.uis.baseUrl;
const ISO3 = "LAO";

/** Curated key UNESCO UIS education indicators for Lao PDR (codes verified against the API). */
export const KEY_EDUCATION_INDICATORS: Array<{ code: string; name: string }> = [
  { code: "LR.AG15T99", name: "Adult literacy rate, population 15+ years, both sexes (%)" },
  { code: "LR.AG15T24", name: "Youth literacy rate, population 15-24 years, both sexes (%)" },
  { code: "NERT.1.CP", name: "Total net enrolment rate, primary, both sexes (%)" },
  { code: "NERT.2.CP", name: "Total net enrolment rate, lower secondary, both sexes (%)" },
  { code: "NERT.3.CP", name: "Total net enrolment rate, upper secondary, both sexes (%)" },
  {
    code: "ROFST.1.CP",
    name: "Out-of-school rate for children of primary school age, both sexes (%)",
  },
  {
    code: "MYS.1T8.AG25T99",
    name: "Mean years of schooling (ISCED 1+), population 25+ years, both sexes",
  },
  { code: "XGDP.FSGOV", name: "Government expenditure on education as a percentage of GDP (%)" },
];

interface UisRecord {
  indicatorId: string;
  geoUnit: string;
  year: number;
  value: number | null;
  magnitude: string | null;
  qualifier: string | null;
}

interface UisIndicatorMeta {
  indicatorCode: string;
  name: string;
  theme?: string;
}

interface UisResponse {
  records?: UisRecord[];
  hints?: unknown[];
  indicatorMetadata?: UisIndicatorMeta[];
}

/** Parse the unit from the trailing parenthetical of an indicator name, e.g. "(%)". */
function parseUnit(name: string): string | undefined {
  const match = /\(([^)]+)\)$/.exec(name.trim());
  return match ? match[1] : undefined;
}

/** Map a UIS qualifier code to a human-readable footnote. */
function qualifierFootnote(qualifier: string | null): string | undefined {
  if (qualifier === "UIS_EST") return "UIS estimate";
  if (qualifier === "NAT_EST") return "National estimate";
  return undefined;
}

/** The magnitudes that force a null value. */
const NULL_MAGNITUDES = new Set(["NA", "SUPP", "INCLUDED"]);

/** Fetch a UNESCO UIS indicator's values for Lao PDR, normalized to IndicatorRecord[]. */
export async function fetchUisIndicator(
  code: string,
  startYear?: number,
  endYear?: number,
): Promise<IndicatorRecord[]> {
  const c = code.trim().toUpperCase();
  const sy = startYear ?? 2000;
  const ey = endYear ?? new Date().getFullYear();

  return cache.getOrSet("uis", ["data", c, sy, ey], async () => {
    const data = await httpGet<UisResponse>("uis", `${BASE}/data/indicators`, {
      params: { geoUnit: ISO3, indicator: c, indicatorMetadata: true },
    });

    if (!data || typeof data !== "object" || !Array.isArray(data.records)) {
      throw new DataParseError("uis", JSON.stringify(data).slice(0, 200));
    }

    // Empty records with hints = unknown/bad code
    if (data.records.length === 0) return [];

    // Build metadata lookup
    const metaMap = new Map<string, UisIndicatorMeta>();
    if (Array.isArray(data.indicatorMetadata)) {
      for (const meta of data.indicatorMetadata) {
        if (meta.indicatorCode) metaMap.set(meta.indicatorCode, meta);
      }
    }

    const meta = metaMap.get(c);
    const indicatorName = meta?.name ?? c;
    const unit = meta ? parseUnit(meta.name) : undefined;
    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = [];

    for (const row of data.records) {
      const year = Number(row.year);
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
      if (year < sy || year > ey) continue;

      const value =
        typeof row.value === "number" && Number.isFinite(row.value) && !NULL_MAGNITUDES.has(row.magnitude ?? "")
          ? row.value
          : null;

      records.push({
        id: `UIS:${c}`,
        source: "uis",
        indicatorCode: c,
        indicatorName,
        category: "education",
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year,
        value,
        unit,
        footnote: qualifierFootnote(row.qualifier),
        retrievedAt,
      });
    }

    records.sort((a, b) => b.year - a.year);
    return records;
  });
}

/** Search the curated education indicator list by name/code substring (no network call). */
export async function searchUisIndicators(
  query: string,
): Promise<Array<{ code: string; name: string }>> {
  const q = query.trim().toLowerCase();
  return KEY_EDUCATION_INDICATORS.filter(
    (i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
  ).slice(0, 25);
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingUis(): Promise<boolean> {
  try {
    const data = await httpGet<UisResponse>("uis", `${BASE}/data/indicators`, {
      params: { geoUnit: ISO3, indicator: "LR.AG15T99", indicatorMetadata: false },
    });
    return Array.isArray(data?.records);
  } catch {
    return false;
  }
}
