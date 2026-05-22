import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.faostat.baseUrl;
const LAOS_AREA = 116; // FAOSTAT area code for Lao PDR

/** Supported FAOSTAT domains and the category each maps to. */
export const FAOSTAT_DOMAINS = {
  QCL: { label: "Crops and livestock products", category: "agriculture" },
  FBS: { label: "Food balances", category: "nutrition" },
  FS: { label: "Food security indicators", category: "nutrition" },
  RL: { label: "Land use", category: "agriculture" },
  FO: { label: "Forestry production and trade", category: "environment" },
} as const;

export type FaostatDomain = keyof typeof FAOSTAT_DOMAINS;
export const FAOSTAT_DOMAIN_IDS = Object.keys(FAOSTAT_DOMAINS) as FaostatDomain[];

type FaostatRow = Record<string, unknown>;
interface FaostatResponse {
  data?: FaostatRow[];
}

/** Read the first present, non-empty string field from a row (tolerant of casing). */
function field(row: FaostatRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return undefined;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export interface FaostatQuery {
  item?: string;
  startYear?: number;
  endYear?: number;
}

/**
 * Fetch a FAOSTAT domain for Lao PDR, normalized to IndicatorRecord[]. `item`
 * filters server-side when it is numeric item code(s), otherwise client-side by
 * item name/code substring.
 */
export async function fetchFaostatDomain(
  domain: FaostatDomain,
  query: FaostatQuery = {},
): Promise<IndicatorRecord[]> {
  const startYear = query.startYear ?? 2010;
  const endYear = query.endYear ?? new Date().getFullYear();
  const item = query.item?.trim();

  return cache.getOrSet("faostat", ["domain", domain, item ?? "", startYear, endYear], async () => {
    const years: string[] = [];
    for (let y = startYear; y <= endYear; y++) years.push(String(y));
    const params: Record<string, string> = {
      area: String(LAOS_AREA),
      output_type: "objects",
      year: years.join(","),
    };
    const itemIsCode = item !== undefined && /^[0-9,]+$/.test(item);
    if (item && itemIsCode) params.item = item;

    const data = await httpGet<FaostatResponse>("faostat", `${BASE}/en/data/${domain}`, {
      params,
    });
    if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
      throw new DataParseError("faostat", JSON.stringify(data).slice(0, 200));
    }

    const category = FAOSTAT_DOMAINS[domain].category;
    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = [];
    for (const row of data.data) {
      const year = Number(field(row, "Year", "Year Code", "year"));
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
      const itemName = field(row, "Item", "item") ?? "";
      const itemCode = field(row, "Item Code", "Item Code (CPC)", "item_code") ?? "";
      const element = field(row, "Element", "element") ?? "";
      const elementCode = field(row, "Element Code", "element_code") ?? "";

      if (item && !itemIsCode) {
        const haystack = `${itemName} ${itemCode}`.toLowerCase();
        if (!haystack.includes(item.toLowerCase())) continue;
      }

      records.push({
        id: `FAOSTAT:${domain}:${itemCode}:${elementCode}`,
        source: "faostat",
        indicatorCode: `${domain}:${elementCode}:${itemCode}`,
        indicatorName:
          [itemName, element].filter(Boolean).join(" — ") || `${domain} ${elementCode}`,
        category,
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year,
        value: toNumber(row["Value"] ?? row["value"]),
        unit: field(row, "Unit", "unit"),
        footnote: field(row, "Flag", "flag"),
        retrievedAt,
      });
    }
    records.sort((a, b) => b.year - a.year);
    return records.slice(0, 2000);
  });
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingFaostat(): Promise<boolean> {
  try {
    const data = await httpGet<unknown>("faostat", `${BASE}/en/domains`, {});
    return data !== null && typeof data === "object";
  } catch {
    return false;
  }
}
