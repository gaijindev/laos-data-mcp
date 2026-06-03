import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.imf.baseUrl;
const ISO3 = "LAO";

/** Curated key IMF WEO indicators for Lao PDR. */
export const KEY_MACRO_INDICATORS: Array<{ code: string; name: string }> = [
  { code: "NGDP_RPCH", name: "Real GDP growth (annual %)" },
  { code: "PCPIPCH", name: "Inflation, average consumer prices (annual %)" },
  { code: "GGXWDG_NGDP", name: "General government gross debt (% of GDP)" },
  { code: "BCA_NGDPD", name: "Current account balance (% of GDP)" },
  { code: "PPPGDP", name: "GDP, PPP (billions of international $)" },
];

interface ImfMeta {
  label?: string;
  unit?: string;
}
interface ImfResponse {
  indicators?: Record<string, ImfMeta>;
  values?: Record<string, Record<string, Record<string, number | null>>>;
}

export interface ImfQuery {
  startYear?: number;
  endYear?: number;
}

/**
 * Fetch an IMF DataMapper (WEO) indicator for Lao PDR. The API ignores the
 * country path segment and returns all countries, so LAO is extracted
 * client-side. Forecast years beyond 2030 are dropped to fit the schema.
 */
export async function fetchImfIndicator(
  code: string,
  query: ImfQuery = {},
): Promise<IndicatorRecord[]> {
  const c = code.trim();
  const startYear = query.startYear ?? 2000;
  const endYear = query.endYear ?? new Date().getFullYear();

  return cache.getOrSet("imf", ["data", c, startYear, endYear], async () => {
    const data = await httpGet<ImfResponse>("imf", `${BASE}/${encodeURIComponent(c)}/${ISO3}`, {});
    if (!data || typeof data !== "object" || !data.values) {
      throw new DataParseError("imf", JSON.stringify(data).slice(0, 200));
    }
    const series = data.values[c]?.[ISO3];
    if (!series || typeof series !== "object") return [];

    const meta = data.indicators?.[c];
    const name = meta?.label ?? c;
    const unit = meta?.unit;
    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = [];
    for (const [yearStr, raw] of Object.entries(series)) {
      const year = Number(yearStr);
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
      if (year < startYear || year > endYear) continue;
      const num = typeof raw === "number" ? raw : raw == null ? null : Number(raw);
      records.push({
        id: `IMF:${c}`,
        source: "imf",
        indicatorCode: c,
        indicatorName: name,
        category: "economy",
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year,
        value: num != null && Number.isFinite(num) ? num : null,
        unit,
        retrievedAt,
      });
    }
    records.sort((a, b) => b.year - a.year);
    return records;
  });
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingImf(): Promise<boolean> {
  try {
    const data = await httpGet<ImfResponse>("imf", `${BASE}/indicators/NGDP_RPCH`, {});
    return data !== null && typeof data === "object" && Boolean(data.indicators);
  } catch {
    return false;
  }
}
