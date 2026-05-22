import { z } from "zod";

/** All data sources this server can talk to. */
export const SOURCES = ["worldbank", "unicef", "adb", "mekong", "laosis"] as const;

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
};

/** Short uppercase prefix used in normalized record IDs, e.g. "WB:SP.POP.TOTL". */
export const SOURCE_ID_PREFIX: Record<Source, string> = {
  worldbank: "WB",
  unicef: "UNICEF",
  adb: "ADB",
  mekong: "MEKONG",
  laosis: "LAOSIS",
};
