import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCatalog } from "../catalog/index.js";
import { COUNTRY_CODE, COUNTRY_NAME } from "../schemas/indicator.js";

export const CATALOG_URI = "laos://indicators/catalog";

interface CatalogDocEntry {
  id: string;
  code: string;
  source: string;
  name: string;
  unit?: string;
  dataflow?: string;
}

export interface CatalogDocument {
  country: { code: string; name: string };
  generatedAt: string;
  totalIndicators: number;
  sources: string[];
  categories: Record<string, CatalogDocEntry[]>;
}

/** Build the catalog document served by the resource and written by refresh-catalog. */
export function buildCatalogDocument(): CatalogDocument {
  const entries = getCatalog();
  const categories: Record<string, CatalogDocEntry[]> = {};
  for (const e of entries) {
    (categories[e.category] ??= []).push({
      id: e.id,
      code: e.code,
      source: e.source,
      name: e.name,
      unit: e.unit,
      dataflow: e.dataflow,
    });
  }
  return {
    country: { code: COUNTRY_CODE, name: COUNTRY_NAME },
    generatedAt: new Date().toISOString(),
    totalIndicators: entries.length,
    sources: [...new Set(entries.map((e) => e.source))],
    categories,
  };
}

export function registerIndicatorCatalogResource(server: McpServer): void {
  server.registerResource(
    "indicator-catalog",
    CATALOG_URI,
    {
      title: "Laos indicator catalog",
      description:
        "Static catalog of all queryable indicators for Lao PDR across connected sources, organized by category. Browse this to discover valid codes without making live API calls.",
      mimeType: "application/json",
    },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(buildCatalogDocument(), null, 2),
        },
      ],
    }),
  );
}
