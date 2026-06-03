import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FAOLEX_TYPES, searchFaolexLegalTexts } from "../adapters/faolex.js";
import { toToolError } from "../utils/errors.js";
import { jsonResult, textResult } from "../utils/result.js";

const DESCRIPTION =
  "Search FAOLEX for Lao PDR laws, regulations, policies, and agreements related to " +
  "agriculture, land, food, housing/community, environment, natural resources, and " +
  "legal governance. Results are normalized as dataset metadata with direct full-text links when available.";

export function registerSearchLegalTextsTool(server: McpServer): void {
  server.registerTool(
    "search_laos_legal_texts",
    {
      title: "Search Laos legal texts",
      description: DESCRIPTION,
      inputSchema: {
        query: z.string().optional().describe('Free-text search, e.g. "mining", "food", "land".'),
        type: z
          .enum(["all", "legislation", "regulation", "policy", "agreement"])
          .optional()
          .describe(`Legal text type (default all). One of: ${FAOLEX_TYPES.join(", ")}.`),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results (default 10, max 50)."),
      },
    },
    async ({ query, type, maxResults }) => {
      const max = Math.min(Math.max(maxResults ?? 10, 1), 50);
      try {
        const datasets = await searchFaolexLegalTexts(query ?? "", type ?? "all", max);
        if (datasets.length === 0) {
          return textResult(
            `No FAOLEX legal texts found for "${query ?? "Lao PDR"}"${
              type && type !== "all" ? ` (${type})` : ""
            }.`,
          );
        }
        return jsonResult(
          `Found ${datasets.length} FAOLEX legal text(s) for "${query ?? "Lao PDR"}"${
            type && type !== "all" ? ` (${type})` : ""
          }.`,
          datasets,
        );
      } catch (err) {
        return toToolError(err, { subject: query ?? "FAOLEX legal texts" });
      }
    },
  );
}
