import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { laosisIsAvailable } from "../adapters/laosis.js";
import { pingAdb } from "../adapters/adb.js";
import { pingFaostat } from "../adapters/faostat.js";
import { pingHdx } from "../adapters/hdx.js";
import { pingImf } from "../adapters/imf.js";
import { pingMekong } from "../adapters/mekong.js";
import { pingUnicef } from "../adapters/unicef.js";
import { pingWho } from "../adapters/who.js";
import { pingWorldBank } from "../adapters/worldbank.js";
import { cache } from "../cache/manager.js";
import { SOURCE_META, SOURCES, type Source } from "../schemas/source.js";
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
};

const NOTES: Partial<Record<Source, string>> = {
  adb: "Behind a Cloudflare bot challenge — usually unreachable from non-browser clients.",
  laosis:
    "No public API yet; reachability is the site only. Set LAOSIS_API_KEY once LSB grants access.",
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
