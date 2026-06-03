import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchHdxHapi, HDX_TOPICS, searchHdxDatasets, type HdxTopic } from "../adapters/hdx.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DATA_DESCRIPTION =
  "Fetch humanitarian indicator values for Lao PDR from HDX HAPI (population, food " +
  "security, poverty, operational presence, funding, conflict). Requires a free HDX_APP_ID " +
  "(no login). For raw dataset files, use search_laos_humanitarian_datasets instead.";

const SEARCH_DESCRIPTION =
  "Search the Humanitarian Data Exchange (HDX) catalog for datasets about Lao PDR. " +
  "Returns dataset titles, organizations, formats, and download URLs. Needs no auth.";

export function registerHumanitarianTools(server: McpServer): void {
  server.registerTool(
    "get_laos_humanitarian_data",
    {
      title: "Get Laos humanitarian data (HDX HAPI)",
      description: DATA_DESCRIPTION,
      inputSchema: {
        topic: z
          .enum(HDX_TOPICS as [HdxTopic, ...HdxTopic[]])
          .optional()
          .describe(`Topic (default population). One of: ${HDX_TOPICS.join(", ")}.`),
      },
    },
    async ({ topic }) => {
      const t = topic ?? "population";
      try {
        const records = await fetchHdxHapi(t);
        if (records.length === 0) {
          return textResult(`No HDX HAPI "${t}" data found for Lao PDR.`);
        }
        return jsonResult(
          `Retrieved ${records.length} HDX HAPI record(s) for topic "${t}", Lao PDR.`,
          records,
        );
      } catch (err) {
        return toToolError(err, { subject: `HDX ${t}` });
      }
    },
  );

  server.registerTool(
    "search_laos_humanitarian_datasets",
    {
      title: "Search Laos humanitarian datasets (HDX)",
      description: SEARCH_DESCRIPTION,
      inputSchema: {
        query: z.string().optional().describe("Free-text search (Lao scoping is applied)."),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results (default 10, max 50)."),
      },
    },
    async ({ query, maxResults }) => {
      const max = Math.min(Math.max(maxResults ?? 10, 1), 50);
      try {
        const datasets = await searchHdxDatasets(query ?? "", max);
        if (datasets.length === 0) {
          return textResult(`No HDX datasets found for "${query ?? "Lao PDR"}".`);
        }
        return jsonResult(
          `Found ${datasets.length} HDX dataset(s) for "${query ?? "Lao PDR"}".`,
          datasets,
        );
      } catch (err) {
        return toToolError(err, { subject: "HDX datasets" });
      }
    },
  );
}
