import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import type { Category } from "../catalog/types.js";
import { DataParseError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.un_sdg.baseUrl;
const LAO_M49 = "418";

export interface UnSdgIndicatorMeta {
  code: string;
  name: string;
  category: Category;
  unit?: string;
}

/** Curated global SDG indicators covering food, agriculture, housing, community, crime, and law. */
export const KEY_UN_SDG_INDICATORS: UnSdgIndicatorMeta[] = [
  {
    code: "2.1.2",
    name: "Food insecurity experience scale: moderate or severe food insecurity",
    category: "nutrition",
    unit: "%",
  },
  {
    code: "2.2.1",
    name: "Child stunting among children under 5",
    category: "nutrition",
    unit: "%",
  },
  {
    code: "2.2.2",
    name: "Child wasting and overweight among children under 5",
    category: "nutrition",
    unit: "%",
  },
  {
    code: "2.3.1",
    name: "Agricultural production per labour unit",
    category: "agriculture",
  },
  {
    code: "2.3.2",
    name: "Average income of small-scale food producers",
    category: "agriculture",
  },
  {
    code: "2.4.1",
    name: "Agricultural area under productive and sustainable agriculture",
    category: "agriculture",
    unit: "%",
  },
  {
    code: "2.a.1",
    name: "Agriculture orientation index for government expenditures",
    category: "agriculture",
  },
  {
    code: "2.c.1",
    name: "Food price anomalies",
    category: "nutrition",
  },
  {
    code: "11.1.1",
    name: "Urban population living in slums, informal settlements or inadequate housing",
    category: "infrastructure",
    unit: "%",
  },
  {
    code: "11.2.1",
    name: "Population with convenient access to public transport",
    category: "infrastructure",
    unit: "%",
  },
  {
    code: "11.3.2",
    name: "Civil society participation structure in urban planning and management",
    category: "governance",
  },
  {
    code: "11.7.1",
    name: "Built-up area that is open space for public use",
    category: "infrastructure",
    unit: "%",
  },
  {
    code: "11.7.2",
    name: "Victims of harassment in the previous 12 months",
    category: "governance",
    unit: "%",
  },
  {
    code: "11.a.1",
    name: "National urban policies or regional development plans",
    category: "governance",
  },
  {
    code: "16.1.1",
    name: "Victims of intentional homicide",
    category: "governance",
    unit: "per 100,000 population",
  },
  {
    code: "16.1.3",
    name: "Population subjected to physical, psychological, or sexual violence",
    category: "governance",
    unit: "%",
  },
  {
    code: "16.1.4",
    name: "Population feeling safe walking alone after dark",
    category: "governance",
    unit: "%",
  },
  {
    code: "16.2.2",
    name: "Detected victims of human trafficking",
    category: "governance",
    unit: "per 100,000 population",
  },
  {
    code: "16.3.2",
    name: "Unsentenced detainees as a proportion of prison population",
    category: "governance",
    unit: "%",
  },
  {
    code: "16.5.1",
    name: "Persons asked for or paying bribes to public officials",
    category: "governance",
    unit: "%",
  },
  {
    code: "16.5.2",
    name: "Firms asked for or paying bribes to public officials",
    category: "governance",
    unit: "%",
  },
  {
    code: "16.6.2",
    name: "Population satisfied with public services",
    category: "governance",
    unit: "%",
  },
  {
    code: "16.10.2",
    name: "Public access to information guarantees",
    category: "governance",
  },
  {
    code: "16.a.1",
    name: "Independent national human rights institutions",
    category: "governance",
  },
  {
    code: "5.1.1",
    name: "Legal frameworks that promote, enforce, and monitor gender equality",
    category: "gender",
  },
  {
    code: "1.4.2",
    name: "Secure tenure rights to land",
    category: "governance",
    unit: "%",
  },
];

interface UnSdgCode {
  code?: string;
  description?: string;
}

interface UnSdgMetadataBlock {
  id?: string;
  codes?: UnSdgCode[];
}

interface UnSdgRow {
  goal?: string[];
  target?: string[];
  indicator?: string[];
  series?: string;
  seriesDescription?: string;
  geoAreaCode?: string;
  geoAreaName?: string;
  timePeriodStart?: number | string;
  value?: string | number | null;
  source?: string | null;
  footnotes?: string[];
  attributes?: Record<string, string>;
  dimensions?: Record<string, string>;
}

interface UnSdgDataResponse {
  size?: number;
  totalElements?: number;
  totalPages?: number;
  pageNumber?: number;
  attributes?: UnSdgMetadataBlock[];
  dimensions?: UnSdgMetadataBlock[];
  data?: UnSdgRow[];
}

function isIndicatorCode(code: string): boolean {
  return /^\d{1,2}\.(?:\d+|[a-z])\.\d+$/i.test(code);
}

function normalizeCode(code: string): string {
  const trimmed = code.trim();
  const dotted = trimmed.replace(/-/g, ".");
  return isIndicatorCode(dotted) ? dotted.toLowerCase() : trimmed.toUpperCase();
}

function categoryFor(goal: string | undefined, indicator: string | undefined): Category {
  if (goal === "2") {
    if (indicator?.startsWith("2.1") || indicator?.startsWith("2.2") || indicator === "2.c.1") {
      return "nutrition";
    }
    return "agriculture";
  }
  if (goal === "11") {
    if (indicator === "11.6.2") return "environment";
    if (indicator?.startsWith("11.1") || indicator?.startsWith("11.2")) return "infrastructure";
    return "governance";
  }
  if (goal === "16") return "governance";
  if (goal === "5") return "gender";
  if (goal === "1") return "governance";
  return "governance";
}

function metadataLookup(
  blocks: UnSdgMetadataBlock[] | undefined,
): Map<string, Map<string, string>> {
  const lookup = new Map<string, Map<string, string>>();
  for (const block of blocks ?? []) {
    if (!block.id) continue;
    const codes = new Map<string, string>();
    for (const item of block.codes ?? []) {
      if (item.code) codes.set(item.code, item.description ?? item.code);
    }
    lookup.set(block.id, codes);
  }
  return lookup;
}

function valueDescription(
  lookup: Map<string, Map<string, string>>,
  dimension: string,
  code: string,
): string {
  return lookup.get(dimension)?.get(code) ?? code;
}

function unitFor(
  row: UnSdgRow,
  attributeLookup: Map<string, Map<string, string>>,
): string | undefined {
  const code = row.attributes?.["Units"];
  if (!code) return undefined;
  return valueDescription(attributeLookup, "Units", code);
}

function parseValue(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return null;
}

function footnoteFor(
  row: UnSdgRow,
  attributeLookup: Map<string, Map<string, string>>,
  dimensionLookup: Map<string, Map<string, string>>,
): string | undefined {
  const parts: string[] = [];

  for (const [key, code] of Object.entries(row.dimensions ?? {})) {
    if (code.startsWith("ALL") || code === "_T" || code === "NOCITI") continue;
    parts.push(`${key}: ${valueDescription(dimensionLookup, key, code)}`);
  }

  const nature = row.attributes?.["Nature"];
  if (nature) parts.push(`Nature: ${valueDescription(attributeLookup, "Nature", nature)}`);

  if (row.source) parts.push(`Source: ${row.source}`);

  for (const note of row.footnotes ?? []) {
    const trimmed = note.trim();
    if (trimmed) parts.push(trimmed);
  }

  return parts.length > 0 ? parts.join("; ") : undefined;
}

function normalizeRows(response: UnSdgDataResponse, requestedCode: string): IndicatorRecord[] {
  if (!Array.isArray(response.data)) {
    throw new DataParseError("un_sdg", JSON.stringify(response).slice(0, 200));
  }

  const attributes = metadataLookup(response.attributes);
  const dimensions = metadataLookup(response.dimensions);
  const retrievedAt = new Date().toISOString();
  const records: IndicatorRecord[] = [];

  for (const row of response.data) {
    if (row.geoAreaCode !== LAO_M49) continue;
    const year = Number(row.timePeriodStart);
    if (!Number.isInteger(year) || year < 1960 || year > 2030) continue;

    const indicator =
      row.indicator?.[0] ?? (isIndicatorCode(requestedCode) ? requestedCode : undefined);
    const series = row.series ?? requestedCode;
    records.push({
      id: `UN_SDG:${series}`,
      source: "un_sdg",
      indicatorCode: indicator ?? series,
      indicatorName: row.seriesDescription ?? series,
      category: categoryFor(row.goal?.[0], indicator),
      countryCode: COUNTRY_CODE,
      countryName: COUNTRY_NAME,
      year,
      value: parseValue(row.value),
      unit: unitFor(row, attributes),
      footnote: footnoteFor(row, attributes, dimensions),
      retrievedAt,
    });
  }

  records.sort(
    (a, b) =>
      b.year - a.year ||
      a.indicatorCode.localeCompare(b.indicatorCode) ||
      a.indicatorName.localeCompare(b.indicatorName),
  );
  return records;
}

async function fetchPage(code: string, page: number, pageSize: number): Promise<UnSdgDataResponse> {
  const isIndicator = isIndicatorCode(code);
  const url = `${BASE}/${isIndicator ? "Indicator" : "Series"}/Data`;
  const data = await httpGet<UnSdgDataResponse>("un_sdg", url, {
    params: {
      [isIndicator ? "indicator" : "seriesCode"]: code,
      areaCode: LAO_M49,
      page,
      pageSize,
    },
  });
  if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
    throw new DataParseError("un_sdg", JSON.stringify(data).slice(0, 200));
  }
  return data;
}

/** Fetch a UN global SDG indicator or series for Lao PDR. */
export async function fetchUnSdgIndicator(
  code: string,
  startYear = 1960,
  endYear = 2030,
): Promise<IndicatorRecord[]> {
  const normalized = normalizeCode(code);
  const pageSize = 1_000;

  return cache.getOrSet("un_sdg", ["data", normalized, startYear, endYear], async () => {
    const first = await fetchPage(normalized, 1, pageSize);
    let rows = normalizeRows(first, normalized);
    const totalPages = Number(first.totalPages ?? 1);

    for (let page = 2; page <= totalPages; page += 1) {
      const next = await fetchPage(normalized, page, pageSize);
      rows = rows.concat(normalizeRows(next, normalized));
    }

    return rows.filter((record) => record.year >= startYear && record.year <= endYear);
  });
}

/** Search the curated UN SDG indicator list by code/name/category substring. */
export function searchUnSdgIndicators(query: string): UnSdgIndicatorMeta[] {
  const q = query.trim().toLowerCase();
  const aliases = new Map([
    ["crime", "governance"],
    ["justice", "governance"],
    ["law", "governance"],
    ["legal", "governance"],
    ["community", "governance"],
    ["housing", "infrastructure"],
    ["food", "nutrition"],
  ]);
  const terms = [q, aliases.get(q)].filter((term): term is string => Boolean(term));
  return KEY_UN_SDG_INDICATORS.filter((indicator) => {
    const haystack = `${indicator.code} ${indicator.name} ${indicator.category}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  }).slice(0, 50);
}

/** Lightweight reachability probe used by get_source_status. */
export async function pingUnSdg(): Promise<boolean> {
  try {
    const data = await fetchPage("11.1.1", 1, 1);
    return Array.isArray(data.data);
  } catch {
    return false;
  }
}
