import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchLsbSdgGoal, fetchLsbSdgIndicator, listLsbSdgIndicators } from "../adapters/lsbSdg.js";
import type { IndicatorRecord } from "../schemas/indicator.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Fetch official Lao PDR Sustainable Development Goal indicator data from the Lao " +
  "Statistics Bureau SDG Open Data Platform. Use `indicatorCode` for one SDG " +
  'indicator such as "3.1.1" or "18-1-1", `goal` for a whole SDG goal, or `search` ' +
  "to discover available official SDG indicators.";

function latestBySeries(records: IndicatorRecord[]): IndicatorRecord[] {
  const latest = new Map<string, IndicatorRecord>();
  for (const record of records) {
    const key = `${record.indicatorCode}|${record.indicatorName}|${record.footnote ?? ""}`;
    const current = latest.get(key);
    if (!current || record.year > current.year) latest.set(key, record);
  }
  return [...latest.values()].sort(
    (a, b) => a.indicatorCode.localeCompare(b.indicatorCode) || b.year - a.year,
  );
}

function indicatorList(goal?: number, search?: string): string {
  const indicators = listLsbSdgIndicators({ goal, search });
  if (indicators.length === 0) {
    return `No LSB SDG indicators matched${goal ? ` goal ${goal}` : ""}${
      search ? ` search "${search}"` : ""
    }.`;
  }

  return [
    `Found ${indicators.length} official LSB SDG indicator(s). Pass a code as \`indicatorCode\` to fetch values:`,
    ...indicators.map((i) => `- \`${i.code}\` - ${i.name}${i.unit ? ` (${i.unit})` : ""}`),
  ].join("\n");
}

export function registerGetSdgProgressTool(server: McpServer): void {
  server.registerTool(
    "get_laos_sdg_progress",
    {
      title: "Get Laos SDG progress",
      description: DESCRIPTION,
      inputSchema: {
        indicatorCode: z
          .string()
          .optional()
          .describe('Official SDG indicator code, e.g. "3.1.1", "3-1-1", or "18-1-1".'),
        goal: z
          .number()
          .int()
          .min(1)
          .max(18)
          .optional()
          .describe("SDG goal number to fetch/list, including Lao national SDG 18 for UXO."),
        search: z
          .string()
          .optional()
          .describe('Search official SDG indicator names/codes, e.g. "poverty", "UXO".'),
        startYear: z.number().int().min(1960).max(2030).optional().describe("First year."),
        endYear: z.number().int().min(1960).max(2030).optional().describe("Last year."),
        latestOnly: z
          .boolean()
          .optional()
          .describe("Return only the latest observation per series/disaggregation."),
      },
    },
    async ({ indicatorCode, goal, search, startYear, endYear, latestOnly }) => {
      const start = startYear ?? 1960;
      const end = endYear ?? 2030;
      try {
        if (search || (!indicatorCode && goal === undefined)) {
          return textResult(indicatorList(goal, search));
        }

        const shouldReturnLatest = latestOnly ?? indicatorCode === undefined;
        const records = indicatorCode
          ? await fetchLsbSdgIndicator(indicatorCode, start, end)
          : await fetchLsbSdgGoal(goal as number, start, end);
        const payload = shouldReturnLatest ? latestBySeries(records) : records;

        if (payload.length === 0) {
          return textResult(
            `No LSB SDG data found for ${indicatorCode ?? `goal ${goal}`} in ${start}-${end}.`,
          );
        }

        return jsonResult(
          `Retrieved ${payload.length} official LSB SDG record(s) for ${
            indicatorCode ?? `goal ${goal}`
          }, ${start}-${end}${shouldReturnLatest ? " (latest observation per series)" : ""}.`,
          payload,
        );
      } catch (err) {
        return toToolError(err, { subject: indicatorCode ?? (goal ? `SDG goal ${goal}` : search) });
      }
    },
  );
}
