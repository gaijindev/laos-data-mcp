import { z } from "zod";

/** All data sources this server can talk to. */
export const SOURCES = [
  "worldbank",
  "unicef",
  "adb",
  "mekong",
  "laosis",
  "faostat",
  "who",
  "imf",
  "hdx",
  "wfp",
  "osm",
  "mrc",
  "census",
  "lsb_sdg",
  "uis",
  "ilostat",
  "comtrade",
  "unodc",
  "un_sdg",
  "faolex",
  "data360",
] as const;

export const SourceEnum = z.enum(SOURCES);
export type Source = z.infer<typeof SourceEnum>;

/** What kind of payload a source returns once normalized. */
export type SourceKind = "indicators" | "datasets" | "official";

export interface SourceMeta {
  id: Source;
  label: string;
  baseUrl: string;
  /** Cache TTL in seconds (also the default node-cache TTL for the source). */
  cacheTtlSeconds: number;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
  auth: "none" | "optional" | "required";
  kind: SourceKind;
  docsUrl: string;
}

/**
 * Single source of truth for per-source base URLs, cache policies, and timeouts.
 * The cache manager and HTTP client both read from here, so changing a TTL or
 * timeout in one place updates the whole server.
 */
export const SOURCE_META: Record<Source, SourceMeta> = {
  worldbank: {
    id: "worldbank",
    label: "World Bank Indicators API",
    baseUrl: "https://api.worldbank.org/v2",
    cacheTtlSeconds: 86_400, // 24h — data updates ~annually
    timeoutMs: 10_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392",
  },
  unicef: {
    id: "unicef",
    label: "UNICEF Data Warehouse (SDMX)",
    baseUrl: "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest",
    cacheTtlSeconds: 43_200, // 12h — updates quarterly
    timeoutMs: 15_000, // SDMX can be slow
    auth: "none",
    kind: "indicators",
    docsUrl: "https://data.unicef.org/sdmx-api-documentation/",
  },
  adb: {
    id: "adb",
    label: "Asian Development Bank Data Library",
    baseUrl: "https://data.adb.org/api/3/action",
    cacheTtlSeconds: 43_200, // 12h
    timeoutMs: 10_000,
    auth: "optional",
    kind: "datasets",
    docsUrl: "https://data.adb.org/",
  },
  mekong: {
    id: "mekong",
    label: "Open Development Mekong (Laos)",
    baseUrl: "https://data.laos.opendevelopmentmekong.net/api/3/action",
    cacheTtlSeconds: 21_600, // 6h — catalog changes more often
    timeoutMs: 8_000,
    auth: "none",
    kind: "datasets",
    docsUrl: "https://data.laos.opendevelopmentmekong.net/",
  },
  laosis: {
    id: "laosis",
    label: "Lao Statistics Bureau (Laosis)",
    baseUrl: "https://laosis.lsb.gov.la",
    cacheTtlSeconds: 3_600, // 1h — when available
    timeoutMs: 5_000,
    auth: "required",
    kind: "official",
    docsUrl: "https://laosis.lsb.gov.la/",
  },
  faostat: {
    id: "faostat",
    label: "FAO FAOSTAT",
    baseUrl: "https://fenixservices.fao.org/faostat/api/v1",
    cacheTtlSeconds: 86_400, // 24h — data updates ~annually
    timeoutMs: 20_000, // FAOSTAT can be slow
    auth: "none",
    kind: "indicators",
    docsUrl: "https://www.fao.org/faostat/en/#data",
  },
  who: {
    id: "who",
    label: "WHO Global Health Observatory",
    baseUrl: "https://ghoapi.azureedge.net/api",
    cacheTtlSeconds: 43_200, // 12h
    timeoutMs: 15_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://www.who.int/data/gho/info/gho-odata-api",
  },
  imf: {
    id: "imf",
    label: "IMF DataMapper (WEO)",
    baseUrl: "https://www.imf.org/external/datamapper/api/v2",
    cacheTtlSeconds: 86_400, // 24h — WEO updates ~twice a year
    timeoutMs: 15_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://www.imf.org/external/datamapper/api/help",
  },
  hdx: {
    id: "hdx",
    label: "Humanitarian Data Exchange (HDX / HAPI)",
    baseUrl: "https://hapi.humdata.org/api/v1",
    cacheTtlSeconds: 21_600, // 6h
    timeoutMs: 15_000,
    auth: "optional", // CKAN search needs none; HAPI needs HDX_APP_ID
    kind: "datasets",
    docsUrl: "https://hapi.humdata.org/docs",
  },
  wfp: {
    id: "wfp",
    label: "WFP VAM Data Bridges",
    baseUrl: "https://gateway.api.wfp.org/vam-data-bridges/v1",
    cacheTtlSeconds: 21_600, // 6h
    timeoutMs: 15_000,
    auth: "required", // OAuth2 client credentials (WFP_CLIENT_ID/SECRET)
    kind: "indicators",
    docsUrl: "https://api.wfp.org/",
  },
  osm: {
    id: "osm",
    label: "OpenStreetMap (Overpass API)",
    baseUrl: "https://overpass-api.de/api/interpreter",
    cacheTtlSeconds: 604_800, // 7d — aggressive caching for the 10k/day rate limit
    timeoutMs: 45_000, // Overpass queries can be slow
    auth: "none",
    kind: "datasets",
    docsUrl: "https://wiki.openstreetmap.org/wiki/Overpass_API",
  },
  mrc: {
    id: "mrc",
    label: "Mekong River Commission (MRC)",
    baseUrl: "https://portal.mrcmekong.org",
    cacheTtlSeconds: 86_400, // 24h
    timeoutMs: 8_000,
    auth: "required", // raw data needs MRC registration (MRC_SESSION_TOKEN)
    kind: "datasets",
    docsUrl: "https://portal.mrcmekong.org/",
  },
  census: {
    id: "census",
    label: "Lao Population & Housing Census (LSB)",
    baseUrl: "https://lsb.gov.la",
    cacheTtlSeconds: 86_400, // 24h (data is bundled, not fetched)
    timeoutMs: 5_000,
    auth: "none",
    kind: "official",
    docsUrl: "https://lsb.gov.la/",
  },
  lsb_sdg: {
    id: "lsb_sdg",
    label: "Lao Statistics Bureau SDG Platform",
    baseUrl: "https://sdg-laos.github.io",
    cacheTtlSeconds: 86_400, // 24h — static Open SDG data; site last update drives freshness
    timeoutMs: 10_000,
    auth: "none",
    kind: "official",
    docsUrl: "https://www.lsb.gov.la/sdg/en/",
  },
  uis: {
    id: "uis",
    label: "UNESCO Institute for Statistics (UIS)",
    baseUrl: "https://api.uis.unesco.org/api/public",
    cacheTtlSeconds: 86_400, // 24h — UIS releases are quarterly/annual
    timeoutMs: 15_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://api.uis.unesco.org/api/public/documentation/",
  },
  ilostat: {
    id: "ilostat",
    label: "ILOSTAT (ILO Labour Statistics)",
    baseUrl: "https://sdmx.ilo.org/rest",
    cacheTtlSeconds: 86_400, // 24h — Lao LFS runs every few years; modelled estimates annual
    timeoutMs: 20_000, // SDMX can be slow
    auth: "none",
    kind: "indicators",
    docsUrl: "https://ilostat.ilo.org/resources/sdmx-tools/",
  },
  comtrade: {
    id: "comtrade",
    label: "UN Comtrade International Trade Statistics",
    baseUrl: "https://comtradeapi.un.org/public/v1/preview",
    cacheTtlSeconds: 86_400, // 24h — annual data, Lao submissions lag 1–2 years
    timeoutMs: 12_000,
    auth: "optional", // keyless preview works; COMTRADE_API_KEY is sent when configured
    kind: "indicators",
    docsUrl: "https://comtrade.un.org/",
  },
  unodc: {
    id: "unodc",
    label: "UNODC Crime & Drug Statistics",
    baseUrl: "https://data.unodc.org",
    cacheTtlSeconds: 604_800, // 7d — bulk files update once or twice a year
    timeoutMs: 15_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://data.unodc.org/",
  },
  un_sdg: {
    id: "un_sdg",
    label: "UN Global SDG Indicators Database",
    baseUrl: "https://unstats.un.org/SDGAPI/v1/sdg",
    cacheTtlSeconds: 86_400, // 24h — global SDG releases are periodic
    timeoutMs: 20_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://unstats.un.org/sdgapi/swagger/",
  },
  faolex: {
    id: "faolex",
    label: "FAOLEX Legal Text Search",
    baseUrl: "https://fao-faolex-prod.appspot.com/api/query",
    cacheTtlSeconds: 86_400, // 24h — legal corpus updates periodically
    timeoutMs: 20_000,
    auth: "none",
    kind: "datasets",
    docsUrl: "https://www.fao.org/faolex/en/",
  },
  data360: {
    id: "data360",
    label: "World Bank Data360 API",
    baseUrl: "https://data360api.worldbank.org/data360",
    cacheTtlSeconds: 86_400, // 24h — governance indicators update annually
    timeoutMs: 15_000,
    auth: "none",
    kind: "indicators",
    docsUrl: "https://data360.worldbank.org/en/api",
  },
};

/** Short uppercase prefix used in normalized record IDs, e.g. "WB:SP.POP.TOTL". */
export const SOURCE_ID_PREFIX: Record<Source, string> = {
  worldbank: "WB",
  unicef: "UNICEF",
  adb: "ADB",
  mekong: "MEKONG",
  laosis: "LAOSIS",
  faostat: "FAOSTAT",
  who: "WHO",
  imf: "IMF",
  hdx: "HDX",
  wfp: "WFP",
  osm: "OSM",
  mrc: "MRC",
  census: "CENSUS",
  lsb_sdg: "LSB_SDG",
  uis: "UIS",
  ilostat: "ILO",
  comtrade: "COMTRADE",
  unodc: "UNODC",
  un_sdg: "UN_SDG",
  faolex: "FAOLEX",
  data360: "DATA360",
};
