import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.who.baseUrl;

/** Curated key WHO GHO indicators for Lao PDR (codes verified against the API). */
export const KEY_HEALTH_INDICATORS: Array<{ code: string; name: string }> = [
  { code: "WHOSIS_000001", name: "Life expectancy at birth (years)" },
  { code: "MALARIA_EST_INCIDENCE", name: "Estimated malaria incidence (per 1000 at risk)" },
  { code: "MDG_0000000020", name: "Incidence of tuberculosis (per 100,000)" },
  { code: "NCDMORT3070", name: "Probability of dying age 30-70 from NCDs (%)" },
  { code: "HWF_0001", name: "Medical doctors (per 10,000)" },
  { code: "WSH_SANITATION_SAFELY_MANAGED", name: "Safely managed sanitation services (%)" },
];

const KEY_NAMES = new Map(KEY_HEALTH_INDICATORS.map((i) => [i.code, i.name]));

interface WhoRow {
  IndicatorCode?: string;
  TimeDimType?: string | null;
  TimeDim?: number | null;
  Dim1Type?: string | null;
  Dim1?: string | null;
  NumericValue?: number | null;
}

interface WhoResponse {
  value?: WhoRow[];
}

interface WhoIndicatorRow {
  IndicatorCode?: string;
  IndicatorName?: string;
}

/** Disaggregation footnote for a WHO Dim1 (sex etc.); undefined when total/both. */
function dimFootnote(dim1Type?: string | null, dim1?: string | null): string | undefined {
  if (!dim1 || dim1 === "SEX_BTSX") return undefined;
  if (dim1 === "SEX_FMLE") return "sex=Female";
  if (dim1 === "SEX_MLE") return "sex=Male";
  return `${dim1Type ?? "dim"}=${dim1}`;
}

/** Resolve a human-readable indicator name (curated, then cached API lookup). */
async function resolveName(code: string): Promise<string> {
  const known = KEY_NAMES.get(code);
  if (known) return known;
  return cache.getOrSet(
    "who",
    ["name", code],
    async () => {
      try {
        const data = await httpGet<{ value?: WhoIndicatorRow[] }>("who", `${BASE}/Indicator`, {
          params: { $filter: `IndicatorCode eq '${code}'` },
        });
        return data?.value?.[0]?.IndicatorName ?? code;
      } catch {
        return code;
      }
    },
    7 * 24 * 3600,
  );
}

/** Fetch a WHO GHO indicator's values for Lao PDR, normalized to IndicatorRecord[]. */
export async function fetchWhoIndicator(code: string): Promise<IndicatorRecord[]> {
  const c = code.trim();
  return cache.getOrSet("who", ["data", c], async () => {
    const data = await httpGet<WhoResponse>("who", `${BASE}/${encodeURIComponent(c)}`, {
      params: { $filter: "SpatialDim eq 'LAO'" },
    });
    if (!data || typeof data !== "object" || !Array.isArray(data.value)) {
      throw new DataParseError("who", JSON.stringify(data).slice(0, 200));
    }
    if (data.value.length === 0) return [];

    const name = await resolveName(c);
    const retrievedAt = new Date().toISOString();
    const records: IndicatorRecord[] = [];
    for (const row of data.value) {
      if ((row.TimeDimType ?? "YEAR") !== "YEAR") continue;
      const year = Number(row.TimeDim);
      if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;
      const footnote = dimFootnote(row.Dim1Type, row.Dim1);
      records.push({
        id: `WHO:${c}`,
        source: "who",
        indicatorCode: c,
        indicatorName: footnote ? `${name} [${footnote}]` : name,
        category: "health",
        countryCode: COUNTRY_CODE,
        countryName: COUNTRY_NAME,
        year,
        value: typeof row.NumericValue === "number" ? row.NumericValue : null,
        footnote,
        retrievedAt,
      });
    }
    records.sort((a, b) => b.year - a.year);
    return records;
  });
}

/** Search the WHO indicator catalog by name substring. */
export async function searchWhoIndicators(
  query: string,
): Promise<Array<{ code: string; name: string }>> {
  const q = query.trim();
  return cache.getOrSet("who", ["search", q.toLowerCase()], async () => {
    const data = await httpGet<{ value?: WhoIndicatorRow[] }>("who", `${BASE}/Indicator`, {
      params: { $filter: `contains(IndicatorName,'${q.replace(/'/g, "''")}')` },
    });
    if (!data || !Array.isArray(data.value)) {
      throw new DataParseError("who", JSON.stringify(data).slice(0, 200));
    }
    return data.value
      .filter((i): i is Required<WhoIndicatorRow> => Boolean(i.IndicatorCode && i.IndicatorName))
      .map((i) => ({ code: i.IndicatorCode, name: i.IndicatorName }))
      .slice(0, 25);
  });
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingWho(): Promise<boolean> {
  try {
    const data = await httpGet<WhoResponse>("who", `${BASE}/Indicator`, { params: { $top: 1 } });
    return Array.isArray(data?.value);
  } catch {
    return false;
  }
}
