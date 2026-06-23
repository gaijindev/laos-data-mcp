import { LSB_SDG_INDICATORS } from "../adapters/lsbSdg.js";
import { KEY_DATA360_INDICATORS } from "../adapters/data360.js";
import { KEY_UN_SDG_INDICATORS } from "../adapters/unSdg.js";
import type { CatalogEntry } from "./types.js";

/**
 * Catalog entries for non-World-Bank expansion sources. These are for discovery
 * via list_available_indicators. Sources with registered fetchers also resolve
 * through get_laos_indicator; dataset/catalog sources point at their dedicated
 * tools (see the unsupported-source hint).
 */
export const EXPANSION_SEED: CatalogEntry[] = [
  // FAOSTAT domains (query via get_laos_agriculture_data)
  {
    id: "FAOSTAT:QCL",
    source: "faostat",
    code: "QCL",
    name: "Crops & livestock production (FAOSTAT domain)",
    category: "agriculture",
  },
  {
    id: "FAOSTAT:FBS",
    source: "faostat",
    code: "FBS",
    name: "Food balances (FAOSTAT domain)",
    category: "nutrition",
  },
  {
    id: "FAOSTAT:FS",
    source: "faostat",
    code: "FS",
    name: "Food security indicators (FAOSTAT domain)",
    category: "nutrition",
  },
  {
    id: "FAOSTAT:RL",
    source: "faostat",
    code: "RL",
    name: "Land use (FAOSTAT domain)",
    category: "agriculture",
  },
  {
    id: "FAOSTAT:FO",
    source: "faostat",
    code: "FO",
    name: "Forestry production & trade (FAOSTAT domain)",
    category: "environment",
  },

  // WHO GHO (query via get_laos_health_data or get_laos_indicator)
  {
    id: "WHO:WHOSIS_000001",
    source: "who",
    code: "WHOSIS_000001",
    name: "Life expectancy at birth",
    category: "health",
    unit: "years",
  },
  {
    id: "WHO:MALARIA_EST_INCIDENCE",
    source: "who",
    code: "MALARIA_EST_INCIDENCE",
    name: "Estimated malaria incidence",
    category: "health",
    unit: "per 1000 at risk",
  },
  {
    id: "WHO:MDG_0000000020",
    source: "who",
    code: "MDG_0000000020",
    name: "Incidence of tuberculosis",
    category: "health",
    unit: "per 100,000",
  },
  {
    id: "WHO:NCDMORT3070",
    source: "who",
    code: "NCDMORT3070",
    name: "Probability of dying 30-70 from NCDs",
    category: "health",
    unit: "%",
  },
  {
    id: "WHO:HWF_0001",
    source: "who",
    code: "HWF_0001",
    name: "Medical doctors",
    category: "health",
    unit: "per 10,000",
  },
  {
    id: "WHO:WSH_SANITATION_SAFELY_MANAGED",
    source: "who",
    code: "WSH_SANITATION_SAFELY_MANAGED",
    name: "Safely managed sanitation services",
    category: "wash",
    unit: "%",
  },

  // IMF WEO (query via get_laos_macro_data or get_laos_indicator)
  {
    id: "IMF:NGDP_RPCH",
    source: "imf",
    code: "NGDP_RPCH",
    name: "Real GDP growth",
    category: "economy",
    unit: "annual %",
  },
  {
    id: "IMF:PCPIPCH",
    source: "imf",
    code: "PCPIPCH",
    name: "Inflation, average consumer prices",
    category: "economy",
    unit: "annual %",
  },
  {
    id: "IMF:GGXWDG_NGDP",
    source: "imf",
    code: "GGXWDG_NGDP",
    name: "General government gross debt",
    category: "economy",
    unit: "% of GDP",
  },
  {
    id: "IMF:BCA_NGDPD",
    source: "imf",
    code: "BCA_NGDPD",
    name: "Current account balance",
    category: "economy",
    unit: "% of GDP",
  },
  {
    id: "IMF:PPPGDP",
    source: "imf",
    code: "PPPGDP",
    name: "GDP, PPP",
    category: "economy",
    unit: "billions intl $",
  },

  // HDX HAPI topics (query via get_laos_humanitarian_data)
  {
    id: "HDX:population",
    source: "hdx",
    code: "population",
    name: "Population (HDX HAPI)",
    category: "demography",
  },
  {
    id: "HDX:food-security",
    source: "hdx",
    code: "food-security",
    name: "Food security / IPC (HDX HAPI)",
    category: "nutrition",
  },
  {
    id: "HDX:poverty",
    source: "hdx",
    code: "poverty",
    name: "Poverty rate (HDX HAPI)",
    category: "poverty",
  },
  {
    id: "HDX:operational-presence",
    source: "hdx",
    code: "operational-presence",
    name: "Humanitarian operational presence (HDX HAPI)",
    category: "humanitarian",
  },
  {
    id: "HDX:funding",
    source: "hdx",
    code: "funding",
    name: "Humanitarian funding (HDX HAPI)",
    category: "humanitarian",
  },
  {
    id: "HDX:conflict",
    source: "hdx",
    code: "conflict",
    name: "Conflict events (HDX HAPI)",
    category: "humanitarian",
  },

  // WFP VAM (query via get_laos_food_prices)
  {
    id: "WFP:PriceMonthly",
    source: "wfp",
    code: "PriceMonthly",
    name: "Monthly market commodity prices (WFP VAM)",
    category: "economy",
  },

  // OpenStreetMap feature types (query via get_laos_infrastructure)
  {
    id: "OSM:hospital",
    source: "osm",
    code: "hospital",
    name: "Hospitals (OpenStreetMap)",
    category: "health",
  },
  {
    id: "OSM:clinic",
    source: "osm",
    code: "clinic",
    name: "Clinics (OpenStreetMap)",
    category: "health",
  },
  {
    id: "OSM:school",
    source: "osm",
    code: "school",
    name: "Schools (OpenStreetMap)",
    category: "education",
  },
  {
    id: "OSM:market",
    source: "osm",
    code: "market",
    name: "Marketplaces (OpenStreetMap)",
    category: "infrastructure",
  },
  {
    id: "OSM:power_plant",
    source: "osm",
    code: "power_plant",
    name: "Power plants (OpenStreetMap)",
    category: "energy",
  },
  {
    id: "OSM:river",
    source: "osm",
    code: "river",
    name: "Rivers (OpenStreetMap)",
    category: "environment",
  },

  // MRC themes (query via search_mekong_data)
  {
    id: "MRC:hydrology-water-level",
    source: "mrc",
    code: "hydrology-water-level",
    name: "Hydrology — water level & discharge (MRC)",
    category: "environment",
  },
  {
    id: "MRC:fisheries",
    source: "mrc",
    code: "fisheries",
    name: "Fisheries — abundance & diversity (MRC)",
    category: "environment",
  },
  {
    id: "MRC:water-quality",
    source: "mrc",
    code: "water-quality",
    name: "Water quality monitoring (MRC)",
    category: "environment",
  },

  // Lao census (query via get_laos_census_data)
  {
    id: "CENSUS:POP_TOTAL",
    source: "census",
    code: "POP_TOTAL",
    name: "Total population (2015 Census)",
    category: "demography",
    unit: "people",
  },
  {
    id: "CENSUS:POP_GROWTH",
    source: "census",
    code: "POP_GROWTH",
    name: "Annual population growth (2015 Census)",
    category: "demography",
    unit: "%",
  },
  {
    id: "CENSUS:URBAN_SHARE",
    source: "census",
    code: "URBAN_SHARE",
    name: "Urban population share (2015 Census)",
    category: "demography",
    unit: "%",
  },
  {
    id: "CENSUS:LITERACY_15",
    source: "census",
    code: "LITERACY_15",
    name: "Literacy rate 15+ (2015 Census)",
    category: "education",
    unit: "%",
  },
  // UNESCO UIS education (query via get_laos_education_data or get_laos_indicator)
  {
    id: "UIS:LR.AG15T99",
    source: "uis",
    code: "LR.AG15T99",
    name: "Adult literacy rate, population 15+ years",
    category: "education",
    unit: "%",
  },
  {
    id: "UIS:LR.AG15T24",
    source: "uis",
    code: "LR.AG15T24",
    name: "Youth literacy rate, population 15-24 years",
    category: "education",
    unit: "%",
  },
  {
    id: "UIS:NERT.1.CP",
    source: "uis",
    code: "NERT.1.CP",
    name: "Net enrolment rate, primary",
    category: "education",
    unit: "%",
  },
  {
    id: "UIS:NERT.2.CP",
    source: "uis",
    code: "NERT.2.CP",
    name: "Net enrolment rate, lower secondary",
    category: "education",
    unit: "%",
  },
  {
    id: "UIS:NERT.3.CP",
    source: "uis",
    code: "NERT.3.CP",
    name: "Net enrolment rate, upper secondary",
    category: "education",
    unit: "%",
  },
  {
    id: "UIS:ROFST.1.CP",
    source: "uis",
    code: "ROFST.1.CP",
    name: "Out-of-school rate, primary school age",
    category: "education",
    unit: "%",
  },
  {
    id: "UIS:MYS.1T8.AG25T99",
    source: "uis",
    code: "MYS.1T8.AG25T99",
    name: "Mean years of schooling, population 25+ years",
    category: "education",
  },
  {
    id: "UIS:XGDP.FSGOV",
    source: "uis",
    code: "XGDP.FSGOV",
    name: "Government expenditure on education",
    category: "education",
    unit: "% of GDP",
  },

  // ILOSTAT labor (query via get_laos_labor_data or get_laos_indicator)
  {
    id: "ILO:DF_EAP_DWAP_SEX_AGE_RT",
    source: "ilostat",
    code: "DF_EAP_DWAP_SEX_AGE_RT",
    name: "Labour force participation rate (15+)",
    category: "labor",
    unit: "%",
  },
  {
    id: "ILO:DF_UNE_DEAP_SEX_AGE_RT",
    source: "ilostat",
    code: "DF_UNE_DEAP_SEX_AGE_RT",
    name: "Unemployment rate (15+)",
    category: "labor",
    unit: "%",
  },
  {
    id: "ILO:DF_EMP_DWAP_SEX_AGE_RT",
    source: "ilostat",
    code: "DF_EMP_DWAP_SEX_AGE_RT",
    name: "Employment-to-population ratio (15+)",
    category: "labor",
    unit: "%",
  },
  {
    id: "ILO:DF_EMP_NIFL_SEX_RT",
    source: "ilostat",
    code: "DF_EMP_NIFL_SEX_RT",
    name: "Informal employment rate",
    category: "labor",
    unit: "%",
  },
  {
    id: "ILO:DF_EAR_EMTA_SEX_NB",
    source: "ilostat",
    code: "DF_EAR_EMTA_SEX_NB",
    name: "Average monthly earnings of employees",
    category: "labor",
    unit: "LAK",
  },
  {
    id: "ILO:DF_EAP_2WAP_SEX_AGE_RT",
    source: "ilostat",
    code: "DF_EAP_2WAP_SEX_AGE_RT",
    name: "Labour force participation rate, ILO modelled estimate (15+)",
    category: "labor",
    unit: "%",
  },

  // UN Comtrade trade (query via get_laos_trade_data or get_laos_indicator)
  {
    id: "COMTRADE:LA_TOTAL_EXPORTS",
    source: "comtrade",
    code: "LA_TOTAL_EXPORTS",
    name: "Total merchandise exports, Lao PDR",
    category: "trade",
    unit: "USD",
  },
  {
    id: "COMTRADE:LA_TOTAL_IMPORTS",
    source: "comtrade",
    code: "LA_TOTAL_IMPORTS",
    name: "Total merchandise imports, Lao PDR",
    category: "trade",
    unit: "USD",
  },
  {
    id: "COMTRADE:LA_EXPORTS_BY_PARTNER",
    source: "comtrade",
    code: "LA_EXPORTS_BY_PARTNER",
    name: "Merchandise exports by partner country (top partners)",
    category: "trade",
    unit: "USD",
  },
  {
    id: "COMTRADE:LA_IMPORTS_BY_PARTNER",
    source: "comtrade",
    code: "LA_IMPORTS_BY_PARTNER",
    name: "Merchandise imports by partner country (top partners)",
    category: "trade",
    unit: "USD",
  },

  // UNODC crime & justice (query via get_laos_crime_data — bulk Excel, no API)
  {
    id: "UNODC:trafficking-in-persons",
    source: "unodc",
    code: "trafficking-in-persons",
    name: "Detected victims of trafficking in persons (GLOTIP)",
    category: "governance",
  },
  {
    id: "UNODC:prison-population",
    source: "unodc",
    code: "prison-population",
    name: "Prison population — persons held & rate (CTS)",
    category: "governance",
  },
  {
    id: "UNODC:drug-treatment",
    source: "unodc",
    code: "drug-treatment",
    name: "Drug treatment admissions (World Drug Report)",
    category: "health",
  },

  // FAOLEX legal texts (query via search_laos_legal_texts or search_laos_datasets)
  {
    id: "FAOLEX:LAO:LEGISLATION",
    source: "faolex",
    code: 'country:("LAO") typeOfTextEn:("Legislation")',
    name: "Lao legislation in FAOLEX",
    category: "governance",
    description: "FAOLEX legal-text search for Lao PDR legislation.",
  },
  {
    id: "FAOLEX:LAO:REGULATION",
    source: "faolex",
    code: 'country:("LAO") typeOfTextEn:("Regulation")',
    name: "Lao regulations in FAOLEX",
    category: "governance",
    description: "FAOLEX legal-text search for Lao PDR regulations.",
  },
  {
    id: "FAOLEX:LAO:POLICY",
    source: "faolex",
    code: 'country:("LAO") typeOfTextEn:("Policy")',
    name: "Lao policy texts in FAOLEX",
    category: "governance",
    description: "FAOLEX legal-text search for Lao PDR policy documents.",
  },

  ...KEY_UN_SDG_INDICATORS.map(
    (indicator): CatalogEntry => ({
      id: `UN_SDG:${indicator.code}`,
      source: "un_sdg",
      code: indicator.code,
      name: indicator.name,
      category: indicator.category,
      unit: indicator.unit,
      description: "UN Global SDG Indicators Database indicator for Lao PDR (area code 418).",
    }),
  ),

  ...KEY_DATA360_INDICATORS.map(
    (indicator): CatalogEntry => ({
      id: `DATA360:${indicator.code}`,
      source: "data360",
      code: indicator.code,
      name: indicator.name,
      category: "governance",
      unit: indicator.unit,
      description: "World Bank Data360 governance indicator for Lao PDR.",
    }),
  ),

  ...LSB_SDG_INDICATORS.map(
    (indicator): CatalogEntry => ({
      id: `LSB_SDG:${indicator.code}`,
      source: "lsb_sdg",
      code: indicator.code,
      name: indicator.name,
      category: indicator.category,
      unit: indicator.unit,
      description: "Official Lao Statistics Bureau SDG Open Data Platform indicator.",
    }),
  ),
];
