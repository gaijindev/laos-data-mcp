import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchUnodcCatalog, unodcLiveEnabled } from "../adapters/unodc.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Browse UNODC (UN Office on Drugs and Crime) crime & justice datasets with Lao PDR " +
  "coverage — trafficking in persons, prison population, and drug-treatment admissions. " +
  "UNODC publishes these only as bulk Excel downloads (no per-country API), so this returns " +
  "catalog metadata + download links. Note: UNODC has no homicide or violent-crime data for Laos.";

export function registerGetCrimeDataTool(server: McpServer): void {
  server.registerTool(
    "get_laos_crime_data",
    {
      title: "Get Laos crime & justice data (UNODC)",
      description: DESCRIPTION,
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe('Filter by topic (e.g. "trafficking", "prison", "drugs").'),
      },
    },
    async ({ topic }) => {
      try {
        const datasets = searchUnodcCatalog(topic);
        const access = unodcLiveEnabled()
          ? "Live UNODC value extraction is enabled."
          : "UNODC has no per-country API; values live in the bulk Excel files linked here. " +
            "Filter rows to Iso3_code = LAO. Homicide/violent-crime data is not available for Laos.";
        if (datasets.length === 0) {
          return textResult(`No UNODC datasets matched "${topic}". ${access}`);
        }
        return jsonResult(
          `Found ${datasets.length} UNODC dataset(s)${topic ? ` for "${topic}"` : ""}. ${access}`,
          datasets,
        );
      } catch (err) {
        return toToolError(err, { subject: "UNODC crime data" });
      }
    },
  );
}
