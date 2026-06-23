import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWorldBankIndicator, isWorldBankCode } from "../adapters/worldbank.js";
import { findCatalogEntry } from "../catalog/index.js";
import type { IndicatorRecord } from "../schemas/indicator.js";
import { SOURCE_ID_PREFIX, SOURCES, SourceEnum, type Source } from "../schemas/source.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";
import { hasOrderedOptionalRange, YEAR_RANGE_MESSAGE } from "../utils/validation.js";

type IndicatorFetcher = (
  code: string,
  startYear: number,
  endYear: number,
) => Promise<IndicatorRecord[]>;

/**
 * Source -> fetcher dispatch. World Bank lands in Phase 3; later phases register
 * additional time-series sources (e.g. UNICEF) here.
 */
const FETCHERS: Partial<Record<Source, IndicatorFetcher>> = {
  worldbank: (code, startYear, endYear) =>
    fetchWorldBankIndicator({ indicatorCode: code, startYear, endYear }),
};

/** Register a time-series fetcher for a source (used by later phases). */
export function registerIndicatorFetcher(source: Source, fetcher: IndicatorFetcher): void {
  FETCHERS[source] = fetcher;
}

/** Look up the registered time-series fetcher for a source, if any. */
export function lookupIndicatorFetcher(source: Source): IndicatorFetcher | undefined {
  return FETCHERS[source];
}

const PREFIX_TO_SOURCE: Record<string, Source> = {};
for (const s of SOURCES) {
  PREFIX_TO_SOURCE[s.toUpperCase()] = s;
  PREFIX_TO_SOURCE[SOURCE_ID_PREFIX[s].toUpperCase()] = s;
}

/** Resolve a user-supplied code + optional explicit source to { source, code }. */
export function resolveIndicator(
  input: string,
  explicit?: Source,
): { source: Source; code: string } {
  const raw = input.trim();
  const colon = raw.indexOf(":");
  let prefixSource: Source | undefined;
  let rest = raw;
  if (colon > 0) {
    const head = raw.slice(0, colon).toUpperCase();
    const mapped = PREFIX_TO_SOURCE[head];
    if (mapped) {
      prefixSource = mapped;
      rest = raw.slice(colon + 1);
    }
  }
  if (explicit) return { source: explicit, code: prefixSource ? rest : raw };
  if (prefixSource) return { source: prefixSource, code: rest };

  const entry = findCatalogEntry(raw) ?? findCatalogEntry(raw.replace(/\./g, "-"));
  if (entry) return { source: entry.source, code: entry.code };
  if (isWorldBankCode(raw)) return { source: "worldbank", code: raw };
  return { source: "worldbank", code: raw };
}

function toTimeseries(records: IndicatorRecord[]) {
  const first = records[0];
  const points = [...records]
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ year: r.year, value: r.value }));
  return {
    id: first?.id,
    source: first?.source,
    indicatorCode: first?.indicatorCode,
    indicatorName: first?.indicatorName,
    category: first?.category,
    unit: first?.unit,
    points,
  };
}

const SOURCE_TOOL_HINTS: Partial<Record<Source, string>> = {
  unicef: "use get_laos_welfare_data for UNICEF topics",
  mekong: "use search_laos_datasets for dataset files",
  adb: "use search_laos_datasets for dataset files",
  laosis: "use get_official_stats for official-statistics categories",
  faostat: "use get_laos_agriculture_data for FAOSTAT domains",
  hdx: "use get_laos_humanitarian_data / search_laos_humanitarian_datasets",
  wfp: "use get_laos_food_prices for WFP market prices",
  osm: "use get_laos_infrastructure for OpenStreetMap features",
  mrc: "use search_mekong_data for MRC datasets",
  census: "use get_laos_census_data for census figures",
  unodc: "use get_laos_crime_data for UNODC crime & justice datasets",
  faolex: "use search_laos_legal_texts for FAOLEX laws, regulations, and policies",
};

export function unsupportedSourceHint(source: Source): string {
  const hint = SOURCE_TOOL_HINTS[source];
  return hint
    ? `get_laos_indicator does not handle source "${source}" directly — ${hint}.`
    : `Source "${source}" is not supported by get_laos_indicator. Try source "worldbank".`;
}

const DESCRIPTION =
  "Fetch time-series data for a specific development indicator for Lao PDR from " +
  "international and official sources (World Bank, UNICEF, WHO, IMF, LSB SDG, UN global SDG, Data360). Use this " +
  "when you need numeric trend data on population, economy, health, education, environment, or infrastructure. " +
  "Call list_available_indicators first if you do not know the code.";

const InputSchema = z
  .object({
    indicatorCode: z
      .string()
      .min(1)
      .describe('Indicator code, e.g. "SP.POP.TOTL". May be prefixed, e.g. "WB:SP.POP.TOTL".'),
    source: SourceEnum.optional().describe("Force a source. Default: auto-detected from the code."),
    startYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("First year (default 2000)."),
    endYear: z
      .number()
      .int()
      .min(1960)
      .max(2030)
      .optional()
      .describe("Last year (default current year)."),
    format: z
      .enum(["records", "timeseries"])
      .optional()
      .describe('Output shape: "records" (default) or "timeseries".'),
  })
  .refine((value) => hasOrderedOptionalRange(value, "startYear", "endYear"), {
    message: YEAR_RANGE_MESSAGE,
    path: ["endYear"],
  });

export function registerGetIndicatorTool(server: McpServer): void {
  server.registerTool(
    "get_laos_indicator",
    {
      title: "Get Laos indicator",
      description: DESCRIPTION,
      inputSchema: InputSchema,
    },
    async ({ indicatorCode, source, startYear, endYear, format }) => {
      const start = startYear ?? 2000;
      const end = endYear ?? new Date().getFullYear();
      const resolved = resolveIndicator(indicatorCode, source);
      const fetcher = FETCHERS[resolved.source];
      if (!fetcher) {
        return { ...textResult(unsupportedSourceHint(resolved.source)), isError: true };
      }
      try {
        const records = await fetcher(resolved.code, start, end);
        if (records.length === 0) {
          return textResult(
            `No data found for "${resolved.code}" from ${resolved.source} for ${start}–${end}. ` +
              `Try a wider year range, or call list_available_indicators to confirm the code.`,
          );
        }
        const payload = format === "timeseries" ? toTimeseries(records) : records;
        const name = records[0]?.indicatorName ?? resolved.code;
        return jsonResult(
          `Retrieved ${records.length} record(s) for ${resolved.code} (${name}) from ${resolved.source}, ${start}–${end}.`,
          payload,
        );
      } catch (err) {
        return toToolError(err, { subject: resolved.code });
      }
    },
  );
}
