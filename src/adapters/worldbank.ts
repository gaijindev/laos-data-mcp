import { cache } from "../cache/manager.js";
import { findCatalogEntry } from "../catalog/index.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError, InvalidIndicatorError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.worldbank.baseUrl;
export const WB_DEFAULT_START_YEAR = 2000;

interface WBObservation {
  indicator?: { id?: string; value?: string };
  country?: { id?: string; value?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | null;
  unit?: string;
}

export interface WorldBankQuery {
  indicatorCode: string;
  startYear?: number;
  endYear?: number;
}

/** True for World Bank-style codes like "SP.POP.TOTL" or "NY.GDP.PCAP.CD". */
export function isWorldBankCode(code: string): boolean {
  return /^[A-Za-z]{2}\.[A-Za-z0-9]+(\.[A-Za-z0-9]+)*$/.test(code.trim());
}

/** Best-effort category from the catalog, falling back to the WDI code prefix. */
function categoryForWorldBank(code: string): string {
  const entry = findCatalogEntry(code);
  if (entry) return entry.category;
  const prefix = (code.split(".")[0] ?? "").toUpperCase();
  switch (prefix) {
    case "SP":
    case "SM":
      return "demography";
    case "SE":
      return "education";
    case "SH":
      return "health";
    case "SN":
      return "nutrition";
    case "SG":
      return "gender";
    case "SI":
      return "poverty";
    case "SL":
      return "labor";
    case "AG":
      return "agriculture";
    case "EG":
      return "energy";
    case "EN":
    case "ER":
      return "environment";
    case "IT":
      return "technology";
    case "IS":
      return "infrastructure";
    case "NE":
    case "TX":
    case "TM":
    case "TG":
      return "trade";
    default:
      return "economy";
  }
}

function parseWorldBankResponse(data: unknown, code: string): IndicatorRecord[] {
  if (!Array.isArray(data)) {
    throw new DataParseError("worldbank", JSON.stringify(data));
  }
  const head: unknown = data[0];
  // Error envelope: [{ message: [{ id, key, value }] }]
  if (head && typeof head === "object" && "message" in head) {
    throw new InvalidIndicatorError(code, "worldbank");
  }
  const rows: unknown = data[1];
  if (rows == null) return [];
  if (!Array.isArray(rows)) {
    throw new DataParseError("worldbank", JSON.stringify(data).slice(0, 300));
  }

  const retrievedAt = new Date().toISOString();
  const records: IndicatorRecord[] = [];
  for (const raw of rows) {
    const row = raw as WBObservation;
    if (!row || typeof row !== "object" || !row.indicator?.id) continue;
    const year = Number(row.date);
    if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
    records.push({
      id: `WB:${row.indicator.id}`,
      source: "worldbank",
      indicatorCode: row.indicator.id,
      indicatorName: row.indicator.value ?? row.indicator.id,
      category: categoryForWorldBank(row.indicator.id),
      countryCode: COUNTRY_CODE,
      countryName: COUNTRY_NAME,
      year,
      value: typeof row.value === "number" ? row.value : null,
      unit: row.unit ? row.unit : undefined,
      retrievedAt,
    });
  }
  records.sort((a, b) => b.year - a.year); // newest first
  return records;
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingWorldBank(): Promise<boolean> {
  try {
    const data = await httpGet<unknown>("worldbank", `${BASE}/country/${COUNTRY_CODE}`, {
      params: { format: "json" },
    });
    return Array.isArray(data);
  } catch {
    return false;
  }
}

/**
 * Fetch a World Bank indicator time series for Lao PDR, normalized to
 * IndicatorRecord[]. Cached per (code, startYear, endYear) with the World Bank
 * TTL. Throws InvalidIndicatorError for unknown codes and SourceUnavailableError
 * when the API is unreachable.
 */
export async function fetchWorldBankIndicator(query: WorldBankQuery): Promise<IndicatorRecord[]> {
  const code = query.indicatorCode.trim();
  const startYear = query.startYear ?? WB_DEFAULT_START_YEAR;
  const endYear = query.endYear ?? new Date().getFullYear();

  return cache.getOrSet("worldbank", ["indicator", code, startYear, endYear], async () => {
    const url = `${BASE}/country/${COUNTRY_CODE}/indicator/${encodeURIComponent(code)}`;
    const data = await httpGet<unknown>("worldbank", url, {
      params: { format: "json", date: `${startYear}:${endYear}`, per_page: 1000 },
    });
    return parseWorldBankResponse(data, code);
  });
}
