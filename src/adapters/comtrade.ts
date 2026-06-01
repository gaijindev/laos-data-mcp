import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError, InvalidIndicatorError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.comtrade.baseUrl;

/** Laos M49 numeric reporter code. */
const REPORTER_CODE = 418;

/** Optional API key for the full (non-preview) endpoint. */
const API_KEY = process.env.COMTRADE_API_KEY;

/** Curated key UN Comtrade indicators for Lao PDR. */
export const KEY_TRADE_INDICATORS: Array<{ code: string; name: string }> = [
  { code: "LA_TOTAL_EXPORTS", name: "Total merchandise exports, Lao PDR (USD)" },
  { code: "LA_TOTAL_IMPORTS", name: "Total merchandise imports, Lao PDR (USD)" },
  { code: "LA_EXPORTS_BY_PARTNER", name: "Merchandise exports by partner, Lao PDR (USD)" },
  { code: "LA_IMPORTS_BY_PARTNER", name: "Merchandise imports by partner, Lao PDR (USD)" },
];

/** Raw row shape returned by UN Comtrade preview endpoint. */
interface ComtradeRow {
  refYear?: number;
  period?: string;
  reporterISO?: string;
  flowCode?: string;
  flowDesc?: string;
  partnerCode?: number;
  partnerISO?: string;
  partnerDesc?: string;
  cmdCode?: string;
  cmdDesc?: string;
  primaryValue?: number | null;
  isReported?: boolean;
}

interface ComtradeResponse {
  elapsedTime?: unknown;
  count?: number;
  data?: ComtradeRow[];
  error?: string;
}

/** Extra request headers — only include Ocp-Apim-Subscription-Key when key is set. */
function authHeaders(): Record<string, string> {
  return API_KEY ? { "Ocp-Apim-Subscription-Key": API_KEY } : {};
}

/**
 * Build the comma-separated `period` parameter for a year range.
 * Capped at 12 years maximum to stay safely within the 500-row preview limit.
 */
function buildPeriod(startYear: number, endYear: number): string {
  const years: number[] = [];
  const cap = Math.min(endYear, startYear + 11); // at most 12 years
  for (let y = startYear; y <= cap; y++) {
    years.push(y);
  }
  return years.join(",");
}

/**
 * Fetch total EXPORTS or IMPORTS annual time series for Lao PDR from UN Comtrade.
 * Normalized into IndicatorRecord[], sorted descending by year.
 */
async function fetchTotalFlow(
  flowCode: "X" | "M",
  startYear: number,
  endYear: number,
): Promise<IndicatorRecord[]> {
  const period = buildPeriod(startYear, endYear);
  const indicatorCode = flowCode === "X" ? "LA_TOTAL_EXPORTS" : "LA_TOTAL_IMPORTS";
  const indicatorName =
    flowCode === "X"
      ? "Total merchandise exports, Lao PDR (USD)"
      : "Total merchandise imports, Lao PDR (USD)";

  return cache.getOrSet("comtrade", ["total", flowCode, period], async () => {
    const data = await httpGet<ComtradeResponse>("comtrade", `${BASE}/C/A/HS`, {
      params: {
        reporterCode: REPORTER_CODE,
        period,
        flowCode,
        cmdCode: "TOTAL",
        partnerCode: 0,
        partner2Code: 0,
        motCode: 0,
        includeDesc: true,
      },
      headers: authHeaders(),
    });

    if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
      throw new DataParseError("comtrade", JSON.stringify(data).slice(0, 200));
    }

    if (data.data.length === 0) return [];

    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = [];

    for (const row of data.data) {
      const year = Number(row.refYear);
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;

      const footnote = row.isReported === false ? "estimated [UN mirror estimate]" : undefined;

      records.push({
        id: `COMTRADE:${indicatorCode}`,
        source: "comtrade",
        indicatorCode,
        indicatorName,
        category: "trade",
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year,
        value: typeof row.primaryValue === "number" ? row.primaryValue : null,
        unit: "USD",
        footnote,
        retrievedAt,
      });
    }

    records.sort((a, b) => b.year - a.year);
    return records;
  });
}

/**
 * Fetch top-15 partner breakdown for one year and one flow direction.
 * Returns one IndicatorRecord per trading partner, sorted by value descending.
 */
export async function fetchComtradePartners(
  flow: "X" | "M",
  year: number,
): Promise<IndicatorRecord[]> {
  const indicatorCode = flow === "X" ? "LA_EXPORTS_BY_PARTNER" : "LA_IMPORTS_BY_PARTNER";

  return cache.getOrSet("comtrade", ["partners", flow, year], async () => {
    const data = await httpGet<ComtradeResponse>("comtrade", `${BASE}/C/A/HS`, {
      params: {
        reporterCode: REPORTER_CODE,
        period: String(year),
        flowCode: flow,
        cmdCode: "TOTAL",
        partnerCode: 0, // 0 = all partners
        partner2Code: 0,
        motCode: 0,
        includeDesc: true,
      },
      headers: authHeaders(),
    });

    if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
      throw new DataParseError("comtrade", JSON.stringify(data).slice(0, 200));
    }

    if (data.data.length === 0) return [];

    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = [];

    for (const row of data.data) {
      // Skip the aggregated "World" / catch-all row (partnerCode 0) and non-TOTAL cmdCode rows
      if (row.partnerCode === 0) continue;
      if (row.cmdCode !== "TOTAL") continue;

      const partnerName = row.partnerDesc ?? row.partnerISO ?? String(row.partnerCode);
      const direction = flow === "X" ? "exports to" : "imports from";
      const indicatorName = `Merchandise ${direction} ${partnerName}, Lao PDR (USD)`;
      const footnote = [
        `partner=${partnerName}`,
        row.isReported === false ? "[estimated]" : undefined,
      ]
        .filter(Boolean)
        .join(" ");

      records.push({
        id: `COMTRADE:${indicatorCode}`,
        source: "comtrade",
        indicatorCode,
        indicatorName,
        category: "trade",
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year,
        value: typeof row.primaryValue === "number" ? row.primaryValue : null,
        unit: "USD",
        footnote,
        retrievedAt,
      });
    }

    // Sort descending by value, keep top 15
    records.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
    return records.slice(0, 15);
  });
}

/**
 * Fetch a UN Comtrade indicator for Lao PDR.
 * Handles LA_TOTAL_EXPORTS and LA_TOTAL_IMPORTS annual time-series.
 * Throws InvalidIndicatorError for unknown codes.
 * Compatible with registerIndicatorFetcher signature.
 */
export async function fetchComtradeIndicator(
  code: string,
  startYear?: number,
  endYear?: number,
): Promise<IndicatorRecord[]> {
  const start = startYear ?? 2010;
  const end = endYear ?? new Date().getFullYear();

  switch (code) {
    case "LA_TOTAL_EXPORTS":
      return fetchTotalFlow("X", start, end);
    case "LA_TOTAL_IMPORTS":
      return fetchTotalFlow("M", start, end);
    default:
      throw new InvalidIndicatorError(code, "comtrade");
  }
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingComtrade(): Promise<boolean> {
  try {
    const currentYear = new Date().getFullYear();
    // Try for 2022 as a recent year that should have data
    const probeYear = Math.min(currentYear - 2, 2022);
    const data = await httpGet<ComtradeResponse>("comtrade", `${BASE}/C/A/HS`, {
      params: {
        reporterCode: REPORTER_CODE,
        period: String(probeYear),
        flowCode: "X",
        cmdCode: "TOTAL",
        partnerCode: 0,
        partner2Code: 0,
        motCode: 0,
        includeDesc: true,
      },
      headers: authHeaders(),
    });
    return data !== null && typeof data === "object" && Array.isArray(data.data);
  } catch {
    return false;
  }
}
