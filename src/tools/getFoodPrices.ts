import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWfpFoodPrices } from "../adapters/wfp.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const MAX_RECORDS = 1000;

const DESCRIPTION =
  "Fetch monthly market prices for Lao PDR from the WFP VAM Data Bridges. Optionally " +
  "filter by commodity, market, or date range (YYYY-MM-DD). Requires WFP OAuth2 " +
  "credentials (WFP_CLIENT_ID / WFP_CLIENT_SECRET).";

export function registerGetFoodPricesTool(server: McpServer): void {
  server.registerTool(
    "get_laos_food_prices",
    {
      title: "Get Laos food prices (WFP VAM)",
      description: DESCRIPTION,
      inputSchema: {
        commodity: z.string().optional().describe('Filter by commodity name (e.g. "Rice").'),
        market: z.string().optional().describe('Filter by market name (e.g. "Vientiane").'),
        startDate: z.string().optional().describe("Start date YYYY-MM-DD."),
        endDate: z.string().optional().describe("End date YYYY-MM-DD."),
      },
    },
    async ({ commodity, market, startDate, endDate }) => {
      try {
        const records = await fetchWfpFoodPrices({ commodity, market, startDate, endDate });
        if (records.length === 0) {
          return textResult(
            `No WFP price data for Lao PDR${commodity ? ` for "${commodity}"` : ""}${market ? ` in "${market}"` : ""}.`,
          );
        }
        const truncated = records.length > MAX_RECORDS;
        const payload = truncated ? records.slice(0, MAX_RECORDS) : records;
        return jsonResult(
          `Retrieved ${records.length} WFP price record(s)${truncated ? ` (showing ${MAX_RECORDS})` : ""} for Lao PDR.`,
          payload,
        );
      } catch (err) {
        return toToolError(err, { subject: "WFP food prices" });
      }
    },
  );
}
