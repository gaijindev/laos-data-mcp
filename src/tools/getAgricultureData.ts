import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  FAOSTAT_DOMAIN_IDS,
  FAOSTAT_DOMAINS,
  fetchFaostatDomain,
  type FaostatDomain,
} from "../adapters/faostat.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";
import { resolveYearRange, yearRangeFields } from "./shared.js";

const MAX_RECORDS = 1000;

const DESCRIPTION =
  "Fetch FAO FAOSTAT agriculture data for Lao PDR — crop & livestock production (QCL), " +
  "food balances (FBS), food security indicators (FS), land use (RL), or forestry (FO). " +
  "Optionally filter by item (name or FAOSTAT item code).";

export function registerGetAgricultureDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_agriculture_data",
    {
      title: "Get Laos agriculture data (FAOSTAT)",
      description: DESCRIPTION,
      inputSchema: {
        domain: z
          .enum(FAOSTAT_DOMAIN_IDS as [FaostatDomain, ...FaostatDomain[]])
          .describe(
            `FAOSTAT domain. ${FAOSTAT_DOMAIN_IDS.map((d) => `${d}=${FAOSTAT_DOMAINS[d].label}`).join("; ")}.`,
          ),
        item: z
          .string()
          .optional()
          .describe('Filter by item name or FAOSTAT item code (e.g. "Rice" or "27").'),
        ...yearRangeFields(2010),
      },
    },
    async ({ domain, item, startYear, endYear }) => {
      const { start, end } = resolveYearRange(startYear, endYear, 2010);
      try {
        const records = await fetchFaostatDomain(domain, { item, startYear: start, endYear: end });
        if (records.length === 0) {
          return textResult(
            `No FAOSTAT ${domain} data for Lao PDR${item ? ` matching "${item}"` : ""} in ${start}–${end}.`,
          );
        }
        const truncated = records.length > MAX_RECORDS;
        const payload = truncated ? records.slice(0, MAX_RECORDS) : records;
        return jsonResult(
          `Retrieved ${records.length} FAOSTAT record(s)${truncated ? ` (showing ${MAX_RECORDS})` : ""} ` +
            `for ${domain} (${FAOSTAT_DOMAINS[domain].label}), Lao PDR, ${start}–${end}.`,
          payload,
        );
      } catch (err) {
        return toToolError(err, { subject: `FAOSTAT ${domain}` });
      }
    },
  );
}
