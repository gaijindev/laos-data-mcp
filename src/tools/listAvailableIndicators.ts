import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CATEGORIES, filterCatalog, type CatalogEntry } from "../catalog/index.js";
import { SourceEnum } from "../schemas/source.js";
import { textResult } from "../utils/result.js";

function renderCatalog(entries: CatalogEntry[]): string {
  const byCategory = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  }

  const lines: string[] = [
    `Found ${entries.length} indicator(s). Pass a \`code\` (or \`source:code\`) to get_laos_indicator / get_laos_welfare_data.`,
    "",
  ];
  for (const category of [...byCategory.keys()].sort()) {
    lines.push(`## ${category}`);
    for (const e of byCategory.get(category)!) {
      const unit = e.unit ? ` — _${e.unit}_` : "";
      lines.push(`- \`${e.code}\` — ${e.name} [${e.source}]${unit}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

const DESCRIPTION =
  "List the development indicators available for Lao PDR across connected sources. " +
  "Optionally filter by source, category, or a text search on indicator names/codes. " +
  "Use this before get_laos_indicator to discover valid indicator codes.";

export function registerListAvailableIndicatorsTool(server: McpServer): void {
  server.registerTool(
    "list_available_indicators",
    {
      title: "List available Laos indicators",
      description: DESCRIPTION,
      inputSchema: {
        source: z
          .union([SourceEnum, z.literal("all")])
          .optional()
          .describe('Filter by source, or "all" (default).'),
        category: z
          .string()
          .optional()
          .describe(`Filter by category. One of: ${CATEGORIES.join(", ")}.`),
        search: z.string().optional().describe("Text search over indicator names and codes."),
      },
    },
    async ({ source, category, search }) => {
      const entries = filterCatalog({ source, category, search });
      if (entries.length === 0) {
        return textResult(
          `No indicators matched (source=${source ?? "all"}, category=${category ?? "-"}, ` +
            `search=${search ?? "-"}). Valid categories: ${CATEGORIES.join(", ")}.`,
        );
      }
      return textResult(renderCatalog(entries));
    },
  );
}
