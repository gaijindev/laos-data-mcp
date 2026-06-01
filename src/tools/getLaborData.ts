import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchIlostatIndicator,
  KEY_LABOR_INDICATORS,
  searchIlostatIndicators,
} from "../adapters/ilostat.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Fetch labour market data for Lao PDR from ILOSTAT (ILO Labour Statistics). Pass an " +
  "`indicator` ILOSTAT dataflow code to get its time series (e.g. labour force participation, " +
  "unemployment, employment-to-population ratio, informality, earnings), `search` to find " +
  "indicator codes by name, or neither to list the key indicators.";

function keyIndicatorList(): string {
  return [
    "Key ILOSTAT labour indicators for Lao PDR (pass one as `indicator`):",
    ...KEY_LABOR_INDICATORS.map((i) => `- \`${i.code}\` — ${i.name}`),
    "",
    'Use `search` (e.g. "unemployment", "earnings") to find more indicator codes.',
  ].join("\n");
}

export function registerGetLaborDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_labor_data",
    {
      title: "Get Laos labor data (ILOSTAT)",
      description: DESCRIPTION,
      inputSchema: {
        indicator: z
          .string()
          .optional()
          .describe(
            "ILOSTAT dataflow code, e.g. DF_EAP_DWAP_SEX_AGE_RT.",
          ),
        search: z
          .string()
          .optional()
          .describe('Search indicator names (e.g. "unemployment", "earnings").'),
      },
    },
    async ({ indicator, search }) => {
      try {
        if (search) {
          const matches = await searchIlostatIndicators(search);
          if (matches.length === 0) {
            return textResult(`No ILOSTAT indicators matched "${search}".`);
          }
          return textResult(
            [
              `Found ${matches.length} ILOSTAT indicator(s) matching "${search}":`,
              ...matches.map((m) => `- \`${m.code}\` — ${m.name}`),
            ].join("\n"),
          );
        }
        if (indicator) {
          const records = await fetchIlostatIndicator(indicator);
          if (records.length === 0) {
            return textResult(
              `No ILOSTAT data for "${indicator}" for Lao PDR. Use search to find a valid code.`,
            );
          }
          return jsonResult(
            `Retrieved ${records.length} ILOSTAT record(s) for ${indicator} (${records[0]?.indicatorName ?? indicator}), Lao PDR.`,
            records,
          );
        }
        return textResult(keyIndicatorList());
      } catch (err) {
        return toToolError(err, { subject: indicator ?? search ?? "ILOSTAT" });
      }
    },
  );
}
