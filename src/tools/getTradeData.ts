import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchComtradeIndicator,
  fetchComtradePartners,
  KEY_TRADE_INDICATORS,
} from "../adapters/comtrade.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Fetch trade data for Lao PDR from the UN Comtrade International Trade Statistics database. " +
  "Pass `flow` (exports or imports) and `breakdown` (total time-series or partner breakdown) to " +
  "get normalized trade records. For total, use `startYear`/`endYear` to set the year range. " +
  "For partner breakdown, pass a specific `year`. Omit all inputs to list available indicators.";

/** Most recent year with reliable Comtrade data (submissions lag 1-2 years). */
const DEFAULT_PARTNER_YEAR = 2022;

function keyIndicatorList(): string {
  return [
    "Key UN Comtrade trade indicators for Lao PDR:",
    ...KEY_TRADE_INDICATORS.map((i) => `- \`${i.code}\` — ${i.name}`),
    "",
    "Usage:",
    "  breakdown=total   → annual time series (use startYear/endYear to filter)",
    "  breakdown=partner → top-15 trading partners for a single year (pass year=<YYYY>)",
    "  flow=exports | imports",
  ].join("\n");
}

export function registerGetTradeDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_trade_data",
    {
      title: "Get Laos trade data (UN Comtrade)",
      description: DESCRIPTION,
      inputSchema: {
        flow: z
          .enum(["exports", "imports"])
          .optional()
          .describe('Trade flow direction: "exports" or "imports" (default: exports).'),
        breakdown: z
          .enum(["total", "partner"])
          .optional()
          .describe(
            '"total" for annual time series, "partner" for top-15 partner breakdown (default: total).',
          ),
        year: z
          .number()
          .int()
          .min(1990)
          .max(2030)
          .optional()
          .describe(
            "Reference year for partner breakdown (required when breakdown=partner; default: 2022).",
          ),
        startYear: z
          .number()
          .int()
          .min(1990)
          .max(2030)
          .optional()
          .describe("First year of the total time series (default: 2010)."),
        endYear: z
          .number()
          .int()
          .min(1990)
          .max(2030)
          .optional()
          .describe("Last year of the total time series (default: current year)."),
      },
    },
    async ({ flow, breakdown, year, startYear, endYear }) => {
      const resolvedFlow = flow ?? "exports";
      const resolvedBreakdown = breakdown ?? "total";

      try {
        if (resolvedBreakdown === "partner") {
          const resolvedYear = year ?? DEFAULT_PARTNER_YEAR;
          const flowCode = resolvedFlow === "exports" ? "X" : "M";
          const records = await fetchComtradePartners(flowCode, resolvedYear);
          if (records.length === 0) {
            return textResult(
              `No Comtrade partner data for Lao PDR ${resolvedFlow} in ${resolvedYear}. ` +
                "The data may not be available yet — try an earlier year.",
            );
          }
          return jsonResult(
            `Retrieved ${records.length} trading partner record(s) for Lao PDR ${resolvedFlow} in ${resolvedYear} (UN Comtrade).`,
            records,
          );
        }

        // breakdown === "total"
        const indicatorCode = resolvedFlow === "exports" ? "LA_TOTAL_EXPORTS" : "LA_TOTAL_IMPORTS";
        const records = await fetchComtradeIndicator(indicatorCode, startYear, endYear);
        if (records.length === 0) {
          return textResult(
            `No Comtrade total ${resolvedFlow} data found for Lao PDR. ` +
              "Try adjusting the year range or check get_source_status.",
          );
        }
        const label = records[0]?.indicatorName ?? indicatorCode;
        const earliest = records[records.length - 1]?.year;
        const latest = records[0]?.year;
        return jsonResult(
          `Retrieved ${records.length} record(s) for ${label}, ${earliest}–${latest} (UN Comtrade).`,
          records,
        );
      } catch (err) {
        return toToolError(err, {
          subject: `Comtrade ${resolvedFlow} ${resolvedBreakdown}`,
        });
      }
    },
  );

  // No-input call → list key indicators (handled above; this branch unreachable via normal path)
  // but provide a passthrough if someone calls the tool with no inputs
  // (the tool handler already falls through to the total branch by defaults).
}

/** Register a zero-input variant listing key indicators — follows getHealthData pattern. */
export function listTradeIndicators(): string {
  return keyIndicatorList();
}
