import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchData360Indicator,
  KEY_DATA360_INDICATORS,
  searchData360Indicators,
} from "../adapters/data360.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Fetch Lao PDR governance and rule-of-law indicators from the World Bank Data360 API. " +
  'Use `indicatorCode` for curated WGI codes such as "GOV_WGI_RL" or `search` to discover codes.';

function indicatorList(search?: string): string {
  const indicators = search ? searchData360Indicators(search) : KEY_DATA360_INDICATORS;
  if (indicators.length === 0) return `No Data360 governance indicators matched "${search}".`;
  return [
    `Found ${indicators.length} curated Data360 governance indicator(s). Pass a code as \`indicatorCode\` to fetch values:`,
    ...indicators.map(
      (indicator) =>
        `- \`${indicator.code}\` - ${indicator.name}${indicator.unit ? ` (${indicator.unit})` : ""}`,
    ),
  ].join("\n");
}

export function registerGetGovernanceDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_governance_data",
    {
      title: "Get Laos governance data",
      description: DESCRIPTION,
      inputSchema: {
        indicatorCode: z
          .string()
          .optional()
          .describe('Data360 governance indicator code, e.g. "GOV_WGI_RL".'),
        search: z.string().optional().describe('Search curated codes, e.g. "rule".'),
        startYear: z.number().int().min(1960).max(2030).optional().describe("First year."),
        endYear: z.number().int().min(1960).max(2030).optional().describe("Last year."),
      },
    },
    async ({ indicatorCode, search, startYear, endYear }) => {
      const start = startYear ?? 2000;
      const end = endYear ?? new Date().getFullYear();
      try {
        if (!indicatorCode) return textResult(indicatorList(search));

        const records = await fetchData360Indicator(indicatorCode, start, end);
        if (records.length === 0) {
          return textResult(
            `No Data360 governance data found for ${indicatorCode}, Lao PDR, ${start}-${end}.`,
          );
        }

        return jsonResult(
          `Retrieved ${records.length} Data360 governance record(s) for ${indicatorCode}, Lao PDR, ${start}-${end}.`,
          records,
        );
      } catch (err) {
        return toToolError(err, { subject: indicatorCode ?? search });
      }
    },
  );
}
