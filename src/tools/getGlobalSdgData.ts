import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchUnSdgIndicator,
  KEY_UN_SDG_INDICATORS,
  searchUnSdgIndicators,
} from "../adapters/unSdg.js";
import type { IndicatorRecord } from "../schemas/indicator.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";
import { hasOrderedOptionalRange, YEAR_RANGE_MESSAGE } from "../utils/validation.js";

const DESCRIPTION =
  "Fetch Lao PDR records from the UN Global SDG Indicators Database. This global " +
  "UNStats API covers food/agriculture (SDG 2), housing and community/urban " +
  "development (SDG 11), and law/crime/justice/governance (SDG 16). Use " +
  '`indicatorCode` for codes like "11.1.1" or "16.2.2", or `search` to discover curated codes.';

const InputSchema = z
  .object({
    indicatorCode: z
      .string()
      .optional()
      .describe('UN global SDG indicator or series code, e.g. "11.1.1" or "EN_LND_SLUM".'),
    search: z
      .string()
      .optional()
      .describe('Search curated UN SDG indicator names/codes/categories, e.g. "housing".'),
    startYear: z.number().int().min(1960).max(2030).optional().describe("First year."),
    endYear: z.number().int().min(1960).max(2030).optional().describe("Last year."),
    latestOnly: z
      .boolean()
      .optional()
      .describe("Return only the latest observation per series/disaggregation."),
  })
  .refine((value) => hasOrderedOptionalRange(value, "startYear", "endYear"), {
    message: YEAR_RANGE_MESSAGE,
    path: ["endYear"],
  });

function latestBySeries(records: IndicatorRecord[]): IndicatorRecord[] {
  const latest = new Map<string, IndicatorRecord>();
  for (const record of records) {
    const key = `${record.id}|${record.indicatorName}|${record.footnote ?? ""}`;
    const current = latest.get(key);
    if (!current || record.year > current.year) latest.set(key, record);
  }
  return [...latest.values()].sort(
    (a, b) => a.indicatorCode.localeCompare(b.indicatorCode) || b.year - a.year,
  );
}

function indicatorList(search?: string): string {
  const indicators = search ? searchUnSdgIndicators(search) : KEY_UN_SDG_INDICATORS;
  if (indicators.length === 0) {
    return `No UN SDG indicators matched search "${search}".`;
  }
  return [
    `Found ${indicators.length} curated UN SDG indicator(s). Pass a code as \`indicatorCode\` to fetch values:`,
    ...indicators.map(
      (indicator) =>
        `- \`${indicator.code}\` - ${indicator.name} [${indicator.category}]${
          indicator.unit ? ` (${indicator.unit})` : ""
        }`,
    ),
  ].join("\n");
}

export function registerGetGlobalSdgDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_global_sdg_data",
    {
      title: "Get Laos global SDG data",
      description: DESCRIPTION,
      inputSchema: InputSchema,
    },
    async ({ indicatorCode, search, startYear, endYear, latestOnly }) => {
      const start = startYear ?? 1960;
      const end = endYear ?? 2030;
      try {
        if (!indicatorCode) return textResult(indicatorList(search));

        const records = await fetchUnSdgIndicator(indicatorCode, start, end);
        const payload = latestOnly ? latestBySeries(records) : records;

        if (payload.length === 0) {
          return textResult(
            `No UN global SDG data found for ${indicatorCode} in Lao PDR, ${start}-${end}.`,
          );
        }

        return jsonResult(
          `Retrieved ${payload.length} UN global SDG record(s) for ${indicatorCode}, Lao PDR, ${start}-${end}${
            latestOnly ? " (latest observation per series)" : ""
          }.`,
          payload,
        );
      } catch (err) {
        return toToolError(err, { subject: indicatorCode ?? search });
      }
    },
  );
}
