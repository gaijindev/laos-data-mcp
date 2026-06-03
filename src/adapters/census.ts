import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";

/**
 * Lao Population & Housing Census adapter — STUB.
 *
 * The latest fully published census is 2015. This adapter bundles its headline
 * summary figures (from LSB publications) and flags that the 2025 Census results
 * are expected Q1–Q2 2026 from lsb.gov.la. Setting CENSUS_2025_AVAILABLE=true
 * switches on the (not-yet-implemented) updated-data path.
 *
 * TODO(census-2025): when 2025 results are published, add them and gate behind
 * census2025Available().
 */

const CENSUS_DATA_YEAR = 2015;

interface CensusFigure {
  code: string;
  name: string;
  category: string;
  topic: string;
  value: number;
  unit?: string;
}

/** Headline figures from the 2015 Lao Population & Housing Census. */
const CENSUS_2015: CensusFigure[] = [
  {
    code: "POP_TOTAL",
    name: "Total population (2015 Census)",
    category: "demography",
    topic: "population",
    value: 6_492_228,
    unit: "people",
  },
  {
    code: "POP_MALE",
    name: "Male population (2015 Census)",
    category: "demography",
    topic: "population sex",
    value: 3_237_458,
    unit: "people",
  },
  {
    code: "POP_FEMALE",
    name: "Female population (2015 Census)",
    category: "demography",
    topic: "population sex",
    value: 3_254_770,
    unit: "people",
  },
  {
    code: "POP_GROWTH",
    name: "Average annual population growth rate (2005–2015)",
    category: "demography",
    topic: "growth",
    value: 1.45,
    unit: "%",
  },
  {
    code: "POP_DENSITY",
    name: "Population density (2015 Census)",
    category: "demography",
    topic: "density",
    value: 27,
    unit: "people per km²",
  },
  {
    code: "URBAN_SHARE",
    name: "Urban population share (2015 Census)",
    category: "demography",
    topic: "urban",
    value: 33.1,
    unit: "%",
  },
  {
    code: "HH_SIZE",
    name: "Average household size (2015 Census)",
    category: "demography",
    topic: "household",
    value: 5.3,
    unit: "people",
  },
  {
    code: "LITERACY_15",
    name: "Literacy rate, population 15+ (2015 Census)",
    category: "education",
    topic: "literacy education",
    value: 84.7,
    unit: "%",
  },
];

export function census2025Available(): boolean {
  return process.env.CENSUS_2025_AVAILABLE?.trim().toLowerCase() === "true";
}

export interface CensusResult {
  records: IndicatorRecord[];
  note: string;
}

function buildNote(requestedYear?: number): string {
  const base = "Figures are from the 2015 Lao Population & Housing Census (LSB).";
  const wantsFuture = requestedYear !== undefined && requestedYear >= 2025;
  if (wantsFuture) {
    return census2025Available()
      ? `${base} CENSUS_2025_AVAILABLE is set, but 2025 figures are not yet bundled (stub) — check lsb.gov.la.`
      : `The 2025 Census results are expected Q1–Q2 2026 from lsb.gov.la; showing 2015 figures. ${base}`;
  }
  return `${base} (2025 Census results expected Q1–Q2 2026 from lsb.gov.la.)`;
}

/** Return bundled census summary figures, optionally filtered by topic. */
export function getCensusData(topic?: string, year?: number): CensusResult {
  const q = topic?.trim().toLowerCase();
  const retrievedAt = new Date().toISOString();
  const figures = q
    ? CENSUS_2015.filter(
        (f) => f.name.toLowerCase().includes(q) || f.topic.toLowerCase().includes(q),
      )
    : CENSUS_2015;
  const records: IndicatorRecord[] = figures.map((f) => ({
    id: `CENSUS:${f.code}`,
    source: "census",
    indicatorCode: f.code,
    indicatorName: f.name,
    category: f.category,
    countryCode: COUNTRY_CODE,
    countryName: COUNTRY_NAME,
    year: CENSUS_DATA_YEAR,
    value: f.value,
    unit: f.unit,
    retrievedAt,
  }));
  return { records, note: buildNote(year) };
}

/** Bundled data is always available locally. */
export function pingCensus(): Promise<boolean> {
  return Promise.resolve(true);
}
