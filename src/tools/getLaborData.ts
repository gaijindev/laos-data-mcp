import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchIlostatIndicator,
  KEY_LABOR_INDICATORS,
  searchIlostatIndicators,
} from "../adapters/ilostat.js";
import { registerSearchableIndicatorTool } from "./shared.js";

const DESCRIPTION =
  "Fetch labour market data for Lao PDR from ILOSTAT (ILO Labour Statistics). Pass an " +
  "`indicator` ILOSTAT dataflow code to get its time series (e.g. labour force participation, " +
  "unemployment, employment-to-population ratio, informality, earnings), `search` to find " +
  "indicator codes by name, or neither to list the key indicators.";

export function registerGetLaborDataTool(server: McpServer): void {
  registerSearchableIndicatorTool(server, {
    name: "get_laos_labor_data",
    title: "Get Laos labor data (ILOSTAT)",
    description: DESCRIPTION,
    indicatorParamDescription: "ILOSTAT dataflow code, e.g. DF_EAP_DWAP_SEX_AGE_RT.",
    searchParamDescription: 'Search indicator names (e.g. "unemployment", "earnings").',
    keyIndicators: KEY_LABOR_INDICATORS,
    keyListHeading: "Key ILOSTAT labour indicators for Lao PDR (pass one as `indicator`):",
    keyListHint: 'Use `search` (e.g. "unemployment", "earnings") to find more indicator codes.',
    recordNoun: "ILOSTAT",
    errorSubject: "ILOSTAT",
    fetchIndicator: (code) => fetchIlostatIndicator(code),
    searchIndicators: (query) => searchIlostatIndicators(query),
  });
}
