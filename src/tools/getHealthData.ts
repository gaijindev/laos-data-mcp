import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWhoIndicator, KEY_HEALTH_INDICATORS, searchWhoIndicators } from "../adapters/who.js";
import { registerSearchableIndicatorTool } from "./shared.js";

const DESCRIPTION =
  "Fetch health data for Lao PDR from the WHO Global Health Observatory. Pass an " +
  "`indicator` GHO code to get its time series (e.g. life expectancy, malaria, TB, NCD " +
  "mortality, physicians, sanitation), `search` to find indicator codes by name, or " +
  "neither to list the key indicators.";

export function registerGetHealthDataTool(server: McpServer): void {
  registerSearchableIndicatorTool(server, {
    name: "get_laos_health_data",
    title: "Get Laos health data (WHO GHO)",
    description: DESCRIPTION,
    indicatorParamDescription: "WHO GHO indicator code, e.g. WHOSIS_000001.",
    searchParamDescription: 'Search indicator names (e.g. "tuberculosis").',
    keyIndicators: KEY_HEALTH_INDICATORS,
    keyListHeading: "Key WHO indicators for Lao PDR (pass one as `indicator`):",
    keyListHint: 'Use `search` (e.g. "immuniz", "maternal") to find more indicator codes.',
    recordNoun: "WHO",
    errorSubject: "WHO GHO",
    fetchIndicator: (code) => fetchWhoIndicator(code),
    searchIndicators: (query) => searchWhoIndicators(query),
  });
}
