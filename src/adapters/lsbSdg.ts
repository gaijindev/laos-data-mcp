import { createHash } from "node:crypto";
import { cache } from "../cache/manager.js";
import { COUNTRY_CODE, COUNTRY_NAME, type IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_META } from "../schemas/source.js";
import { DataParseError, InvalidIndicatorError } from "../utils/errors.js";
import { httpGet } from "../utils/http.js";

const BASE = SOURCE_META.lsb_sdg.baseUrl;
const DATA_BASE = `${BASE}/data-production/en`;

export interface LsbSdgIndicatorMeta {
  code: string;
  name: string;
  category:
    | "poverty"
    | "nutrition"
    | "health"
    | "education"
    | "gender"
    | "economy"
    | "environment"
    | "governance"
    | "humanitarian";
  unit?: string;
}

export const LSB_SDG_DOWNLOAD_URL = `${DATA_BASE}/zip/all_indicators.zip`;

/** Official Lao SDG indicators currently published in the Open SDG CSV export. */
export const LSB_SDG_INDICATORS = [
  {
    code: "1-1-1",
    name: "Proportion of population below international poverty line [1.1.1]",
    category: "poverty",
    unit: "Percent",
  },
  {
    code: "1-2-1",
    name: "Proportion of population living below the national poverty line [1.2.1]",
    category: "poverty",
    unit: "Percent",
  },
  {
    code: "1-2-2",
    name: "Proportion of children living in child-specific multidimensional poverty [1.2.2]",
    category: "poverty",
    unit: "Percent",
  },
  {
    code: "1-4-1",
    name: "Proportion of population living in households with access to secondary school [1.4.1]",
    category: "poverty",
    unit: "Percent",
  },
  {
    code: "2-1-1",
    name: "Prevalence of undernourishment [2.1.1]",
    category: "nutrition",
    unit: "Percent",
  },
  { code: "2-1-4", name: "Food production [2.1.4]", category: "nutrition", unit: "Metric Tons" },
  {
    code: "2-2-1",
    name: "Proportion of children moderately or severely stunted [2.2.1]",
    category: "nutrition",
    unit: "Percent",
  },
  {
    code: "2-2-2",
    name: "Proportion of children moderately or severely wasted [2.2.2]",
    category: "nutrition",
    unit: "Percent",
  },
  {
    code: "2-a-1",
    name: "Agriculture share of Government Expenditure [2.a.1]",
    category: "nutrition",
    unit: "Percent",
  },
  {
    code: "2-c-1",
    name: "Indicator of Food Price Anomalies (IFPA) [2.c.1]",
    category: "nutrition",
    unit: "Number",
  },
  {
    code: "3-1-1",
    name: "Maternal mortality ratio [3.1.1]",
    category: "health",
    unit: "Per 100,000 population",
  },
  {
    code: "3-1-2",
    name: "Proportion of births attended by skilled health personnel [3.1.2]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-2-1",
    name: "Infant mortality rate [3.2.1]",
    category: "health",
    unit: "Per 100,000 population",
  },
  {
    code: "3-2-2",
    name: "Neonatal mortality rate [3.2.2]",
    category: "health",
    unit: "Per 100,000 population",
  },
  {
    code: "3-3-1",
    name: "Number of new HIV infections per 1,000 uninfected population [3.3.1]",
    category: "health",
    unit: "Number",
  },
  {
    code: "3-3-2",
    name: "Tuberculosis incidence [3.3.2]",
    category: "health",
    unit: "Per 100,000 population",
  },
  {
    code: "3-3-3",
    name: "Malaria incidence per 1,000 population at risk [3.3.3]",
    category: "health",
    unit: "Per 1,000 population",
  },
  {
    code: "3-3-4",
    name: "Prevalence of hepatitis B surface antigen (HBsAg) [3.3.4]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-3-5",
    name: "Number of people requiring interventions against neglected tropical diseases [3.3.5]",
    category: "health",
    unit: "Number",
  },
  {
    code: "3-4-1",
    name: "Mortality rate attributed to cardiovascular disease, cancer, diabetes or chronic respiratory disease [3.4.1]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-5-2",
    name: "Alcohol consumption per capita (aged 15 years and older) within a calendar year [3.5.2]",
    category: "health",
    unit: "Litres pure alcohol",
  },
  {
    code: "3-6-1",
    name: "Number of deaths rate due to road traffic injuries [3.6.1]",
    category: "health",
    unit: "Per 100,000 population",
  },
  {
    code: "3-7-1",
    name: "Proportion of women married or in a union of reproductive age (aged 15-49 years) who have their need for family planning satisfied with modern methods [3.7.1]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-7-2",
    name: "Adolescent birth rate (per 1,000 women aged 15-19 years) [3.7.2]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-8-1",
    name: "Coverage of essential health services: % Antenatal care coverage (at least 4 visits)",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-8-2",
    name: "Out of pocket health expenditure as % of total health expenditure",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-9-2",
    name: "Mortality rate attributed to unsafe water, unsafe sanitation and lack of hygiene [3.9.2]",
    category: "health",
    unit: "Number",
  },
  {
    code: "3-9-3",
    name: "Mortality rate attributed to unintentional poisonings [3.9.3]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-a-1",
    name: "Age-standardized prevalence of current tobacco use among persons aged 15 years and older [3.a.1]",
    category: "health",
    unit: "Percent",
  },
  {
    code: "3-b-2",
    name: "Total official development assistance to medical research and basic heath sectors, gross disbursement, by recipient countries [3.b.2]",
    category: "health",
    unit: "USD",
  },
  {
    code: "3-c-1",
    name: "Health worker distribution, by sex and type of occupation [3.c.1]",
    category: "health",
    unit: "Per 1,000 population",
  },
  {
    code: "4-1-1",
    name: "Proportion of children and young people achieving a minimum proficiency level in reading and mathematics [4.1.1]",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-1-2",
    name: "Completion rate, by sex, location, wealth quintile and education level (%) [4.1.2]",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-1-6",
    name: "Children over-age for grade",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-2-3",
    name: "Gross early childhood enrolment ratio",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-3-3",
    name: "Participation rate in technical-vocational education programmes (15-24 years-old)",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-3-4",
    name: "Percentage lower secondary/upper secondary school graduates enrolled in vocational & training school",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-5-1-a",
    name: "Gender parity indices for gross enrolment",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-5-1-b",
    name: "Gender parity indices for completion",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-6-1",
    name: "Proportion of population achieving at least a fixed level of proficiency in functional skills [4.6.1]",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-b-1",
    name: "Total official flows for scholarships, by recipient countries [4.b.1]",
    category: "education",
    unit: "Percent",
  },
  {
    code: "4-c-1",
    name: "Proportion of teachers who have received at least the minimum organized teacher training pre-service or in-service required for teaching at the relevant level in a given country [4.c.1]",
    category: "education",
    unit: "Percent",
  },
  {
    code: "5-1-1",
    name: "Legal frameworks that promote, enforce and monitor gender equality (percentage of achievement, 0 - 100) -- Area 1: overarching legal frameworks and public life. [5.1.1]",
    category: "gender",
    unit: "Number",
  },
  {
    code: "5-2-1",
    name: "Proportion of ever-partnered women and girls subjected to physical and sexual violence by a current or former intimate partner in the previous 12 months [5.2.1]",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "5-3-1",
    name: "Proportion of women aged 20-24 years who were married or in a union before age 15 [5.3.1]",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "5-3-4",
    name: "Percentage of women aged 15-49 years who gave birth by aged 15",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "5-4-1",
    name: "Proportion of time spent on unpaid domestic chores and care work [5.4.1]",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "5-5-1",
    name: "Proportion of seats held by women in national parliaments (% of total number of seats) [5.5.1]",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "5-5-2",
    name: "Percentage of women in decision making positions /leadership positions in government sector by central, province and district in the following positions_Deputy Division Head",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "5-b-1",
    name: "Proportion of individuals who own a mobile telephone [5.b.1]",
    category: "gender",
    unit: "Percent",
  },
  {
    code: "8-1-1",
    name: "Annual growth rate of real GDP per capita [8.1.1]",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-2-1",
    name: "Annual growth rate of real GDP per employed person [8.2.1]",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-3-1",
    name: "Proportion of informal employment, by sector and sex (ILO harmonized estimates) [8.3.1]",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-3-2",
    name: "Percentage of financing and loans issued to SMEs",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-3-3",
    name: "Number of SMEs owned by Lao citizens (with Lao citizens as the majority shareholders)",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-5-1",
    name: "Average hourly earnings [8.5.1]",
    category: "economy",
    unit: "Local currency",
  },
  {
    code: "8-5-2",
    name: "Unemployment rate [8.5.2]",
    category: "economy",
    unit: "Percent",
  },
  { code: "8-5-3", name: "Businesses owned by females", category: "economy", unit: "Percent" },
  {
    code: "8-5-4",
    name: "Share of employed persons in the informal sector",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-6-1",
    name: "Proportion of youth not in education, employment or training [8.6.1]",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-7-1",
    name: "Proportion of children engaged in economic activity and household chores [8.7.1]",
    category: "economy",
    unit: "Percent",
  },
  {
    code: "8-7-2",
    name: "Number of children aged 5-17 engaged in prohibited hazardous occupations and tasks, by sex and age",
    category: "economy",
    unit: "Number",
  },
  {
    code: "8-8-1",
    name: "Non-fatal occupational injuries among employees (rate) [8.8.1]",
    category: "economy",
    unit: "Number",
  },
  {
    code: "8-9-1",
    name: "Tourism direct GDP as a proportion of total GDP [8.9.1]",
    category: "economy",
    unit: "USD",
  },
  {
    code: "8-9-3",
    name: "Establishment of Tourism standards (1=to be adopted and implemented)",
    category: "economy",
    unit: "Number",
  },
  {
    code: "8-a-1",
    name: "Mean number of days to clear imports",
    category: "economy",
    unit: "Number",
  },
  {
    code: "13-1-1",
    name: "Number of people affected by disaster [1.5.1, 11.5.1, 13.1.1]",
    category: "environment",
    unit: "Per 100,000 population",
  },
  {
    code: "13-3-3",
    name: "Number of provinces with capacity to report on the situation of climate change",
    category: "environment",
    unit: "Number",
  },
  {
    code: "17-1-1",
    name: "Total government revenue as a proportion of GDP [17.1.1]",
    category: "governance",
    unit: "Percent",
  },
  {
    code: "17-1-2",
    name: "Proportion of domestic budget funded by domestic taxes [17.1.2]",
    category: "governance",
    unit: "Percent",
  },
  {
    code: "17-3-1",
    name: "Foreign direct investment (FDI) inflows [17.3.1]",
    category: "governance",
    unit: "USD",
  },
  {
    code: "17-6-1",
    name: "Fixed broadband subscriptions per 100 inhabitants [17.6.1]",
    category: "governance",
    unit: "Per 100 population",
  },
  {
    code: "17-7-1",
    name: "Number of science and/or technology cooperation agreements and programmes between countries, by type of cooperation (Increase number of agreements with other counties and international organisations to 100 agreements and implementing 80% in 2020)",
    category: "governance",
    unit: "Number",
  },
  {
    code: "17-8-1",
    name: "Internet users per 100 inhabitants [17.8.1]",
    category: "governance",
    unit: "Percent",
  },
  {
    code: "17-8-2",
    name: "Percentage of population registered as internet users through landline and wireless",
    category: "governance",
    unit: "Percent",
  },
  {
    code: "17-8-3",
    name: "Percentage of mobile phone users with internet access.",
    category: "governance",
    unit: "Percent",
  },
  {
    code: "17-11-1",
    name: "Developing countries' and least developed countries' share of global merchandise exports [17.11.1]",
    category: "governance",
    unit: "Percent",
  },
  {
    code: "17-19-2",
    name: "Proportion of countries that have conducted at least one population and housing census in the last 10 years [17.19.2]",
    category: "governance",
    unit: "Number",
  },
  {
    code: "17-19-3",
    name: "Number of death registration recorded",
    category: "governance",
    unit: "Number",
  },
  {
    code: "18-1-1",
    name: "Number of reported UXO casualties-Total",
    category: "humanitarian",
    unit: "Number",
  },
  {
    code: "18-1-2",
    name: "Percentage of population in contaminated villages with information on Confirmed Hazardous Areas in their village (disaggregated by age group, sex and persons with disabilities) [18.1.2 ]",
    category: "humanitarian",
    unit: "Percent",
  },
  {
    code: "18-2-1",
    name: "Percentage of high priority hazardous areas remaining to be cleared (disaggregated by village poverty levels) [18.2.1]",
    category: "humanitarian",
    unit: "Percent",
  },
  {
    code: "18-2-2",
    name: "Number of villages defined as 'poor' with Confirmed Hazardous Areas remaining to be cleared [18.2.2 ]",
    category: "humanitarian",
    unit: "Number",
  },
  {
    code: "18-3-1",
    name: "Proportion of registered active age UXO survivors unable to earn sufficient income with access to basic income security [18.3.1 ]",
    category: "humanitarian",
    unit: "Percent",
  },
  {
    code: "18-3-2",
    name: "Percentage of registered UXO survivors mainstreamed into health, education and employment services [18.3.2 ]",
    category: "humanitarian",
    unit: "Percent",
  },
] as const satisfies readonly LsbSdgIndicatorMeta[];

const INDICATOR_BY_CODE: ReadonlyMap<string, LsbSdgIndicatorMeta> = new Map(
  LSB_SDG_INDICATORS.map((i) => [i.code, i]),
);

const CSV_CONFIG = {
  responseType: "text" as const,
  headers: { Accept: "text/csv,*/*" },
  transformResponse: [(data: unknown) => String(data)],
};

const IGNORED_FOOTNOTE_COLUMNS = new Set(["Year", "SERIES", "UNIT_MEASURE", "Value"]);

function csvUrl(code: string): string {
  return `${DATA_BASE}/data/${encodeURIComponent(code)}.csv`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function parseCsvRows(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const header = rows[0]?.map((h) => h.trim());
  if (!header || !header.includes("Year") || !header.includes("Value")) {
    throw new DataParseError("lsb_sdg", text.slice(0, 300));
  }

  return rows
    .slice(1)
    .map((cells) => Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()])));
}

function numericValue(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function hashFootnote(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function rowFootnote(row: Record<string, string>): string | undefined {
  const parts = Object.entries(row)
    .filter(([key, value]) => !IGNORED_FOOTNOTE_COLUMNS.has(key) && value.trim().length > 0)
    .map(([key, value]) => `${key}=${value}`);
  return parts.length ? parts.join("; ") : undefined;
}

function normalizeCode(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^LSB_SDG:/i, "")
    .replace(/^SDG:/i, "")
    .replace(/\./g, "-")
    .toLowerCase();
  if (!INDICATOR_BY_CODE.has(cleaned)) {
    throw new InvalidIndicatorError(input, "lsb_sdg");
  }
  return cleaned;
}

export function listLsbSdgIndicators(filter: { goal?: number; search?: string } = {}) {
  const q = filter.search?.trim().toLowerCase();
  const goalPrefix = filter.goal !== undefined ? `${filter.goal}-` : undefined;
  return LSB_SDG_INDICATORS.filter((indicator) => {
    if (goalPrefix && !indicator.code.startsWith(goalPrefix)) return false;
    if (!q) return true;
    return (
      indicator.code.includes(q) ||
      indicator.name.toLowerCase().includes(q) ||
      indicator.category.includes(q)
    );
  });
}

export async function fetchLsbSdgIndicator(
  indicatorCode: string,
  startYear = 1960,
  endYear = 2030,
): Promise<IndicatorRecord[]> {
  const code = normalizeCode(indicatorCode);
  const meta = INDICATOR_BY_CODE.get(code);
  if (!meta) throw new InvalidIndicatorError(indicatorCode, "lsb_sdg");

  const records = await cache.getOrSet("lsb_sdg", ["indicator", code], async () => {
    const text = await httpGet<string>("lsb_sdg", csvUrl(code), CSV_CONFIG);
    const rows = parseCsvRows(text);
    const retrievedAt = new Date().toISOString();

    return rows
      .map((row): IndicatorRecord | null => {
        const year = Number(row.Year);
        if (!Number.isInteger(year) || year < 1960 || year > 2030) return null;
        const footnote = rowFootnote(row);
        const series = row.SERIES || meta.name;
        const unit = row.UNIT_MEASURE || meta.unit;
        const value = numericValue(row.Value ?? "");
        const suffix = footnote ? ` [${footnote}]` : "";
        const variant = hashFootnote(`${series}|${footnote ?? ""}`);
        return {
          id: `LSB_SDG:${code}:${year}:${variant}`,
          source: "lsb_sdg",
          indicatorCode: code,
          indicatorName: `${series}${suffix}`,
          category: meta.category,
          countryCode: COUNTRY_CODE,
          countryName: COUNTRY_NAME,
          year,
          value,
          unit,
          footnote,
          retrievedAt,
        };
      })
      .filter((record): record is IndicatorRecord => record !== null)
      .sort((a, b) => b.year - a.year || a.indicatorName.localeCompare(b.indicatorName));
  });

  return records.filter((r) => r.year >= startYear && r.year <= endYear);
}

export async function fetchLsbSdgGoal(
  goal: number,
  startYear = 1960,
  endYear = 2030,
): Promise<IndicatorRecord[]> {
  const indicators = listLsbSdgIndicators({ goal });
  const groups = await Promise.all(
    indicators.map((indicator) => fetchLsbSdgIndicator(indicator.code, startYear, endYear)),
  );
  return groups
    .flat()
    .sort((a, b) => a.indicatorCode.localeCompare(b.indicatorCode) || b.year - a.year);
}

export async function pingLsbSdg(): Promise<boolean> {
  try {
    const text = await httpGet<string>("lsb_sdg", `${DATA_BASE}/headline/3-1-1.csv`, CSV_CONFIG);
    return text.includes("Maternal mortality ratio") && text.includes("Year");
  } catch {
    return false;
  }
}
