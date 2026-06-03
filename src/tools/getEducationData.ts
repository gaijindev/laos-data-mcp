import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchUisIndicator,
  KEY_EDUCATION_INDICATORS,
  searchUisIndicators,
} from "../adapters/uis.js";
import { registerSearchableIndicatorTool } from "./shared.js";

const DESCRIPTION =
  "Fetch education data for Lao PDR from the UNESCO Institute for Statistics (UIS). Pass an " +
  "`indicator` UIS code to get its time series (e.g. literacy rates, enrolment rates, " +
  "out-of-school rates, mean years of schooling, education expenditure), `search` to find " +
  "indicator codes by name, or neither to list the key indicators.";

export function registerGetEducationDataTool(server: McpServer): void {
  registerSearchableIndicatorTool(server, {
    name: "get_laos_education_data",
    title: "Get Laos education data (UNESCO UIS)",
    description: DESCRIPTION,
    indicatorParamDescription: "UNESCO UIS indicator code, e.g. LR.AG15T99 (adult literacy rate).",
    searchParamDescription: 'Search education indicator names (e.g. "literacy", "enrolment").',
    keyIndicators: KEY_EDUCATION_INDICATORS,
    keyListHeading: "Key UNESCO UIS education indicators for Lao PDR (pass one as `indicator`):",
    keyListHint:
      'Use `search` (e.g. "literacy", "enrolment", "expenditure") to find more indicator codes.',
    recordNoun: "UNESCO UIS",
    errorSubject: "UNESCO UIS",
    fetchIndicator: (code) => fetchUisIndicator(code),
    searchIndicators: (query) => searchUisIndicators(query),
  });
}
