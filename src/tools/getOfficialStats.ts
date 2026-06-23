import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLaosisCategories, laosisHasApiKey, laosisIsAvailable } from "../adapters/laosis.js";
import { toToolError } from "../utils/errors.js";
import { textResult } from "../utils/result.js";

const DESCRIPTION =
  "List official statistics categories published by the Lao Statistics Bureau (Laosis). " +
  "Laosis has no public REST API yet, so this returns the known category catalog plus " +
  "live-access status; set LAOSIS_API_KEY once LSB grants access to enable data retrieval.";

export function registerGetOfficialStatsTool(server: McpServer): void {
  server.registerTool(
    "get_official_stats",
    {
      title: "Get Laos official statistics (Laosis)",
      description: DESCRIPTION,
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe('Filter categories by a substring (e.g. "health", "agriculture").'),
      },
    },
    async ({ category }) => {
      try {
        const all = getLaosisCategories();
        const filtered = category
          ? all.filter((c) => c.toLowerCase().includes(category.toLowerCase()))
          : all;
        const hasKey = laosisHasApiKey();
        const reachable = await laosisIsAvailable();

        const statusNote = hasKey
          ? "A LAOSIS_API_KEY is set, but Laosis exposes no documented public REST API yet, so live data retrieval is not implemented (stub). See the README for how to request access from LSB."
          : "Laosis has no public API. This lists known statistical categories only. Set LAOSIS_API_KEY once LSB grants access to enable live data.";

        const lines = [
          "Lao Statistics Bureau (Laosis) — official statistics.",
          `Site reachable: ${reachable ? "yes" : "no"}. API key configured: ${hasKey ? "yes" : "no"}.`,
          statusNote,
          "",
          `Categories (${filtered.length}${category ? ` matching "${category}"` : ""}):`,
          ...filtered.map((c) => `- ${c}`),
        ];
        if (filtered.length === 0) {
          lines.push(
            `(No category matched "${category}". Omit the filter to see all ${all.length}.)`,
          );
        }
        return textResult(lines.join("\n"));
      } catch (err) {
        return toToolError(err, { subject: category ?? "Laosis official statistics" });
      }
    },
  );
}
