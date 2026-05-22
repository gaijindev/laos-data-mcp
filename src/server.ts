import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchUnicefIndicatorByCode } from "./adapters/unicef.js";
import { registerGetIndicatorTool, registerIndicatorFetcher } from "./tools/getIndicator.js";
import { registerGetWelfareDataTool } from "./tools/getWelfareData.js";
import { registerListAvailableIndicatorsTool } from "./tools/listAvailableIndicators.js";
import { registerSearchDatasetsTool } from "./tools/searchDatasets.js";

export const SERVER_NAME = "laos-data-mcp";
export const SERVER_VERSION = "1.0.0";

const INSTRUCTIONS = `laos-data-mcp is a unified data gateway for Lao PDR (Laos).

It connects five sources behind one interface and normalizes their responses:
  - World Bank Indicators API (development indicators, no auth)
  - UNICEF SDMX (child welfare, health, education, nutrition, WASH; no auth)
  - Open Development Mekong (CKAN dataset catalog; no auth)
  - Asian Development Bank Data Library (CKAN; may be Cloudflare-protected)
  - Laosis / Lao Statistics Bureau (official statistics; stub unless LAOSIS_API_KEY is set)

Typical flow:
  1. Call list_available_indicators to discover valid indicator codes.
  2. Call get_laos_indicator (international time series) or get_laos_welfare_data (UNICEF).
  3. Call search_laos_datasets for raw data files (Mekong / ADB).
  4. Call compare_indicators to merge several indicators into one table.
  5. Call get_source_status if you suspect a source is down.

All numeric records share one normalized shape (see the laos://indicators/catalog resource).`;

/**
 * Build a fully-wired McpServer instance. Tools, resources, and prompts are
 * registered by the register* helpers in src/tools, src/resources, src/prompts
 * (added incrementally across build phases). Returning a fresh instance per
 * call keeps the HTTP stateless transport correct.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  // Make UNICEF codes ("DATAFLOW:INDICATOR") fetchable through get_laos_indicator.
  registerIndicatorFetcher("unicef", (code, startYear, endYear) =>
    fetchUnicefIndicatorByCode(code, startYear, endYear),
  );

  // Discovery + time series + UNICEF welfare + dataset search.
  registerListAvailableIndicatorsTool(server);
  registerGetIndicatorTool(server);
  registerGetWelfareDataTool(server);
  registerSearchDatasetsTool(server);

  return server;
}
