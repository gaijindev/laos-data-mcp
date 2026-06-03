import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchComtradeIndicator } from "./adapters/comtrade.js";
import { fetchData360Indicator } from "./adapters/data360.js";
import { fetchIlostatIndicator } from "./adapters/ilostat.js";
import { fetchImfIndicator } from "./adapters/imf.js";
import { fetchLsbSdgIndicator } from "./adapters/lsbSdg.js";
import { fetchUisIndicator } from "./adapters/uis.js";
import { fetchUnicefIndicatorByCode } from "./adapters/unicef.js";
import { fetchUnSdgIndicator } from "./adapters/unSdg.js";
import { fetchWhoIndicator } from "./adapters/who.js";
import { registerCompareIndicatorsTool } from "./tools/compareIndicators.js";
import { registerGetIndicatorTool, registerIndicatorFetcher } from "./tools/getIndicator.js";
import { registerGetOfficialStatsTool } from "./tools/getOfficialStats.js";
import { registerGetSourceStatusTool } from "./tools/getSourceStatus.js";
import { registerGetWelfareDataTool } from "./tools/getWelfareData.js";
import { registerListAvailableIndicatorsTool } from "./tools/listAvailableIndicators.js";
import { registerSearchDatasetsTool } from "./tools/searchDatasets.js";
import { registerGetAgricultureDataTool } from "./tools/getAgricultureData.js";
import { registerGetHealthDataTool } from "./tools/getHealthData.js";
import { registerGetMacroDataTool } from "./tools/getMacroData.js";
import { registerHumanitarianTools } from "./tools/getHumanitarianData.js";
import { registerGetFoodPricesTool } from "./tools/getFoodPrices.js";
import { registerGetInfrastructureTool } from "./tools/getInfrastructure.js";
import { registerSearchMekongDataTool } from "./tools/getMekongData.js";
import { registerGetCensusDataTool } from "./tools/getCensusData.js";
import { registerGetSdgProgressTool } from "./tools/getSdgProgress.js";
import { registerGetEducationDataTool } from "./tools/getEducationData.js";
import { registerGetLaborDataTool } from "./tools/getLaborData.js";
import { registerGetTradeDataTool } from "./tools/getTradeData.js";
import { registerGetCrimeDataTool } from "./tools/getCrimeData.js";
import { registerGetGlobalSdgDataTool } from "./tools/getGlobalSdgData.js";
import { registerGetGovernanceDataTool } from "./tools/getGovernanceData.js";
import { registerSearchLegalTextsTool } from "./tools/searchLegalTexts.js";
import { registerIndicatorCatalogResource } from "./resources/indicatorCatalog.js";
import { registerSourceSummaryResource } from "./resources/sourceSummary.js";
import { registerPolicyBriefPrompt } from "./prompts/policyBrief.js";
import { registerSectorComparisonPrompt } from "./prompts/sectorComparison.js";
import { registerDataAuditPrompt } from "./prompts/dataAudit.js";
import { registerSdgProgressAuditPrompt } from "./prompts/sdgProgressAudit.js";

export const SERVER_NAME = "laos-data-mcp";
export const SERVER_VERSION = "1.0.0";

const INSTRUCTIONS = `laos-data-mcp is a unified data gateway for Lao PDR (Laos).

It connects 21 sources behind one interface and normalizes their responses:
  - World Bank Indicators API (development indicators, no auth)
  - UNICEF SDMX (child welfare, health, education, nutrition, WASH; no auth)
  - Open Development Mekong (CKAN dataset catalog; no auth)
  - Asian Development Bank Data Library (CKAN; may be Cloudflare-protected)
  - Laosis / Lao Statistics Bureau (official statistics; stub unless LAOSIS_API_KEY is set)
  - FAOSTAT (agriculture, food, forestry; no auth)
  - WHO GHO (health indicators; no auth)
  - IMF DataMapper (WEO macro indicators; no auth)
  - HDX / HAPI (humanitarian datasets + indicators; HAPI needs HDX_APP_ID)
  - WFP VAM (market food prices; OAuth2 client credentials)
  - OpenStreetMap Overpass (infrastructure POIs; no auth)
  - Mekong River Commission (hydrology/fisheries catalog; stub unless MRC_SESSION_TOKEN)
  - Lao Population & Housing Census (bundled official figures)
  - Lao Statistics Bureau SDG Platform (official SDG indicators; no auth)
  - UNESCO UIS (education indicators; no auth)
  - ILOSTAT (labor indicators via SDMX; no auth)
  - UN Comtrade (merchandise trade; keyless preview, optional COMTRADE_API_KEY)
  - UNODC (crime & justice catalog; stub — bulk Excel only, no per-country API)
  - UN Global SDG Indicators Database (food/agriculture, housing/community, law/crime/justice)
  - FAOLEX (legal texts, laws, regulations, policies; no auth)
  - World Bank Data360 (governance and rule-of-law indicators; no auth)

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

  // Make code-based indicator sources fetchable through get_laos_indicator
  // (and therefore compare_indicators).
  registerIndicatorFetcher("unicef", (code, startYear, endYear) =>
    fetchUnicefIndicatorByCode(code, startYear, endYear),
  );
  registerIndicatorFetcher("who", (code) => fetchWhoIndicator(code));
  registerIndicatorFetcher("imf", (code, startYear, endYear) =>
    fetchImfIndicator(code, { startYear, endYear }),
  );
  registerIndicatorFetcher("lsb_sdg", (code, startYear, endYear) =>
    fetchLsbSdgIndicator(code, startYear, endYear),
  );
  registerIndicatorFetcher("uis", (code, startYear, endYear) =>
    fetchUisIndicator(code, startYear, endYear),
  );
  registerIndicatorFetcher("ilostat", (code, startYear, endYear) =>
    fetchIlostatIndicator(code, startYear, endYear),
  );
  registerIndicatorFetcher("comtrade", (code, startYear, endYear) =>
    fetchComtradeIndicator(code, startYear, endYear),
  );
  registerIndicatorFetcher("un_sdg", (code, startYear, endYear) =>
    fetchUnSdgIndicator(code, startYear, endYear),
  );
  registerIndicatorFetcher("data360", (code, startYear, endYear) =>
    fetchData360Indicator(code, startYear, endYear),
  );

  // Discovery + time series + UNICEF welfare + dataset search.
  registerListAvailableIndicatorsTool(server);
  registerGetIndicatorTool(server);
  registerGetWelfareDataTool(server);
  registerSearchDatasetsTool(server);
  registerCompareIndicatorsTool(server);

  // Source health + Lao official statistics (Laosis stub).
  registerGetSourceStatusTool(server);
  registerGetOfficialStatsTool(server);

  // Expanded data sources (added incrementally).
  registerGetAgricultureDataTool(server); // FAOSTAT
  registerGetHealthDataTool(server); // WHO GHO
  registerGetMacroDataTool(server); // IMF DataMapper
  registerHumanitarianTools(server); // HDX (CKAN + HAPI)
  registerGetFoodPricesTool(server); // WFP VAM
  registerGetInfrastructureTool(server); // OpenStreetMap (Overpass)
  registerSearchMekongDataTool(server); // MRC (stub)
  registerGetCensusDataTool(server); // Lao census (stub)
  registerGetSdgProgressTool(server); // LSB SDG Open Data Platform
  registerGetEducationDataTool(server); // UNESCO UIS
  registerGetLaborDataTool(server); // ILOSTAT
  registerGetTradeDataTool(server); // UN Comtrade
  registerGetCrimeDataTool(server); // UNODC (stub)
  registerGetGlobalSdgDataTool(server); // UN Global SDG Indicators
  registerSearchLegalTextsTool(server); // FAOLEX legal texts
  registerGetGovernanceDataTool(server); // World Bank Data360

  // Resources: browsable indicator catalog + live source status.
  registerIndicatorCatalogResource(server);
  registerSourceSummaryResource(server);

  // Prompts: ready-made workflows over the tools above.
  registerPolicyBriefPrompt(server);
  registerSectorComparisonPrompt(server);
  registerDataAuditPrompt(server);
  registerSdgProgressAuditPrompt(server);

  return server;
}
