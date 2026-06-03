import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchImfIndicator, KEY_MACRO_INDICATORS } from "../adapters/imf.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";
import { keyIndicatorList, resolveYearRange, yearRangeFields } from "./shared.js";

const DESCRIPTION =
  "Fetch macroeconomic data for Lao PDR from the IMF DataMapper (World Economic Outlook). " +
  "Pass an IMF `indicator` code (e.g. NGDP_RPCH real GDP growth, PCPIPCH inflation, " +
  "GGXWDG_NGDP govt debt, BCA_NGDPD current account, PPPGDP) or omit it to list key indicators.";

function keyList(): string {
  return keyIndicatorList({
    heading: "Key IMF indicators for Lao PDR (pass one as `indicator`):",
    indicators: KEY_MACRO_INDICATORS,
  });
}

export function registerGetMacroDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_macro_data",
    {
      title: "Get Laos macro data (IMF)",
      description: DESCRIPTION,
      inputSchema: {
        indicator: z.string().optional().describe("IMF WEO indicator code, e.g. NGDP_RPCH."),
        ...yearRangeFields(2000),
      },
    },
    async ({ indicator, startYear, endYear }) => {
      if (!indicator) return textResult(keyList());
      const { start, end } = resolveYearRange(startYear, endYear, 2000);
      try {
        const records = await fetchImfIndicator(indicator, { startYear: start, endYear: end });
        if (records.length === 0) {
          return textResult(
            `No IMF data for "${indicator}" for Lao PDR in ${start}–${end}. Check the indicator code.`,
          );
        }
        return jsonResult(
          `Retrieved ${records.length} IMF record(s) for ${indicator} (${records[0]?.indicatorName ?? indicator}), Lao PDR, ${start}–${end}.`,
          records,
        );
      } catch (err) {
        return toToolError(err, { subject: `IMF ${indicator}` });
      }
    },
  );
}
