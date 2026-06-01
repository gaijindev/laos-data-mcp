import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWhoIndicator, KEY_HEALTH_INDICATORS, searchWhoIndicators } from "../adapters/who.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Fetch health data for Lao PDR from the WHO Global Health Observatory. Pass an " +
  "`indicator` GHO code to get its time series (e.g. life expectancy, malaria, TB, NCD " +
  "mortality, physicians, sanitation), `search` to find indicator codes by name, or " +
  "neither to list the key indicators.";

function keyIndicatorList(): string {
  return [
    "Key WHO indicators for Lao PDR (pass one as `indicator`):",
    ...KEY_HEALTH_INDICATORS.map((i) => `- \`${i.code}\` — ${i.name}`),
    "",
    'Use `search` (e.g. "immuniz", "maternal") to find more indicator codes.',
  ].join("\n");
}

export function registerGetHealthDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_health_data",
    {
      title: "Get Laos health data (WHO GHO)",
      description: DESCRIPTION,
      inputSchema: {
        indicator: z.string().optional().describe("WHO GHO indicator code, e.g. WHOSIS_000001."),
        search: z.string().optional().describe('Search indicator names (e.g. "tuberculosis").'),
      },
    },
    async ({ indicator, search }) => {
      try {
        if (search) {
          const matches = await searchWhoIndicators(search);
          if (matches.length === 0) {
            return textResult(`No WHO indicators matched "${search}".`);
          }
          return textResult(
            [
              `Found ${matches.length} WHO indicator(s) matching "${search}":`,
              ...matches.map((m) => `- \`${m.code}\` — ${m.name}`),
            ].join("\n"),
          );
        }
        if (indicator) {
          const records = await fetchWhoIndicator(indicator);
          if (records.length === 0) {
            return textResult(
              `No WHO data for "${indicator}" for Lao PDR. Use search to find a valid code.`,
            );
          }
          return jsonResult(
            `Retrieved ${records.length} WHO record(s) for ${indicator} (${records[0]?.indicatorName ?? indicator}), Lao PDR.`,
            records,
          );
        }
        return textResult(keyIndicatorList());
      } catch (err) {
        return toToolError(err, { subject: indicator ?? search ?? "WHO GHO" });
      }
    },
  );
}
