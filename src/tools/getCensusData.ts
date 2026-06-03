import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCensusData } from "../adapters/census.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Get Lao PDR census summary figures (population, sex, growth, density, urbanization, " +
  "households, literacy) from the 2015 Population & Housing Census. The 2025 Census " +
  "results are expected Q1–Q2 2026; set CENSUS_2025_AVAILABLE=true to enable the updated path.";

export function registerGetCensusDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_census_data",
    {
      title: "Get Laos census data (LSB)",
      description: DESCRIPTION,
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe('Filter by topic (e.g. "population", "literacy", "urban").'),
        year: z
          .number()
          .int()
          .min(1995)
          .max(2030)
          .optional()
          .describe("Census year (2015; 2025 pending)."),
      },
    },
    async ({ topic, year }) => {
      try {
        const { records, note } = getCensusData(topic, year);
        if (records.length === 0) {
          return textResult(`No census figures matched "${topic}". ${note}`);
        }
        return jsonResult(
          `Retrieved ${records.length} census figure(s) for Lao PDR. ${note}`,
          records,
        );
      } catch (err) {
        return toToolError(err, { subject: "Lao census" });
      }
    },
  );
}
