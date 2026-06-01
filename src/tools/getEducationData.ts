import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchUisIndicator,
  KEY_EDUCATION_INDICATORS,
  searchUisIndicators,
} from "../adapters/uis.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Fetch education data for Lao PDR from the UNESCO Institute for Statistics (UIS). Pass an " +
  "`indicator` UIS code to get its time series (e.g. literacy rates, enrolment rates, " +
  "out-of-school rates, mean years of schooling, education expenditure), `search` to find " +
  "indicator codes by name, or neither to list the key indicators.";

function keyIndicatorList(): string {
  return [
    "Key UNESCO UIS education indicators for Lao PDR (pass one as `indicator`):",
    ...KEY_EDUCATION_INDICATORS.map((i) => `- \`${i.code}\` — ${i.name}`),
    "",
    'Use `search` (e.g. "literacy", "enrolment", "expenditure") to find more indicator codes.',
  ].join("\n");
}

export function registerGetEducationDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_education_data",
    {
      title: "Get Laos education data (UNESCO UIS)",
      description: DESCRIPTION,
      inputSchema: {
        indicator: z
          .string()
          .optional()
          .describe("UNESCO UIS indicator code, e.g. LR.AG15T99 (adult literacy rate)."),
        search: z
          .string()
          .optional()
          .describe('Search education indicator names (e.g. "literacy", "enrolment").'),
      },
    },
    async ({ indicator, search }) => {
      try {
        if (search) {
          const matches = await searchUisIndicators(search);
          if (matches.length === 0) {
            return textResult(`No UNESCO UIS indicators matched "${search}".`);
          }
          return textResult(
            [
              `Found ${matches.length} UNESCO UIS indicator(s) matching "${search}":`,
              ...matches.map((m) => `- \`${m.code}\` — ${m.name}`),
            ].join("\n"),
          );
        }
        if (indicator) {
          const records = await fetchUisIndicator(indicator);
          if (records.length === 0) {
            return textResult(
              `No UNESCO UIS data for "${indicator}" for Lao PDR. The code may be invalid — use search to find a valid code.`,
            );
          }
          return jsonResult(
            `Retrieved ${records.length} UNESCO UIS record(s) for ${indicator} (${records[0]?.indicatorName ?? indicator}), Lao PDR.`,
            records,
          );
        }
        return textResult(keyIndicatorList());
      } catch (err) {
        return toToolError(err, { subject: indicator ?? search ?? "UNESCO UIS" });
      }
    },
  );
}
