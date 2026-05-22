import type { CatalogEntry } from "./types.js";

/**
 * Catalog entries for the expansion sources (FAOSTAT, WHO, IMF, HDX, WFP, OSM,
 * MRC, Census). These are for discovery via list_available_indicators. WHO/IMF
 * codes also resolve through get_laos_indicator; the rest point at their own
 * dedicated tools (see the unsupported-source hint).
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
];
