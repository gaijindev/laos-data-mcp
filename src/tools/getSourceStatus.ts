import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { laosisIsAvailable } from "../adapters/laosis.js";
import { pingAdb } from "../adapters/adb.js";
import { pingCensus } from "../adapters/census.js";
import { pingFaostat } from "../adapters/faostat.js";
import { pingHdx } from "../adapters/hdx.js";
import { pingImf } from "../adapters/imf.js";
import { pingLsbSdg } from "../adapters/lsbSdg.js";
import { pingMekong } from "../adapters/mekong.js";
import { mrcIsAvailable } from "../adapters/mrc.js";
import { pingOsm } from "../adapters/osm.js";
import { pingUnicef } from "../adapters/unicef.js";
import { pingWfp } from "../adapters/wfp.js";
import { pingWho } from "../adapters/who.js";
import { pingWorldBank } from "../adapters/worldbank.js";
import { pingUis } from "../adapters/uis.js";
import { pingIlostat } from "../adapters/ilostat.js";
import { pingComtrade } from "../adapters/comtrade.js";
import { pingUnodc } from "../adapters/unodc.js";
import { cache } from "../cache/manager.js";
import { SOURCE_META, SOURCES, type Source } from "../schemas/source.js";
import { circuitSnapshot, type CircuitSnapshot } from "../utils/circuitBreaker.js";
import { jsonResult } from "../utils/result.js";

const PINGS: Record<Source, () => Promise<boolean>> = {
  worldbank: pingWorldBank,
  unicef: pingUnicef,
  mekong: pingMekong,
  adb: pingAdb,
  laosis: laosisIsAvailable,
  faostat: pingFaostat,
  who: pingWho,
  imf: pingImf,
  hdx: pingHdx,
  wfp: pingWfp,
  osm: pingOsm,
  mrc: mrcIsAvailable,
  census: pingCensus,
  lsb_sdg: pingLsbSdg,
  uis: pingUis,
  ilostat: pingIlostat,
  comtrade: pingComtrade,
  unodc: pingUnodc,
};

const NOTES: Partial<Record<Source, string>> = {
  adb: "Behind a Cloudflare bot challenge — usually unreachable from non-browser clients.",
  laosis:
    "No public API yet; reachability is the site only. Set LAOSIS_API_KEY once LSB grants access.",
  hdx: "Reachability is the public CKAN catalog; HAPI indicator values need HDX_APP_ID.",
  wfp: "Requires WFP_CLIENT_ID / WFP_CLIENT_SECRET (OAuth2); reports unreachable without them.",
  mrc: "Stub: portal reachability only. Raw data needs MRC registration (MRC_SESSION_TOKEN).",
  census: "Bundled 2015 census summary; 2025 results expected Q1–Q2 2026 (CENSUS_2025_AVAILABLE).",
  lsb_sdg:
    "Official LSB SDG Open Data Platform CSV export; site currently reports data last updated Jun 26, 2021.",
  comtrade:
    "Keyless preview endpoint (capped at 500 records/response). Set COMTRADE_API_KEY for the full data endpoint. 2017+ Lao values are UN mirror estimates.",
  unodc:
    "Stub: portal reachability only. UNODC has no per-country API — values are bulk Excel; Laos covers trafficking, prison, and drug treatment (no homicide/violent crime).",
};

export interface SourceStatus {
  source: Source;
  label: string;
  reachable: boolean;
  auth: string;
  cacheTtlSeconds: number;
  lastFetch: string | null;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  circuit: CircuitSnapshot;
  note?: string;
}

export interface SourceStatusReport {
  generatedAt: string;
  cache: { enabled: boolean; keys: number; hits: number; misses: number; hitRate: number };
  reachable: string;
  sources: SourceStatus[];
}

/** Ping every source in parallel and combine with cache stats. Reused by the resource. */
export async function collectSourceStatus(): Promise<SourceStatusReport> {
  const stats = cache.stats();
  const sources = await Promise.all(
    SOURCES.map(async (s): Promise<SourceStatus> => {
      const reachable = await PINGS[s]().catch(() => false);
      const cs = stats.perSource[s];
      return {
        source: s,
        label: SOURCE_META[s].label,
        reachable,
        auth: SOURCE_META[s].auth,
        cacheTtlSeconds: SOURCE_META[s].cacheTtlSeconds,
        lastFetch: cs.lastFetch,
        cacheHits: cs.hits,
        cacheMisses: cs.misses,
        hitRate: Number(cs.hitRate.toFixed(2)),
        circuit: circuitSnapshot(s),
        note: NOTES[s],
      };
    }),
  );
  const reachableCount = sources.filter((s) => s.reachable).length;
  return {
    generatedAt: new Date().toISOString(),
    cache: {
      enabled: stats.enabled,
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: Number(stats.hitRate.toFixed(2)),
    },
    reachable: `${reachableCount}/${sources.length}`,
    sources,
  };
}

const DESCRIPTION =
  "Check the health and availability of all connected data sources (World Bank, UNICEF, " +
  "OD Mekong, ADB, Laosis), with last-fetch time and cache hit rates. Use before making " +
  "data requests if you suspect connectivity problems.";

export function registerGetSourceStatusTool(server: McpServer): void {
  server.registerTool(
    "get_source_status",
    { title: "Get data source status", description: DESCRIPTION, inputSchema: {} },
    async () => {
      const report = await collectSourceStatus();
      return jsonResult(`Data source status — ${report.reachable} reachable.`, report);
    },
  );
}
