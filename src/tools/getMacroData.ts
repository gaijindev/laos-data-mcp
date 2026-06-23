import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchImfIndicator, KEY_MACRO_INDICATORS } from "../adapters/imf.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";
import { hasOrderedOptionalRange, YEAR_RANGE_MESSAGE } from "../utils/validation.js";

const DESCRIPTION =
  "Fetch macroeconomic data for Lao PDR from the IMF DataMapper (World Economic Outlook). " +
  "Pass an IMF `indicator` code (e.g. NGDP_RPCH real GDP growth, PCPIPCH inflation, " +
  "GGXWDG_NGDP govt debt, BCA_NGDPD current account, PPPGDP) or omit it to list key indicators.";

const InputSchema = z
  .object({
    indicator: z.string().optional().describe("IMF WEO indicator code, e.g. NGDP_RPCH."),
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
  })
  .refine((value) => hasOrderedOptionalRange(value, "startYear", "endYear"), {
    message: YEAR_RANGE_MESSAGE,
    path: ["endYear"],
  });

function keyList(): string {
  return [
    "Key IMF indicators for Lao PDR (pass one as `indicator`):",
    ...KEY_MACRO_INDICATORS.map((i) => `- \`${i.code}\` — ${i.name}`),
  ].join("\n");
}

export function registerGetMacroDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_macro_data",
    {
      title: "Get Laos macro data (IMF)",
      description: DESCRIPTION,
      inputSchema: InputSchema,
    },
    async ({ indicator, startYear, endYear }) => {
      if (!indicator) return textResult(keyList());
      const start = startYear ?? 2000;
      const end = endYear ?? new Date().getFullYear();
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
